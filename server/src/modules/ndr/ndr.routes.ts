import { Router } from "express";
import { z } from "zod";
import { authenticate, requirePermission } from "../../common/auth";
import { ApiError } from "../../common/errors";
import { param } from "../../common/http";
import { getPagination } from "../../common/pagination";
import { ok, pageMeta } from "../../common/response";
import { validateBody } from "../../common/validate";
import { prisma } from "../../config/prisma";
import type { Prisma } from "../../generated/prisma/client";
import {
  getShipmentById,
  serializeShipment,
  serializeShipmentLite,
  shipmentListInclude,
  updateShipmentStatus,
} from "../shipments/shipments.service";

const router = Router();

router.use(authenticate);

router.get("/", requirePermission("ndr:manage"), async (req, res, next) => {
  try {
    const { skip, take, page, limit } = getPagination(req.query, 20);
    const where: Prisma.ShipmentWhereInput = { status: { in: ["NDR", "RETURNED", "RTS"] } };
    const [items, total] = await Promise.all([
      prisma.shipment.findMany({
        where,
        include: { ...shipmentListInclude, ndrEvents: { orderBy: { createdAt: "desc" }, take: 1 } },
        orderBy: { updatedAt: "desc" },
        skip,
        take,
      }),
      prisma.shipment.count({ where }),
    ]);
    ok(res, {
      items: items.map((s) => ({
        ...serializeShipmentLite(s),
        lastNdr: s.ndrEvents[0]
          ? { reason: s.ndrEvents[0].reason, remarks: s.ndrEvents[0].remarks, action: s.ndrEvents[0].action, at: s.ndrEvents[0].createdAt.toISOString() }
          : null,
      })),
      meta: pageMeta(page, limit, total),
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/:shipmentId/attempt",
  requirePermission("ndr:manage"),
  validateBody(
    z.object({
      reason: z.enum(["CUSTOMER_UNAVAILABLE", "WRONG_ADDRESS", "RESCHEDULED", "REFUSED", "DAMAGE", "ADDRESS_UNTRACEABLE", "OTHER"]),
      remarks: z.string().max(500).optional(),
      nextAttemptDate: z.string().optional(),
      action: z.enum(["REATTEMPT", "RETURN", "REROUTE"]),
    }),
  ),
  async (req, res, next) => {
    try {
      const body = req.body as {
        reason: "CUSTOMER_UNAVAILABLE" | "WRONG_ADDRESS" | "RESCHEDULED" | "REFUSED" | "DAMAGE" | "ADDRESS_UNTRACEABLE" | "OTHER";
        remarks?: string;
        nextAttemptDate?: string;
        action: "REATTEMPT" | "RETURN" | "REROUTE";
      };
      const shipment = await getShipmentById(param(req, "shipmentId"));

      await prisma.ndrEvent.create({
        data: {
          shipmentId: shipment.id,
          reason: body.reason,
          remarks: body.remarks,
          action: body.action,
          nextAttemptDate: body.nextAttemptDate ? new Date(body.nextAttemptDate) : null,
          handledById: req.user!.id,
        },
      });

      const target =
        body.action === "REATTEMPT"
          ? "OUT_FOR_DELIVERY"
          : body.action === "RETURN"
            ? "RETURNED"
            : "IN_TRANSIT";

      let updated = shipment;
      try {
        updated = await updateShipmentStatus({
          shipmentId: shipment.id,
          status: target,
          remarks: `NDR ${body.action.toLowerCase()}: ${body.reason}${body.remarks ? ` - ${body.remarks}` : ""}`,
          actorId: req.user!.id,
          actorLocationId: req.user!.locationId,
        });
      } catch (err) {
        if (!(err instanceof ApiError)) throw err;
      }

      ok(res, serializeShipment(updated));
    } catch (err) {
      next(err);
    }
  },
);

export default router;
