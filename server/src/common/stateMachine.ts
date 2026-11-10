import type { ShipmentStatus } from "../generated/prisma/client";

export const SHIPMENT_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  BOOKED: ["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "CANCELLED"],
  PICKED_UP: ["IN_TRANSIT", "OUT_FOR_DELIVERY", "NDR", "CANCELLED"],
  IN_TRANSIT: ["IN_TRANSIT", "OUT_FOR_DELIVERY", "NDR", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "NDR"],
  NDR: ["IN_TRANSIT", "OUT_FOR_DELIVERY", "RETURNED", "CANCELLED"],
  DELIVERED: [],
  RETURNED: ["RTS"],
  RTS: [],
  CANCELLED: [],
};

export function canTransition(from: ShipmentStatus, to: ShipmentStatus): boolean {
  if (from === to) return from === "IN_TRANSIT";
  return SHIPMENT_TRANSITIONS[from].includes(to);
}

export const STATUS_LABELS: Record<ShipmentStatus, string> = {
  BOOKED: "Booked",
  PICKED_UP: "Picked Up",
  IN_TRANSIT: "In Transit",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  NDR: "NDR / Exception",
  RETURNED: "Returning to Sender",
  RTS: "Returned to Sender",
  CANCELLED: "Cancelled",
};
