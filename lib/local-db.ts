import type { SQLiteDatabase } from "expo-sqlite";
import type {
  IslandWithPins,
  Pin,
  Challenge,
  Choice,
  IslandProgress,
  Badge,
  BadgeType,
} from "@/types";
import { ISLAND_PASS_THRESHOLD } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Types for raw SQLite rows
// ---------------------------------------------------------------------------

interface IslandRow {
  id: string;
  number: number;
  name: string;
  skillFocus: string;
  description: string;
  npcName: string | null;
  npcDialogueIntro: string | null;
  npcDialogueSuccess: string | null;
  npcDialogueFail: string | null;
  npcAudioIntro: string | null;
  npcAudioSuccess: string | null;
  npcAudioFail: string | null;
  ingayAudioUrl: string | null;
  ingayDialogue: string | null;
  bgMusicUrl: string | null;
  shardItemName: string | null;
  shardDescription: string | null;
}

interface PinRow {
  id: string;
  islandId: string;
  number: number;
  type: string;
  sortOrder: number;
}

interface ChallengeRow {
  id: string;
  pinId: string;
  audioUrl: string;
  audioScript: string | null;
  question: string;
  choices: string; // JSON string
  answer: string;
  explanation: string;
  hint: string;
  explanationAudioUrl: string | null;
  sortOrder: number;
}

interface ProgressRow {
  pinId: string;
  accuracy: number;
  isCompleted: number; // 0 or 1
  completedAt: string | null;
  needsSync: number;
}

interface BadgeRow {
  badgeType: string;
  earnedAt: string;
  needsSync: number;
}

// ---------------------------------------------------------------------------
// Database Initialization (called by SQLiteProvider onInit)
// ---------------------------------------------------------------------------

