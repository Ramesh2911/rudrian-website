import type { Response } from "express";

export function ok(res: Response, data: unknown, status = 200): void {
  res.status(status).json({ data });
}

export function created(res: Response, data: unknown): void {
  ok(res, data, 201);
}

export function pageMeta(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
