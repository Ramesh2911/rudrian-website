import { randomInt } from "node:crypto";
import { ApiError } from "../../common/errors";
import { generateAwb } from "../../common/awb";
import { hashOtp } from "../../common/auth";
import { canTransition, STATUS_LABELS } from "../../common/stateMachine";
import { prisma } from "../../config/prisma";
import type {
  BookingSource,
  LocationType,
  ParcelCategory,
  PaymentMethod,
  Prisma,
  ServiceType,
  Shipment,
  ShipmentStatus,
} from "../../generated/prisma/client";
import { emitErp, emitShipmentUpdate, emitToRider } from "../../sockets";
import { notify, trackingUrl } from "../notifications/dispatch";
import { computeCharges } from "../pricing/pricing.service";

export type PartyInput = {
  name: string;
  phone: string;
  address: string;
  pincode: string;
  city: string;
  state?: string;
};

export type ParcelInput = {
  category: ParcelCategory;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  physicalWeight: number;
  declaredValue?: number;
  codAmount?: number;
};

export type CreateShipmentInput = {
  sender: PartyInput;
  receiver: PartyInput;
  parcel: ParcelInput;
  serviceType: ServiceType;
  paymentMethod: PaymentMethod;
};

export type CreateShipmentOptions = {
  source: BookingSource;
  userId?: string | null;
  locationId?: string | null;
};

const shipmentInclude = {
  originLocation: { select: { id: true, name: true, type: true, city: true, pincode: true } },
  destLocation: { select: { id: true, name: true, type: true, city: true, pincode: true } },
  currentLocation: { select: { id: true, name: true, type: true, city: true, pincode: true } },
  assignedRider: { select: { id: true, name: true, phone: true } },
  history: { orderBy: { createdAt: "asc" as const }, include: { location: { select: { name: true, type: true } } } },
  pod: true,
} satisfies Prisma.ShipmentInclude;

export type ShipmentWithExtras = Prisma.ShipmentGetPayload<{ include: typeof shipmentInclude }>;

function num(value: unknown): number {
  return Number(value ?? 0);
}

function party(shipment: Shipment, side: "sender" | "receiver") {
  if (side === "sender") {
    return {
      name: shipment.senderName,
      phone: shipment.senderPhone,
      address: shipment.senderAddress,
      pincode: shipment.senderPincode,
      city: shipment.senderCity,
      state: shipment.senderState ?? undefined,
    };
  }
  return {
    name: shipment.receiverName,
    phone: shipment.receiverPhone,
    address: shipment.receiverAddress,
    pincode: shipment.receiverPincode,
    city: shipment.receiverCity,
    state: shipment.receiverState ?? undefined,
  };
}

export function serializeShipment(shipment: ShipmentWithExtras) {
  return {
    id: shipment.id,
    awbNumber: shipment.awbNumber,
    status: shipment.status,
    statusLabel: STATUS_LABELS[shipment.status],
    serviceType: shipment.serviceType,
    bookingSource: shipment.bookingSource,
    sender: party(shipment, "sender"),
    receiver: party(shipment, "receiver"),
    parcel: {
      category: shipment.parcelCategory,
      lengthCm: num(shipment.lengthCm),
      widthCm: num(shipment.widthCm),
      heightCm: num(shipment.heightCm),
      physicalWeight: num(shipment.physicalWeight),
      volumetricWeight: num(shipment.volumetricWeight),
      chargeableWeight: num(shipment.chargeableWeight),
      declaredValue: num(shipment.declaredValue),
      codAmount: num(shipment.codAmount),
    },
    charges: {
      baseCharge: num(shipment.baseCharge),
      fuelSurcharge: num(shipment.fuelSurcharge),
      codCharge: num(shipment.codCharge),
      insuranceCharge: num(shipment.insuranceCharge),
      gstAmount: num(shipment.gstAmount),
      total: num(shipment.totalCharge),
    },
    originLocation: shipment.originLocation,
    destLocation: shipment.destLocation,
    currentLocation: shipment.currentLocation,
    rider: shipment.assignedRider,
    timeline: shipment.history.map((h) => ({
      status: h.status,
      statusLabel: STATUS_LABELS[h.status],
      remarks: h.remarks,
      location: h.location?.name ?? null,
      locationType: h.location?.type ?? null,
      at: h.createdAt.toISOString(),
    })),
    pod: shipment.pod
      ? {
          signatureUrl: shipment.pod.signatureUrl,
          photoUrl: shipment.pod.photoUrl,
          recipientName: shipment.pod.recipientName,
          otpVerified: shipment.pod.otpVerified,
          notes: shipment.pod.notes,
          capturedAt: shipment.pod.capturedAt.toISOString(),
        }
      : null,
    hasOtp: Boolean(shipment.otpHash),
    createdAt: shipment.createdAt.toISOString(),
    updatedAt: shipment.updatedAt.toISOString(),
    pickedUpAt: shipment.pickedUpAt?.toISOString() ?? null,
    outForDeliveryAt: shipment.outForDeliveryAt?.toISOString() ?? null,
    deliveredAt: shipment.deliveredAt?.toISOString() ?? null,
  };
}

