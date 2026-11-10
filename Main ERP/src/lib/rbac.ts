import type { Role, ShipmentStatus } from "../api/types";

export const NAV_ROLES: Record<string, Role[]> = {
  staff: ["SUPER_ADMIN"],
  locations: ["SUPER_ADMIN"],
  "rate-cards": ["SUPER_ADMIN", "BRANCH_MANAGER"],
  hrms: ["SUPER_ADMIN", "HR_ADMIN", "BRANCH_MANAGER"],
  pos: ["SUPER_ADMIN", "BRANCH_MANAGER", "HUB_MANAGER", "OPERATIONS", "COUNTER_STAFF"],
  ndr: ["SUPER_ADMIN", "BRANCH_MANAGER", "HUB_MANAGER", "OPERATIONS", "COUNTER_STAFF"],
  manifests: ["SUPER_ADMIN", "BRANCH_MANAGER", "HUB_MANAGER", "OPERATIONS", "COUNTER_STAFF"],
  riders: ["SUPER_ADMIN", "BRANCH_MANAGER", "HUB_MANAGER", "OPERATIONS", "COUNTER_STAFF"],
  shipments: ["SUPER_ADMIN", "BRANCH_MANAGER", "HUB_MANAGER", "OPERATIONS", "COUNTER_STAFF"],
  tickets: ["SUPER_ADMIN", "BRANCH_MANAGER", "HUB_MANAGER", "OPERATIONS"],
  notifications: [
    "SUPER_ADMIN",
    "BRANCH_MANAGER",
    "HUB_MANAGER",
    "OPERATIONS",
    "COUNTER_STAFF",
    "HR_ADMIN",
  ],
};

export function canSee(role: Role | undefined, section: string): boolean {
  if (!role) return false;
  const allowed = NAV_ROLES[section];
  if (!allowed) return true;
  return allowed.includes(role);
}

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
