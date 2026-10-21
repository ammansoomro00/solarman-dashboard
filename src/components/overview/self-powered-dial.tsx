"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Hint } from "@/components/ui/hint";

const SOURCES = [
  { key: "sun", label: "Sun", color: "var(--sun)" },
  { key: "battery", label: "Battery", color: "var(--battery)" },
  { key: "grid", label: "Bought", color: "var(--grid)" },
] as const;

/** How much of the home's power is its own, as a radial dial plus a three-way source split. */
export function SelfPoweredDial({ selfPowered, mix }: { selfPowered: number; mix: { sun: number; battery: number; grid: number } }) {
  const reduce = useReducedMotion();
  const gid = useId();
  const R = 44;
  // A 270° arc, open at the bottom.
  const ARC = 2 * Math.PI * R * 0.75;
  const pct = Math.round(selfPowered * 100);

  return (
    <div className="border-line bg-surface-2/70 rounded-tile relative w-full shrink-0 overflow-hidden border p-4 backdrop-blur-md xl:w-[290px]">
      <div className="flex items-center gap-4">
        <div className="relative size-[104px] shrink-0">
          <svg viewBox="0 0 104 104" className="size-full rotate-[135deg] overflow-visible" aria-hidden>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="var(--gilt-2)" />
                <stop offset="1" stopColor="var(--gilt-1)" />
              </linearGradient>
            </defs>
            <circle cx="52" cy="52" r={R} fill="none" stroke="var(--surface-sunk)" strokeWidth={9} strokeLinecap="round" strokeDasharray={`${ARC} 999`} />
            <motion.circle
              cx="52"
              cy="52"
              r={R}
              fill="none"
              stroke={`url(#${gid})`}
              strokeWidth={9}
              strokeLinecap="round"
              initial={{ strokeDasharray: `0 999` }}
              animate={{ strokeDasharray: `${Math.max(0.01, selfPowered) * ARC} 999` }}
              transition={reduce ? { duration: 0 } : { duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
              style={{ filter: "drop-shadow(0 0 6px color-mix(in oklab, var(--gilt-2) 55%, transparent))" }}
            />
          </svg>
          <div
            className="absolute inset-0 grid place-items-center"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-label="Powered by your own system"
          >
            <p className="tabular text-[26px] leading-none font-bold tracking-tight">
              <AnimatedNumber value={pct} format={(n) => String(Math.round(n))} />
              <span className="text-ink-3 text-[13px]">%</span>
            </p>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-ink-2 flex items-center gap-1 text-[13px] font-semibold">
            Your own power
            <Hint>How much of what your home is using right now comes from your panels and battery, instead of being bought from the power company.</Hint>
          </p>
          <ul className="mt-2 space-y-1.5">
            {SOURCES.map((s, i) => {
              const share = mix[s.key];
              return (
                <li key={s.key} className="flex items-center gap-2 text-[12px]">
                  <span className="text-ink-3 w-12 shrink-0">{s.label}</span>
                  <span className="bg-surface-sunk h-1.5 flex-1 overflow-hidden rounded-full">
                    <motion.span
                      className="block h-full rounded-full"
                      style={{ background: s.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${share * 100}%` }}
                      transition={reduce ? { duration: 0 } : { duration: 0.9, delay: 0.3 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </span>
                  <span className="tabular w-8 shrink-0 text-right font-bold">{Math.round(share * 100)}%</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
