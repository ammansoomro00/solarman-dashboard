"use client";

import { useReducedMotion } from "motion/react";
import { useId, useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SeriesPoint } from "@/lib/data/types";
import { formatPower, powerText } from "@/lib/format";
import { ChartTooltipBox } from "./chart-tooltip";

const HOUR = 3_600_000;

/**
 * Solar vs home use through one day, with the battery level as its own strip below
 * (separate 0–100% scale, so never a second axis on the power chart).
 */
export function PowerDayChart({
  points,
  dayStart,
  timeZone,
  height = 240,
  showBattery = true,
  compact = false,
}: {
  points: SeriesPoint[];
  dayStart: number;
  timeZone: string;
  height?: number;
  showBattery?: boolean;
  compact?: boolean;
}) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const data = useMemo(() => points.map((p) => ({ ...p, buy: Math.max(0, p.gridW) })), [points]);
  const ticks = useMemo(() => [0, 6, 12, 18, 24].map((h) => dayStart + h * HOUR), [dayStart]);
  const hourLabel = (t: number) => new Date(t).toLocaleTimeString("en-US", { hour: "numeric", timeZone }).replace(" ", "").toLowerCase();
  const timeLabel = (t: number) => new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone });
  const maxW = Math.max(500, ...data.map((d) => Math.max(d.solarW, d.homeW)));
  const last = data.length - 1;
  const anim = { isAnimationActive: !reduce, animationDuration: 1400, animationEasing: "ease-out" as const };

  if (!data.length) {
    return (
      <div className="bg-surface-2/60 border-line text-ink-3 grid place-items-center rounded-2xl border text-sm" style={{ height }}>
        No readings for this day yet.
      </div>
    );
  }

  /** Pulsing "now" marker on the newest reading; nothing on the others. */
  const nowDot = (color: string) =>
    function NowDot({ cx, cy, index }: { cx?: number; cy?: number; index?: number }) {
      if (index !== last || cx == null || cy == null) return <g key={`d-${index}`} />;
      return (
        <g key={`d-${index}`}>
          {!reduce && (
            <circle cx={cx} cy={cy} r={4} fill={color} opacity={0.5}>
              <animate attributeName="r" values="4;13" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.5;0" dur="2s" repeatCount="indefinite" />
            </circle>
          )}
          <circle cx={cx} cy={cy} r={4.5} fill={color} stroke="var(--surface)" strokeWidth={2} />
        </g>
      );
    };

  const yWidth = compact ? 58 : 64;

  return (
    <div className="[&_.curve-glow-home_.recharts-area-curve]:[filter:drop-shadow(0_0_5px_color-mix(in_oklab,var(--home)_70%,transparent))] [&_.curve-glow-sun_.recharts-area-curve]:[filter:drop-shadow(0_0_6px_color-mix(in_oklab,var(--sun)_80%,transparent))]">
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: 0 }} syncId="day">
            <defs>
              <linearGradient id={`${uid}-sun`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--sun)" stopOpacity={0.55} />
                <stop offset="60%" stopColor="var(--sun)" stopOpacity={0.14} />
                <stop offset="100%" stopColor="var(--sun)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id={`${uid}-home`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--home)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--home)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="2 6" />
            <XAxis
              dataKey="t"
              type="number"
              domain={[dayStart, dayStart + 24 * HOUR]}
              ticks={ticks}
              tickFormatter={hourLabel}
              tick={{ fill: "var(--ink-3)", fontSize: 11 }}
              axisLine={{ stroke: "var(--line-strong)" }}
              tickLine={false}
              hide={showBattery}
            />
            <YAxis
              domain={[0, Math.ceil(maxW / 500) * 500]}
              tickFormatter={(w: number) => (w === 0 ? "0" : powerText(w))}
              tick={{ fill: "var(--ink-3)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={yWidth}
              tickCount={4}
            />
            <Tooltip
              cursor={<Crosshair />}
              isAnimationActive={false}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as (typeof data)[number];
                return (
                  <ChartTooltipBox
                    title={timeLabel(p.t)}
                    rows={[
                      { label: "Solar made", value: powerText(p.solarW), color: "var(--sun)" },
                      { label: "Home used", value: powerText(p.homeW), color: "var(--home)" },
                      ...(p.buy > 0 ? [{ label: "Bought", value: powerText(p.buy), color: "var(--grid)" }] : []),
                      ...(p.batteryPct !== null ? [{ label: "Battery", value: `${Math.round(p.batteryPct)}%`, color: "var(--battery)" }] : []),
                    ]}
                  />
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="homeW"
              name="Home used"
              className="curve-glow-home"
              stroke="var(--home)"
              strokeWidth={2}
              fill={`url(#${uid}-home)`}
              {...anim}
              dot={nowDot("var(--home)")}
              activeDot={{ r: 5, strokeWidth: 2.5, stroke: "var(--surface)", fill: "var(--home)" }}
            />
            <Area
              type="monotone"
              dataKey="solarW"
              name="Solar made"
              className="curve-glow-sun"
              stroke="var(--sun)"
              strokeWidth={2.5}
              fill={`url(#${uid}-sun)`}
              {...anim}
              dot={nowDot("var(--sun)")}
              activeDot={{ r: 5.5, strokeWidth: 2.5, stroke: "var(--surface)", fill: "var(--sun)" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {showBattery && (
        <div className="mt-1" style={{ height: 64 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} syncId="day">
              <defs>
                <linearGradient id={`${uid}-bat`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--battery)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="var(--battery)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="t"
                type="number"
                domain={[dayStart, dayStart + 24 * HOUR]}
                ticks={ticks}
                tickFormatter={hourLabel}
                tick={{ fill: "var(--ink-3)", fontSize: 11 }}
                axisLine={{ stroke: "var(--line-strong)" }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 100]}
                tickFormatter={(v: number) => `${v}%`}
                tick={{ fill: "var(--ink-3)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={yWidth}
              />
              <Tooltip content={() => null} cursor={<Crosshair />} isAnimationActive={false} />
              <Area
                type="monotone"
                dataKey="batteryPct"
                name="Battery level"
                stroke="var(--battery)"
                strokeWidth={1.75}
                fill={`url(#${uid}-bat)`}
                {...anim}
                dot={nowDot("var(--battery)")}
                activeDot={{ r: 3.5, strokeWidth: 2, stroke: "var(--surface)", fill: "var(--battery)" }}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/** Scrubber line: a soft vertical beam rather than a hard dashed rule. Recharts passes the line's points. */
function Crosshair({ points, height }: { points?: Array<{ x: number; y: number }>; height?: number }) {
  if (!points?.length) return null;
  const x = points[0].x;
  const top = Math.min(points[0].y, points[1]?.y ?? points[0].y);
  const h = height ?? Math.abs((points[1]?.y ?? top) - points[0].y);
  return (
    <g pointerEvents="none">
      <rect x={x - 14} y={top} width={28} height={h} fill="var(--ink)" opacity={0.04} rx={8} />
      <line x1={x} x2={x} y1={top} y2={top + h} stroke="var(--ink-3)" strokeOpacity={0.6} strokeWidth={1} />
    </g>
  );
}

export function peakText(points: SeriesPoint[]) {
  const peak = points.reduce((a, p) => (p.solarW > a.solarW ? p : a), points[0]);
  return peak ? formatPower(peak.solarW) : null;
}
