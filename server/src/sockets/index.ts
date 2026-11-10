import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { verifyAccessToken } from "../common/auth";
import type { AuthUser } from "../types/express";

let io: Server | null = null;

export function initSockets(server: HttpServer): Server {
  io = new Server(server, {
    cors: { origin: env.corsOrigins, credentials: true },
    transports: ["websocket", "polling"],
  });

  const subscribeTracking = (socket: import("socket.io").Socket) => {
    socket.on("track:subscribe", (payload: { awb?: string }) => {
      const awb = typeof payload?.awb === "string" ? payload.awb.trim().toUpperCase() : "";
      if (awb) socket.join(`awb:${awb}`);
    });
    socket.on("track:unsubscribe", (payload: { awb?: string }) => {
      const awb = typeof payload?.awb === "string" ? payload.awb.trim().toUpperCase() : "";
      if (awb) socket.leave(`awb:${awb}`);
    });
  };

  io.on("connection", subscribeTracking);
  io.of("/tracking").on("connection", subscribeTracking);

  const erp = io.of("/erp");
  erp.use((socket, next) => {
    try {
      const token = (socket.handshake.auth?.token as string | undefined) ?? "";
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });
  erp.on("connection", async (socket) => {
    const userId = socket.data.userId as string;
    try {
      const { prisma } = await import("../config/prisma");
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, phone: true, email: true, role: true, locationId: true },
      });
      if (!user) throw new Error("unauthorized");
      socket.data.user = user satisfies AuthUser;
      socket.join("global");
      socket.join(`role:${user.role}`);
      if (user.locationId) socket.join(`loc:${user.locationId}`);
    } catch {
      socket.disconnect(true);
    }
  });

  const rider = io.of("/rider");
  rider.use((socket, next) => {
    try {
      const token = (socket.handshake.auth?.token as string | undefined) ?? "";
      const payload = verifyAccessToken(token);
      socket.data.riderId = payload.sub;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });
  rider.on("connection", (socket) => {
    const riderId = socket.data.riderId as string;
    if (riderId) socket.join(`rider:${riderId}`);
  });

  logger.info("Socket.IO initialized");
  return io;
}

export function emitShipmentUpdate(awbNumber: string, payload: Record<string, unknown>): void {
  if (!io) return;
  io.of("/tracking").to(`awb:${awbNumber}`).emit("shipment:update", payload);
  io.of("/erp").to("global").emit("shipment:update", { awbNumber, ...payload });
}

export function emitErp(event: string, payload: Record<string, unknown>): void {
  io?.of("/erp").to("global").emit(event, payload);
}

export function emitToRider(riderId: string, event: string, payload: Record<string, unknown>): void {
  io?.of("/rider").to(`rider:${riderId}`).emit(event, payload);
}
