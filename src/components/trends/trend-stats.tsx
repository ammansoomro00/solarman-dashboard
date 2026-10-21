"use client";

import { ArrowDown, ArrowUp, Banknote, HandCoins, Leaf, Trees } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Card } from "@/components/overview/card";
import { change, type Insights } from "@/lib/energy/insights";
import { formatUnits, moneyText, percentText } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CountUp } from "./count-up";

const EASE = [0.22, 1, 0.36, 1] as const;

/** A headline total with a live comparison against the previous period. */
export function TrendStat({
  label,
  value,
  prev,
  unit,
  good,
  color,
  compareTo,
  icon: Icon,
}: {
  label: string;
  value: number;
  prev?: number;
  unit: string;
  good: "up" | "down";
  color: string;
  compareTo: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const [hover, setHover] = useState(false);
  const delta = prev !== undefined ? change(value, prev) : null;
  const better = delta !== null && (good === "up" ? delta > 0 : delta < 0);
  const max = Math.max(value, prev ?? 0, 0.001);

  return (
    <Card
      className="relative isolate flex flex-col overflow-hidden p-5"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      tabIndex={0}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-16 -z-10 size-48 rounded-full blur-3xl"
        style={{ background: color }}
        animate={{ opacity: hover ? 0.3 : 0.14, scale: hover ? 1.15 : 1 }}
        transition={{ duration: 0.5 }}
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-ink-2 text-[13px] leading-snug">{label}</p>
        <motion.span
          className="grid size-8 shrink-0 place-items-center rounded-full"
          style={{
            background: `radial-gradient(120% 120% at 30% 20%, color-mix(in oklab, ${color} 38%, var(--surface)), color-mix(in oklab, ${color} 10%, var(--surface)))`,
            color: `color-mix(in oklab, ${color} 55%, var(--ink))`,
            boxShadow: `0 0 0 1px color-mix(in oklab, ${color} 30%, transparent), 0 8px 20px -8px ${color}`,
          }}
          animate={{ rotate: hover ? 12 : 0, scale: hover ? 1.1 : 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
        >
          <Icon className="size-4" />
        </motion.span>
      </div>

      <p className="tabular mt-2 text-[30px] leading-tight font-bold tracking-tight">
        <CountUp value={value} format={(n) => formatUnits(n)} /> <span className="text-ink-3 text-sm font-semibold">{unit}</span>
      </p>

      {/* This period vs last, as two bars */}
      {prev !== undefined && (
        <div className="mt-3 space-y-1" aria-hidden>
          {[
            { v: value, c: color, o: 1 },
            { v: prev, c: "var(--ink-3)", o: 0.45 },
          ].map((b, i) => (
            <div key={i} className="bg-surface-sunk h-1.5 overflow-hidden rounded-full">
              <motion.div
                className="h-full rounded-full"
                style={{ background: b.c, opacity: b.o }}
                initial={{ width: 0 }}
                animate={{ width: `${(b.v / max) * 100}%` }}
                transition={{ duration: 0.9, delay: 0.15 + i * 0.1, ease: EASE }}
              />
            </div>
          ))}
        </div>
      )}

      <div className="relative mt-2.5 h-4 text-xs">
        <AnimatePresence mode="wait" initial={false}>
          {hover && prev !== undefined ? (
            <motion.p
              key="prev"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="text-ink-2 absolute inset-0 font-semibold"
            >
              {formatUnits(prev)} {unit} {compareTo}
            </motion.p>
          ) : delta !== null && Math.abs(delta) >= 0.005 ? (
            <motion.p
              key="delta"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className={cn("absolute inset-0 flex items-center gap-1 font-semibold", better ? "text-good-ink" : "text-ink-3")}
            >
              {delta > 0 ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />}
              {percentText(Math.abs(delta))} {delta > 0 ? "more" : "less"} than {compareTo}
            </motion.p>
          ) : (
            <motion.p key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-ink-3 absolute inset-0">
              {delta === null ? `Nothing to compare with ${compareTo}` : `Same as ${compareTo}`}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}

/** "Solar saved you": the money headline, with a shimmering sun-to-home finish. */
export function SavedHero({ insights, previous, currency, compareTo }: { insights: Insights; previous: Insights | null; currency: string; compareTo: string }) {
  const reduce = useReducedMotion();
  const R = 20;
  const C = 2 * Math.PI * R;
  return (
    <Card className="relative isolate col-span-2 flex flex-col overflow-hidden p-5 lg:col-span-1">
      {/* Deep panel lit by a sun glow and a green glow, matching the overview savings card. */}
      <div aria-hidden className="absolute -top-16 -left-12 -z-10 size-48 rounded-full opacity-30 blur-3xl" style={{ background: "var(--sun)" }} />
      <div aria-hidden className="absolute -right-10 -bottom-20 -z-10 size-48 rounded-full opacity-25 blur-3xl" style={{ background: "var(--home)" }} />
      {!reduce && (
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <span
            className="absolute inset-y-0 w-1/3 bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--ink)_6%,transparent),transparent)]"
            style={{ animation: "shimmer-sweep 6s ease-in-out infinite" }}
          />
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-ink-2 text-[13px] font-semibold">Solar saved you</p>
          <p className="tabular mt-1 bg-[linear-gradient(100deg,var(--gilt-1),var(--gilt-2))] bg-clip-text text-[30px] leading-tight font-bold tracking-tight text-transparent">
            <CountUp value={insights.saved} format={(n) => moneyText(n, currency)} duration={1.4} />
          </p>
        </div>
        <svg
          viewBox="0 0 48 48"
          className="size-12 shrink-0 -rotate-90 overflow-visible"
          role="img"
          aria-label={`${percentText(insights.selfPowered)} of your power was your own`}
        >
          <circle cx="24" cy="24" r={R} fill="none" stroke="var(--surface-sunk)" strokeWidth={5} />
          <motion.circle
            cx="24"
            cy="24"
            r={R}
            fill="none"
            stroke="var(--home)"
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray={C}
            initial={{ strokeDashoffset: C }}
            animate={{ strokeDashoffset: C * (1 - insights.selfPowered) }}
            transition={{ duration: 1.3, ease: EASE, delay: 0.2 }}
            style={{ filter: "drop-shadow(0 0 4px color-mix(in oklab, var(--home) 60%, transparent))" }}
          />
        </svg>
      </div>
      <p className="text-ink-3 mt-auto pt-3 text-xs font-medium">
        <strong className="text-ink">{percentText(insights.selfPowered)}</strong> of your power was your own
        {previous && previous.saved > 0 ? ` · ${moneyText(previous.saved, currency)} ${compareTo}` : ""}
      </p>
    </Card>
  );
}

/** Money and planet: four tiles whose icons come alive on hover. */
export function ImpactTiles({ insights, currency }: { insights: Insights; currency: string }) {
  const trees = insights.trees < 10 ? Math.round(insights.trees * 10) / 10 : Math.round(insights.trees);
  const tiles = [
    { label: "Paid for bought power", value: insights.spent, format: (n: number) => moneyText(n, currency), icon: Banknote, color: "var(--grid)" },
    { label: "Earned from selling", value: insights.earned, format: (n: number) => moneyText(n, currency), icon: HandCoins, color: "var(--sun)" },
    { label: "Pollution avoided", value: insights.co2Kg, format: (n: number) => `${Math.round(n)} kg CO₂`, icon: Leaf, color: "var(--home)" },
    {
      label: "Like planting",
      value: trees,
      format: (n: number) => `${trees < 10 ? Math.round(n * 10) / 10 : Math.round(n)} trees`,
      icon: Trees,
      color: "var(--home)",
    },
  ];
  return (
    <dl className="mt-5 grid grid-cols-2 gap-3">
      {tiles.map((t, i) => (
        <motion.div
          key={t.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.06, duration: 0.4, ease: EASE }}
          whileHover="hover"
          className="group/tile rounded-tile bg-surface-2/80 border-line relative overflow-hidden border px-4 py-3"
        >
          <motion.span
            aria-hidden
            className="pointer-events-none absolute -right-6 -bottom-8 size-24 rounded-full opacity-0 blur-2xl"
            style={{ background: t.color }}
            variants={{ hover: { opacity: 0.35 } }}
          />
          <dt className="text-ink-3 relative flex items-center gap-1.5 text-xs">
            <motion.span
              variants={{ hover: { rotate: -12, scale: 1.2, y: -1 } }}
              transition={{ type: "spring", stiffness: 400, damping: 12 }}
              style={{ color: t.color }}
            >
              <t.icon className="size-3.5" />
            </motion.span>
            {t.label}
          </dt>
          <dd className="tabular relative mt-0.5 text-[17px] font-bold">
            <CountUp value={t.value} format={t.format} />
          </dd>
        </motion.div>
      ))}
    </dl>
  );
}
