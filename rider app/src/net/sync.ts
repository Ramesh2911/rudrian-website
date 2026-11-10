import AsyncStorage from '@react-native-async-storage/async-storage';

import { NetworkError } from '../api/client';
import { riderApi } from '../api/rider';
import { logger } from '../logger';
import { getPendingCount, getPendingOutbox, markOutboxSynced } from '../storage/db';
import { isNetworkUp } from './useOnline';
import type { SyncAction } from '../types';

const LAST_SYNCED_KEY = 'sl_last_synced_at';
const MAX_BACKOFF_MS = 5 * 60 * 1000;
const BASE_BACKOFF_MS = 5 * 1000;

export interface SyncSummary {
  attempted: number;
  synced: number;
  failed: number;
  pending: number;
  skipped: boolean;
}

let inflight: Promise<SyncSummary> | null = null;
let backoffMs = 0;
let nextAttemptAt = 0;

export async function getPendingOutboxCount(): Promise<number> {
  try {
    return await getPendingCount();
  } catch {
    return 0;
  }
}

export async function getLastSyncedAt(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_SYNCED_KEY);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

async function setLastSyncedAt(value: number): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_SYNCED_KEY, String(value));
  } catch {
    // Best effort.
  }
}

function summarize(attempted: number, synced: number, skipped: boolean): SyncSummary {
  return {
    attempted,
    synced,
    failed: Math.max(attempted - synced, 0),
    pending: Math.max(attempted - synced, 0),
    skipped,
  };
}

async function runSync(force: boolean): Promise<SyncSummary> {
  const rows = await getPendingOutbox();
  if (rows.length === 0) {
    return { attempted: 0, synced: 0, failed: 0, pending: 0, skipped: false };
  }

  if (!force && Date.now() < nextAttemptAt) {
    return summarize(rows.length, 0, true);
  }

  const online = await isNetworkUp();
  if (!online) {
    return summarize(rows.length, 0, true);
  }

  const actions: SyncAction[] = rows.map((row) => {
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(row.payload) as Record<string, unknown>;
    } catch {
      payload = {};
    }
    return {
      localId: row.id,
      type: row.type as SyncAction['type'],
      taskId: row.taskId ?? undefined,
      payload,
      createdAt: row.createdAt,
    };
  });

  try {
    const { results } = await riderApi.sync(actions);
    const syncedIds = results
      .filter((result) => result.status === 'SYNCED')
      .map((result) => result.localId);

    await markOutboxSynced(syncedIds);
    const remaining = await getPendingCount();

    backoffMs = 0;
    nextAttemptAt = 0;
    await setLastSyncedAt(Date.now());

    return {
      attempted: actions.length,
      synced: syncedIds.length,
      failed: Math.max(actions.length - syncedIds.length, 0),
      pending: remaining,
      skipped: false,
    };
  } catch (error) {
    if (!(error instanceof NetworkError)) {
      logger.warn('sync failed', error);
    }
    backoffMs = backoffMs === 0 ? BASE_BACKOFF_MS : Math.min(backoffMs * 2, MAX_BACKOFF_MS);
    nextAttemptAt = Date.now() + backoffMs;
    return summarize(actions.length, 0, false);
  }
}

export function syncOutbox(options: { force?: boolean } = {}): Promise<SyncSummary> {
  if (inflight) return inflight;
  inflight = runSync(options.force ?? false).finally(() => {
    inflight = null;
  });
  return inflight;
}
