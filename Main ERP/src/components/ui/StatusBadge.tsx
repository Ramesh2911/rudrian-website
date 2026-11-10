import { STATUS_LABELS } from "../../lib/rbac";
import type { ShipmentStatus } from "../../api/types";
import { Badge } from "./Badge";

const STATUS_TONE: Record<ShipmentStatus, "slate" | "indigo" | "sky" | "violet" | "emerald" | "amber" | "rose" | "gray"> = {
  BOOKED: "slate",
  PICKED_UP: "indigo",
  IN_TRANSIT: "sky",
  OUT_FOR_DELIVERY: "violet",
  DELIVERED: "emerald",
  NDR: "amber",
  RETURNED: "rose",
  RTS: "rose",
  CANCELLED: "gray",
};

export function StatusBadge({ status, label }: { status: ShipmentStatus; label?: string }) {
  return <Badge tone={STATUS_TONE[status] ?? "gray"}>{label ?? STATUS_LABELS[status] ?? status}</Badge>;
}
