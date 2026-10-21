"use client";

import { ChartColumn, ChevronLeft, ChevronRight, Download, House, Sun, Table2, UtilityPole } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Legend } from "@/components/charts/chart-tooltip";
import { METRIC_SERIES } from "@/components/charts/series";
import { LazyEnergyBarChart, LazyPowerDayChart } from "@/components/charts/lazy";
import { Card, CardHeader } from "@/components/overview/card";
import { Button } from "@/components/ui/button";
import { Hint } from "@/components/ui/hint";
import { Segmented } from "@/components/ui/segmented";
import type { View } from "@/lib/data/params";
import { periodLabel, previousLabel, shiftPeriod } from "@/lib/data/period";
import type { AnalyticsData, Range } from "@/lib/data/types";
import type { Insights } from "@/lib/energy/insights";
import { formatUnits, powerText } from "@/lib/format";
import { SourceSplit } from "./source-split";
import { ImpactTiles, SavedHero, TrendStat } from "./trend-stats";

const RANGE_OPTIONS = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
] as const;

const VIEW_OPTIONS = [
  { value: "sun", label: "Sunshine" },
  { value: "home", label: "Home use" },
  { value: "grid", label: "Bought & sold" },
  { value: "battery", label: "Battery" },
] as const;

const VIEW_COLOR: Record<View, string> = { sun: "var(--sun)", home: "var(--home)", grid: "var(--grid)", battery: "var(--battery)" };

const VIEW_TEXT: Record<View, string> = {
  sun: "Units of electricity your solar panels made.",
  home: "Everything your home used, split into what your own system supplied and what you bought.",
  grid: "Units bought from the power company and spare units sold back to it.",
  battery: "Units stored in your battery and units it later gave back to your home.",
};

const EASE = [0.22, 1, 0.36, 1] as const;

