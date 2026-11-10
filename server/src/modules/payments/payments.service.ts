import { createHash } from "node:crypto";
import { ApiError } from "../../common/errors";
import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { prisma } from "../../config/prisma";

export type PaymentOrder = { orderId: string; amount: number; currency: string; keyId: string };

export async function createPaymentOrder(shipment: { id: string; awbNumber: string; totalCharge: unknown }): Promise<PaymentOrder> {
  const amountPaise = Math.round(Number(shipment.totalCharge) * 100);

  if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt: shipment.awbNumber }),
    });
    if (!res.ok) {
      const text = await res.text();
      logger.error({ text }, "razorpay order creation failed");
      throw ApiError.badRequest("Could not start online payment, please try again");
    }
    const order = (await res.json()) as { id: string; amount: number; currency: string };
    await prisma.payment.updateMany({
      where: { shipmentId: shipment.id, method: "RAZORPAY", status: "PENDING" },
      data: { orderId: order.id },
    });
    return { orderId: order.id, amount: order.amount, currency: order.currency, keyId: env.RAZORPAY_KEY_ID };
  }

  const devOrderId = `order_dev_${shipment.awbNumber}`;
  await prisma.payment.updateMany({
    where: { shipmentId: shipment.id, method: "RAZORPAY", status: "PENDING" },
    data: { orderId: devOrderId },
  });
  return { orderId: devOrderId, amount: amountPaise, currency: "INR", keyId: "rzp_test_dev" };
}

export async function verifyPaymentOrder(input: {
  orderId: string;
  paymentId: string;
  signature?: string;
  awbNumber: string;
}): Promise<{ ok: true; awbNumber: string }> {
  const shipment = await prisma.shipment.findUnique({
    where: { awbNumber: input.awbNumber.toUpperCase() },
    select: { id: true, awbNumber: true },
  });
  if (!shipment) throw ApiError.notFound("Shipment not found");

  const payment = await prisma.payment.findFirst({
    where: { shipmentId: shipment.id, method: "RAZORPAY" },
    orderBy: { createdAt: "desc" },
  });
  if (!payment) throw ApiError.notFound("No online payment found for this shipment");
  if (payment.status === "PAID") return { ok: true, awbNumber: shipment.awbNumber };

  const isDevOrder = input.orderId.startsWith("order_dev_");
  if (!isDevOrder) {
    if (!env.RAZORPAY_KEY_SECRET) throw ApiError.unprocessable("Payment gateway is not configured");
    const expected = createHash("sha256").update(`${input.orderId}|${input.paymentId}`).digest("hex");
    if (!input.signature || expected !== input.signature) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
      throw ApiError.unprocessable("Payment signature verification failed");
    }
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "PAID",
      orderId: input.orderId,
      paymentId: input.paymentId,
      signature: input.signature ?? null,
      verifiedAt: new Date(),
    },
  });

  return { ok: true, awbNumber: shipment.awbNumber };
}

export async function handleRazorpayWebhook(rawBody: string, signature: string | undefined): Promise<{ received: true }> {
  if (env.RAZORPAY_WEBHOOK_SECRET) {
    const expected = createHash("sha256").update(rawBody).digest("hex");
    if (!signature || expected !== signature) throw ApiError.unauthorized("Invalid webhook signature");
  }
  try {
    const event = JSON.parse(rawBody) as {
      event?: string;
      payload?: { payment?: { entity?: { order_id?: string; id?: string } } };
    };
    const orderId = event.payload?.payment?.entity?.order_id;
    const paymentId = event.payload?.payment?.entity?.id;
    if (orderId) {
      await prisma.payment.updateMany({
        where: { orderId, status: { in: ["PENDING", "FAILED"] } },
        data: { status: "PAID", paymentId: paymentId ?? null, verifiedAt: new Date() },
      });
    }
    logger.info({ event: event.event }, "razorpay webhook processed");
  } catch (err) {
    logger.warn({ err }, "razorpay webhook parse failed");
  }
  return { received: true };
}
