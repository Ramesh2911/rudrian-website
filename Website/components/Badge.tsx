import type { ReactNode } from "react";
import type { ShipmentStatus } from "@/lib/types";
import { cx } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "info" | "violet" | "neutral";

const toneClasses: Record<Tone, string> = {
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
  info: "bg-info-bg text-info",
  violet: "bg-violet-bg text-violet",
  neutral: "bg-page text-body",
};

interface BadgeProps {
  tone?: Tone;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

export function Badge({ tone = "neutral", dot = false, children, className }: BadgeProps) {
  return (
    <span className={cx("badge", toneClasses[tone], className)}>
      {dot ? <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

const statusTone: Record<string, Tone> = {
  BOOKED: "info",
  PICKED_UP: "violet",
  IN_TRANSIT: "info",
  OUT_FOR_DELIVERY: "warning",
  DELIVERED: "success",
  NDR: "danger",
  RETURNED: "warning",
  CANCELLED: "danger",
  OPEN: "info",
  IN_PROGRESS: "warning",
  RESOLVED: "success",
  CLOSED: "neutral",
};

const statusLabels: Record<string, string> = {
  BOOKED: "Booked",
  PICKED_UP: "Picked Up",
  IN_TRANSIT: "In Transit",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  NDR: "Delivery Exception",
  RETURNED: "Returned",
  CANCELLED: "Cancelled",
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export function statusLabel(status: string): string {
  return statusLabels[status] ?? status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = statusTone[status] ?? "neutral";
  return (
    <Badge tone={tone} dot className={className}>
      {statusLabel(status)}
    </Badge>
  );
}

export function statusToneOf(status: string): Tone {
  return statusTone[status] ?? "neutral";
}

export type { Tone };
export type { ShipmentStatus };
