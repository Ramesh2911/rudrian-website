import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { verifyOtpCode } from "../../common/auth";
import { localDateKey, parseDateKeyOrToday, todayDate } from "../../common/dates";
import { ApiError } from "../../common/errors";
import { env } from "../../config/env";
import { prisma } from "../../config/prisma";
import type { Prisma, TaskType } from "../../generated/prisma/client";
import { canTransition } from "../../common/stateMachine";
import { getShipmentById, serializeShipment, updateShipmentStatus, type ShipmentWithExtras } from "../shipments/shipments.service";

const taskInclude = {
  shipment: {
    include: {
      originLocation: { select: { id: true, name: true, type: true, city: true } },
      destLocation: { select: { id: true, name: true, type: true, city: true } },
      currentLocation: { select: { id: true, name: true, type: true, city: true } },
      assignedRider: { select: { id: true, name: true, phone: true } },
    },
  },
} satisfies Prisma.RiderTaskInclude;

type TaskWithShipment = Prisma.RiderTaskGetPayload<{ include: typeof taskInclude }>;

export function serializeTask(task: TaskWithShipment) {
  const s = task.shipment;
  const customer =
    task.type === "DELIVERY"
      ? { name: s.receiverName, phone: s.receiverPhone, address: s.receiverAddress, pincode: s.receiverPincode, city: s.receiverCity }
      : { name: s.senderName, phone: s.senderPhone, address: s.senderAddress, pincode: s.senderPincode, city: s.senderCity };
  return {
    id: task.id,
    type: task.type,
    status: task.status,
    sequence: task.sequence,
    awbNumber: s.awbNumber,
    shipmentStatus: s.status,
    codAmount: Number(task.codAmount || s.codAmount),
    otpRequired: Boolean(s.otpHash),
    customer,
    package: {
      category: s.parcelCategory,
      physicalWeight: Number(s.physicalWeight),
      volumetricWeight: Number(s.volumetricWeight),
      chargeableWeight: Number(s.chargeableWeight),
    },
    originLocation: s.originLocation,
    destLocation: s.destLocation,
    currentLocation: s.currentLocation,
    notes: task.notes,
    createdAt: task.createdAt.toISOString(),
    completedAt: task.completedAt?.toISOString() ?? null,
  };
}

export async function getRunsheet(riderId: string, dateParam?: string) {
  const { key, date } = parseDateKeyOrToday(dateParam);
  const tasks = await prisma.riderTask.findMany({
    where: { riderId, date },
    include: taskInclude,
    orderBy: [{ sequence: "asc" }, { createdAt: "asc" }],
  });
  return {
    date: key,
    deliveries: tasks.filter((t) => t.type === "DELIVERY").map(serializeTask),
    pickups: tasks.filter((t) => t.type === "PICKUP").map(serializeTask),
    pending: tasks.filter((t) => t.status !== "COMPLETED").length,
    completed: tasks.filter((t) => t.status === "COMPLETED").length,
  };
}

async function getRiderTask(taskId: string, riderId: string): Promise<TaskWithShipment> {
  const task = await prisma.riderTask.findUnique({ where: { id: taskId }, include: taskInclude });
  if (!task || task.riderId !== riderId) throw ApiError.notFound("Task not found in your run-sheet");
  return task;
}

export async function scanTask(riderId: string, taskId: string, codeRaw: string) {
  const task = await getRiderTask(taskId, riderId);
  const code = codeRaw.trim().toUpperCase();
  if (code !== task.shipment.awbNumber) {
    throw ApiError.badRequest(`Barcode ${code} does not match this task (${task.shipment.awbNumber})`);
  }
  let updated = task;
  if (task.status === "PENDING") {
    updated = await prisma.riderTask.update({
      where: { id: task.id },
      data: { status: "IN_PROGRESS", attempts: { increment: 1 } },
      include: taskInclude,
    });
  }
  return {
    task: serializeTask(updated),
    shipment: {
      awbNumber: task.shipment.awbNumber,
      status: task.shipment.status,
      physicalWeight: Number(task.shipment.physicalWeight),
      otpRequired: Boolean(task.shipment.otpHash),
      codAmount: Number(task.shipment.codAmount),
    },
  };
}

