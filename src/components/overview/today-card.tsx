"use client";

import { ArrowDownLeft, ArrowUpRight, House, Sun } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Hint } from "@/components/ui/hint";
import type { EnergyTotals } from "@/lib/energy/insights";
import { formatUnits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, CardHeader } from "./card";

type Key = "sun" | "home" | "bought" | "sold";

/** One unit runs a 75 W ceiling fan for about 13 hours. */
function fanText(kwh: number) {
  const hours = (kwh * 1000) / 75;
  if (hours < 1) return "less than an hour of a ceiling fan";
  if (hours < 48) return `a ceiling fan for ${Math.round(hours)} hours`;
  return `a ceiling fan for ${Math.round(hours / 24)} days`;
}

export function TodayCard({ totals, className }: { totals: EnergyTotals; className?: string }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState<Key | null>(null);

  const own = Math.max(0, totals.homeKwh - totals.boughtKwh);
  const ownShare = totals.homeKwh > 0 ? own / totals.homeKwh : 0;

  const tiles: Array<{ key: Key; label: string; value: number; icon: React.ComponentType<{ className?: string }>; color: string; more: string }> = [
    { key: "sun", label: "Made", value: totals.solarKwh, icon: Sun, color: "var(--sun)", more: `Your panels made enough to run ${fanText(totals.solarKwh)}.` },
    {
      key: "home",
      label: "Used",
      value: totals.homeKwh,
      icon: House,
      color: "var(--home)",
      more: `${Math.round(ownShare * 100)}% of it came from your own panels and battery.`,
    },
    {
      key: "bought",
      label: "Bought",
      value: totals.boughtKwh,
      icon: ArrowDownLeft,
      color: "var(--grid)",
      more: totals.boughtKwh > 0.05 ? "Taken from the power company. This shows up on your bill." : "Nothing bought from the power company today.",
    },
    {
      key: "sold",
      label: "Sold back",
      value: totals.soldKwh,
      icon: ArrowUpRight,
      color: "var(--sun)",
      more: totals.soldKwh > 0.05 ? "Spare solar sent to the power company." : "No spare power sent back today.",
    },
  ];
  const max = Math.max(1, ...tiles.map((t) => t.value));
  const detail = tiles.find((t) => t.key === open);

  return (
    <Card className={cn("relative isolate flex flex-col overflow-hidden", className)} aria-labelledby="today-title">
      <div aria-hidden className="bg-sun pointer-events-none absolute -top-24 -right-16 -z-10 size-64 rounded-full opacity-[0.13] blur-3xl" />
      <CardHeader
        id="today-title"
        title="Today so far"
        hint={
          <Hint>Electricity is counted in units, the same units on your electricity bill. One unit is enough to run a ceiling fan for about 13 hours.</Hint>
        }
      />

      {/* Own-power balance: how much of today's use was yours */}
      <div className="mt-4">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-ink-2 text-[13px]">Your own power today</p>
          <p className="tabular text-[15px] font-bold">
            <AnimatedNumber value={Math.round(ownShare * 100)} format={(n) => `${Math.round(n)}%`} />
          </p>
        </div>
        <div className="bg-surface-sunk relative mt-2 flex h-2.5 overflow-hidden rounded-full">
          <motion.span
            className="h-full rounded-l-full"
            style={{ background: "linear-gradient(90deg, var(--gilt-2), var(--gilt-1))", boxShadow: "0 0 12px color-mix(in oklab, var(--gilt-2) 55%, transparent)" }}
            initial={{ width: 0 }}
            animate={{ width: `${ownShare * 100}%` }}
            transition={reduce ? { duration: 0 } : { duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.span
            className="bg-grid h-full rounded-r-full opacity-80"
            initial={{ width: 0 }}
            animate={{ width: `${(1 - ownShare) * 100 * (totals.homeKwh > 0 ? 1 : 0)}%` }}
            transition={reduce ? { duration: 0 } : { duration: 1.1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>

      <ul className="mt-5 grid grid-cols-2 gap-2.5" onMouseLeave={() => setOpen(null)}>
        {tiles.map((t, i) => {
          const Icon = t.icon;
          const share = t.value / max;
          const R = 15;
          const C = 2 * Math.PI * R;
          const active = open === t.key;
          return (
            <li key={t.key}>
              <motion.button
                type="button"
                onMouseEnter={() => setOpen(t.key)}
                onFocus={() => setOpen(t.key)}
                onClick={() => setOpen((o) => (o === t.key ? null : t.key))}
                aria-expanded={active}
                aria-controls="today-detail"
                whileHover={reduce ? undefined : { y: -2 }}
                whileTap={{ scale: 0.97 }}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: open && !active ? 0.55 : 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 24, delay: reduce ? 0 : i * 0.05 }}
                className="border-line bg-surface-2/70 rounded-tile relative w-full overflow-hidden border p-3 text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  boxShadow: active ? `0 0 0 1px color-mix(in oklab, ${t.color} 45%, transparent), 0 10px 28px -12px ${t.color}` : undefined,
                }}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-6 -bottom-8 size-20 rounded-full blur-2xl transition-opacity duration-500"
                  style={{ background: t.color, opacity: active ? 0.35 : 0.12 }}
                />
                <span className="relative flex items-center justify-between">
                  {/* Icon inside a ring that fills by its share of the biggest number */}
                  <span className="relative grid size-9 place-items-center">
                    <svg viewBox="0 0 36 36" className="absolute inset-0 size-full -rotate-90" aria-hidden>
                      <circle cx="18" cy="18" r={R} fill="none" stroke="var(--line)" strokeWidth={2.5} />
                      <motion.circle
                        cx="18"
                        cy="18"
                        r={R}
                        fill="none"
                        stroke={t.color}
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeDasharray={C}
                        initial={{ strokeDashoffset: C }}
                        animate={{ strokeDashoffset: C * (1 - Math.max(0.02, share)) }}
                        transition={reduce ? { duration: 0 } : { duration: 1.2, delay: 0.2 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </svg>
                    <motion.span
                      style={{ color: `color-mix(in oklab, ${t.color} 70%, var(--ink))` }}
                      animate={reduce || t.key !== "sun" || t.value <= 0 ? undefined : { rotate: 360 }}
                      transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                    >
                      <Icon className="size-4" />
                    </motion.span>
                  </span>
                  <span className="text-ink-3 text-[10.5px] font-bold tracking-[0.1em] uppercase">{t.label}</span>
                </span>
                <span className="relative mt-3 block">
                  <span className="tabular text-[22px] leading-none font-bold tracking-tight">
                    <AnimatedNumber value={t.value} format={(n) => formatUnits(n)} />
                  </span>
                  <span className="text-ink-3 ml-1 text-xs font-semibold">units</span>
                </span>
              </motion.button>
            </li>
          );
        })}
      </ul>

      <div id="today-detail" aria-live="polite" className="mt-3 min-h-[40px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={detail?.key ?? "none"}
            initial={{ opacity: 0, y: 4, filter: "blur(3px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -4, filter: "blur(3px)" }}
            transition={{ duration: 0.2 }}
            className={cn("text-[12.5px] leading-relaxed", detail ? "text-ink-2" : "text-ink-3")}
          >
            {detail ? detail.more : "Hover or tap a number to see what it means."}
          </motion.p>
        </AnimatePresence>
      </div>
    </Card>
  );
}