export async function initDatabase(db: SQLiteDatabase) {
  const result = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version"
  );
  const currentVersion = result?.user_version ?? 0;

  if (currentVersion === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = 'wal';

      CREATE TABLE IF NOT EXISTS islands (
        id TEXT PRIMARY KEY,
        number INTEGER NOT NULL UNIQUE,
        name TEXT NOT NULL,
        skillFocus TEXT NOT NULL,
        description TEXT NOT NULL,
        npcName TEXT,
        npcDialogueIntro TEXT,
        npcDialogueSuccess TEXT,
        npcDialogueFail TEXT,
        npcAudioIntro TEXT,
        npcAudioSuccess TEXT,
        npcAudioFail TEXT,
        ingayAudioUrl TEXT,
        ingayDialogue TEXT,
        bgMusicUrl TEXT,
        shardItemName TEXT,
        shardDescription TEXT
      );

      CREATE TABLE IF NOT EXISTS pins (
        id TEXT PRIMARY KEY,
        islandId TEXT NOT NULL REFERENCES islands(id),
        number INTEGER NOT NULL,
        type TEXT NOT NULL,
        sortOrder INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS challenges (
        id TEXT PRIMARY KEY,
        pinId TEXT NOT NULL REFERENCES pins(id),
        audioUrl TEXT NOT NULL,
        audioScript TEXT,
        question TEXT NOT NULL,
        choices TEXT NOT NULL,
        answer TEXT NOT NULL,
        explanation TEXT NOT NULL,
        hint TEXT NOT NULL,
        explanationAudioUrl TEXT,
        sortOrder INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS local_progress (
        pinId TEXT PRIMARY KEY,
        accuracy REAL NOT NULL DEFAULT 0,
        isCompleted INTEGER NOT NULL DEFAULT 0,
        completedAt TEXT,
        needsSync INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS local_badges (
        badgeType TEXT PRIMARY KEY,
        earnedAt TEXT NOT NULL,
        needsSync INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS local_ingay_seen (
        islandId TEXT PRIMARY KEY,
        seenAt TEXT NOT NULL
      );
    `);

    // Seed content from bundled JSON
    await seedContentFromBundle(db);

    await db.execAsync("PRAGMA user_version = 1");
  }

  // Future migrations:
  // if (currentVersion === 1) { ... await db.execAsync("PRAGMA user_version = 2"); }
}

// ---------------------------------------------------------------------------
// Seed from bundled JSON
// ---------------------------------------------------------------------------

async function seedContentFromBundle(db: SQLiteDatabase) {
  // Dynamic import to avoid loading the JSON on every app launch
  const contentData = require("@/assets/data/content.json") as {
    version: number;
    islands: {
      id: string;
      number: number;
      name: string;
      skillFocus: string;
      description: string;
      npcName?: string | null;
      npcDialogueIntro?: string | null;
      npcDialogueSuccess?: string | null;
      npcDialogueFail?: string | null;
      npcAudioIntro?: string | null;
      npcAudioSuccess?: string | null;
      npcAudioFail?: string | null;
      ingayAudioUrl?: string | null;
      ingayDialogue?: string | null;
      bgMusicUrl?: string | null;
      shardItemName?: string | null;
      shardDescription?: string | null;
      pins: {
        id: string;
        number: number;
        type: string;
        sortOrder: number;
        challenges: {
          id: string;
          audioUrl: string;
          audioScript?: string | null;
          question: string;
          choices: Choice[];
          answer: string;
          explanation: string;
          hint: string;
          explanationAudioUrl?: string | null;
          sortOrder: number;
        }[];
      }[];
    }[];
  };

  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const island of contentData.islands) {
      await txn.runAsync(
        `INSERT INTO islands (id, number, name, skillFocus, description,
          npcName, npcDialogueIntro, npcDialogueSuccess, npcDialogueFail,
          npcAudioIntro, npcAudioSuccess, npcAudioFail,
          ingayAudioUrl, ingayDialogue, bgMusicUrl,
          shardItemName, shardDescription)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          island.id,
          island.number,
          island.name,
          island.skillFocus,
          island.description,
          island.npcName ?? null,
          island.npcDialogueIntro ?? null,
          island.npcDialogueSuccess ?? null,
          island.npcDialogueFail ?? null,
          island.npcAudioIntro ?? null,
          island.npcAudioSuccess ?? null,
          island.npcAudioFail ?? null,
          island.ingayAudioUrl ?? null,
          island.ingayDialogue ?? null,
          island.bgMusicUrl ?? null,
          island.shardItemName ?? null,
          island.shardDescription ?? null,
        ]
      );

      for (const pin of island.pins) {
        await txn.runAsync(
          `INSERT INTO pins (id, islandId, number, type, sortOrder)
           VALUES (?, ?, ?, ?, ?)`,
          [pin.id, island.id, pin.number, pin.type, pin.sortOrder]
        );

        for (const challenge of pin.challenges) {
          await txn.runAsync(
            `INSERT INTO challenges (id, pinId, audioUrl, audioScript, question,
              choices, answer, explanation, hint, explanationAudioUrl, sortOrder)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              challenge.id,
              pin.id,
              challenge.audioUrl,
              challenge.audioScript ?? null,
              challenge.question,
              JSON.stringify(challenge.choices),
              challenge.answer,
              challenge.explanation,
              challenge.hint,
              challenge.explanationAudioUrl ?? null,
              challenge.sortOrder,
            ]
          );
        }
      }
    }
  });
}

// ---------------------------------------------------------------------------
// READ: Islands with pins, challenges, and local progress
// (mirrors GET /api/islands response shape)
// ---------------------------------------------------------------------------

export async function getIslandsLocal(
  db: SQLiteDatabase
): Promise<IslandWithPins[]> {
  const islands = await db.getAllAsync<IslandRow>(
    "SELECT * FROM islands ORDER BY number ASC"
  );
  const pins = await db.getAllAsync<PinRow>(
    "SELECT * FROM pins ORDER BY sortOrder ASC"
  );
  const challenges = await db.getAllAsync<ChallengeRow>(
    "SELECT * FROM challenges ORDER BY sortOrder ASC"
  );
  const progress = await db.getAllAsync<ProgressRow>(
    "SELECT * FROM local_progress WHERE isCompleted = 1"
  );

  const completedPinIds = new Set(
    progress.filter((p) => p.isCompleted).map((p) => p.pinId)
  );
  const accuracyMap = new Map(progress.map((p) => [p.pinId, p.accuracy]));

  // Group pins by island
  const pinsByIsland = new Map<string, PinRow[]>();
  for (const pin of pins) {
    const list = pinsByIsland.get(pin.islandId) ?? [];
    list.push(pin);
    pinsByIsland.set(pin.islandId, list);
  }

  // Group challenges by pin
  const challengesByPin = new Map<string, ChallengeRow[]>();
  for (const ch of challenges) {
    const list = challengesByPin.get(ch.pinId) ?? [];
    list.push(ch);
    challengesByPin.set(ch.pinId, list);
  }

  return islands.map((island, idx) => {
    const islandPins = pinsByIsland.get(island.id) ?? [];

    // Island unlock logic (mirrors backend/app/api/islands/route.ts:38-52)
    const isLocked =
      idx === 0
        ? false
        : !islands.slice(0, idx).every((prev) => {
            const prevPins = pinsByIsland.get(prev.id) ?? [];
            if (!prevPins.every((p) => completedPinIds.has(p.id))) return false;
            if (prevPins.length === 0) return true;
            const avg =
              prevPins.reduce(
                (sum, p) => sum + (accuracyMap.get(p.id) ?? 0),
                0
              ) / prevPins.length;
            return avg >= ISLAND_PASS_THRESHOLD;
          });

    // Cumulative accuracy for this island
    const completedIslandPins = islandPins.filter((p) =>
      completedPinIds.has(p.id)
    );
    const allPinsCompleted = completedIslandPins.length === islandPins.length;
    const cumulativeAccuracy =
      completedIslandPins.length > 0
        ? Math.round(
            completedIslandPins.reduce(
              (sum, p) => sum + (accuracyMap.get(p.id) ?? 0),
              0
            ) / completedIslandPins.length
          )
        : null;
    const islandPassed =
      allPinsCompleted &&
      (cumulativeAccuracy ?? 0) >= ISLAND_PASS_THRESHOLD;

    return {
      id: island.id,
      number: island.number,
      name: island.name,
      skillFocus: island.skillFocus,
      description: island.description,
      isLocked,
      npcName: island.npcName ?? undefined,
      npcDialogueIntro: island.npcDialogueIntro ?? undefined,
      npcDialogueSuccess: island.npcDialogueSuccess ?? undefined,
      npcDialogueFail: island.npcDialogueFail ?? undefined,
      npcAudioIntro: island.npcAudioIntro ?? undefined,
      npcAudioSuccess: island.npcAudioSuccess ?? undefined,
      npcAudioFail: island.npcAudioFail ?? undefined,
      ingayAudioUrl: island.ingayAudioUrl ?? undefined,
      bgMusicUrl: island.bgMusicUrl,
      shardItemName: island.shardItemName ?? undefined,
      shardDescription: island.shardDescription ?? undefined,
      cumulativeAccuracy,
      allPinsCompleted,
      islandPassed,
      pins: islandPins.map((pin) => ({
        id: pin.id,
        islandId: pin.islandId,
        number: pin.number,
        type: pin.type as "CHALLENGE" | "CHECKPOINT",
        sortOrder: pin.sortOrder,
        isCompleted: completedPinIds.has(pin.id),
        accuracy: accuracyMap.get(pin.id) ?? null,
        challenges: (challengesByPin.get(pin.id) ?? []).map(parseChallenge),
      })),
    } as IslandWithPins;
  });
}

// ---------------------------------------------------------------------------
// READ: Single island with full data
// (mirrors GET /api/islands/[id] response shape)
// ---------------------------------------------------------------------------

export async function getIslandLocal(
  db: SQLiteDatabase,
  islandId: string
): Promise<
  IslandWithPins & {
    allPinsCompleted: boolean;
    cumulativeAccuracy: number | null;
    islandPassed: boolean;
    ingaySeen: boolean;
    isDevUser: boolean;
  }
> {
  const island = await db.getFirstAsync<IslandRow>(
    "SELECT * FROM islands WHERE id = ?",
    [islandId]
  );
  if (!island) throw new Error("Island not found.");

  const pins = await db.getAllAsync<PinRow>(
    "SELECT * FROM pins WHERE islandId = ? ORDER BY sortOrder ASC",
    [islandId]
  );
  const challenges = await db.getAllAsync<ChallengeRow>(
    `SELECT c.* FROM challenges c
     JOIN pins p ON c.pinId = p.id
     WHERE p.islandId = ?
     ORDER BY c.sortOrder ASC`,
    [islandId]
  );
  const progress = await db.getAllAsync<ProgressRow>(
    `SELECT lp.* FROM local_progress lp
     JOIN pins p ON lp.pinId = p.id
     WHERE p.islandId = ?`,
    [islandId]
  );

  const progressMap = new Map(progress.map((p) => [p.pinId, p]));
  const challengesByPin = new Map<string, ChallengeRow[]>();
  for (const ch of challenges) {
    const list = challengesByPin.get(ch.pinId) ?? [];
    list.push(ch);
    challengesByPin.set(ch.pinId, list);
  }

  const completedPins = pins.filter(
    (p) => progressMap.get(p.id)?.isCompleted === 1
  );
  const allPinsCompleted = completedPins.length === pins.length;
  const cumulativeAccuracy =
    completedPins.length > 0
      ? Math.round(
          completedPins.reduce(
            (sum, p) => sum + (progressMap.get(p.id)?.accuracy ?? 0),
            0
          ) / completedPins.length
        )
      : null;
  const islandPassed =
    allPinsCompleted && (cumulativeAccuracy ?? 0) >= ISLAND_PASS_THRESHOLD;

  const ingayRow = await db.getFirstAsync(
    "SELECT 1 FROM local_ingay_seen WHERE islandId = ?",
    [islandId]
  );

  return {
    id: island.id,
    number: island.number,
    name: island.name,
    skillFocus: island.skillFocus,
    description: island.description,
    isLocked: false, // If we're viewing it, it's unlocked
    npcName: island.npcName ?? undefined,
    npcDialogueIntro: island.npcDialogueIntro ?? undefined,
    npcDialogueSuccess: island.npcDialogueSuccess ?? undefined,
    npcDialogueFail: island.npcDialogueFail ?? undefined,
    npcAudioIntro: island.npcAudioIntro ?? undefined,
    npcAudioSuccess: island.npcAudioSuccess ?? undefined,
    npcAudioFail: island.npcAudioFail ?? undefined,
    ingayAudioUrl: island.ingayAudioUrl ?? undefined,
    bgMusicUrl: island.bgMusicUrl,
    shardItemName: island.shardItemName ?? undefined,
    shardDescription: island.shardDescription ?? undefined,
    cumulativeAccuracy,
    allPinsCompleted,
    islandPassed,
    ingaySeen: !!ingayRow,
    isDevUser: false,
    pins: pins.map((pin) => {
      const prog = progressMap.get(pin.id);
      return {
        id: pin.id,
        islandId: pin.islandId,
        number: pin.number,
        type: pin.type as "CHALLENGE" | "CHECKPOINT",
        sortOrder: pin.sortOrder,
        isCompleted: prog?.isCompleted === 1,
        accuracy: prog?.accuracy ?? null,
        challenges: (challengesByPin.get(pin.id) ?? []).map(parseChallenge),
      };
    }),
  };
}

// ---------------------------------------------------------------------------
// READ: Single pin with challenges + progress
// (mirrors GET /api/islands/pins/[id] response shape)
// ---------------------------------------------------------------------------

export async function getPinLocal(
  db: SQLiteDatabase,
  pinId: string
): Promise<
  Pin & {
    challenges: Challenge[];
    isCompleted: boolean;
    accuracy: number | null;
    island: {
      number: number;
      name: string;
      skillFocus: string;
      npcDialogueIntro?: string;
      npcDialogueSuccess?: string;
      npcDialogueFail?: string;
      npcAudioIntro?: string;
      npcAudioSuccess?: string;
      npcAudioFail?: string;
      ingayAudioUrl?: string;
      ingayDialogue?: string;
    };
    isDevUser: boolean;
  }
> {
  const pin = await db.getFirstAsync<PinRow>(
    "SELECT * FROM pins WHERE id = ?",
    [pinId]
  );
  if (!pin) throw new Error("Pin not found.");

  const challengeRows = await db.getAllAsync<ChallengeRow>(
    "SELECT * FROM challenges WHERE pinId = ? ORDER BY sortOrder ASC",
    [pinId]
  );
  const progress = await db.getFirstAsync<ProgressRow>(
    "SELECT * FROM local_progress WHERE pinId = ?",
    [pinId]
  );
  const island = await db.getFirstAsync<IslandRow>(
    "SELECT * FROM islands WHERE id = ?",
    [pin.islandId]
  );
  if (!island) throw new Error("Island not found.");

  return {
    id: pin.id,
    islandId: pin.islandId,
    number: pin.number,
    type: pin.type as "CHALLENGE" | "CHECKPOINT",
    sortOrder: pin.sortOrder,
    isCompleted: progress?.isCompleted === 1,
    accuracy: progress?.accuracy ?? null,
    challenges: challengeRows.map(parseChallenge),
    island: {
      number: island.number,
      name: island.name,
      skillFocus: island.skillFocus,
      npcDialogueIntro: island.npcDialogueIntro ?? undefined,
      npcDialogueSuccess: island.npcDialogueSuccess ?? undefined,
      npcDialogueFail: island.npcDialogueFail ?? undefined,
      npcAudioIntro: island.npcAudioIntro ?? undefined,
      npcAudioSuccess: island.npcAudioSuccess ?? undefined,
      npcAudioFail: island.npcAudioFail ?? undefined,
      ingayAudioUrl: island.ingayAudioUrl ?? undefined,
      ingayDialogue: island.ingayDialogue ?? undefined,
    },
    isDevUser: false,
  };
}

// ---------------------------------------------------------------------------
// READ: Progress in IslandProgress[] shape
// (mirrors GET /api/progress response)
// ---------------------------------------------------------------------------

export async function getProgressLocal(
  db: SQLiteDatabase
): Promise<IslandProgress[]> {
  const islands = await db.getAllAsync<{ id: string; number: number }>(
    "SELECT id, number FROM islands ORDER BY number ASC"
  );
  const pins = await db.getAllAsync<{ id: string; islandId: string }>(
    "SELECT id, islandId FROM pins"
  );
  const progress = await db.getAllAsync<{ pinId: string; accuracy: number }>(
    "SELECT pinId, accuracy FROM local_progress WHERE isCompleted = 1"
  );

  const completedPinIds = new Set(progress.map((p) => p.pinId));
  const accuracyMap = new Map(progress.map((p) => [p.pinId, p.accuracy]));

  return islands.map((island, idx) => {
    const islandPins = pins.filter((p) => p.islandId === island.id);

    const isUnlocked =
      idx === 0
        ? true
        : islands.slice(0, idx).every((prev) => {
            const prevPins = pins.filter((p) => p.islandId === prev.id);
            if (!prevPins.every((p) => completedPinIds.has(p.id))) return false;
            if (prevPins.length === 0) return true;
            const avg =
              prevPins.reduce(
                (sum, p) => sum + (accuracyMap.get(p.id) ?? 0),
                0
              ) / prevPins.length;
            return avg >= ISLAND_PASS_THRESHOLD;
          });

    return {
      islandId: island.id,
      completedPins: islandPins.filter((p) => completedPinIds.has(p.id)).length,
      totalPins: islandPins.length,
      isUnlocked,
      isCompleted: islandPins.every((p) => completedPinIds.has(p.id)),
    };
  });
}

// ---------------------------------------------------------------------------
// READ: Badges
// ---------------------------------------------------------------------------

export async function getBadgesLocal(
  db: SQLiteDatabase
): Promise<Badge[]> {
  const rows = await db.getAllAsync<BadgeRow>(
    "SELECT * FROM local_badges ORDER BY earnedAt ASC"
  );
  return rows.map((r) => ({
    id: r.badgeType, // Use badgeType as ID for local badges
    userId: "local",
    badgeType: r.badgeType as BadgeType,
    earnedAt: r.earnedAt,
  }));
}

// ---------------------------------------------------------------------------
// WRITE: Save progress (upsert, keep best score)
// ---------------------------------------------------------------------------

export async function saveProgressLocal(
  db: SQLiteDatabase,
  pinId: string,
  accuracy: number
) {
  const clampedAccuracy = Math.min(Math.max(accuracy, 0), 100);

  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      `INSERT INTO local_progress (pinId, accuracy, isCompleted, completedAt, needsSync)
       VALUES (?, ?, 1, datetime('now'), 1)
       ON CONFLICT(pinId) DO UPDATE SET
         accuracy = MAX(accuracy, excluded.accuracy),
         isCompleted = 1,
         completedAt = datetime('now'),
         needsSync = 1`,
      [pinId, clampedAccuracy]
    );
  });
}

// ---------------------------------------------------------------------------
// WRITE: Mark Ingay as seen
// ---------------------------------------------------------------------------

export async function markIngaySeenLocal(
  db: SQLiteDatabase,
  islandId: string
) {
  await db.runAsync(
    `INSERT OR IGNORE INTO local_ingay_seen (islandId, seenAt) VALUES (?, datetime('now'))`,
    [islandId]
  );
}

// ---------------------------------------------------------------------------
// Sync helpers
// ---------------------------------------------------------------------------

export async function getUnsyncedProgress(db: SQLiteDatabase) {
  return db.getAllAsync<{ pinId: string; accuracy: number }>(
    "SELECT pinId, accuracy FROM local_progress WHERE needsSync = 1"
  );
}

export async function markProgressSynced(
  db: SQLiteDatabase,
  pinIds: string[]
) {
  if (pinIds.length === 0) return;
  const placeholders = pinIds.map(() => "?").join(",");
  await db.runAsync(
    `UPDATE local_progress SET needsSync = 0 WHERE pinId IN (${placeholders})`,
    pinIds
  );
}

export async function mergeServerProgress(
  db: SQLiteDatabase,
  serverItems: { pinId: string; accuracy: number }[]
) {
  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const item of serverItems) {
      await txn.runAsync(
        `INSERT INTO local_progress (pinId, accuracy, isCompleted, completedAt, needsSync)
         VALUES (?, ?, 1, datetime('now'), 0)
         ON CONFLICT(pinId) DO UPDATE SET
           accuracy = MAX(accuracy, excluded.accuracy),
           needsSync = CASE WHEN accuracy < excluded.accuracy THEN 0 ELSE needsSync END`,
        [item.pinId, item.accuracy]
      );
    }
  });
}

export async function mergeServerBadges(
  db: SQLiteDatabase,
  serverBadges: { badgeType: string; earnedAt: string }[]
) {
  for (const badge of serverBadges) {
    await db.runAsync(
      `INSERT OR IGNORE INTO local_badges (badgeType, earnedAt, needsSync) VALUES (?, ?, 0)`,
      [badge.badgeType, badge.earnedAt]
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseChallenge(row: ChallengeRow): Challenge {
  return {
    id: row.id,
    pinId: row.pinId,
    sortOrder: row.sortOrder,
    audioUrl: row.audioUrl,
    audioScript: row.audioScript,
    question: row.question,
    choices: JSON.parse(row.choices) as Choice[],
    answer: row.answer as "A" | "B" | "C" | "D",
    explanation: row.explanation,
    hint: row.hint,
    explanationAudioUrl: row.explanationAudioUrl,
  };
}
