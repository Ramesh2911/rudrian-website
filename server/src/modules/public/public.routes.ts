import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { ApiError } from "../../common/errors";
import { ok } from "../../common/response";
import { validateBody } from "../../common/validate";
import { prisma } from "../../config/prisma";
import { generateTicketNumber } from "../../common/awb";
import { createPaymentOrder, verifyPaymentOrder } from "../payments/payments.service";
import { quote } from "../pricing/pricing.service";
import { createShipmentSchema, quoteSchema } from "../shipments/shipments.schemas";
import { createShipment, getShipmentById, serializeShipment } from "../shipments/shipments.service";

const router = Router();

const limiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: "Too many requests, please try again shortly" } },
});

router.use(limiter);

router.get("/track/:awb", async (req, res, next) => {
  try {
    const awb = String(req.params.awb ?? "").trim().toUpperCase();
    if (!/^SLX\d{12}$/.test(awb) && !/^[A-Z0-9-]{6,30}$/.test(awb)) throw ApiError.badRequest("Invalid AWB format");
    const shipment = await getShipmentById(awb);
    const payload = serializeShipment(shipment);
    ok(res, {
      ...payload,
      rider: payload.rider ? { name: payload.rider.name } : null,
      estimatedDelivery: shipment.deliveredAt
        ? shipment.deliveredAt.toISOString()
        : new Date(shipment.createdAt.getTime() + 4 * 86_400_000).toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

router.post("/quote", validateBody(quoteSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof quoteSchema>;
    const result = await quote({
      serviceType: body.serviceType,
      physicalWeight: body.weight,
      lengthCm: body.lengthCm,
      widthCm: body.widthCm,
      heightCm: body.heightCm,
      declaredValue: body.declaredValue,
      codAmount: body.codAmount,
      originPincode: body.originPincode,
      destPincode: body.destPincode,
    });
    ok(res, result);
  } catch (err) {
    next(err);
  }
});

router.post("/bookings", validateBody(createShipmentSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof createShipmentSchema>;
    const shipment = await createShipment(body, { source: "PORTAL" });
    let payment: Awaited<ReturnType<typeof createPaymentOrder>> | null = null;
    if (body.paymentMethod === "RAZORPAY") {
      payment = await createPaymentOrder(shipment);
    }
    const serialized = serializeShipment(shipment);
    ok(res, { awbNumber: serialized.awbNumber, shipment: serialized, payment }, 201);
  } catch (err) {
    next(err);
  }
});

router.post(
  "/payments/verify",
  validateBody(
    z.object({
      orderId: z.string().min(3),
      paymentId: z.string().min(3),
      signature: z.string().optional(),
      awbNumber: z.string().min(4),
    }),
  ),
  async (req, res, next) => {
    try {
      const result = await verifyPaymentOrder(req.body);
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/tickets",
  validateBody(
    z.object({
      name: z.string().min(2).max(80),
      phone: z.string().regex(/^\d{10,13}$/, "Enter a valid phone number"),
      email: z.email().optional(),
      category: z.enum(["DELAY", "NON_DELIVERY", "DAMAGED", "ADDRESS_CHANGE", "OTHER"]),
      awbNumber: z.string().max(30).optional(),
      subject: z.string().min(4).max(150),
      message: z.string().min(10).max(2000),
    }),
  ),
  async (req, res, next) => {
    try {
      const body = req.body as {
        name: string;
        phone: string;
        email?: string;
        category: "DELAY" | "NON_DELIVERY" | "DAMAGED" | "ADDRESS_CHANGE" | "OTHER";
        awbNumber?: string;
        subject: string;
        message: string;
      };
      const awb = body.awbNumber?.trim().toUpperCase() || null;
      let assignedLocationId: string | null = null;
      if (awb) {
        const shipment = await prisma.shipment.findUnique({ where: { awbNumber: awb }, select: { destLocationId: true } });
        assignedLocationId = shipment?.destLocationId ?? null;
      }
      const hours = body.category === "NON_DELIVERY" || body.category === "DAMAGED" ? 12 : 24;
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: await generateTicketNumber(),
          name: body.name,
          phone: body.phone,
          email: body.email ?? null,
          category: body.category,
          awbNumber: awb,
          subject: body.subject,
          message: body.message,
          assignedLocationId,
          slaDueAt: new Date(Date.now() + hours * 3_600_000),
          comments: {
            create: { authorName: body.name, authorRole: "CUSTOMER", message: body.message, visibility: "PUBLIC" },
          },
        },
      });
      ok(res, { ticket }, 201);
    } catch (err) {
      next(err);
    }
  },
);

router.get("/tickets/:ticketId", async (req, res, next) => {
  try {
    const phone = String(req.query.phone ?? "").trim();
    if (!phone) throw ApiError.badRequest("phone query parameter is required");
    const ticket = await prisma.ticket.findFirst({
      where: { id: req.params.ticketId, phone },
      include: {
        comments: { orderBy: { createdAt: "asc" }, where: { visibility: "PUBLIC" } },
        assignedLocation: { select: { name: true, city: true } },
      },
    });
    if (!ticket) throw ApiError.notFound("Ticket not found for this phone number");
    ok(res, { ticket });
  } catch (err) {
    next(err);
  }
});

export default router;
