import { compareSync, hashSync } from "bcryptjs";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { authenticate, newRefreshToken, refreshTokenTtlMs, signAccessToken } from "../../common/auth";
import { ApiError } from "../../common/errors";
import { ok } from "../../common/response";
import { validateBody } from "../../common/validate";
import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { prisma } from "../../config/prisma";
import type { User } from "../../generated/prisma/client";
import { notify } from "../notifications/dispatch";

const router = Router();

const loginSchema = z.object({ identifier: z.string().min(3), password: z.string().min(1) });

const authLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: "Too many attempts, please slow down" } },
});

function publicUser(user: User & { location?: { id: string; name: string; type: string } | null }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    locationId: user.locationId,
    location: user.location ?? null,
  };
}

async function issueSession(user: User, userAgent?: string) {
  const { token: refreshToken, hash } = newRefreshToken();
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + refreshTokenTtlMs()),
      userAgent: userAgent ?? null,
    },
  });
  const full = await prisma.user.findUnique({ where: { id: user.id }, include: { location: true } });
  const authUser = full ?? user;
  return {
    accessToken: signAccessToken({
      id: authUser.id,
      name: authUser.name,
      phone: authUser.phone,
      email: authUser.email,
      role: authUser.role,
      locationId: authUser.locationId,
    }),
    refreshToken,
    user: publicUser(authUser),
  };
}

router.post(
  "/login",
  authLimiter,
  validateBody(z.object({ identifier: z.string().min(3), password: z.string().min(1) })),
  async (req, res, next) => {
    try {
      const { identifier, password } = req.body as z.infer<typeof loginSchema>;
      const id = identifier.trim();
      const user = await prisma.user.findFirst({
        where: { OR: [{ email: id.toLowerCase() }, { email: id }, { phone: id }] },
        include: { location: true },
      });
      if (!user || !compareSync(password, user.passwordHash)) {
        throw ApiError.unauthorized("Invalid credentials");
      }
      if (user.status !== "ACTIVE") throw ApiError.forbidden("Account is inactive");
      const session = await issueSession(user, req.headers["user-agent"]);
      ok(res, session);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/register",
  authLimiter,
  validateBody(
    z.object({
      name: z.string().min(2).max(80),
      phone: z.string().regex(/^\d{10,13}$/, "Enter a valid phone number"),
      email: z.email().optional(),
      password: z.string().min(6, "Password must be at least 6 characters"),
    }),
  ),
  async (req, res, next) => {
    try {
      const { name, phone, email, password } = req.body as {
        name: string;
        phone: string;
        email?: string;
        password: string;
      };
      const normalizedEmail = email?.toLowerCase();
      const existing = await prisma.user.findFirst({
        where: { OR: [{ phone }, ...(normalizedEmail ? [{ email: normalizedEmail }] : [])] },
      });
      if (existing) throw ApiError.conflict("An account with this phone or email already exists");

      const user = await prisma.user.create({
        data: {
          name,
          phone,
          email: normalizedEmail ?? null,
          passwordHash: hashSync(password, 10),
          role: "CUSTOMER",
        },
      });
      void notify({
        recipient: phone,
        template: "welcome",
        userId: user.id,
        data: { name, trackingUrl: `${env.APP_URL}/track` },
      }).catch(() => undefined);

      const session = await issueSession(user, req.headers["user-agent"]);
      ok(res, session, 201);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/refresh",
  validateBody(z.object({ refreshToken: z.string().min(10) })),
  async (req, res, next) => {
    try {
      const { refreshToken } = req.body as { refreshToken: string };
      const { createHash } = await import("node:crypto");
      const hash = createHash("sha256").update(refreshToken).digest("hex");
      const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hash }, include: { user: true } });
      if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
        throw ApiError.unauthorized("Session expired, please login again", "REFRESH_INVALID");
      }
      if (stored.user.status !== "ACTIVE") throw ApiError.forbidden("Account is inactive");

      await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
      const session = await issueSession(stored.user, stored.userAgent ?? undefined);
      ok(res, session);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/logout",
  validateBody(z.object({ refreshToken: z.string().min(10).optional() })),
  async (req, res, next) => {
    try {
      const { refreshToken } = req.body as { refreshToken?: string };
      if (refreshToken) {
        const { createHash } = await import("node:crypto");
        const hash = createHash("sha256").update(refreshToken).digest("hex");
        await prisma.refreshToken
          .updateMany({ where: { tokenHash: hash, revokedAt: null }, data: { revokedAt: new Date() } })
          .catch(() => undefined);
      }
      ok(res, { ok: true });
    } catch (err) {
      next(err);
    }
  },
);

router.get("/me", authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { location: { select: { id: true, name: true, type: true, city: true } } },
    });
    if (!user) throw ApiError.unauthorized("Account not found");
    logger.debug({ userId: user.id }, "me");
    ok(res, publicUser(user));
  } catch (err) {
    next(err);
  }
});

export default router;
