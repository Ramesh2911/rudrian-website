import { CountUp } from "@/components/motion/CountUp";

interface StatItemProps {
  /** Static display value (used when `to` is not provided). */
  value?: string;
  /** Animated counter target — renders a CountUp when provided. */
  to?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  label: string;
}

export function StatItem({ value, to, prefix, suffix, decimals, label }: StatItemProps) {
  return (
    <div className="px-4 py-6 text-center sm:px-6">
      <div className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        {to !== undefined ? (
          <CountUp to={to} prefix={prefix} suffix={suffix} decimals={decimals} />
        ) : (
          value
        )}
      </div>
      <div className="mt-1.5 text-sm font-medium text-body">{label}</div>
    </div>
  );
}