async function persistMedia(value: string | undefined, awb: string, kind: string): Promise<string | null> {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const match = /^data:image\/(png|jpe?g|webp);base64,(.+)$/i.exec(value);
  if (!match) return null;
  const ext = match[1].toLowerCase() === "jpg" ? "jpg" : match[1].toLowerCase() === "webp" ? "webp" : "png";
  const dir = path.join(env.uploadDir, "pod");
  await mkdir(dir, { recursive: true });
  const fileName = `${awb}-${kind}-${Date.now()}.${ext}`;
  await writeFile(path.join(dir, fileName), Buffer.from(match[2], "base64"));
  return `/uploads/pod/${fileName}`;
}

export type CompleteTaskPayload = {
  otp?: string;
  signatureUrl?: string;
  photoUrl?: string;
  notes?: string;
  lat?: number;
  lng?: number;
};

export async function completeTask(riderId: string, taskId: string, payload: CompleteTaskPayload) {
  const task = await getRiderTask(taskId, riderId);
  if (task.status === "COMPLETED") throw ApiError.unprocessable("This task is already completed");
  const shipment: ShipmentWithExtras = await getShipmentById(task.shipmentId);

  if (task.type === "DELIVERY") {
    if (shipment.otpHash) {
      if (!payload.otp) throw ApiError.badRequest("Delivery OTP is required");
      if (shipment.otpExpiresAt && shipment.otpExpiresAt.getTime() < Date.now()) {
        throw ApiError.unprocessable("OTP expired, please request a new one");
      }
      if (!verifyOtpCode(payload.otp, shipment.otpHash)) throw ApiError.unprocessable("Incorrect OTP, please try again");
    }

    const signatureUrl = await persistMedia(payload.signatureUrl, shipment.awbNumber, "signature");
    const photoUrl = await persistMedia(payload.photoUrl, shipment.awbNumber, "photo");

    await prisma.pod.upsert({
      where: { shipmentId: shipment.id },
      update: {
        signatureUrl,
        photoUrl,
        recipientName: payload.notes ? shipment.receiverName : shipment.receiverName,
        notes: payload.notes ?? null,
        otpVerified: Boolean(shipment.otpHash),
        latitude: payload.lat ?? null,
        longitude: payload.lng ?? null,
        byRiderId: riderId,
        capturedAt: new Date(),
      },
      create: {
        shipmentId: shipment.id,
        signatureUrl,
        photoUrl,
        recipientName: shipment.receiverName,
        notes: payload.notes ?? null,
        otpVerified: Boolean(shipment.otpHash),
        latitude: payload.lat ?? null,
        longitude: payload.lng ?? null,
        byRiderId: riderId,
      },
    });

    const rider = await prisma.user.findUnique({ where: { id: riderId }, select: { locationId: true } });
    await updateShipmentStatus({
      shipmentId: shipment.id,
      status: "DELIVERED",
      remarks: payload.notes ? `Delivered - ${payload.notes}` : "Delivered with digital POD",
      actorId: riderId,
      actorLocationId: rider?.locationId,
      latitude: payload.lat,
      longitude: payload.lng,
    });
  } else {
    const rider = await prisma.user.findUnique({ where: { id: riderId }, select: { locationId: true } });
    if (canTransition(shipment.status, "PICKED_UP")) {
      await updateShipmentStatus({
        shipmentId: shipment.id,
        status: "PICKED_UP",
        remarks: "First-mile pickup completed by rider",
        actorId: riderId,
        actorLocationId: rider?.locationId,
        latitude: payload.lat,
        longitude: payload.lng,
      });
    }
  }

  const updatedTask = await prisma.riderTask.update({
    where: { id: task.id },
    data: { status: "COMPLETED", completedAt: new Date(), notes: payload.notes ?? task.notes },
    include: taskInclude,
  });

  return { task: serializeTask(updatedTask), shipment: serializeShipment(await getShipmentById(shipment.id)) };
}

export async function punch(riderId: string, action: "IN" | "OUT", lat?: number, lng?: number) {
  const date = todayDate();
  const existing = await prisma.attendance.findUnique({
    where: { userId_date: { userId: riderId, date } },
  });

  if (action === "IN") {
    if (existing?.inTime) return existing;
    if (existing) {
      return prisma.attendance.update({
        where: { id: existing.id },
        data: { inTime: new Date(), status: "PRESENT", source: "MOBILE", inLatitude: lat ?? null, inLongitude: lng ?? null },
      });
    }
    return prisma.attendance.create({
      data: {
        userId: riderId,
        date,
        status: "PRESENT",
        inTime: new Date(),
        source: "MOBILE",
        inLatitude: lat ?? null,
        inLongitude: lng ?? null,
      },
    });
  }

  if (!existing?.inTime) throw ApiError.badRequest("Please punch in before punching out");
  if (existing.outTime) return existing;
  return prisma.attendance.update({
    where: { id: existing.id },
    data: { outTime: new Date(), outLatitude: lat ?? null, outLongitude: lng ?? null },
  });
}

