import {
  AlertTriangle,
  ArrowLeftRight,
  Ban,
  MapPin,
  Package,
  PackageCheck,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TimelineEvent } from "@/lib/types";
import { statusLabel, statusToneOf } from "@/components/Badge";
import { cx, formatDate } from "@/lib/utils";

const iconMap: Record<string, LucideIcon> = {
  BOOKED: Package,
  PICKED_UP: PackageCheck,
  IN_TRANSIT: Truck,
  OUT_FOR_DELIVERY: MapPin,
  DELIVERED: PackageCheck,
  NDR: AlertTriangle,
  RETURNED: ArrowLeftRight,
  CANCELLED: Ban,
};

const toneNode: Record<string, string> = {
  success: "bg-success-bg text-success ring-success/20",
  warning: "bg-warning-bg text-warning ring-warning/20",
  danger: "bg-danger-bg text-danger ring-danger/20",
  info: "bg-info-bg text-info ring-info/20",
  violet: "bg-violet-bg text-violet ring-violet/20",
  neutral: "bg-page text-muted ring-line",
};

interface TimelineProps {
  events: TimelineEvent[];
  currentStatus: string;
}

export function Timeline({ events, currentStatus }: TimelineProps) {
  const ordered = [...events].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );
  const matchIndex = ordered.findIndex((event) => event.status === currentStatus);
  const currentIndex = matchIndex >= 0 ? matchIndex : 0;

  return (
    <ol className="relative">
      {ordered.map((event, index) => {
        const Icon = iconMap[event.status] ?? Package;
        const tone = statusToneOf(event.status);
        const isCurrent = index === currentIndex;
        const isPast = index > currentIndex;
        return (
          <li
            key={`${event.status}-${event.at}-${index}`}
            className="stagger-in relative flex gap-4 pb-8 last:pb-0"
            style={{ animationDelay: `${index * 90}ms` }}
          >
            {index < ordered.length - 1 ? (
              <span
                aria-hidden="true"
                className={cx(
                  "absolute left-[17px] top-9 h-full w-0.5",
                  isPast ? "bg-line" : "bg-gradient-to-b from-brand/50 to-line",
                )}
              />
            ) : null}
            <span
              aria-hidden="true"
              className={cx(
                "relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full ring-4",
                isPast ? "bg-page text-muted ring-line opacity-70" : toneNode[tone] ?? toneNode.neutral,
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-ink">{statusLabel(event.status)}</p>
                {isCurrent ? (
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">
                    Latest
                  </span>
                ) : null}
              </div>
              {event.remarks ? (
                <p className="mt-1 text-sm leading-relaxed text-body">{event.remarks}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                {event.location ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-page px-2.5 py-1 font-medium text-body">
                    <MapPin className="h-3 w-3" aria-hidden="true" />
                    {event.location}
                  </span>
                ) : null}
                <time dateTime={event.at}>{formatDate(event.at)}</time>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
