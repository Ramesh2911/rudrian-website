"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { cx } from "@/lib/utils";

interface ApiErrorStateProps {
  message: string;
  title?: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}

export function ApiErrorState({
  message,
  title = "Something went wrong",
  onRetry,
  retrying = false,
  className,
}: ApiErrorStateProps) {
  const router = useRouter();

  return (
    <div
      role="alert"
      className={cx(
        "flex flex-col items-center justify-center rounded-2xl border border-danger/20 bg-danger-bg/60 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-danger/10 text-danger">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-7 w-7">
          <path
            d="M12 8v5m0 3.5h.01M10.3 3.9 2.6 17.4A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3.1L13.7 3.9a2 2 0 0 0-3.4 0Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h3 className="mt-4 text-lg font-bold text-ink">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-body">{message}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button variant="primary" onClick={onRetry ?? (() => router.refresh())} loading={retrying}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </Button>
        <Button variant="secondary" onClick={() => router.push("/")}>
          Back to home
        </Button>
      </div>
    </div>
  );
}
