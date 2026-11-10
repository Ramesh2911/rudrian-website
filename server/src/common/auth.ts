import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import type { Role } from "../generated/prisma/client";
import type { AuthUser } from "../types/express";
import { ApiError } from "./errors";
import { roleHasPermission, type Permission } from "./rbac";

function parseTtl(ttl: string): number {
  const match = /^(\d+)\s*([smhd])$/.exec(ttl.trim());
  if (!match) return 30 * 24 * 60 * 60 * 1000;
  const value = Number(match[1]);
  const unit = match[2];
  const factor = unit === "s" ? 1000 : unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : 86_400_000;
  return value * factor;
}

export function signAccessToken(user: AuthUser): string {
  return jwt.sign({ sub: user.id, name: user.name, role: user.role, locationId: user.locationId }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): { sub: string } {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub: string };
}

export function newRefreshToken() {
  const token = randomBytes(48).toString("hex");
  return { token, hash: createHash("sha256").update(token).digest("hex") };
}

export function refreshTokenTtlMs(): number {
  return parseTtl(env.JWT_REFRESH_TTL);
}

export function hashOtp(code: string): string {
  return createHash("sha256").update(`${code}:${env.JWT_ACCESS_SECRET}`).digest("hex");
}

export function verifyOtpCode(code: string, hash: string): boolean {
  const a = Buffer.from(hashOtp(code));
  const b = Buffer.from(hash);
  return a.length === b.length && timingSafeEqual(a, b);
}

function extractBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractBearer(req);
    if (!token) throw ApiError.unauthorized();
    let payload: { sub: string };
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw ApiError.unauthorized("Session expired, please login again", "TOKEN_EXPIRED");
    }
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, phone: true, email: true, role: true, locationId: true, status: true },
    });
    if (!user || user.status !== "ACTIVE") throw ApiError.unauthorized("Account is inactive or deleted");
    const { status: _status, ...authUser } = user;
    req.user = authUser;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden("Your role cannot access this resource"));
    next();
  };
}

export function requirePermission(permission: Permission) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roleHasPermission(req.user.role, permission)) {
      return next(ApiError.forbidden(`Missing permission: ${permission}`));
    }
    next();
  };
}
