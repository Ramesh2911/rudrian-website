import AsyncStorage from '@react-native-async-storage/async-storage';

import { NetworkError } from '../api/client';
import { riderApi } from '../api/rider';
import { logger } from '../logger';
import { mergeTasks } from './localTasks';
import type { Runsheet } from '../types';

const CACHE_PREFIX = 'sl_runsheet_';
const DEFAULT_MAX_AGE_MS = 5 * 60 * 1000;

interface CacheEnvelope {
  savedAt: number;
  runsheet: Runsheet;
}

export interface LoadRunsheetResult {
  runsheet: Runsheet;
  source: 'network' | 'cache';
}

async function readCache(date: string): Promise<Runsheet | null> {
  try {
    const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${date}`);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as CacheEnvelope;
    if (!envelope?.runsheet) return null;
    return {
      date: envelope.runsheet.date ?? date,
      deliveries: mergeTasks(envelope.runsheet.deliveries ?? []),
      pickups: mergeTasks(envelope.runsheet.pickups ?? []),
    };
  } catch {
    return null;
  }
}

async function writeCache(runsheet: Runsheet): Promise<void> {
  try {
    const envelope: CacheEnvelope = { savedAt: Date.now(), runsheet };
    await AsyncStorage.setItem(`${CACHE_PREFIX}${runsheet.date}`, JSON.stringify(envelope));
  } catch {
    // Cache write is best effort.
  }
}

export async function loadRunsheet(
  date: string,
  options: { maxAgeMs?: number } = {},
): Promise<LoadRunsheetResult> {
  const maxAgeMs = options.maxAgeMs ?? DEFAULT_MAX_AGE_MS;
  const cached = await readCache(date);

  try {
    const fresh = await riderApi.runsheet(date);
    const runsheet: Runsheet = {
      date: fresh.date ?? date,
      deliveries: mergeTasks(fresh.deliveries ?? []),
      pickups: mergeTasks(fresh.pickups ?? []),
    };
    await writeCache({ ...fresh, date });
    return { runsheet, source: 'network' };
  } catch (error) {
    if (error instanceof NetworkError && cached) {
      logger.debug('runsheet served from cache for', date);
      return { runsheet: cached, source: 'cache' };
    }
    throw error;
  }
}
