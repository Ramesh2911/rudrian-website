import type { Task } from '../types';

export function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

export function isoDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function todayIsoDate(): string {
  return isoDate(new Date());
}

export function lastNIsoDates(count: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i += 1) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    out.push(isoDate(d));
  }
  return out;
}

export function formatDisplayDate(date: Date = new Date()): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(iso?: string | null): string {
  if (!iso) return '--:--';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function formatCod(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDuration(ms: number): string {
  const clamped = Math.max(0, ms);
  const totalMin = Math.floor(clamped / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function formatWeight(value: number): string {
  return `${value.toFixed(2)} kg`;
}

export function greetingForHour(hour: number = new Date().getHours()): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.length > 0) return error;
  return 'Something went wrong. Please try again.';
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function uid(prefix = 'local'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function taskDateKey(task: Task): string {
  return task.createdAt ?? '';
}

export function sortTasksByCreatedDesc(a: Task, b: Task): number {
  const aTime = new Date(a.createdAt).getTime() || 0;
  const bTime = new Date(b.createdAt).getTime() || 0;
  return bTime - aTime;
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]!.charAt(0)}${parts[parts.length - 1]!.charAt(0)}`.toUpperCase();
}
