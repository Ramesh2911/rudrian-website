import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { logger } from "../config/logger";

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }

  static badRequest(message = "Bad request", code?: string) {
    return new ApiError(400, message, code);
  }
  static unauthorized(message = "Authentication required", code?: string) {
    return new ApiError(401, message, code);
  }
  static forbidden(message = "You do not have permission to perform this action", code?: string) {
    return new ApiError(403, message, code);
  }
  static notFound(message = "Resource not found", code?: string) {
    return new ApiError(404, message, code);
  }
  static conflict(message = "Resource already exists", code?: string) {
    return new ApiError(409, message, code);
  }
  static unprocessable(message: string, code?: string) {
    return new ApiError(422, message, code);
  }
  static tooMany(message = "Too many requests, please try again shortly") {
    return new ApiError(429, message, "RATE_LIMITED");
  }
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: { message: `Route not found: ${req.method} ${req.originalUrl}` } });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: { message: err.message, code: err.code } });
  }
  if (err instanceof ZodError) {
    const message = err.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
    return res.status(400).json({ error: { message } });
  }
  const anyErr = err as { type?: string; message?: string };
  if (anyErr?.type === "entity.parse.failed") {
    return res.status(400).json({ error: { message: "Invalid JSON body" } });
  }
  logger.error({ err }, "Unhandled error");
  return res.status(500).json({ error: { message: "Internal server error" } });
}