export function TrendsView({
  data,
  view,
  timeZone,
  dayStart,
  currency,
  insights,
  previousInsights,
}: {
  data: AnalyticsData;
  view: View;
  timeZone: string;
  dayStart: number;
  currency: string;
  insights: Insights;
  previousInsights: Insights | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [table, setTable] = useState(false);
  // Which way the period label slides: -1 back in time, 1 forward.
  const [dir, setDir] = useState(0);

  const go = (next: Partial<{ range: Range; date: string; view: View }>, direction = 0) => {
    setDir(direction);
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) q.set(k, v);
    startTransition(() => router.push(`${pathname}?${q.toString()}`, { scroll: false }));
  };

  const { range, start, end, earliest, latest, totals, previous } = data;
  const compareTo = previousLabel(range, data.partial);
  const canBack = start > earliest;
  const canForward = end < latest;
  const label = periodLabel(range, start, end, latest);
  const exportHref = `/api/export?range=${range}&date=${data.anchor}`;

  const stats = [
    { label: "Made by your panels", value: totals.solarKwh, prev: previous?.solarKwh, unit: "units", good: "up" as const, color: "var(--sun)", icon: Sun },
    { label: "Used by your home", value: totals.homeKwh, prev: previous?.homeKwh, unit: "units", good: "down" as const, color: "var(--home)", icon: House },
    {
      label: "Bought from power company",
      value: totals.boughtKwh,
      prev: previous?.boughtKwh,
      unit: "units",
      good: "down" as const,
      color: "var(--grid)",
      icon: UtilityPole,
    },
  ];

  // Where the home's power came from over the period.
  const fromBattery = Math.min(totals.dischargedKwh, totals.homeKwh);
  const fromGrid = Math.min(totals.boughtKwh, totals.homeKwh);
  const fromSun = Math.max(0, totals.homeKwh - fromBattery - fromGrid);
  const sources = [
    { label: "Straight from your panels", value: fromSun, color: "var(--sun)" },
    { label: "From your battery", value: fromBattery, color: "var(--battery)" },
    { label: "Bought from power company", value: fromGrid, color: "var(--grid)" },
  ];
  const chartColor = range === "day" ? "var(--sun)" : VIEW_COLOR[view];

  return (
    <div className="space-y-4 lg:space-y-5">
      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented label="Time range" value={range} onChange={(r) => go({ range: r })} options={RANGE_OPTIONS} />
        <div className="border-line bg-surface/70 flex items-center gap-1 self-start rounded-full border p-1 shadow-[var(--shadow-card)] backdrop-blur-xl sm:self-auto">
          <Button
            size="icon-sm"
            variant="ghost"
            className="rounded-full"
            onClick={() => go({ date: shiftPeriod(range, data.anchor, -1) }, -1)}
            disabled={!canBack || pending}
            aria-label="Previous period"
          >
            <ChevronLeft />
          </Button>
          <div className="relative min-w-[160px] overflow-hidden text-center">
            <AnimatePresence mode="popLayout" initial={false} custom={dir}>
              <motion.p
                key={label}
                custom={dir}
                variants={{
                  enter: (d: number) => ({ opacity: 0, x: d * 24, filter: "blur(4px)" }),
                  center: { opacity: 1, x: 0, filter: "blur(0px)" },
                  exit: (d: number) => ({ opacity: 0, x: d * -24, filter: "blur(4px)" }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className="text-[15px] font-bold tracking-tight"
              >
                {label}
              </motion.p>
            </AnimatePresence>
          </div>
          <Button
            size="icon-sm"
            variant="ghost"
            className="rounded-full"
            onClick={() => go({ date: shiftPeriod(range, data.anchor, 1) }, 1)}
            disabled={!canForward || pending}
            aria-label="Next period"
          >
            <ChevronRight />
          </Button>
          <AnimatePresence initial={false}>
            {canForward && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden"
              >
                <Button size="sm" variant="ghost" className="rounded-full whitespace-nowrap" onClick={() => go({ date: latest }, 1)} disabled={pending}>
                  Back to today
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <motion.div
        animate={{ opacity: pending ? 0.55 : 1, filter: pending ? "blur(2px) saturate(0.8)" : "blur(0px) saturate(1)" }}
        transition={{ duration: 0.25 }}
        className="space-y-4 lg:space-y-5"
        aria-busy={pending}
      >
        {/* Headline numbers */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
          {stats.map((s) => (
            <TrendStat key={s.label} {...s} compareTo={compareTo} />
          ))}
          <SavedHero insights={insights} previous={previousInsights} currency={currency} compareTo={compareTo} />
        </div>

        {/* Main chart */}
        <Card className="relative isolate overflow-hidden" aria-labelledby="trend-chart-title">
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -top-40 -left-24 -z-10 size-[420px] rounded-full opacity-[0.13] blur-3xl"
            animate={{ backgroundColor: chartColor }}
            transition={{ duration: 0.8 }}
          />
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={range === "day" ? "day" : view}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <CardHeader id="trend-chart-title" title={range === "day" ? "Power through the day" : VIEW_OPTIONS.find((v) => v.value === view)!.label} />
                <p className="text-ink-2 mt-1 max-w-lg text-[13px]">
                  {range === "day" ? "How strong the sun was and how much power your home was using, moment by moment." : VIEW_TEXT[view]}
                </p>
              </motion.div>
            </AnimatePresence>
            <div className="flex items-center gap-2">
              {range !== "day" && (
                <Segmented
                  size="sm"
                  label="What to show"
                  value={view}
                  onChange={(v) => go({ view: v })}
                  options={VIEW_OPTIONS}
                  className="max-w-full overflow-x-auto"
                />
              )}
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => setTable((t) => !t)}
                aria-pressed={table}
                aria-label={table ? "Show as chart" : "Show as table"}
                title={table ? "Show as chart" : "Show as table"}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={table ? "chart" : "table"}
                    initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
                    transition={{ duration: 0.18 }}
                    className="grid place-items-center"
                  >
                    {table ? <ChartColumn /> : <Table2 />}
                  </motion.span>
                </AnimatePresence>
              </Button>
            </div>
          </div>

          <div className="mt-4">
            <Legend
              items={
                range === "day"
                  ? [
                      { label: "Solar made", color: "var(--sun)" },
                      { label: "Home used", color: "var(--home)" },
                      { label: "Battery level", color: "var(--battery)" },
                    ]
                  : METRIC_SERIES[view].map((s) => ({ label: s.label, color: s.color }))
              }
            />
          </div>

          <div className="mt-4">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={table ? "table" : `chart-${range}-${view}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3, ease: EASE }}
              >
                {table ? (
                  <DataTable data={data} view={view} timeZone={timeZone} />
                ) : range === "day" ? (
                  <LazyPowerDayChart points={data.power} dayStart={dayStart} timeZone={timeZone} height={280} />
                ) : (
                  <LazyEnergyBarChart bars={data.bars} range={range} metric={view} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
          {/* Where power came from */}
          <Card className="relative isolate overflow-hidden lg:col-span-7" aria-labelledby="sources-title">
            <div aria-hidden className="pointer-events-none absolute -right-24 -bottom-32 -z-10 size-80 rounded-full bg-[var(--sun)] opacity-[0.1] blur-3xl" />
            <CardHeader
              id="sources-title"
              title="Where your home's power came from"
              hint={
                <Hint>
                  Every unit your home used came from one of three places: directly from the panels, from power stored earlier in the battery, or bought from
                  the power company.
                </Hint>
              }
            />
            {totals.homeKwh < 0.05 ? <p className="text-ink-3 mt-6 text-sm">No usage recorded for this period.</p> : <SourceSplit sources={sources} />}
          </Card>

          {/* Money & planet */}
          <Card className="relative isolate overflow-hidden lg:col-span-5" aria-labelledby="period-impact-title">
            <div aria-hidden className="pointer-events-none absolute -top-24 -right-20 -z-10 size-72 rounded-full bg-[var(--home)] opacity-[0.12] blur-3xl" />
            <CardHeader id="period-impact-title" title="Money and planet" />
            <ImpactTiles insights={insights} currency={currency} />
            <a
              href={exportHref}
              className="group/dl border-line bg-surface-2/70 text-ink-2 hover:text-ink hover:border-line-strong mt-5 inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors"
              download
            >
              <Download className="size-4 transition-transform group-hover/dl:translate-y-0.5" /> Download this {range} as a spreadsheet (CSV)
            </a>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}

function DataTable({ data, view, timeZone }: { data: AnalyticsData; view: View; timeZone: string }) {
  if (data.range === "day") {
    const rows = data.power.filter((_, i) => i % 6 === 0); // every 30 minutes
    return (
      <div className="border-line max-h-[340px] overflow-auto rounded-2xl border">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-surface-2/95 text-ink-3 sticky top-0 text-xs backdrop-blur">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Time</th>
              <th className="px-4 py-2.5 font-semibold">Solar made</th>
              <th className="px-4 py-2.5 font-semibold">Home used</th>
              <th className="px-4 py-2.5 font-semibold">Battery</th>
            </tr>
          </thead>
          <tbody className="tabular">
            {rows.map((p) => (
              <tr key={p.t} className="border-line hover:bg-surface-2 border-t transition-colors">
                <td className="px-4 py-2">{new Date(p.t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone })}</td>
                <td className="px-4 py-2">{powerText(p.solarW)}</td>
                <td className="px-4 py-2">{powerText(p.homeW)}</td>
                <td className="px-4 py-2">{p.batteryPct !== null ? `${Math.round(p.batteryPct)}%` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  const series = METRIC_SERIES[view];
  return (
    <div className="border-line max-h-[340px] overflow-auto rounded-2xl border">
      <table className="w-full text-left text-[13px]">
        <thead className="bg-surface-2/95 text-ink-3 sticky top-0 text-xs backdrop-blur">
          <tr>
            <th className="px-4 py-2.5 font-semibold">{data.range === "year" ? "Month" : "Day"}</th>
            {series.map((s) => (
              <th key={s.key} className="px-4 py-2.5 font-semibold">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="tabular">
          {data.bars.map((b) => (
            <tr key={b.date} className="border-line hover:bg-surface-2 border-t transition-colors">
              <td className="px-4 py-2">
                {new Date(`${b.date}T12:00:00Z`).toLocaleDateString(
                  "en-US",
                  data.range === "year" ? { month: "long", timeZone: "UTC" } : { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" },
                )}
              </td>
              {series.map((s) => (
                <td key={s.key} className="px-4 py-2">
                  {formatUnits(s.value(b))} units
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
