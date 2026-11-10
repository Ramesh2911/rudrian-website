import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { notFoundHandler, errorHandler, ApiError } from "./common/errors";
import { env } from "./config/env";
import { checkRedis } from "./config/redis";
import { prisma } from "./config/prisma";
import authRoutes from "./modules/auth/auth.routes";
import usersRoutes from "./modules/users/users.routes";
import locationsRoutes from "./modules/locations/locations.routes";
import shipmentsRoutes from "./modules/shipments/shipments.routes";
import publicRoutes from "./modules/public/public.routes";
import manifestsRoutes from "./modules/manifests/manifests.routes";
import ridersRoutes from "./modules/riders/riders.routes";
import riderRoutes from "./modules/riders/rider.routes";
import ndrRoutes from "./modules/ndr/ndr.routes";
import posRoutes from "./modules/pos/pos.routes";
import ticketsRoutes from "./modules/tickets/tickets.routes";
import hrmsRoutes from "./modules/hrms/hrms.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import notificationsRoutes from "./modules/notifications/notifications.routes";
import rateCardsRoutes from "./modules/pricing/rate-cards.routes";
import { handleRazorpayWebhook } from "./modules/payments/payments.service";

export function createApp(): express.Express {
  const app = express();

  app.set("trust proxy", 1);

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || env.corsOrigins.includes(origin)) callback(null, true);
        else callback(null, false);
      },
      credentials: true,
    }),
  );
  app.use(morgan(env.isProd ? "combined" : "dev"));

  app.post(
    "/api/v1/payments/webhook",
    express.raw({ type: "application/json", limit: "2mb" }),
    async (req, res, next) => {
      try {
        const signature = String(req.headers["x-razorpay-signature"] ?? "");
        const raw = (req.body as Buffer)?.toString("utf8") ?? "";
        const result = await handleRazorpayWebhook(raw, signature);
        res.json({ data: result });
      } catch (err) {
        next(err);
      }
    },
  );

  app.use(express.json({ limit: "8mb" }));
  app.use(express.urlencoded({ extended: true, limit: "8mb" }));

  app.use("/uploads", express.static(env.uploadDir, { maxAge: "1d", fallthrough: true }));

  app.get("/api/v1/health", async (_req, res) => {
    let db = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      db = true;
    } catch {
      db = false;
    }
    const redisOk = await checkRedis();
    res.status(db ? 200 : 503).json({
      data: {
        status: db ? "ok" : "degraded",
        db,
        redis: redisOk,
        uptime: Math.round(process.uptime()),
        env: env.NODE_ENV,
      },
    });
  });

  const apiLimiter = rateLimit({
    windowMs: 60_000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { message: "Too many requests, please try again shortly" } },
  });
  app.use("/api/v1", apiLimiter);

  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/public", publicRoutes);
  app.use("/api/v1/rider", riderRoutes);
  app.use("/api/v1/staff", usersRoutes);
  app.use("/api/v1/locations", locationsRoutes);
  app.use("/api/v1/shipments", shipmentsRoutes);
  app.use("/api/v1/manifests", manifestsRoutes);
  app.use("/api/v1/riders", ridersRoutes);
  app.use("/api/v1/ndr", ndrRoutes);
  app.use("/api/v1/pos", posRoutes);
  app.use("/api/v1/tickets", ticketsRoutes);
  app.use("/api/v1/dashboard", dashboardRoutes);
  app.use("/api/v1/notifications", notificationsRoutes);
  app.use("/api/v1/rate-cards", rateCardsRoutes);
  app.use("/api/v1", hrmsRoutes);

  app.use((_req, _res, next) => next(ApiError.notFound()));
  app.use(errorHandler);

  return app;
}
