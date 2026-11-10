import { NetworkError } from '../api/client';
import { riderApi } from '../api/rider';
import { insertOutboxItem } from '../storage/db';
import { setLocalTask } from '../storage/localTasks';
import type { CompletePayload, Coordinates, PunchAction } from '../types';
import { isNetworkUp } from './useOnline';

export type MutationOutcome = 'SYNCED' | 'QUEUED';

export async function submitComplete(
  taskId: string,
  payload: CompletePayload,
  coordinates: Coordinates | null,
): Promise<MutationOutcome> {
  const body: CompletePayload = {
    ...payload,
    lat: coordinates?.lat,
    lng: coordinates?.lng,
  };

  if (await isNetworkUp()) {
    try {
      await riderApi.completeTask(taskId, body);
      await setLocalTask(taskId, {
        status: 'COMPLETED',
        pendingSync: false,
        completedAt: new Date().toISOString(),
      });
      return 'SYNCED';
    } catch (error) {
      if (!(error instanceof NetworkError)) throw error;
    }
  }

  await insertOutboxItem({ type: 'COMPLETE', taskId, payload: { ...body } });
  await setLocalTask(taskId, {
    status: 'COMPLETED',
    pendingSync: true,
    completedAt: new Date().toISOString(),
  });
  return 'QUEUED';
}

export async function submitPunch(
  action: PunchAction,
  coordinates: Coordinates | null,
): Promise<MutationOutcome> {
  const body = { action, lat: coordinates?.lat, lng: coordinates?.lng };

  if (await isNetworkUp()) {
    try {
      await riderApi.punch(body);
      return 'SYNCED';
    } catch (error) {
      if (!(error instanceof NetworkError)) throw error;
    }
  }

  await insertOutboxItem({ type: 'PUNCH', payload: { ...body } });
  return 'QUEUED';
}

export async function submitScan(taskId: string, code: string): Promise<MutationOutcome> {
  if (await isNetworkUp()) {
    try {
      await riderApi.scanTask(taskId, code);
      return 'SYNCED';
    } catch (error) {
      if (!(error instanceof NetworkError)) throw error;
    }
  }

  await insertOutboxItem({ type: 'SCAN', taskId, payload: { code } });
  return 'QUEUED';
}
