import { Router } from "express";
import { z } from "zod";
import { authenticate, requirePermission } from "../../common/auth";
import { ApiError } from "../../common/errors";
import { param } from "../../common/http";
import { getPagination, optionalString } from "../../common/pagination";
import { ok, pageMeta } from "../../common/response";
import { validateBody } from "../../common/validate";
import { prisma } from "../../config/prisma";
import type { Prisma, TicketStatus } from "../../generated/prisma/client";
import { notify } from "../notifications/dispatch";

const router = Router();

router.use(authenticate);

router.get("/", requirePermission("tickets:read"), async (req, res, next) => {
  try {
    const { skip, take, page, limit } = getPagination(req.query, 20);
    const status = optionalString(req.query.status);
    const search = optionalString(req.query.search);
    const locationId = optionalString(req.query.locationId);

    const where: Prisma.TicketWhereInput = {
      ...(status ? { status: status as TicketStatus } : {}),
      ...(locationId ? { assignedLocationId: locationId } : {}),
      ...(search
        ? {
            OR: [
              { ticketNumber: { contains: search.toUpperCase() } },
              { subject: { contains: search } },
              { name: { contains: search } },
              { phone: { contains: search } },
              { awbNumber: { contains: search.toUpperCase() } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          assignedLocation: { select: { id: true, name: true, city: true } },
          _count: { select: { comments: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.ticket.count({ where }),
    ]);

    ok(res, {
      items: items.map((t) => ({
        ...t,
        slaRemainingMs: t.slaDueAt ? t.slaDueAt.getTime() - Date.now() : null,
        slaBreached: Boolean(t.slaDueAt && t.slaDueAt.getTime() < Date.now() && t.status !== "RESOLVED" && t.status !== "CLOSED"),
      })),
      meta: pageMeta(page, limit, total),
    });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", requirePermission("tickets:read"), async (req, res, next) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: param(req, "id") },
      include: {
        comments: { orderBy: { createdAt: "asc" } },
        assignedLocation: { select: { id: true, name: true, city: true } },
      },
    });
    if (!ticket) throw ApiError.notFound("Ticket not found");
    ok(res, ticket);
  } catch (err) {
    next(err);
  }
});

router.post(
  "/:id/comment",
  requirePermission("tickets:manage"),
  validateBody(
    z.object({
      message: z.string().min(2).max(2000),
      visibility: z.enum(["PUBLIC", "INTERNAL"]).default("PUBLIC"),
    }),
  ),
  async (req, res, next) => {
    try {
      const body = req.body as { message: string; visibility: "PUBLIC" | "INTERNAL" };
      const ticket = await prisma.ticket.findUnique({ where: { id: param(req, "id") } });
      if (!ticket) throw ApiError.notFound("Ticket not found");
      const comment = await prisma.ticketComment.create({
        data: {
          ticketId: ticket.id,
          authorName: req.user!.name,
          authorRole: req.user!.role,
          visibility: body.visibility,
          message: body.message,
        },
      });
      if (body.visibility === "PUBLIC") {
        void notify({
          recipient: ticket.phone,
          template: "ticket_update",
          data: { ticketNumber: ticket.ticketNumber, status: ticket.status, remarks: body.message.slice(0, 140) },
        }).catch(() => undefined);
      }
      ok(res, comment, 201);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/:id/status",
  requirePermission("tickets:manage"),
  validateBody(z.object({ status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]) })),
  async (req, res, next) => {
    try {
      const body = req.body as { status: TicketStatus };
      const existing = await prisma.ticket.findUnique({ where: { id: param(req, "id") } });
      if (!existing) throw ApiError.notFound("Ticket not found");
      const ticket = await prisma.ticket.update({
        where: { id: existing.id },
        data: {
          status: body.status,
          resolvedAt: body.status === "RESOLVED" || body.status === "CLOSED" ? new Date() : null,
        },
      });
      void notify({
        recipient: ticket.phone,
        template: "ticket_update",
        data: { ticketNumber: ticket.ticketNumber, status: body.status.replace("_", " "), remarks: ticket.subject },
      }).catch(() => undefined);
      ok(res, ticket);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/:id/assign",
  requirePermission("tickets:manage"),
  validateBody(z.object({ locationId: z.string().min(1) })),
  async (req, res, next) => {
    try {
      const body = req.body as { locationId: string };
      const location = await prisma.location.findUnique({ where: { id: body.locationId } });
      if (!location) throw ApiError.notFound("Location not found");
      const ticket = await prisma.ticket.update({ where: { id: param(req, "id") }, data: { assignedLocationId: location.id } });
      ok(res, ticket);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