export async function getShipmentById(id: string): Promise<ShipmentWithExtras> {
  const shipment = await prisma.shipment.findFirst({
    where: { OR: [{ id }, { awbNumber: id.toUpperCase() }] },
    include: shipmentInclude,
  });
  if (!shipment) throw ApiError.notFound("Shipment not found");
  return shipment;
}

export const shipmentListInclude = {
  originLocation: { select: { id: true, name: true, type: true, city: true, pincode: true } },
  destLocation: { select: { id: true, name: true, type: true, city: true, pincode: true } },
  currentLocation: { select: { id: true, name: true, type: true, city: true, pincode: true } },
  assignedRider: { select: { id: true, name: true, phone: true } },
} satisfies Prisma.ShipmentInclude;

export type ShipmentListRow = Prisma.ShipmentGetPayload<{ include: typeof shipmentListInclude }>;

export function serializeShipmentLite(shipment: ShipmentListRow) {
  return {
    id: shipment.id,
    awbNumber: shipment.awbNumber,
    status: shipment.status,
    statusLabel: STATUS_LABELS[shipment.status],
    serviceType: shipment.serviceType,
    bookingSource: shipment.bookingSource,
    receiverName: shipment.receiverName,
    receiverCity: shipment.receiverCity,
    receiverPincode: shipment.receiverPincode,
    senderName: shipment.senderName,
    senderCity: shipment.senderCity,
    destLocation: shipment.destLocation,
    currentLocation: shipment.currentLocation,
    originLocation: shipment.originLocation,
    rider: shipment.assignedRider,
    chargeableWeight: num(shipment.chargeableWeight),
    codAmount: num(shipment.codAmount),
    totalCharge: num(shipment.totalCharge),
    createdAt: shipment.createdAt.toISOString(),
    deliveredAt: shipment.deliveredAt?.toISOString() ?? null,
  };
}

async function pickLocation(pincode: string, preferType: LocationType | undefined, excludeId?: string | null) {
  const base: Prisma.LocationWhereInput = { active: true, ...(excludeId ? { id: { not: excludeId } } : {}) };
  const exact = await prisma.location.findFirst({ where: { ...base, pincode }, orderBy: { createdAt: "asc" } });
  if (exact) return exact;
  if (preferType) {
    const preferred = await prisma.location.findFirst({ where: { ...base, type: preferType }, orderBy: { createdAt: "asc" } });
    if (preferred) return preferred;
  }
  return prisma.location.findFirst({ where: base, orderBy: { createdAt: "asc" } });
}

