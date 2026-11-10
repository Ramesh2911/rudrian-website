import AsyncStorage from '@react-native-async-storage/async-storage';

import type { LocalTaskState, Task } from '../types';

const KEY = 'sl_local_tasks';

let cache: Record<string, LocalTaskState> | null = null;
let loadPromise: Promise<Record<string, LocalTaskState>> | null = null;

async function readStore(): Promise<Record<string, LocalTaskState>> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, LocalTaskState>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeStore(next: Record<string, LocalTaskState>): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Best effort persistence only.
  }
}

export async function loadLocalTasks(): Promise<void> {
  if (cache) return;
  if (!loadPromise) {
    loadPromise = readStore().then((store) => {
      cache = store;
      return store;
    });
  }
  await loadPromise;
}

async function ensureLoaded(): Promise<Record<string, LocalTaskState>> {
  await loadLocalTasks();
  return cache ?? {};
}

export async function setLocalTask(
  taskId: string,
  patch: Partial<LocalTaskState> & Pick<LocalTaskState, 'status'>,
): Promise<void> {
  const store = await ensureLoaded();
  const next: Record<string, LocalTaskState> = {
    ...store,
    [taskId]: { ...store[taskId], ...patch } as LocalTaskState,
  };
  cache = next;
  await writeStore(next);
}

export function mergeTask(task: Task): Task {
  const local = cache?.[task.id];
  if (!local) return task;
  return { ...task, status: local.status };
}

export function mergeTasks(tasks: Task[]): Task[] {
  return tasks.map((task) => mergeTask(task));
}

export function getLocalTaskState(taskId: string): LocalTaskState | null {
  return cache?.[taskId] ?? null;
}

export async function clearLocalTasks(): Promise<void> {
  cache = {};
  loadPromise = null;
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // Best effort cleanup.
  }
}
