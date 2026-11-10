import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function connectErpSocket(token: string): Socket | null {
  try {
    if (socket?.connected) return socket;
    socket?.disconnect();
    const SOCKET_URL =
  (import.meta.env.VITE_SOCKET_URL as string | undefined) ??
  "http://localhost:4000";

socket = io(`${SOCKET_URL}/erp`, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
    });
    return socket;
  } catch {
    return null;
  }
}

export function disconnectErpSocket(): void {
  try {
    socket?.disconnect();
  } catch {
    // ignore
  }
  socket = null;
}