export async function createShipment(input: CreateShipmentInput, options: CreateShipmentOptions): Promise<ShipmentWithExtras> {
  const charges = await computeCharges({
    serviceType: input.serviceType,
    physicalWeight: input.parcel.physicalWeight,
    lengthCm: input.parcel.lengthCm,
    widthCm: input.parcel.widthCm,
    heightCm: input.parcel.heightCm,
    declaredValue: input.parcel.declaredValue ?? 0,
    codAmount: input.parcel.codAmount ?? 0,
    originPincode: input.sender.pincode,
    destPincode: input.receiver.pincode,
  });

  let origin =
    options.locationId != null
      ? await prisma.location.findFirst({ where: { id: options.locationId, active: true } })
      : null;
  origin ??= await pickLocation(input.sender.pincode, "BRANCH");
  if (!origin) {
    throw ApiError.unprocessable("No branch or hub configured. Please seed locations first.");
  }
  const destination = (await pickLocation(input.receiver.pincode, "HUB", origin.id)) ?? origin;

  const awbNumber = await generateAwb();

  const shipment = await prisma.shipment.create({
    data: {
      awbNumber,
      status: "BOOKED",
      bookingSource: options.source,
      serviceType: input.serviceType,
      senderName: input.sender.name,
      senderPhone: input.sender.phone,
      senderAddress: input.sender.address,
      senderPincode: input.sender.pincode,
      senderCity: input.sender.city,
      senderState: input.sender.state ?? null,
      receiverName: input.receiver.name,
      receiverPhone: input.receiver.phone,
      receiverAddress: input.receiver.address,
      receiverPincode: input.receiver.pincode,
      receiverCity: input.receiver.city,
      receiverState: input.receiver.state ?? null,
      parcelCategory: input.parcel.category,
      lengthCm: input.parcel.lengthCm,
      widthCm: input.parcel.widthCm,
      heightCm: input.parcel.heightCm,
      physicalWeight: input.parcel.physicalWeight,
      volumetricWeight: charges.volumetricWeight,
      chargeableWeight: charges.chargeableWeight,
      declaredValue: input.parcel.declaredValue ?? 0,
      codAmount: input.parcel.codAmount ?? 0,
      baseCharge: charges.baseCharge,
      fuelSurcharge: charges.fuelSurcharge,
      codCharge: charges.codCharge,
      insuranceCharge: charges.insuranceCharge,
      gstAmount: charges.gstAmount,
      totalCharge: charges.total,
      originLocationId: origin.id,
      destLocationId: destination.id,
      currentLocationId: origin.id,
      createdById: options.userId ?? null,
      history: {
        create: {
          status: "BOOKED",
          remarks: `Shipment booked (${options.source.toLowerCase()})`,
          locationId: origin.id,
          actorId: options.userId ?? null,
        },
      },
      payments: {
        create: { method: input.paymentMethod, status: "PENDING", amount: charges.total, currency: "INR" },
      },
    },
    include: shipmentInclude,
  });

  void notify({
    recipient: shipment.senderPhone,
    template: "booking_confirmed",
    shipmentId: shipment.id,
    data: {
      name: shipment.senderName,
      awb: shipment.awbNumber,
      service: shipment.serviceType,
      total: String(charges.total),
      trackingUrl: trackingUrl(shipment.awbNumber),
    },
  }).catch(() => undefined);

  emitShipmentUpdate(shipment.awbNumber, { status: shipment.status, at: new Date().toISOString() });
  emitErp("booking:new", { awbNumber: shipment.awbNumber, dest: shipment.destLocation?.name });

  return shipment;
}

export type UpdateStatusInput = {
  shipmentId: string;
  status: ShipmentStatus;
  remarks?: string;
  locationId?: string;
  actorId: string;
  actorLocationId?: string | null;
  latitude?: number;
  longitude?: number;
};

export async function updateShipmentStatus(input: UpdateStatusInput): Promise<ShipmentWithExtras> {
  const shipment = await getShipmentById(input.shipmentId);
  if (!canTransition(shipment.status, input.status)) {
    throw ApiError.unprocessable(`Invalid status transition: ${shipment.status} → ${input.status}`);
  }

  const now = new Date();
  const locationId = input.locationId ?? input.actorLocationId ?? shipment.currentLocationId ?? undefined;
  const data: Prisma.ShipmentUpdateInput = { status: input.status };
  let freshOtp: string | undefined;

  if (input.status === "PICKED_UP" && !shipment.pickedUpAt) data.pickedUpAt = now;
  if (input.status === "OUT_FOR_DELIVERY") {
    if (!shipment.outForDeliveryAt) data.outForDeliveryAt = now;
    freshOtp = String(randomInt(100000, 999999));
    data.otpHash = hashOtp(freshOtp);
    data.otpExpiresAt = new Date(now.getTime() + 10 * 60 * 1000);
  }
  if (input.status === "DELIVERED" && !shipment.deliveredAt) data.deliveredAt = now;
  if (input.status === "CANCELLED" && !shipment.cancelledAt) data.cancelledAt = now;
  if (locationId) data.currentLocation = { connect: { id: locationId } };

  await prisma.$transaction([
    prisma.shipment.update({ where: { id: shipment.id }, data }),
    prisma.shipmentStatusHistory.create({
      data: {
        shipmentId: shipment.id,
        status: input.status,
        remarks: input.remarks ?? null,
        locationId: locationId ?? null,
        actorId: input.actorId,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
      },
    }),
  ]);

  await afterStatusChange(shipment, input, now, freshOtp);

  const updated = await getShipmentById(shipment.id);
  emitShipmentUpdate(updated.awbNumber, { status: updated.status, at: now.toISOString(), remarks: input.remarks ?? null });
  emitErp("shipment:status", { awbNumber: updated.awbNumber, status: updated.status });
  return updated;
}

