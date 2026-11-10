"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  /** Animation start direction. */
  from?: "up" | "down" | "left" | "right" | "none";
  /** Distance in px (ignored when from="none"). */
  distance?: number;
  delay?: number;
  duration?: number;
  className?: string;
  /** Render as a semantic element instead of div. */
  as?: "div" | "section" | "article" | "li" | "header" | "footer";
}

const offsets = {
  up: (d: number) => ({ y: d }),
  down: (d: number) => ({ y: -d }),
  left: (d: number) => ({ x: d }),
  right: (d: number) => ({ x: -d }),
  none: () => ({ y: 0, x: 0 }),
};

export function Reveal({
  children,
  from = "up",
  distance = 20,
  delay = 0,
  duration = 0.55,
  className,
  as = "div",
}: RevealProps) {
  const reduced = useReducedMotion();
  const offset = offsets[from](distance);

  const variants: Variants = reduced
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : {
        hidden: { opacity: 0, ...offset },
        visible: { opacity: 1, x: 0, y: 0, transition: { duration, delay, ease: [0.22, 1, 0.36, 1] } },
      };

  const Component = motion[as];

  return (
    <Component
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
    >
      {children}
    </Component>
  );
}
