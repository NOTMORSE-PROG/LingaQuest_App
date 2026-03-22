import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync("linguaquest.db");
    await initSchema(db);
  }
  return db;
}

async function initSchema(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS cached_islands (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      cached_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS local_progress (
      pin_id TEXT PRIMARY KEY,
      is_completed INTEGER NOT NULL DEFAULT 0,
      accuracy INTEGER NOT NULL DEFAULT 0,
      hints_used INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      synced INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS cached_badges (
      badge_type TEXT PRIMARY KEY,
      earned_at TEXT NOT NULL
    );
  `);
}

export async function cacheIslands(islands: unknown[]) {
  const db = await getDb();
  const now = Date.now();
  await db.withTransactionAsync(async () => {
    for (const island of islands as any[]) {
      await db.runAsync(
        "INSERT OR REPLACE INTO cached_islands (id, data, cached_at) VALUES (?, ?, ?)",
        [island.id, JSON.stringify(island), now]
      );
    }
  });
}

export async function getCachedIslands(): Promise<unknown[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ data: string }>("SELECT data FROM cached_islands ORDER BY rowid");
  return rows.map((r) => JSON.parse(r.data));
}

export async function saveLocalProgress(
  pinId: string,
  accuracy: number,
  hintsUsed: number
) {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO local_progress
     (pin_id, is_completed, accuracy, hints_used, completed_at, synced)
     VALUES (?, 1, ?, ?, datetime('now'), 0)`,
    [pinId, accuracy, hintsUsed]
  );
}

export async function getUnsyncedProgress() {
  const db = await getDb();
  return db.getAllAsync<{
    pin_id: string;
    accuracy: number;
    hints_used: number;
    completed_at: string;
  }>("SELECT * FROM local_progress WHERE synced = 0");
}

export async function markProgressSynced(pinIds: string[]) {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const id of pinIds) {
      await db.runAsync("UPDATE local_progress SET synced = 1 WHERE pin_id = ?", [id]);
    }
  });
}
