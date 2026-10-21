"use client";

import { Sun } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Legend } from "@/components/charts/chart-tooltip";
import { LazyPowerDayChart } from "@/components/charts/lazy";
import type { SeriesPoint } from "@/lib/data/types";
import { formatUnits, powerText } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, CardHeader } from "./card";

export function CurveCard({ points, dayStart, timeZone, className }: { points: SeriesPoint[]; dayStart: number; timeZone: string; className?: string }) {
  const reduce = useReducedMotion();
  const peak = points.reduce<SeriesPoint | null>((a, p) => (!a || p.solarW > a.solarW ? p : a), null);
  const peakTime = peak ? new Date(peak.t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone }) : null;
  const sunny = !!peak && peak.solarW > 15;

  // Units made and used so far, integrated from the readings (trapezoids between samples).
  let made = 0;
  let used = 0;
  for (let i = 1; i < points.length; i++) {
    const h = (points[i].t - points[i - 1].t) / 3_600_000;
    if (h <= 0 || h > 2) continue;
    made += ((points[i].solarW + points[i - 1].solarW) / 2) * h;
    used += ((points[i].homeW + points[i - 1].homeW) / 2) * h;
  }

  return (
    <Card className={cn("relative isolate flex flex-col overflow-hidden", className)} aria-labelledby="curve-title">
      <div aria-hidden className="bg-sun pointer-events-none absolute -top-32 left-1/3 -z-10 h-56 w-[60%] rounded-full opacity-[0.1] blur-3xl" />
      <CardHeader
        id="curve-title"
        title="Today's sun and usage"
        action={
          <Legend
            items={[
              { label: "Solar made", color: "var(--sun)" },
              { label: "Home used", color: "var(--home)" },
              { label: "Battery", color: "var(--battery)" },
            ]}
          />
        }
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {sunny ? (
          <motion.span
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-sun-soft text-sun-ink inline-flex items-center gap-1.5 rounded-full py-1 pr-3 pl-1.5 text-[12.5px] font-semibold"
          >
            <motion.span
              className="bg-sun grid size-5 place-items-center rounded-full text-white"
              style={{ boxShadow: "0 0 12px var(--sun)" }}
              animate={reduce ? undefined : { rotate: 360 }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            >
              <Sun className="size-3" />
            </motion.span>
            Strongest sun <strong className="text-ink">{powerText(peak!.solarW)}</strong> at {peakTime}
          </motion.span>
        ) : (
          <span className="text-ink-2 text-[13px]">The sun hasn&apos;t come up enough to make power yet.</span>
        )}
        {made > 0 && (
          <span className="border-line text-ink-2 rounded-full border px-3 py-1 text-[12.5px]">
            <strong className="tabular text-ink">{formatUnits(made / 1000)}</strong> made ·{" "}
            <strong className="tabular text-ink">{formatUnits(used / 1000)}</strong> used
          </span>
        )}
      </div>
      <div className="mt-4">
        <LazyPowerDayChart points={points} dayStart={dayStart} timeZone={timeZone} compact />
      </div>
    </Card>
  );
}
