import { Queue, Worker } from "bullmq";
import type { ConnectionOptions } from "bullmq";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { logger } from "../config/logger";

export let notifyQueue: Queue | null = null;

function redisOptions(): ConnectionOptions {
  const url = new URL(env.REDIS_URL);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    password: url.password ? decodeURIComponent(url.password) : undefined,
    db: url.pathname && url.pathname !== "/" ? Number(url.pathname.slice(1)) : 0,
    maxRetriesPerRequest: null,
    connectTimeout: 5000,
    retryStrategy: (times: number) => Math.min(times * 1000, 10000),
  };
}

async function processSendJob(job: { data: { logId?: string } }): Promise<void> {
  if (!job.data.logId) return;
  const log = await prisma.notificationLog.findUnique({ where: { id: job.data.logId } });
  if (!log) return;
  if (log.status === "SENT" || log.status === "DELIVERED") return;
  const { deliverNotification } = await import("../modules/notifications/dispatch");
  await deliverNotification({
    logId: log.id,
    channel: log.channel,
    recipient: log.recipient,
    title: log.title ?? "SwiftLogix",
    body: log.body,
  });
}

async function markAbsents(): Promise<void> {
  const { todayDate } = await import("../common/dates");
  const today = todayDate();
  const users = await prisma.user.findMany({
    where: { status: "ACTIVE", role: { notIn: ["CUSTOMER"] } },
    select: { id: true },
  });
  for (const user of users) {
    await prisma.attendance.upsert({
      where: { userId_date: { userId: user.id, date: today } },
      update: {},
      create: { userId: user.id, date: today, status: "ABSENT" },
    });
  }
  logger.info({ users: users.length }, "auto-absent marked for staff without punch");
}

export function initJobs(): void {
  try {
    notifyQueue = new Queue("notifications", { connection: redisOptions() });

    const sendWorker = new Worker("notifications", processSendJob, { connection: redisOptions(), concurrency: 5 });
    sendWorker.on("failed", (job, err) => logger.warn({ job: job?.name, err: err.message }, "notify job failed"));
    sendWorker.on("error", (err) => logger.warn({ err: err.message }, "notify worker error"));

    const maintenanceQueue = new Queue("maintenance", { connection: redisOptions() });
    const maintenanceWorker = new Worker(
      "maintenance",
      async (job) => {
        if (job.name === "mark-absent") await markAbsents();
      },
      { connection: redisOptions(), concurrency: 1 },
    );
    maintenanceWorker.on("failed", (job, err) => logger.warn({ job: job?.name, err: err.message }, "maintenance job failed"));

    maintenanceQueue
      .upsertJobScheduler("daily-mark-absent", { pattern: "15 0 * * *" }, { name: "mark-absent", data: {} })
      .catch((err: Error) => logger.warn({ err: err.message }, "could not schedule repeatable job"));

    logger.info("BullMQ workers started (notifications, maintenance)");
  } catch (err) {
    notifyQueue = null;
    logger.warn({ err }, "BullMQ unavailable - notifications will deliver inline");
  }
}
