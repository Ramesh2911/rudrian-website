export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dateKeyToDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

export function todayDate(): Date {
  return dateKeyToDate(localDateKey());
}

export function parseDateKeyOrToday(key?: string | null): { key: string; date: Date } {
  if (key && /^\d{4}-\d{2}-\d{2}$/.test(key)) return { key, date: dateKeyToDate(key) };
  const k = localDateKey();
  return { key: k, date: dateKeyToDate(k) };
}

export function monthBounds(month?: string | null): { start: Date; end: Date; key: string } {
  const now = new Date();
  const key = month && /^\d{4}-\d{2}$/.test(month) ? month : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [y, m] = key.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
  return { start, end, key };
}

export function daysInMonth(key: string): number {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}
