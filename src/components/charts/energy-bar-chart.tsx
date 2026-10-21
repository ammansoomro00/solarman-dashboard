"use client";

import { useReducedMotion } from "motion/react";
import { useId } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { EnergyBar, Range } from "@/lib/data/types";
import { METRIC_SERIES, type Metric } from "./series";
import { formatUnits } from "@/lib/format";
import { ChartTooltipBox } from "./chart-tooltip";

function label(range: Range, date: string, long = false) {
  const d = new Date(`${date}T12:00:00Z`);
  if (range === "year") return d.toLocaleDateString("en-US", { month: long ? "long" : "short", year: long ? "numeric" : undefined, timeZone: "UTC" });
  if (range === "week")
    return d.toLocaleDateString("en-US", long ? { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" } : { weekday: "short", timeZone: "UTC" });
  return long ? d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }) : String(d.getUTCDate());
}

export function EnergyBarChart({ bars, range, metric, height = 300 }: { bars: EnergyBar[]; range: Range; metric: Metric; height?: number }) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const series = METRIC_SERIES[metric];
  const data: Array<Record<string, number | string>> = bars.map((b) => ({
    date: b.date,
    ...Object.fromEntries(series.map((s) => [s.key, Math.round(s.value(b) * 10) / 10])),
  }));
  const stacked = series.some((s) => s.stack);
  const heights = data.map((d) => (stacked ? series.reduce((a, s) => a + Number(d[s.key]), 0) : Math.max(...series.map((s) => Number(d[s.key])))));
  const max = Math.max(1, ...heights);

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -8 }} barCategoryGap={range === "month" ? "18%" : "28%"} barGap={3}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`${uid}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={`color-mix(in oklab, ${s.color} 75%, white)`} />
                <stop offset="45%" stopColor={s.color} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0.55} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="2 6" />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => label(range, d)}
            tick={{ fill: "var(--ink-3)", fontSize: 11 }}
            axisLine={{ stroke: "var(--line-strong)" }}
            tickLine={false}
            interval={range === "month" ? "preserveStartEnd" : 0}
            minTickGap={4}
          />
          <YAxis
            domain={[0, Math.ceil(max * 1.1)]}
            tickFormatter={(v: number) => formatUnits(v, 0)}
            tick={{ fill: "var(--ink-3)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={44}
            tickCount={4}
            label={{ value: "units", angle: -90, position: "insideLeft", offset: 18, fill: "var(--ink-3)", fontSize: 11 }}
          />
          <Tooltip
            cursor={{ fill: "color-mix(in oklab, var(--ink) 5%, transparent)", radius: 10 }}
            isAnimationActive={false}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload as Record<string, number | string>;
              return (
                <ChartTooltipBox
                  title={label(range, String(row.date), true)}
                  rows={series.map((s) => ({ label: s.label, value: `${formatUnits(Number(row[s.key]))} units`, color: s.color }))}
                />
              );
            }}
          />
          {series.map((s, i) => {
            const top = !stacked || i === series.length - 1;
            return (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                stackId={s.stack}
                fill={`url(#${uid}-${s.key})`}
                radius={top ? [6, 6, 2, 2] : [0, 0, 2, 2]}
                stroke="var(--surface)"
                strokeWidth={stacked ? 1 : 0}
                maxBarSize={range === "month" ? 18 : 40}
                activeBar={{ style: { filter: `drop-shadow(0 0 8px color-mix(in oklab, ${s.color} 70%, transparent))` } }}
                isAnimationActive={!reduce}
                animationBegin={i * 120}
                animationDuration={900}
                animationEasing="ease-out"
              />
            );
          })}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