async function afterStatusChange(
  shipment: ShipmentWithExtras,
  input: UpdateStatusInput,
  now: Date,
  otp?: string,
): Promise<void> {
  try {
    if (input.status === "OUT_FOR_DELIVERY" && shipment.assignedRiderId) {
      const { todayDate } = await import("../../common/dates");
      await prisma.riderTask.upsert({
        where: { shipmentId_type: { shipmentId: shipment.id, type: "DELIVERY" } },
        update: { status: "PENDING", date: todayDate(), riderId: shipment.assignedRiderId, completedAt: null },
        create: {
          shipmentId: shipment.id,
          riderId: shipment.assignedRiderId,
          type: "DELIVERY",
          status: "PENDING",
          date: todayDate(),
          codAmount: shipment.codAmount,
        },
      });
      emitToRider(shipment.assignedRiderId, "task:assigned", { awbNumber: shipment.awbNumber, type: "DELIVERY" });
      if (otp) {
        void notify({
          recipient: shipment.receiverPhone,
          template: "out_for_delivery",
          shipmentId: shipment.id,
          data: { awb: shipment.awbNumber, otp, trackingUrl: trackingUrl(shipment.awbNumber) },
        });
      }
    } else if (input.status === "OUT_FOR_DELIVERY" && otp) {
      void notify({
        recipient: shipment.receiverPhone,
        template: "out_for_delivery",
        shipmentId: shipment.id,
        data: { awb: shipment.awbNumber, otp, trackingUrl: trackingUrl(shipment.awbNumber) },
      });
    }

    if (input.status === "DELIVERED") {
      await prisma.riderTask.updateMany({
        where: { shipmentId: shipment.id, type: "DELIVERY", status: { not: "COMPLETED" } },
        data: { status: "COMPLETED", completedAt: now },
      });
      if (Number(shipment.codAmount) > 0) {
        const ledgerLocation = input.locationId ?? input.actorLocationId;
        if (ledgerLocation) {
          await prisma.cashLedgerEntry.create({
            data: {
              locationId: ledgerLocation,
              date: now,
              type: "CASH_IN",
              amount: shipment.codAmount,
              description: `COD collected for ${shipment.awbNumber} (${shipment.receiverName})`,
              reference: shipment.awbNumber,
              shipmentId: shipment.id,
              createdById: input.actorId,
            },
          });
        }
      }
      void notify({
        recipient: shipment.senderPhone,
        template: "delivered",
        shipmentId: shipment.id,
        data: { awb: shipment.awbNumber, trackingUrl: trackingUrl(shipment.awbNumber) },
      });
      void notify({
        recipient: shipment.receiverPhone,
        template: "delivered",
        shipmentId: shipment.id,
        data: { awb: shipment.awbNumber, trackingUrl: trackingUrl(shipment.awbNumber) },
      });
    }

    if (input.status === "NDR") {
      void notify({
        recipient: shipment.senderPhone,
        template: "ndr_update",
        shipmentId: shipment.id,
        data: {
          awb: shipment.awbNumber,
          reason: input.remarks ?? "attempt unsuccessful",
          trackingUrl: trackingUrl(shipment.awbNumber),
        },
      });
    }
  } catch (err) {
    // side effects must never break the status update
    void err;
  }
}
