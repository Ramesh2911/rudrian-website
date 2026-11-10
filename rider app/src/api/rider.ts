import { apiGet, apiPost } from './client';
import type {
  Attendance,
  AuthSession,
  CompletePayload,
  NotificationItem,
  ProfileData,
  Runsheet,
  ScanResult,
  SyncAction,
  SyncResultItem,
  Task,
  User,
} from '../types';

export const riderApi = {
  login(identifier: string, password: string): Promise<AuthSession> {
    return apiPost<AuthSession>('/auth/login', { identifier, password }, false);
  },

  me(): Promise<User> {
    return apiGet<User>('/auth/me');
  },

  runsheet(date: string): Promise<Runsheet> {
    return apiGet<Runsheet>(`/rider/runsheet?date=${encodeURIComponent(date)}`);
  },

  scanTask(taskId: string, code: string): Promise<ScanResult> {
    return apiPost<ScanResult>(`/rider/tasks/${encodeURIComponent(taskId)}/scan`, { code });
  },

  completeTask(taskId: string, payload: CompletePayload): Promise<{ task: Task }> {
    return apiPost<{ task: Task }>(`/rider/tasks/${encodeURIComponent(taskId)}/complete`, payload);
  },

  punch(payload: { action: 'IN' | 'OUT'; lat?: number; lng?: number }): Promise<{ attendance: Attendance }> {
    return apiPost<{ attendance: Attendance }>('/rider/punch', payload);
  },

  profile(): Promise<ProfileData> {
    return apiGet<ProfileData>('/rider/profile');
  },

  sync(actions: SyncAction[]): Promise<{ results: SyncResultItem[] }> {
    return apiPost<{ results: SyncResultItem[] }>('/rider/sync', { actions });
  },

  notifications(): Promise<{ items: NotificationItem[] }> {
    return apiGet<{ items: NotificationItem[] }>('/rider/notifications');
  },
};
