import { Router } from "express";
import { z } from "zod";
import { authenticate, requireRole } from "../../common/auth";
import { param } from "../../common/http";
import { ok } from "../../common/response";
import { validateBody } from "../../common/validate";
import { prisma } from "../../config/prisma";
import { getRiderProfile, getRunsheet, punch, scanTask, completeTask, syncActions } from "./rider.service";

const router = Router();

router.use(authenticate, requireRole("RIDER"));

router.get("/runsheet", async (req, res, next) => {
  try {
    const runsheet = await getRunsheet(req.user!.id, typeof req.query.date === "string" ? req.query.date : undefined);
    ok(res, runsheet);
  } catch (err) {
    next(err);
  }
});

router.post(
  "/tasks/:taskId/scan",
  validateBody(z.object({ code: z.string().min(4).max(40) })),
  async (req, res, next) => {
    try {
      const result = await scanTask(req.user!.id, param(req, "taskId"), (req.body as { code: string }).code);
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/tasks/:taskId/complete",
  validateBody(
    z.object({
      otp: z.string().max(10).optional(),
      signatureUrl: z.string().max(4_000_000).optional(),
      photoUrl: z.string().max(4_000_000).optional(),
      notes: z.string().max(500).optional(),
      lat: z.number().optional(),
      lng: z.number().optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      const result = await completeTask(req.user!.id, param(req, "taskId"), req.body);
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/punch",
  validateBody(
    z.object({
      action: z.enum(["IN", "OUT"]),
      lat: z.number().optional(),
      lng: z.number().optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      const body = req.body as { action: "IN" | "OUT"; lat?: number; lng?: number };
      const attendance = await punch(req.user!.id, body.action, body.lat, body.lng);
      ok(res, attendance);
    } catch (err) {
      next(err);
    }
  },
);

router.get("/profile", async (req, res, next) => {
  try {
    ok(res, await getRiderProfile(req.user!.id));
  } catch (err) {
    next(err);
  }
});

router.post(
  "/sync",
  validateBody(
    z.object({
      actions: z
        .array(
          z.object({
            localId: z.string().min(1),
            type: z.enum(["COMPLETE", "PUNCH", "SCAN"]),
            taskId: z.string().optional(),
            payload: z.record(z.string(), z.unknown()).optional(),
            createdAt: z.string().optional(),
          }),
        )
        .max(100),
    }),
  ),
  async (req, res, next) => {
    try {
      const { actions } = req.body as { actions: Parameters<typeof syncActions>[1] };
      ok(res, await syncActions(req.user!.id, actions));
    } catch (err) {
      next(err);
    }
  },
);

router.get("/notifications", async (req, res, next) => {
  try {
    const items = await prisma.notificationLog.findMany({
      where: { recipient: req.user!.phone },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: { id: true, title: true, body: true, status: true, createdAt: true },
    });
    ok(res, { items });
  } catch (err) {
    next(err);
  }
});

export default router;
