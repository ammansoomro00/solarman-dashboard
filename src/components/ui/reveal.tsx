"use client";

import { motion, useReducedMotion } from "motion/react";

/** Staggered fade-up on first render; transform + opacity only. */
export function Reveal({ children, index = 0, className }: { children: React.ReactNode; index?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 18, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 140, damping: 22, mass: 0.9, delay: Math.min(index, 8) * 0.06 }}
    >
      {children}
    </motion.div>
  );
}
