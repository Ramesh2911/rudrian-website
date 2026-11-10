"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/Button";
import { cx, pushRecentAwb } from "@/lib/utils";

interface TrackSearchBoxProps {
  size?: "md" | "lg";
  autoFocus?: boolean;
  initialAwb?: string;
  className?: string;
}

export function TrackSearchBox({
  size = "lg",
  autoFocus = false,
  initialAwb = "",
  className,
}: TrackSearchBoxProps) {
  const router = useRouter();
  const [awb, setAwb] = useState(initialAwb);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = awb.trim().toUpperCase();
    if (normalized.length < 8) {
      setError("Enter a valid AWB number, e.g. SLX261031000002.");
      return;
    }
    setError(null);
    pushRecentAwb(normalized);
    router.push(`/track/${encodeURIComponent(normalized)}`);
  }

  return (
    <form onSubmit={handleSubmit} className={cx("w-full", className)} noValidate>
      <div
        className={cx(
          "flex flex-col gap-2.5 rounded-2xl border border-line bg-card p-2.5 shadow-card sm:flex-row sm:items-center",
          size === "lg" && "sm:rounded-2xl sm:p-2",
        )}
        role="search"
        aria-label="Track a shipment"
      >
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <label htmlFor={`awb-search-${size}`} className="sr-only">
            AWB tracking number
          </label>
          <input
            id={`awb-search-${size}`}
            type="text"
            value={awb}
            onChange={(event) => {
              setAwb(event.target.value);
              if (error) setError(null);
            }}
            autoFocus={autoFocus}
            autoComplete="off"
            spellCheck={false}
            placeholder="Enter AWB number, e.g. SLX261031000002"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `awb-search-${size}-error` : undefined}
            className={cx(
              "w-full rounded-xl border border-transparent bg-transparent py-3 pl-10 pr-3.5 text-[15px] font-medium text-ink placeholder:font-normal placeholder:text-muted focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10",
              error && "border-danger/50",
              size === "lg" ? "sm:py-4" : "sm:py-3",
            )}
          />
        </div>
        <Button type="submit" size={size} className="w-full sm:w-auto">
          Track
          <Search className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      {error ? (
        <p id={`awb-search-${size}-error`} role="alert" className="field-error mt-2 text-left">
          {error}
        </p>
      ) : null}
    </form>
  );
}
