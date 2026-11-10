"use client";

import type { ReactNode } from "react";

interface TickerProps {
  children: ReactNode;
  /** Seconds for one full loop. */
  duration?: number;
  className?: string;
  itemClassName?: string;
}

/**
 * Infinite horizontal marquee. Content is duplicated once for a seamless loop;
 * pauses on hover/focus and stops entirely under prefers-reduced-motion.
 */
export function Ticker({ children, duration = 38, className, itemClassName }: TickerProps) {
  return (
    <div className={`ticker ${className ?? ""}`} aria-hidden="true">
      <div className="ticker-track" style={{ animationDuration: `${duration}s` }}>
        <div className={`ticker-group ${itemClassName ?? ""}`}>{children}</div>
        <div className={`ticker-group ${itemClassName ?? ""}`}>{children}</div>
      </div>
    </div>
  );
}
