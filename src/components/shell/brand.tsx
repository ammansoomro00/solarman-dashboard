"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import { cn } from "@/lib/utils";

/** A living sun rising over a horizon: the product mark. Rays turn slowly and the core breathes. */
export function BrandMark({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const id = useId().replace(/:/g, "");

  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8 overflow-visible", className)}>
      <defs>
        <radialGradient id={`${id}-core`} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="color-mix(in oklab, var(--sun) 45%, white)" />
          <stop offset="0.6" stopColor="var(--sun)" />
          <stop offset="1" stopColor="color-mix(in oklab, var(--sun) 75%, black)" />
        </radialGradient>
        <linearGradient id={`${id}-tile`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="color-mix(in oklab, var(--ink) 88%, var(--sun))" />
          <stop offset="1" stopColor="var(--ink)" />
        </linearGradient>
        <clipPath id={`${id}-sky`}>
          <rect width="32" height="20" />
        </clipPath>
      </defs>
      <rect width="32" height="32" rx="10" fill={`url(#${id}-tile)`} />
      <g clipPath={`url(#${id}-sky)`}>
        <motion.circle
          cx="16"
          cy="19"
          r="9"
          fill="var(--sun)"
          initial={false}
          animate={reduce ? { opacity: 0.18 } : { opacity: [0.12, 0.3, 0.12], r: [8, 10, 8] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.g
          style={{ originX: "16px", originY: "19px" }}
          animate={reduce ? undefined : { rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        >
          {Array.from({ length: 8 }, (_, i) => (
            <line
              key={i}
              x1="16"
              y1="9.6"
              x2="16"
              y2="11.6"
              stroke="var(--sun)"
              strokeWidth="1.7"
              strokeLinecap="round"
              transform={`rotate(${i * 45} 16 19)`}
            />
          ))}
        </motion.g>
        <circle cx="16" cy="19" r="5.6" fill={`url(#${id}-core)`} />
      </g>
      <path d="M6.5 20h19" stroke="var(--page)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10 23.5h12M13 26.5h6" stroke="var(--page)" strokeOpacity="0.35" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function Brand({ name }: { name: string }) {
  return (
    <div className="group flex items-center gap-3">
      <span className="relative">
        <span
          aria-hidden
          className="bg-sun absolute inset-0 rounded-[10px] opacity-0 blur-md transition-opacity duration-500 group-hover:opacity-50"
        />
        <BrandMark className="relative size-9" />
      </span>
      <div className="min-w-0 leading-tight">
        <p className="text-[15px] font-bold tracking-tight">Solar Home</p>
        <p className="text-ink-3 truncate text-xs">{name}</p>
      </div>
    </div>
  );
}
