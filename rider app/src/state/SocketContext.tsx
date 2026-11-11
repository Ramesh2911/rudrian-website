import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

import { logger } from '../logger';
import { useAuth } from './AuthContext';

export interface TaskAssignedEvent {
  at: number;
  payload?: Record<string, unknown>;
}

interface SocketContextValue {
  connected: boolean;
  taskEvent: TaskAssignedEvent | null;
  clearTaskEvent: () => void;
}

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL ?? (__DEV__ ? '' : 'https://rudrianlogistics.com');

const SocketContext = createContext<SocketContextValue>({
  connected: false,
  taskEvent: null,
  clearTaskEvent: () => undefined,
});

export function SocketProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [taskEvent, setTaskEvent] = useState<TaskAssignedEvent | null>(null);

  useEffect(() => {
    if (!user?.id || !SOCKET_URL) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      return;
    }

    const socket: Socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('rider:subscribe', { riderId: user.id });
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('connect_error', (error) => {
      logger.debug('socket connect error', error.message);
    });

    socket.on('task:assigned', (payload: Record<string, unknown>) => {
      setTaskEvent({ at: Date.now(), payload });
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [user?.id]);

  const value = useMemo<SocketContextValue>(
    () => ({
      connected,
      taskEvent,
      clearTaskEvent: () => setTaskEvent(null),
    }),
    [connected, taskEvent],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket(): SocketContextValue {
  return useContext(SocketContext);
}
