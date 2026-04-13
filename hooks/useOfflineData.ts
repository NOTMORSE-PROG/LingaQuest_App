import { useSQLiteContext, SQLiteDatabase } from "expo-sqlite";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { useIsOnline } from "./useIsOnline";
import {
  getIslandsLocal,
  getProgressLocal,
  getBadgesLocal,
  getPinLocal,
  getIslandLocal,
  saveProgressLocal,
  markIngaySeenLocal,
} from "@/lib/local-db";
import { checkAndAwardBadgesLocal } from "@/lib/badge-engine";
import { apiClient } from "@/lib/api";
import { ISLAND_PASS_THRESHOLD } from "@/lib/constants";

/**
 * Read all completed local progress and return a lookup map.
 * Used to overlay locally-saved completions onto server responses
 * so the UI reflects progress immediately (before the server knows).
 */
async function getLocalProgressMap(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<{
    pinId: string;
    accuracy: number;
    isCompleted: number;
  }>("SELECT pinId, accuracy, isCompleted FROM local_progress WHERE isCompleted = 1");
  return new Map(rows.map((r) => [r.pinId, r]));
}

/**
 * Merge local progress into server pin data.
 * For each pin, if local DB shows it completed but server doesn't,
 * use the local state. Always take the higher accuracy.
 */
function mergePinsWithLocal(
  pins: any[],
  localMap: Map<string, { pinId: string; accuracy: number; isCompleted: number }>
) {
  return pins.map((pin: any) => {
    const local = localMap.get(pin.id);
    if (!local) return pin;
    return {
      ...pin,
      isCompleted: pin.isCompleted || true,
      accuracy: Math.max(pin.accuracy ?? 0, local.accuracy),
    };
  });
}

/**
 * Offline-aware hook for islands data.
 * When online + logged in: fetches from server (with local fallback on error).
 * Otherwise: reads from local SQLite.
 */
export function useIslands() {
  const db = useSQLiteContext();
  const isOnline = useIsOnline();
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: ["islands"],
    queryFn: async () => {
      if (isOnline && token) {
        try {
          const serverData = await apiClient.getIslands();
          // Merge local progress so locally-completed pins show immediately
          const localMap = await getLocalProgressMap(db);
          if (localMap.size === 0) return serverData;
          return serverData.map((island: any) => ({
            ...island,
            pins: mergePinsWithLocal(island.pins ?? [], localMap),
          }));
        } catch {
          return getIslandsLocal(db);
        }
      }
      return getIslandsLocal(db);
    },
    staleTime: isOnline ? 30_000 : Infinity,
    gcTime: Infinity,
    refetchOnMount: true,
  });
}

/**
 * Offline-aware hook for island progress.
 */
export function useProgress() {
  const db = useSQLiteContext();
  const isOnline = useIsOnline();
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: ["progress"],
    queryFn: async () => {
      if (isOnline && token) {
        try {
          const serverData = await apiClient.getProgress();
          // Merge local progress so locally-completed pins are counted
          const localMap = await getLocalProgressMap(db);
          if (localMap.size === 0) return serverData;
          // Read pin→island mapping to adjust per-island counts
          const pins = await db.getAllAsync<{ id: string; islandId: string }>(
            "SELECT id, islandId FROM pins"
          );
          const pinsByIsland = new Map<string, string[]>();
          for (const p of pins) {
            const list = pinsByIsland.get(p.islandId) ?? [];
            list.push(p.id);
            pinsByIsland.set(p.islandId, list);
          }
          return serverData.map((island: any) => {
            const islandPinIds = pinsByIsland.get(island.islandId) ?? [];
            const localCompleted = islandPinIds.filter((id) => localMap.has(id)).length;
            const completedPins = Math.max(island.completedPins ?? 0, localCompleted);
            const isCompleted = completedPins >= island.totalPins;
            return { ...island, completedPins, isCompleted };
          });
        } catch {
          return getProgressLocal(db);
        }
      }
      return getProgressLocal(db);
    },
    staleTime: isOnline ? 30_000 : Infinity,
    refetchOnMount: true,
  });
}

