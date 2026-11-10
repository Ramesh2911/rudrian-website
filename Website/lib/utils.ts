export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

const RECENT_KEY = "sl_recent_awbs";
const RECENT_LIMIT = 6;

export interface RecentAwb {
  awb: string;
  at: string;
}

function isRecentAwb(value: unknown): value is RecentAwb {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { awb?: unknown; at?: unknown };
  return typeof candidate.awb === "string" && typeof candidate.at === "string";
}

export function readRecentAwbs(): RecentAwb[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecentAwb).slice(0, RECENT_LIMIT);
  } catch {
    return [];
  }
}

export function pushRecentAwb(awb: string): void {
  if (typeof window === "undefined") return;
  const normalized = awb.trim().toUpperCase();
  if (!normalized) return;
  try {
    const next = readRecentAwbs().filter((entry) => entry.awb !== normalized);
    next.unshift({ awb: normalized, at: new Date().toISOString() });
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next.slice(0, RECENT_LIMIT)));
  } catch {
    /* storage unavailable */
  }
}

export function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatRelativeDay(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const today = new Date();
  const diff = Math.round(
    (new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() -
      new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) /
      86_400_000,
  );
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(date);
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "SL";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}
