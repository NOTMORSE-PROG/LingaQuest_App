/**
 * Client-side badge computation.
 * Exact port of checkAndAwardBadges() from backend/app/api/progress/route.ts:113-172.
 * Reads from local SQLite instead of Prisma.
 */

import type { SQLiteDatabase } from "expo-sqlite";
import { ISLAND_PASS_THRESHOLD } from "@/lib/constants";

export async function checkAndAwardBadgesLocal(db: SQLiteDatabase) {
  const progress = await db.getAllAsync<{ pinId: string; accuracy: number }>(
    "SELECT pinId, accuracy FROM local_progress WHERE isCompleted = 1"
  );
  const existingBadges = await db.getAllAsync<{ badgeType: string }>(
    "SELECT badgeType FROM local_badges"
  );
  const earned = new Set(existingBadges.map((b) => b.badgeType));
  const toAward: string[] = [];

  // first_steps: completed at least 1 pin
  if (progress.length >= 1 && !earned.has("first_steps")) {
    toAward.push("first_steps");
  }

  // sharp_ear: 100% accuracy on any pin
  if (progress.some((p) => p.accuracy === 100) && !earned.has("sharp_ear")) {
    toAward.push("sharp_ear");
  }

  // Island badges: all pins on island completed + avg accuracy >= threshold
  const islands = await db.getAllAsync<{ id: string; number: number }>(
    "SELECT id, number FROM islands"
  );
  const pins = await db.getAllAsync<{ id: string; islandId: string }>(
    "SELECT id, islandId FROM pins"
  );
  const completedPinIds = new Set(progress.map((p) => p.pinId));
  const accuracyMap = new Map(progress.map((p) => [p.pinId, p.accuracy]));

  for (const island of islands) {
    const islandPins = pins.filter((p) => p.islandId === island.id);
    const badgeKey = `island_${island.number}`;
    if (earned.has(badgeKey) || islandPins.length === 0) continue;
    if (!islandPins.every((p) => completedPinIds.has(p.id))) continue;
    const avg =
      islandPins.reduce((s, p) => s + (accuracyMap.get(p.id) ?? 0), 0) /
      islandPins.length;
    if (avg >= ISLAND_PASS_THRESHOLD) {
      toAward.push(badgeKey);
    }
  }

  // the_captain + island_conqueror: all islands passed
  const allPassed = islands.every((island) => {
    const islandPins = pins.filter((p) => p.islandId === island.id);
    if (!islandPins.every((p) => completedPinIds.has(p.id))) return false;
    if (islandPins.length === 0) return true;
    const avg =
      islandPins.reduce((s, p) => s + (accuracyMap.get(p.id) ?? 0), 0) /
      islandPins.length;
    return avg >= ISLAND_PASS_THRESHOLD;
  });
  if (allPassed && !earned.has("the_captain")) {
    toAward.push("the_captain");
    if (!earned.has("island_conqueror")) toAward.push("island_conqueror");
  }

  // Insert new badges
  for (const badgeType of toAward) {
    await db.runAsync(
      `INSERT OR IGNORE INTO local_badges (badgeType, earnedAt, needsSync)
       VALUES (?, datetime('now'), 1)`,
      [badgeType]
    );
  }
}
