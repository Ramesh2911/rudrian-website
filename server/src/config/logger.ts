import pino from "pino";
import { env } from "./env";

export const logger = pino({
  level: env.isProd ? "info" : "debug",
  ...(env.isProd
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:HH:MM:ss", ignore: "pid,hostname" },
        },
      }),
});
