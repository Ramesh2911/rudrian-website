import * as SecureStore from 'expo-secure-store';

import type { AuthSession, User } from '../types';

const ACCESS_TOKEN_KEY = 'sl_access_token';
const REFRESH_TOKEN_KEY = 'sl_refresh_token';
const USER_KEY = 'sl_user';

async function safeGet(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function safeSet(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // Secure store unavailable; session will not persist.
  }
}

async function safeDelete(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Ignore cleanup failures.
  }
}

export async function getAccessToken(): Promise<string | null> {
  return safeGet(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return safeGet(REFRESH_TOKEN_KEY);
}

export async function getStoredUser(): Promise<User | null> {
  const raw = await safeGet(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  await safeSet(ACCESS_TOKEN_KEY, accessToken);
  await safeSet(REFRESH_TOKEN_KEY, refreshToken);
}

export async function saveUser(user: User): Promise<void> {
  await safeSet(USER_KEY, JSON.stringify(user));
}

export async function saveSession(session: AuthSession): Promise<void> {
  await saveTokens(session.accessToken, session.refreshToken);
  await saveUser(session.user);
}

export async function clearTokens(): Promise<void> {
  await safeDelete(ACCESS_TOKEN_KEY);
  await safeDelete(REFRESH_TOKEN_KEY);
  await safeDelete(USER_KEY);
}

export async function clearSession(): Promise<void> {
  await clearTokens();
}
