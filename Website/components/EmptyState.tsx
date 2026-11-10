import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  actionHref,
  actionLabel,
  className,
}: EmptyStateProps) {
  return (
    <div className={cx("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand">
        {icon ?? (
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-7 w-7">
            <path
              d="M4 7.5 12 3.5l8 4v9l-8 4-8-4v-9Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M4 7.5 12 11.5l8-4M12 11.5v9" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        )}
      </div>
      <h3 className="mt-4 text-base font-bold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-body">{description}</p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="btn btn-primary btn-sm mt-5"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
