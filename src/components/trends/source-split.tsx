"use client";

import { BatteryMedium, Sun, UtilityPole } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { formatUnits, percentText } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CountUp } from "./count-up";

const ICONS = [Sun, BatteryMedium, UtilityPole];

/** Where the home's power came from: a glowing ribbon you can explore by hovering a source. */
export function SourceSplit({ sources }: { sources: { label: string; value: number; color: string }[] }) {
  const [focus, setFocus] = useState<number | null>(null);
  const total = Math.max(
    0.001,
    sources.reduce((s, x) => s + x.value, 0),
  );

  return (
    <div onMouseLeave={() => setFocus(null)}>
      <div
        className="bg-surface-sunk mt-6 flex h-12 gap-1 overflow-hidden rounded-2xl p-1"
        role="img"
        aria-label={sources.map((s) => `${s.label}: ${percentText(s.value / total)}`).join(", ")}
      >
        {sources.map((s, i) => {
          if (s.value <= 0) return null;
          const share = s.value / total;
          const active = focus === i;
          const dim = focus !== null && !active;
          return (
            <motion.div
              key={s.label}
              onMouseEnter={() => setFocus(i)}
              className="relative h-full min-w-[6px] overflow-hidden rounded-xl"
              initial={{ flexGrow: 0 }}
              animate={{ flexGrow: active ? share * 1.25 + 0.05 : share, opacity: dim ? 0.4 : 1 }}
              style={{ flexBasis: 0 }}
              transition={{ type: "spring", stiffness: 160, damping: 22 }}
            >
              <span
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(180deg, color-mix(in oklab, ${s.color} 70%, white), ${s.color} 45%, color-mix(in oklab, ${s.color} 75%, black))`,
                  boxShadow: `inset 0 1px 0 rgb(255 255 255 / 0.35), 0 0 24px -4px ${s.color}`,
                }}
              />
              {share > 0.12 && (
                <span className="tabular absolute inset-0 grid place-items-center text-[13px] font-bold text-white/95 [text-shadow:0_1px_2px_rgb(0_0_0/0.35)]">
                  {percentText(share)}
                </span>
              )}
            </motion.div>
          );
        })}
      </div>

      <ul className="mt-5 grid gap-3 sm:grid-cols-3">
        {sources.map((s, i) => {
          const Icon = ICONS[i] ?? Sun;
          return (
            <li key={s.label}>
              <button
                type="button"
                onMouseEnter={() => setFocus(i)}
                onFocus={() => setFocus(i)}
                onBlur={() => setFocus(null)}
                className={cn(
                  "rounded-tile w-full border px-3.5 py-3 text-left transition-colors",
                  focus === i ? "border-line-strong bg-surface-2" : "border-transparent",
                  focus !== null && focus !== i && "opacity-55",
                )}
              >
                <span className="text-ink-2 flex items-center gap-2 text-[13px]">
                  <span
                    className="grid size-6 place-items-center rounded-full"
                    style={{ background: `color-mix(in oklab, ${s.color} 18%, transparent)`, color: s.color }}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  {s.label}
                </span>
                <span className="tabular mt-1.5 block text-xl font-bold">
                  <CountUp value={(s.value / total) * 100} format={(n) => `${Math.round(n)}%`} />{" "}
                  <span className="text-ink-3 text-[13px] font-semibold">· {formatUnits(s.value)} units</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
