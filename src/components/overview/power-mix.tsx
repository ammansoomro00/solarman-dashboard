"use client";

import { motion, useReducedMotion } from "motion/react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Hint } from "@/components/ui/hint";

const SOURCES = [
  { key: "sun", label: "Sun", color: "var(--sun)" },
  { key: "battery", label: "Battery", color: "var(--battery)" },
  { key: "grid", label: "Bought", color: "var(--grid)" },
] as const;

/** "Your own power" as one big figure over a single segmented ribbon showing where it comes from. */
export function PowerMix({ selfPowered, mix }: { selfPowered: number; mix: { sun: number; battery: number; grid: number } }) {
  const reduce = useReducedMotion();
  const pct = Math.round(selfPowered * 100);
  const total = mix.sun + mix.battery + mix.grid;

  return (
    <div className="w-full shrink-0 xl:w-[300px]">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-ink-3 flex items-center gap-1 text-[11px] font-bold tracking-[0.12em] uppercase">
            Your own power
            <Hint>How much of what your home is using right now comes from your panels and battery, instead of being bought from the power company.</Hint>
          </p>
          <p
            className="tabular mt-1 bg-[linear-gradient(100deg,var(--gilt-1),var(--gilt-2))] bg-clip-text text-[46px] leading-none font-bold tracking-tight text-transparent"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-label="Powered by your own system"
          >
            <AnimatedNumber value={pct} format={(n) => String(Math.round(n))} />
            <span className="text-[22px]">%</span>
          </p>
        </div>
      </div>

      {/* One ribbon, three segments, separated by hairline gaps */}
      <div className="bg-surface-sunk mt-3 flex h-2.5 gap-[3px] overflow-hidden rounded-full">
        {total > 0 &&
          SOURCES.map((s, i) =>
            mix[s.key] > 0.005 ? (
              <motion.span
                key={s.key}
                className="h-full first:rounded-l-full last:rounded-r-full"
                style={{ background: `linear-gradient(180deg, color-mix(in oklab, ${s.color} 80%, white), ${s.color})`, boxShadow: `0 0 10px color-mix(in oklab, ${s.color} 50%, transparent)` }}
                initial={{ width: 0 }}
                animate={{ width: `${(mix[s.key] / total) * 100}%` }}
                transition={reduce ? { duration: 0 } : { duration: 1, delay: 0.2 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              />
            ) : null,
          )}
      </div>

      <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
        {SOURCES.map((s) => (
          <li key={s.key} className="text-ink-3 flex items-center gap-1.5 text-[12px]">
            <span className="size-1.5 rounded-full" style={{ background: s.color }} />
            {s.label}
            <span className="tabular text-ink font-bold">{Math.round(mix[s.key] * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
