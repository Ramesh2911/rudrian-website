import { Router } from "express";
import { z } from "zod";
import { authenticate, requirePermission } from "../../common/auth";
import { ApiError } from "../../common/errors";
import { param } from "../../common/http";
import { getPagination, optionalString } from "../../common/pagination";
import { created, ok, pageMeta } from "../../common/response";
import { validateBody } from "../../common/validate";
import { prisma } from "../../config/prisma";
import type { Prisma, ServiceType, ShipmentStatus } from "../../generated/prisma/client";
import { createShipmentSchema } from "./shipments.schemas";
import {
  createShipment,
  getShipmentById,
  serializeShipment,
  serializeShipmentLite,
  shipmentListInclude,
  updateShipmentStatus,
} from "./shipments.service";

const router = Router();

router.use(authenticate);

const STATUSES = [
  "BOOKED",
  "PICKED_UP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "NDR",
  "RETURNED",
  "RTS",
  "CANCELLED",
] as const;

router.get("/", requirePermission("shipments:read"), async (req, res, next) => {
  try {
    const { skip, take, page, limit } = getPagination(req.query, 25);
    const search = optionalString(req.query.search);
    const status = optionalString(req.query.status);
    const serviceType = optionalString(req.query.serviceType);
    const originLocationId = optionalString(req.query.originLocationId);
    const destLocationId = optionalString(req.query.destLocationId);
    const from = optionalString(req.query.from);
    const to = optionalString(req.query.to);
    const phone = optionalString(req.query.phone);

    const where: Prisma.ShipmentWhereInput = {
      ...(search
        ? {
            OR: [
              { awbNumber: { contains: search.toUpperCase() } },
              { receiverName: { contains: search } },
              { senderName: { contains: search } },
            ],
          }
        : {}),
      ...(phone ? { OR: [{ senderPhone: { contains: phone } }, { receiverPhone: { contains: phone } }] } : {}),
      ...(status && (STATUSES as readonly string[]).includes(status) ? { status: status as ShipmentStatus } : {}),
      ...(serviceType ? { serviceType: serviceType as ServiceType } : {}),
      ...(originLocationId ? { originLocationId } : {}),
      ...(destLocationId ? { destLocationId } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.shipment.findMany({
        where,
        include: shipmentListInclude,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.shipment.count({ where }),
    ]);

    ok(res, { items: items.map(serializeShipmentLite), meta: pageMeta(page, limit, total) });
  } catch (err) {
    next(err);
  }
});

router.get("/pods", requirePermission("pods:read"), async (req, res, next) => {
  try {
    const { skip, take, page, limit } = getPagination(req.query, 20);
    const where: Prisma.ShipmentWhereInput = { pod: { isNot: null } };
    const [items, total] = await Promise.all([
      prisma.shipment.findMany({
        where,
        include: { ...shipmentListInclude, pod: true },
        orderBy: { deliveredAt: "desc" },
        skip,
        take,
      }),
      prisma.shipment.count({ where }),
    ]);
    ok(
      res,
      {
        items: items.map((s) => ({
          ...serializeShipmentLite(s),
          pod: s.pod
            ? {
                signatureUrl: s.pod.signatureUrl,
                photoUrl: s.pod.photoUrl,
                recipientName: s.pod.recipientName,
                otpVerified: s.pod.otpVerified,
                capturedAt: s.pod.capturedAt.toISOString(),
              }
            : null,
        })),
        meta: pageMeta(page, limit, total),
      },
    );
  } catch (err) {
    next(err);
  }
});

router.post("/", requirePermission("shipments:create"), validateBody(createShipmentSchema), async (req, res, next) => {
  try {
    const shipment = await createShipment(req.body, {
      source: "ADMIN",
      userId: req.user!.id,
      locationId: req.user!.locationId,
    });
    created(res, serializeShipment(shipment));
  } catch (err) {
    next(err);
  }
});

router.get("/:id", requirePermission("shipments:read"), async (req, res, next) => {
  try {
    const shipment = await getShipmentById(param(req, "id"));
    ok(res, serializeShipment(shipment));
  } catch (err) {
    next(err);
  }
});

router.post(
  "/:id/status",
  requirePermission("shipments:status"),
  validateBody(
    z.object({
      status: z.enum(STATUSES),
      remarks: z.string().max(500).optional(),
      locationId: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      const body = req.body as {
        status: ShipmentStatus;
        remarks?: string;
        locationId?: string;
        latitude?: number;
        longitude?: number;
      };
      const shipment = await updateShipmentStatus({
        shipmentId: param(req, "id"),
        status: body.status,
        remarks: body.remarks,
        locationId: body.locationId,
        actorId: req.user!.id,
        actorLocationId: req.user!.locationId,
        latitude: body.latitude,
        longitude: body.longitude,
      });
      ok(res, serializeShipment(shipment));
    } catch (err) {
      if (err instanceof ApiError) throw err;
      next(err);
    }
  },
);

export default router;
