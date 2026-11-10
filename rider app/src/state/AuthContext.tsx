import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { setSessionExpiredHandler } from '../api/client';
import { riderApi } from '../api/rider';
import { logger } from '../logger';
import {
  clearSession,
  getAccessToken,
  saveSession,
  saveUser,
} from '../storage/auth';
import { clearLocalTasks, loadLocalTasks } from '../storage/localTasks';
import type { User } from '../types';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  signIn: (identifier: string, password: string) => Promise<User>;
  completeSignIn: (user: User) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const performSignOut = useCallback(async () => {
    await clearSession();
    await clearLocalTasks();
    if (!mounted.current) return;
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      void performSignOut();
    });
    return () => setSessionExpiredHandler(null);
  }, [performSignOut]);

  useEffect(() => {
    void (async () => {
      try {
        await loadLocalTasks();
        const token = await getAccessToken();
        if (!token) {
          if (mounted.current) setStatus('unauthenticated');
          return;
        }
        const me = await riderApi.me();
        await saveUser(me);
        if (!mounted.current) return;
        setUser(me);
        setStatus('authenticated');
      } catch (error) {
        logger.warn('auth bootstrap failed', error);
        await clearSession();
        if (!mounted.current) return;
        setUser(null);
        setStatus('unauthenticated');
      }
    })();
  }, []);

  const signIn = useCallback(async (identifier: string, password: string): Promise<User> => {
    const session = await riderApi.login(identifier, password);
    await saveSession(session);
    return session.user;
  }, []);

  const completeSignIn = useCallback((nextUser: User) => {
    setUser(nextUser);
    setStatus('authenticated');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, signIn, completeSignIn, signOut: performSignOut }),
    [status, user, signIn, completeSignIn, performSignOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
