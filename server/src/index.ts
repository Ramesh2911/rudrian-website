import http from "node:http";
import { mkdir } from "node:fs/promises";
import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { connectDatabase, prisma } from "./config/prisma";
import { redis } from "./config/redis";
import { initJobs } from "./jobs/queues";
import { initSockets } from "./sockets";

async function main(): Promise<void> {
  await mkdir(env.uploadDir, { recursive: true }).catch(() => undefined);
  await connectDatabase();

  const app = createApp();
  const server = http.createServer(app);

  initSockets(server);
  initJobs();

  server.listen(env.PORT, () => {
    logger.info(`SwiftLogix API listening on http://localhost:${env.PORT}`);
    logger.info(`Health check: http://localhost:${env.PORT}/api/v1/health`);
  });

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} received, shutting down...`);
    server.close(() => {
      void prisma.$disconnect().catch(() => undefined);
      void redis.quit().catch(() => undefined);
      setTimeout(() => process.exit(0), 500);
    });
    setTimeout(() => process.exit(0), 5000).unref();
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
