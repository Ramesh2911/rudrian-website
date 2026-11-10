import type { NavigatorScreenParams } from '@react-navigation/native';

import type { Task } from '../types';

export type AuthStackParamList = {
  Login: undefined;
};

export type TaskDetailParams = {
  taskId: string;
  task?: Task;
  scanned?: boolean;
};

export type ScannerParams = {
  taskId?: string;
};

export type TodayStackParamList = {
  Today: undefined;
  TaskDetail: TaskDetailParams;
  Scanner: ScannerParams | undefined;
};

export type HistoryStackParamList = {
  History: undefined;
  TaskDetail: TaskDetailParams;
  Scanner: ScannerParams | undefined;
};

export type PunchStackParamList = {
  Punch: undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
};

export type MainTabParamList = {
  TodayTab: NavigatorScreenParams<TodayStackParamList>;
  HistoryTab: NavigatorScreenParams<HistoryStackParamList>;
  PunchTab: NavigatorScreenParams<PunchStackParamList>;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};
