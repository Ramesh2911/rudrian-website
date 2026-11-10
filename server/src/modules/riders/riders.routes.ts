import { Router } from "express";
import { z } from "zod";
import { authenticate, requirePermission } from "../../common/auth";
import { ApiError } from "../../common/errors";
import { param } from "../../common/http";
import { optionalString } from "../../common/pagination";
import { ok } from "../../common/response";
import { validateBody } from "../../common/validate";
import { parseDateKeyOrToday, todayDate } from "../../common/dates";
import { prisma } from "../../config/prisma";
import { assignShipmentToRider, getRunsheet } from "./rider.service";
import { getShipmentById, serializeShipmentLite, shipmentListInclude } from "../shipments/shipments.service";

const router = Router();

router.use(authenticate);

router.get("/", requirePermission("riders:read"), async (req, res, next) => {
  try {
    const locationId = optionalString(req.query.locationId);
    const riders = await prisma.user.findMany({
      where: { role: "RIDER", status: "ACTIVE", ...(locationId ? { locationId } : {}) },
      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
        location: { select: { id: true, name: true, type: true, city: true } },
        profile: { select: { vehicleType: true, vehicleNumber: true } },
        _count: { select: { riderTasks: true } },
      },
      orderBy: { name: "asc" },
    });

    const date = todayDate();
    const stats = await Promise.all(
      riders.map(async (r) => {
        const [deliveredToday, pendingToday] = await Promise.all([
          prisma.riderTask.count({ where: { riderId: r.id, type: "DELIVERY", status: "COMPLETED", date } }),
          prisma.riderTask.count({ where: { riderId: r.id, date, status: { in: ["PENDING", "IN_PROGRESS"] } } }),
        ]);
        return { deliveredToday, pendingToday };
      }),
    );

    ok(res, {
      items: riders.map((r, i) => ({
        id: r.id,
        name: r.name,
        phone: r.phone,
        status: r.status,
        location: r.location,
        vehicle: r.profile,
        totalTasks: r._count.riderTasks,
        ...stats[i],
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.get("/:id/tasks", requirePermission("riders:read"), async (req, res, next) => {
  try {
    const rider = await prisma.user.findUnique({ where: { id: param(req, "id") }, select: { id: true, role: true } });
    if (!rider || rider.role !== "RIDER") throw ApiError.notFound("Rider not found");
    const runsheet = await getRunsheet(rider.id, optionalString(req.query.date));
    ok(res, runsheet);
  } catch (err) {
    next(err);
  }
});

router.post(
  "/:id/assign",
  requirePermission("riders:manage"),
  validateBody(z.object({ awbNumber: z.string().min(4).max(30) })),
  async (req, res, next) => {
    try {
      const rider = await prisma.user.findUnique({ where: { id: param(req, "id") }, select: { id: true, role: true } });
      if (!rider || rider.role !== "RIDER") throw ApiError.notFound("Rider not found");
      const awb = String((req.body as { awbNumber: string }).awbNumber).trim().toUpperCase();
      const shipment = await getShipmentById(awb);
      const result = await assignShipmentToRider(rider.id, shipment.id);
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/:id/unassign",
  requirePermission("riders:manage"),
  validateBody(z.object({ awbNumber: z.string().min(4).max(30) })),
  async (req, res, next) => {
    try {
      const awb = String((req.body as { awbNumber: string }).awbNumber).trim().toUpperCase();
      const shipment = await getShipmentById(awb);
      await prisma.riderTask.deleteMany({ where: { shipmentId: shipment.id, status: { in: ["PENDING", "IN_PROGRESS"] } } });
      const updated = await prisma.shipment.update({
        where: { id: shipment.id },
        data: { assignedRiderId: null },
        include: shipmentListInclude,
      });
      ok(res, serializeShipmentLite(updated));
    } catch (err) {
      next(err);
    }
  },
);

export default router;
