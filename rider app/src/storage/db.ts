import * as SQLite from 'expo-sqlite';

import { logger } from '../logger';
import { uid } from '../utils/format';

const DB_NAME = 'rudrian_rider.db';

export interface OutboxRow {
  id: string;
  type: string;
  taskId: string | null;
  payload: string;
  createdAt: number;
  synced: number;
}

let database: SQLite.SQLiteDatabase | null = null;

function getDatabase(): SQLite.SQLiteDatabase {
  if (!database) {
    database = SQLite.openDatabaseSync(DB_NAME);
    database.execSync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS outbox (
        id TEXT PRIMARY KEY NOT NULL,
        type TEXT NOT NULL,
        taskId TEXT,
        payload TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_outbox_synced ON outbox (synced);
    `);
  }
  return database;
}

export async function insertOutboxItem(input: {
  type: string;
  taskId?: string | null;
  payload: Record<string, unknown>;
}): Promise<OutboxRow> {
  const db = getDatabase();
  const row: OutboxRow = {
    id: uid('ob'),
    type: input.type,
    taskId: input.taskId ?? null,
    payload: JSON.stringify(input.payload),
    createdAt: Date.now(),
    synced: 0,
  };
  await db.runAsync(
    'INSERT INTO outbox (id, type, taskId, payload, createdAt, synced) VALUES (?, ?, ?, ?, ?, ?)',
    [row.id, row.type, row.taskId, row.payload, row.createdAt, row.synced],
  );
  return row;
}

export async function getPendingOutbox(): Promise<OutboxRow[]> {
  const db = getDatabase();
  return db.getAllAsync<OutboxRow>(
    'SELECT * FROM outbox WHERE synced = 0 ORDER BY createdAt ASC',
  );
}

export async function getPendingCount(): Promise<number> {
  const db = getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM outbox WHERE synced = 0',
  );
  return row?.count ?? 0;
}

export async function markOutboxSynced(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = getDatabase();
  const placeholders = ids.map(() => '?').join(', ');
  await db.runAsync(`UPDATE outbox SET synced = 1 WHERE id IN (${placeholders})`, ids);
}

export async function clearSyncedOutbox(): Promise<void> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM outbox WHERE synced = 1');
}

export async function deleteOutboxItem(id: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM outbox WHERE id = ?', [id]);
}

export async function resetOutbox(): Promise<void> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM outbox');
}

export async function outboxHealthCheck(): Promise<void> {
  try {
    getDatabase();
  } catch (error) {
    logger.error('outbox database unavailable', error);
  }
}
