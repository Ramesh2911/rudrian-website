import IORedis from "ioredis";
import { env } from "./env";
import { logger } from "./logger";

export const redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy: (times) => Math.min(times * 1000, 10000),
  enableOfflineQueue: true,
});

let loggedOnce = false;

redis.on("error", (err: Error) => {
  if (!loggedOnce) {
    loggedOnce = true;
    logger.warn(`Redis unavailable (${err.message}) - running without cache/queue, will auto-reconnect`);
  }
});

redis.on("ready", () => {
  if (loggedOnce) logger.info("Redis connected");
  loggedOnce = false;
});

export async function checkRedis(): Promise<boolean> {
  try {
    const pong = await redis.ping();
    return pong === "PONG";
  } catch {
    return false;
  }
}
