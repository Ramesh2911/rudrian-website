"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

interface CountUpProps {
  /** Final value to count up to. */
  to: number;
  /** Prefix, e.g. "₹". */
  prefix?: string;
  /** Suffix, e.g. "+", "%", "K+", "M+". */
  suffix?: string;
  /** Decimal places in the final value (and during the animation). */
  decimals?: number;
  duration?: number;
  className?: string;
}

/** Scroll-triggered number counter (e.g. 0 → 2M+). */
export function CountUp({
  to,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 1.6,
  className,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduced = useReducedMotion();
  // SSR/initial HTML shows the final value (SEO-friendly); the count-up
  // resets to 0 only once the element is actually in view on the client.
  const [value, setValue] = useState(to);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!inView || reduced) return;
    if (startedRef.current) return;
    startedRef.current = true;

    let frame: number;
    const startTime = performance.now();
    setValue(0);

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / (duration * 1000), 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(to * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, reduced, to, duration]);

  const formatted =
    decimals > 0
      ? value.toFixed(decimals)
      : Math.round(value).toLocaleString("en-IN");

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