/**
 * Offline-aware hook for badges.
 */
export function useBadges() {
  const db = useSQLiteContext();
  const isOnline = useIsOnline();
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: ["badges"],
    queryFn: async () => {
      if (isOnline && token) {
        try {
          return await apiClient.getBadges();
        } catch {
          return getBadgesLocal(db);
        }
      }
      return getBadgesLocal(db);
    },
    staleTime: isOnline ? 30_000 : Infinity,
    refetchOnMount: true,
  });
}

/**
 * Offline-aware hook for a single pin with challenges.
 */
export function usePin(pinId: string) {
  const db = useSQLiteContext();
  const isOnline = useIsOnline();
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: ["pin", pinId],
    queryFn: async () => {
      if (isOnline && token) {
        try {
          return await apiClient.getPin(pinId);
        } catch {
          return getPinLocal(db, pinId);
        }
      }
      return getPinLocal(db, pinId);
    },
  });
}

/**
 * Offline-aware hook for a single island with full data.
 */
export function useIsland(islandId: string) {
  const db = useSQLiteContext();
  const isOnline = useIsOnline();
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: ["island", islandId],
    queryFn: async () => {
      if (isOnline && token) {
        try {
          const serverData = await apiClient.getIsland(islandId);
          // Merge local progress so locally-completed pins show immediately
          const localMap = await getLocalProgressMap(db);
          if (localMap.size === 0) return serverData;
          const mergedPins = mergePinsWithLocal(serverData.pins ?? [], localMap);
          const completedPins = mergedPins.filter((p: any) => p.isCompleted);
          const allPinsCompleted = completedPins.length === mergedPins.length && mergedPins.length > 0;
          const cumulativeAccuracy =
            completedPins.length > 0
              ? Math.round(
                  completedPins.reduce((sum: number, p: any) => sum + (p.accuracy ?? 0), 0) /
                    completedPins.length
                )
              : null;
          return {
            ...serverData,
            pins: mergedPins,
            allPinsCompleted,
            cumulativeAccuracy,
            islandPassed: allPinsCompleted && (cumulativeAccuracy ?? 0) >= ISLAND_PASS_THRESHOLD,
          };
        } catch {
          return getIslandLocal(db, islandId);
        }
      }
      return getIslandLocal(db, islandId);
    },
    refetchOnMount: true,
  });
}

/**
 * Offline-first progress submission mutation.
 * Always writes to local SQLite first, then attempts server push if online.
 */
export function useSubmitProgress() {
  const db = useSQLiteContext();
  const isOnline = useIsOnline();
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { pinId: string; accuracy: number }) => {
      // ALWAYS write locally first (offline-first pattern)
      await saveProgressLocal(db, data.pinId, data.accuracy);

      // Award badges locally
      try {
        await checkAndAwardBadgesLocal(db);
      } catch {
        // Badge award is best-effort
      }

      // If online + logged in, also push to server (best-effort)
      if (isOnline && token) {
        try {
          await apiClient.submitProgress(data);
        } catch {
          // Already saved locally with needsSync=1 -- sync engine will retry
        }
      }

      // Return shape matching server response for quest UI compatibility
      const bestAccuracy = data.accuracy;
      return {
        isPassed: bestAccuracy >= ISLAND_PASS_THRESHOLD,
        passThreshold: ISLAND_PASS_THRESHOLD,
      };
    },
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      queryClient.invalidateQueries({ queryKey: ["island"] });
      queryClient.invalidateQueries({ queryKey: ["islands"] });
      queryClient.invalidateQueries({ queryKey: ["badges"] });
    },
  });
}

/**
 * Offline-first ingay seen mutation.
 */
export function useMarkIngaySeen() {
  const db = useSQLiteContext();
  const isOnline = useIsOnline();
  const token = useAuthStore((s) => s.token);

  return useMutation({
    mutationFn: async (islandId: string) => {
      await markIngaySeenLocal(db, islandId);
      if (isOnline && token) {
        try {
          await apiClient.markIngaySeen(islandId);
        } catch {
          // Local is enough
        }
      }
    },
  });
}
