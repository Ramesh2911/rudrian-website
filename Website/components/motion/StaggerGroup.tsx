"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

interface StaggerGroupProps {
  children: ReactNode;
  /** Delay between each StaggerItem child, in seconds. */
  stagger?: number;
  delay?: number;
  className?: string;
  as?: "div" | "ol" | "ul";
}

/** Container: pairs with StaggerItem children for a coordinated reveal. */
export function StaggerGroup({ children, stagger = 0.08, delay = 0, className, as = "div" }: StaggerGroupProps) {
  const reduced = useReducedMotion();

  const container: Variants = reduced
    ? { hidden: {}, visible: {} }
    : {
        hidden: {},
        visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
      };

  const Component = motion[as] as typeof motion.div;

  return (
    <Component
      className={className}
      variants={container}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
    >
      {children}
    </Component>
  );
}

interface StaggerItemProps {
  children: ReactNode;
  /** Distance in px. */
  distance?: number;
  className?: string;
  as?: "div" | "li" | "article" | "section";
}

/** Item: wraps one grid/list child inside a StaggerGroup. */
export function StaggerItem({ children, distance = 18, className, as = "div" }: StaggerItemProps) {
  const reduced = useReducedMotion();

  const child: Variants = reduced
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: distance },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
      };

  const Component = motion[as] as typeof motion.div;

  return (
    <Component className={className} variants={child}>
      {children}
    </Component>
  );
}
