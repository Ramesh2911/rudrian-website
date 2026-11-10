import { Router } from "express";
import { z } from "zod";
import { authenticate, requirePermission } from "../../common/auth";
import { ApiError } from "../../common/errors";
import { dateKeyToDate, localDateKey, monthBounds } from "../../common/dates";
import { optionalString } from "../../common/pagination";
import { created, ok } from "../../common/response";
import { validateBody } from "../../common/validate";
import { prisma } from "../../config/prisma";
import type { Prisma } from "../../generated/prisma/client";
import { createShipmentSchema } from "../shipments/shipments.schemas";
import { createShipment, getShipmentById, serializeShipment } from "../shipments/shipments.service";

const router = Router();

router.use(authenticate);

function requireLocation(req: { user?: { locationId: string | null }; query: Record<string, unknown> }): string {
  const queryLocation = optionalString(req.query.locationId);
  const locationId = queryLocation ?? req.user?.locationId ?? null;
  if (!locationId) throw ApiError.badRequest("No branch/counter selected for this operation");
  return locationId;
}

router.post(
  "/bookings",
  requirePermission("pos:use"),
  validateBody(createShipmentSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof createShipmentSchema>;
      const locationId = requireLocation(req);
      const shipment = await createShipment(body, {
        source: "COUNTER",
        userId: req.user!.id,
        locationId,
      });

      let ledgerEntry = null;
      if (body.paymentMethod === "CASH" || body.paymentMethod === "UPI_QR") {
        await prisma.payment.updateMany({
          where: { shipmentId: shipment.id },
          data: { status: "PAID", verifiedAt: new Date(), paymentId: `counter_${Date.now()}` },
        });
        ledgerEntry = await prisma.cashLedgerEntry.create({
          data: {
            locationId,
            date: dateKeyToDate(localDateKey()),
            type: "CASH_IN",
            amount: shipment.totalCharge,
            description: `Counter ${body.paymentMethod === "CASH" ? "cash" : "UPI"} booking ${shipment.awbNumber}`,
            reference: shipment.awbNumber,
            shipmentId: shipment.id,
            createdById: req.user!.id,
          },
        });
      }

      created(res, { shipment: serializeShipment(shipment), ledgerEntry });
    } catch (err) {
      next(err);
    }
  },
);

router.get("/ledger", requirePermission("ledger:read"), async (req, res, next) => {
  try {
    const locationId = requireLocation(req);
    const dateKey = optionalString(req.query.date) ?? localDateKey();
    const date = dateKeyToDate(dateKey);

    const entries = await prisma.cashLedgerEntry.findMany({
      where: { locationId, date },
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });

    const cashIn = entries.filter((e) => e.type === "CASH_IN").reduce((sum, e) => sum + Number(e.amount), 0);
    const cashOut = entries.filter((e) => e.type === "CASH_OUT").reduce((sum, e) => sum + Number(e.amount), 0);
    const adjustments = entries.filter((e) => e.type === "ADJUSTMENT").reduce((sum, e) => sum + Number(e.amount), 0);

    const closing = await prisma.dayClosing.findUnique({ where: { locationId_date: { locationId, date } } });

    ok(res, {
      locationId,
      date: dateKey,
      entries: entries.map((e) => ({
        id: e.id,
        type: e.type,
        amount: Number(e.amount),
        description: e.description,
        reference: e.reference,
        by: e.createdBy?.name ?? null,
        at: e.createdAt.toISOString(),
      })),
      totals: { cashIn, cashOut, adjustments, expectedClosing: cashIn - cashOut + adjustments, count: entries.length },
      closing: closing
        ? {
            expectedAmount: Number(closing.expectedAmount),
            closedAmount: Number(closing.closedAmount),
            difference: Number(closing.difference),
            remarks: closing.remarks,
            closedAt: closing.createdAt.toISOString(),
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/closings",
  requirePermission("pos:use"),
  validateBody(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      closedAmount: z.coerce.number().min(0),
      remarks: z.string().max(500).optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      const body = req.body as { date?: string; closedAmount: number; remarks?: string };
      const locationId = requireLocation(req);
      const dateKey = body.date ?? localDateKey();
      const date = dateKeyToDate(dateKey);

      const entries = await prisma.cashLedgerEntry.findMany({ where: { locationId, date } });
      const cashIn = entries.filter((e) => e.type === "CASH_IN").reduce((sum, e) => sum + Number(e.amount), 0);
      const cashOut = entries.filter((e) => e.type === "CASH_OUT").reduce((sum, e) => sum + Number(e.amount), 0);
      const expected = cashIn - cashOut;

      const closing = await prisma.dayClosing.upsert({
        where: { locationId_date: { locationId, date } },
        update: {
          expectedAmount: expected,
          closedAmount: body.closedAmount,
          difference: Math.round((body.closedAmount - expected) * 100) / 100,
          remarks: body.remarks,
          closedById: req.user!.id,
        },
        create: {
          locationId,
          date,
          expectedAmount: expected,
          closedAmount: body.closedAmount,
          difference: Math.round((body.closedAmount - expected) * 100) / 100,
          remarks: body.remarks,
          closedById: req.user!.id,
        },
      });

      ok(res, closing);
    } catch (err) {
      next(err);
    }
  },
);

router.get("/closings", requirePermission("ledger:read"), async (req, res, next) => {
  try {
    const locationId = requireLocation(req);
    const { start, end } = monthBounds(optionalString(req.query.month));
    const items = await prisma.dayClosing.findMany({
      where: { locationId, date: { gte: start, lte: end } },
      include: { closedBy: { select: { name: true } } },
      orderBy: { date: "desc" },
    });
    ok(res, {
      items: items.map((c) => ({
        id: c.id,
        date: c.date.toISOString().slice(0, 10),
        expectedAmount: Number(c.expectedAmount),
        closedAmount: Number(c.closedAmount),
        difference: Number(c.difference),
        remarks: c.remarks,
        closedBy: c.closedBy?.name ?? null,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.get("/search", requirePermission("shipments:read"), async (req, res, next) => {
  try {
    const awb = optionalString(req.query.awb);
    if (!awb) throw ApiError.badRequest("awb is required");
    const shipment = await getShipmentById(awb);
    ok(res, serializeShipment(shipment));
  } catch (err) {
    next(err);
  }
});

export default router;
