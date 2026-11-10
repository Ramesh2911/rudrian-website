import { Router } from "express";
import { z } from "zod";
import { authenticate, requirePermission } from "../../common/auth";
import { ApiError } from "../../common/errors";
import { param } from "../../common/http";
import { generateManifestNumber } from "../../common/awb";
import { getPagination, optionalString } from "../../common/pagination";
import { created, ok, pageMeta } from "../../common/response";
import { validateBody } from "../../common/validate";
import { prisma } from "../../config/prisma";
import type { Prisma } from "../../generated/prisma/client";
import { emitErp } from "../../sockets";
import {
  getShipmentById,
  serializeShipment,
  serializeShipmentLite,
  shipmentListInclude,
  updateShipmentStatus,
} from "../shipments/shipments.service";

const router = Router();

router.use(authenticate);

const manifestInclude = {
  fromLocation: { select: { id: true, name: true, type: true, city: true } },
  toLocation: { select: { id: true, name: true, type: true, city: true } },
  closedBy: { select: { id: true, name: true } },
} satisfies Prisma.ManifestInclude;

router.get("/", requirePermission("manifests:read"), async (req, res, next) => {
  try {
    const { skip, take, page, limit } = getPagination(req.query, 15);
    const status = optionalString(req.query.status);
    const locationId = optionalString(req.query.locationId);
    const where: Prisma.ManifestWhereInput = {
      ...(status ? { status: status as Prisma.EnumManifestStatusFilter["equals"] } : {}),
      ...(locationId ? { OR: [{ fromLocationId: locationId }, { toLocationId: locationId }] } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.manifest.findMany({ where, include: manifestInclude, orderBy: { createdAt: "desc" }, skip, take }),
      prisma.manifest.count({ where }),
    ]);
    ok(res, { items, meta: pageMeta(page, limit, total) });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/",
  requirePermission("manifests:manage"),
  validateBody(
    z.object({
      fromLocationId: z.string().min(1),
      toLocationId: z.string().min(1),
      vehicleNumber: z.string().max(20).optional(),
      driverName: z.string().max(80).optional(),
      driverPhone: z.string().max(15).optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      const body = req.body as {
        fromLocationId: string;
        toLocationId: string;
        vehicleNumber?: string;
        driverName?: string;
        driverPhone?: string;
      };
      if (body.fromLocationId === body.toLocationId) {
        throw ApiError.badRequest("Source and destination must be different locations");
      }
      const manifest = await prisma.manifest.create({
        data: {
          manifestNumber: await generateManifestNumber(),
          fromLocationId: body.fromLocationId,
          toLocationId: body.toLocationId,
          vehicleNumber: body.vehicleNumber,
          driverName: body.driverName,
          driverPhone: body.driverPhone,
        },
        include: manifestInclude,
      });
      created(res, manifest);
    } catch (err) {
      next(err);
    }
  },
);

router.get("/:id", requirePermission("manifests:read"), async (req, res, next) => {
  try {
    const manifest = await prisma.manifest.findUnique({
      where: { id: param(req, "id") },
      include: {
        ...manifestInclude,
        items: {
          orderBy: { scannedAt: "desc" },
          include: {
            shipment: { include: shipmentListInclude },
          },
        },
      },
    });
    if (!manifest) throw ApiError.notFound("Manifest not found");
    ok(res, {
      ...manifest,
      items: manifest.items.map((item) => ({
        scannedAt: item.scannedAt.toISOString(),
        shipment: serializeShipmentLite(item.shipment),
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/:id/items",
  requirePermission("manifests:manage"),
  validateBody(z.object({ awbNumber: z.string().min(4).max(30) })),
  async (req, res, next) => {
    try {
      const awb = String((req.body as { awbNumber: string }).awbNumber).trim().toUpperCase();
      const manifest = await prisma.manifest.findUnique({ where: { id: param(req, "id") } });
      if (!manifest) throw ApiError.notFound("Manifest not found");
      if (manifest.status !== "OPEN") throw ApiError.unprocessable("Manifest is closed, cannot add parcels");

      const shipment = await getShipmentById(awb);
      if (["DELIVERED", "CANCELLED", "RTS", "RETURNED"].includes(shipment.status)) {
        throw ApiError.unprocessable(`Shipment is ${shipment.status} and cannot be manifested`);
      }
      const inOpenManifest = await prisma.manifestItem.findFirst({
        where: { shipmentId: shipment.id, manifest: { status: { in: ["OPEN", "IN_TRANSIT"] } } },
      });
      if (inOpenManifest && inOpenManifest.manifestId !== manifest.id) {
        throw ApiError.unprocessable("Shipment is already inside another open manifest");
      }

      if (!inOpenManifest) {
        await prisma.manifestItem.create({
          data: { manifestId: manifest.id, shipmentId: shipment.id, scannedById: req.user!.id },
        });
        await prisma.manifest.update({ where: { id: manifest.id }, data: { scannedCount: { increment: 1 } } });
      }

      let updatedShipment = shipment;
      if (shipment.status !== "IN_TRANSIT") {
        updatedShipment = await updateShipmentStatus({
          shipmentId: shipment.id,
          status: "IN_TRANSIT",
          remarks: `Bagged into manifest ${manifest.manifestNumber}`,
          locationId: manifest.fromLocationId,
          actorId: req.user!.id,
          actorLocationId: req.user!.locationId,
        });
      }

      const refreshed = await prisma.manifest.findUnique({ where: { id: manifest.id }, include: manifestInclude });
      emitErp("manifest:scan", { manifestNumber: manifest.manifestNumber, awbNumber: shipment.awbNumber });
      ok(res, { manifest: refreshed, added: serializeShipment(updatedShipment) });
    } catch (err) {
      next(err);
    }
  },
);

router.post("/:id/close", requirePermission("manifests:manage"), async (req, res, next) => {
  try {
    const manifest = await prisma.manifest.findUnique({ where: { id: param(req, "id") } });
    if (!manifest) throw ApiError.notFound("Manifest not found");
    if (manifest.status !== "OPEN") throw ApiError.unprocessable("Only open manifests can be closed");
    if (manifest.scannedCount === 0) throw ApiError.unprocessable("Add at least one parcel before closing");
    const updated = await prisma.manifest.update({
      where: { id: manifest.id },
      data: { status: "CLOSED", closedAt: new Date(), closedById: req.user!.id },
      include: manifestInclude,
    });
    emitErp("manifest:closed", { manifestNumber: updated.manifestNumber });
    ok(res, updated);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/receive", requirePermission("manifests:manage"), async (req, res, next) => {
  try {
    const manifest = await prisma.manifest.findUnique({
      where: { id: param(req, "id") },
      include: { items: { select: { shipmentId: true } } },
    });
    if (!manifest) throw ApiError.notFound("Manifest not found");
    if (manifest.status !== "CLOSED" && manifest.status !== "IN_TRANSIT") {
      throw ApiError.unprocessable("Only dispatched manifests can be received");
    }

    for (const item of manifest.items) {
      try {
        await updateShipmentStatus({
          shipmentId: item.shipmentId,
          status: "IN_TRANSIT",
          remarks: `Received at inbound hub`,
          locationId: manifest.toLocationId,
          actorId: req.user!.id,
          actorLocationId: req.user!.locationId,
        });
      } catch {
        // skip shipments whose state does not allow an inbound scan
      }
    }

    const updated = await prisma.manifest.update({
      where: { id: manifest.id },
      data: { status: "RECEIVED", receivedAt: new Date() },
      include: manifestInclude,
    });
    emitErp("manifest:received", { manifestNumber: updated.manifestNumber });
    ok(res, updated);
  } catch (err) {
    next(err);
  }
});

export default router;
