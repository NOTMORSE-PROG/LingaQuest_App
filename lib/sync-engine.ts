/**
 * Sync engine: pushes local offline progress to the server when
 * the user is online and logged in.
 *
 * Triggers:
 * 1. After login (called from setAuth flow)
 * 2. App returns to foreground (AppState 'active')
 * 3. Network recovers (NetInfo online transition)
 * 4. After quest completion (inline in useSubmitProgress)
 */

import NetInfo from "@react-native-community/netinfo";
import { AppState } from "react-native";
import * as SQLite from "expo-sqlite";
import { useAuthStore } from "@/stores/auth";
import { apiClient } from "@/lib/api";
import {
  getUnsyncedProgress,
  markProgressSynced,
  mergeServerProgress,
  mergeServerBadges,
} from "@/lib/local-db";

let syncInProgress = false;

/**
 * Push unsynced local progress to the server.
 * Safe to call multiple times — coalesces concurrent requests.
 */
export async function syncProgress() {
  const { token } = useAuthStore.getState();
  if (!token) return;

  const net = await NetInfo.fetch();
  if (!net.isConnected) return;

  // Coalesce: skip if already running
  if (syncInProgress) return;
  syncInProgress = true;

  try {
    const db = SQLite.openDatabaseSync("linguaquest.db");

    // === PUSH: Send unsynced progress to server ===
    const unsynced = await getUnsyncedProgress(db);

    if (unsynced.length > 0) try {
      await apiClient.submitProgressBatch(unsynced);
      // Mark all as synced
      await markProgressSynced(
        db,
        unsynced.map((r) => r.pinId)
      );
    } catch {
      // Leave needsSync = 1, will retry next cycle
    }

    // Mark local badges as synced (server awards badges during progress batch)
    try {
      await db.runAsync(
        "UPDATE local_badges SET needsSync = 0 WHERE needsSync = 1"
      );
    } catch {
      // Non-critical
    }

    // === PULL: Fetch server progress + badges and merge into local DB ===
    try {
      const { progress, badges } = await apiClient.getSyncData();
      if (progress.length > 0) {
        await mergeServerProgress(db, progress);
      }
      if (badges.length > 0) {
        await mergeServerBadges(
          db,
          badges.map((b) => ({ badgeType: b.type, earnedAt: b.earnedAt }))
        );
      }
    } catch {
      // Pull failed — not critical, local data still works
    }
  } finally {
    syncInProgress = false;
  }
}

/**
 * Initialize sync listeners. Call once during app startup.
 * Returns a cleanup function to remove listeners.
 */
export function initSyncEngine(): () => void {
  // Sync on app foreground
  const appStateSub = AppState.addEventListener("change", (state) => {
    if (state === "active") {
      syncProgress();
    }
  });

  // Sync on network recovery
  const netInfoUnsub = NetInfo.addEventListener((state) => {
    if (state.isConnected) {
      syncProgress();
    }
  });

  return () => {
    appStateSub.remove();
    netInfoUnsub();
  };
}
