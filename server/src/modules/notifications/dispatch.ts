import type { NotifyChannel } from "../../generated/prisma/client";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { logger } from "../../config/logger";

export type NotifyInput = {
  recipient: string;
  channel?: NotifyChannel;
  template: string;
  data: Record<string, string | number>;
  shipmentId?: string;
  userId?: string;
};

const FALLBACK_TEMPLATES: Record<string, string> = {
  booking_confirmed:
    "SwiftLogix: Hi {{name}}, your shipment {{awb}} is booked ({{service}}). Track: {{trackingUrl}}",
  out_for_delivery:
    "SwiftLogix: Your shipment {{awb}} is out for delivery today. Keep {{otp}} ready for COD/verification. Track: {{trackingUrl}}",
  delivered: "SwiftLogix: Great news! Shipment {{awb}} has been delivered. Thank you for choosing SwiftLogix.",
  ndr_update:
    "SwiftLogix: Delivery attempt for {{awb}} could not be completed ({{reason}}). Our team will retry. Track: {{trackingUrl}}",
  otp_delivery: "SwiftLogix: {{otp}} is your delivery OTP for shipment {{awb}}. Valid for 10 minutes. Do not share it.",
  ticket_update: "SwiftLogix: Ticket {{ticketNumber}} update: {{status}}. {{remarks}}",
  welcome: "SwiftLogix: Welcome {{name}}! Your account is ready. Track shipments anytime: {{trackingUrl}}",
};

function render(text: string, data: Record<string, string | number>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => String(data[key] ?? ""));
}

export async function renderTemplate(input: NotifyInput): Promise<{ title: string; body: string }> {
  let template: { title: string; body: string; active?: boolean } | null = null;
  try {
    template = await prisma.messageTemplate.findUnique({
      where: { code: input.template },
      select: { title: true, body: true, active: true },
    });
    if (template && !template.active) template = null;
  } catch {
    template = null;
  }
  const bodySource = template?.body ?? FALLBACK_TEMPLATES[input.template] ?? `${input.template}: {{data}}`;
  const data = { ...input.data };
  if (!template && !FALLBACK_TEMPLATES[input.template]) data.data = JSON.stringify(input.data);
  return { title: render(template?.title ?? "SwiftLogix", data), body: render(bodySource, data) };
}

async function sendWhatsApp(to: string, title: string, body: string): Promise<string | null> {
  if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) return null;
  const url = `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: `${title}\n${body}` },
    }),
  });
  const json = (await res.json().catch(() => ({}))) as { messages?: { id?: string }[] };
  if (!res.ok) throw new Error(`WhatsApp API error: ${res.status}`);
  return json.messages?.[0]?.id ?? null;
}

async function sendSms(to: string, body: string): Promise<string | null> {
  if (!env.MSG91_AUTH_KEY) return null;
  const res = await fetch("https://control.msg91.com/api/v5/flow/", {
    method: "POST",
    headers: { authkey: env.MSG91_AUTH_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      template_id: env.MSG91_TEMPLATE_ID || undefined,
      recipients: [{ mobiles: to, VAR1: body }],
      sender: env.MSG91_SENDER_ID || "SWFTLGX",
      short_url: "1",
    }),
  });
  if (!res.ok) throw new Error(`MSG91 API error: ${res.status}`);
  const json = (await res.json().catch(() => ({}))) as { message?: string };
  return json.message ?? "accepted";
}

export async function deliverNotification(payload: {
  logId: string;
  channel: NotifyChannel;
  recipient: string;
  title: string;
  body: string;
}): Promise<void> {
  const { logId, channel, recipient, title, body } = payload;
  try {
    let providerRef: string | null = null;
    if (channel === "WHATSAPP") providerRef = await sendWhatsApp(recipient, title, body);
    else providerRef = await sendSms(recipient, body);

    const devMode = providerRef === null;
    if (devMode) logger.info({ recipient, channel }, `[DEV ${channel}] ${title} | ${body}`);

    await prisma.notificationLog.update({
      where: { id: logId },
      data: {
        status: "SENT",
        sentAt: new Date(),
        providerRef: providerRef ?? (devMode ? "dev-mode" : undefined),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "send failed";
    await prisma.notificationLog
      .update({ where: { id: logId }, data: { status: "FAILED", error: message } })
      .catch(() => undefined);
    throw err;
  }
}

export async function notify(input: NotifyInput): Promise<void> {
  const channel: NotifyChannel = input.channel ?? "WHATSAPP";
  try {
    const rendered = await renderTemplate(input);
    const log = await prisma.notificationLog.create({
      data: {
        channel,
        recipient: input.recipient,
        template: input.template,
        title: rendered.title,
        body: rendered.body,
        status: "QUEUED",
        shipmentId: input.shipmentId,
        userId: input.userId,
      },
    });
    const { notifyQueue } = await import("../../jobs/queues");
    if (notifyQueue) {
      try {
        await notifyQueue.add(
          "send",
          { logId: log.id },
          { attempts: 3, backoff: { type: "exponential", delay: 4000 }, removeOnComplete: true, removeOnFail: 1000 },
        );
        return;
      } catch {
        // fall through to inline delivery when Redis queue is unavailable
      }
    }
    await deliverNotification({ logId: log.id, channel, recipient: input.recipient, title: rendered.title, body: rendered.body });
  } catch (err) {
    logger.warn({ err, template: input.template }, "notification dispatch failed");
  }
}

export function trackingUrl(awb: string): string {
  return `${env.APP_URL}/track/${awb}`;
}