export async function getRiderProfile(riderId: string) {
  const user = await prisma.user.findUnique({
    where: { id: riderId },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      role: true,
      location: { select: { id: true, name: true, type: true, city: true, address: true } },
      profile: { select: { vehicleType: true, vehicleNumber: true } },
    },
  });
  if (!user) throw ApiError.notFound("Rider not found");

  const date = todayDate();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const [attendanceToday, deliveredToday, pickedToday, pendingToday, completedWeek] = await Promise.all([
    prisma.attendance.findUnique({ where: { userId_date: { userId: riderId, date } } }),
    prisma.riderTask.count({ where: { riderId, type: "DELIVERY", status: "COMPLETED", date } }),
    prisma.riderTask.count({ where: { riderId, type: "PICKUP", status: "COMPLETED", date } }),
    prisma.riderTask.count({ where: { riderId, date, status: { in: ["PENDING", "IN_PROGRESS"] } } }),
    prisma.riderTask.count({ where: { riderId, status: "COMPLETED", completedAt: { gte: weekAgo } } }),
  ]);

  return {
    user,
    attendanceToday: attendanceToday
      ? { action: attendanceToday.outTime ? "OUT" : "IN", inTime: attendanceToday.inTime?.toISOString() ?? null, outTime: attendanceToday.outTime?.toISOString() ?? null, status: attendanceToday.status }
      : null,
    stats: { deliveredToday, pickedToday, pendingToday, completedWeek },
  };
}

export type SyncAction = {
  localId: string;
  type: "COMPLETE" | "PUNCH" | "SCAN";
  taskId?: string;
  payload?: Record<string, unknown>;
  createdAt?: string;
};

export async function syncActions(riderId: string, actions: SyncAction[]) {
  const results: { localId: string; status: "SYNCED" | "FAILED"; message?: string }[] = [];
  for (const action of actions.slice(0, 100)) {
    try {
      if (action.type === "COMPLETE" && action.taskId) {
        await completeTask(riderId, action.taskId, (action.payload ?? {}) as CompleteTaskPayload);
      } else if (action.type === "PUNCH") {
        const p = (action.payload ?? {}) as { action?: "IN" | "OUT"; lat?: number; lng?: number };
        await punch(riderId, p.action === "OUT" ? "OUT" : "IN", p.lat, p.lng);
      } else if (action.type === "SCAN" && action.taskId) {
        const p = (action.payload ?? {}) as { code?: string };
        if (p.code) await scanTask(riderId, action.taskId, p.code);
      } else {
        throw ApiError.badRequest("Unknown sync action");
      }
      results.push({ localId: action.localId, status: "SYNCED" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "sync failed";
      results.push({ localId: action.localId, status: "FAILED", message });
    }
  }
  return { results, syncedAt: new Date().toISOString(), date: localDateKey() };
}

export async function assignShipmentToRider(riderId: string, shipmentId: string) {
  const shipment = await getShipmentById(shipmentId);
  if (["DELIVERED", "CANCELLED", "RTS", "RETURNED"].includes(shipment.status)) {
    throw ApiError.unprocessable(`Shipment is ${shipment.status} and cannot be assigned`);
  }
  await prisma.shipment.update({ where: { id: shipment.id }, data: { assignedRiderId: riderId } });

  const type: TaskType = shipment.status === "OUT_FOR_DELIVERY" ? "DELIVERY" : "PICKUP";
  const task = await prisma.riderTask.upsert({
    where: { shipmentId_type: { shipmentId: shipment.id, type } },
    update: { riderId, status: "PENDING", date: todayDate(), completedAt: null },
    create: {
      shipmentId: shipment.id,
      riderId,
      type,
      status: "PENDING",
      date: todayDate(),
      codAmount: shipment.codAmount,
    },
    include: taskInclude,
  });

  const { emitToRider } = await import("../../sockets");
  emitToRider(riderId, "task:assigned", { awbNumber: shipment.awbNumber, type });

  return { task: serializeTask(task), shipment: serializeShipment(shipment) };
}
