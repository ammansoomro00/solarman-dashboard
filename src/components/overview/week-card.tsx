"use client";

import { ArrowRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRef, useState } from "react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import type { EnergyBar } from "@/lib/data/types";
import { formatUnits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, CardHeader } from "./card";

export function WeekCard({ days, today, className }: { days: EnergyBar[]; today: string; className?: string }) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<number | null>(null);
  const plot = useRef<HTMLDivElement>(null);
  const max = Math.max(0.5, ...days.map((d) => Math.max(d.solarKwh, d.homeKwh)));
  const total = days.reduce((a, d) => a + d.solarKwh, 0);
  const avg = days.length ? total / days.length : 0;
  const shown = active ?? days.length - 1;
  const day = days[shown];

  const weekday = (key: string, style: "short" | "long") => new Date(`${key}T12:00:00Z`).toLocaleDateString("en-US", { weekday: style, timeZone: "UTC" });

  /** Scrub with a finger or the pointer: the nearest day follows along. */
  const scrub = (clientX: number) => {
    const el = plot.current;
    if (!el || !days.length) return;
    const r = el.getBoundingClientRect();
    const i = Math.floor(((clientX - r.left) / r.width) * days.length);
    setActive(Math.min(days.length - 1, Math.max(0, i)));
  };

  if (!day) return null;
  const covered = day.homeKwh > 0 ? Math.min(1, day.solarKwh / day.homeKwh) : 1;

  return (
    <Card className={cn("relative isolate flex flex-col overflow-hidden", className)} aria-labelledby="week-title">
      <div
        aria-hidden
        className="bg-sun pointer-events-none absolute -bottom-28 left-1/2 -z-10 h-48 w-[80%] -translate-x-1/2 rounded-full opacity-[0.12] blur-3xl"
      />
      <CardHeader
        id="week-title"
        title="Last 7 days"
        action={
          <Link
            href="/trends?range=week"
            className="group/link text-ink-2 hover:text-ink border-line hover:border-line-strong inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-semibold transition-colors"
          >
            Trends
            <ArrowRight className="size-3.5 transition-transform group-hover/link:translate-x-0.5" />
          </Link>
        }
      />
      <div className="mt-3">
        <p className="tabular text-[30px] leading-tight font-bold tracking-tight">
          <AnimatedNumber value={total} format={(n) => formatUnits(n)} /> <span className="text-ink-3 text-sm font-semibold">units made</span>
        </p>
        <div className="mt-1 h-5 overflow-hidden" aria-live="polite">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.p
              key={day.date}
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -14, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className="text-ink-2 text-[13px]"
            >
              <strong className="text-ink">{day.date === today ? "Today" : weekday(day.date, "long")}</strong>: {formatUnits(day.solarKwh)} made ·{" "}
              {formatUnits(day.homeKwh)} used · <span className="text-home-ink font-semibold">{Math.round(covered * 100)}% covered</span>
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-5 flex min-h-[170px] flex-1 flex-col">
        <div
          ref={plot}
          className="relative flex min-h-[140px] flex-1 touch-pan-y gap-2 pt-3"
          role="list"
          aria-label="Units made by your panels each day"
          onPointerMove={(e) => scrub(e.clientX)}
          onPointerDown={(e) => scrub(e.clientX)}
          onPointerLeave={() => setActive(null)}
        >
          {/* Daily average guide, in the same box the bars are measured against */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-3 bottom-0">
            <div className="border-line-strong absolute inset-x-0 border-t border-dashed" style={{ bottom: `${(avg / max) * 100}%` }}>
              <span className="text-ink-3 bg-surface/80 absolute -top-2.5 right-0 rounded px-1 text-[10px] font-semibold backdrop-blur">
                avg {formatUnits(avg)}
              </span>
            </div>
          </div>

          {days.map((d, i) => {
            const h = Math.max(3, (d.solarKwh / max) * 100);
            const used = Math.max(3, (d.homeKwh / max) * 100);
            const isToday = d.date === today;
            const on = shown === i;
            return (
              <button
                key={d.date}
                role="listitem"
                type="button"
                className="group relative flex-1 outline-none"
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                aria-label={`${weekday(d.date, "long")}: ${formatUnits(d.solarKwh)} units made, ${formatUnits(d.homeKwh)} used`}
              >
                {/* What the home used, as a ghost bar behind */}
                <motion.span
                  aria-hidden
                  className="border-ink-3/70 absolute bottom-0 left-1/2 w-full max-w-[38px] -translate-x-1/2 rounded-t-[8px] rounded-b-[3px] border border-dashed bg-[color-mix(in_oklab,var(--ink)_5%,transparent)]"
                  initial={reduce ? false : { height: 0 }}
                  animate={{ height: `${used}%`, opacity: on ? 1 : 0.6 }}
                  transition={{ type: "spring", stiffness: 120, damping: 18, delay: reduce ? 0 : i * 0.05 }}
                />
                <motion.span
                  className="group-focus-visible:outline-ink absolute bottom-0 left-1/2 block w-full max-w-[30px] -translate-x-1/2 overflow-hidden rounded-t-[8px] rounded-b-[3px] group-focus-visible:outline-2 group-focus-visible:outline-offset-2"
                  style={{
                    background:
                      "linear-gradient(180deg, color-mix(in oklab, var(--sun) 70%, white), var(--sun) 40%, color-mix(in oklab, var(--sun) 55%, transparent))",
                  }}
                  initial={reduce ? false : { height: 0 }}
                  animate={{
                    height: `${h}%`,
                    opacity: on ? 1 : isToday ? 0.75 : 0.45,
                    boxShadow: on ? "0 0 22px -2px color-mix(in oklab, var(--sun) 75%, transparent)" : "0 0 0 0 transparent",
                  }}
                  transition={{ type: "spring", stiffness: 140, damping: 16, delay: reduce ? 0 : i * 0.05 }}
                >
                  <span className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/30 to-transparent" />
                </motion.span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex gap-2" aria-hidden>
          {days.map((d, i) => (
            <span
              key={d.date}
              className={cn(
                "flex-1 text-center text-[11px] font-semibold transition-colors",
                shown === i ? "text-ink" : d.date === today ? "text-ink-2" : "text-ink-3",
              )}
            >
              {d.date === today ? "Today" : weekday(d.date, "short")}
            </span>
          ))}
        </div>
      </div>
      <p className="text-ink-3 mt-3 flex items-center gap-3 text-[11px]">
        <span className="flex items-center gap-1.5">
          <span className="bg-sun size-2 rounded-sm" /> Made
        </span>
        <span className="flex items-center gap-1.5">
          <span className="border-ink-3/70 size-2 rounded-sm border border-dashed" /> Used
        </span>
      </p>
    </Card>
  );
}
