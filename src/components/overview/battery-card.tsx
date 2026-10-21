"use client";

import { ArrowDown, ArrowUp, Hourglass, Thermometer } from "lucide-react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useId } from "react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Hint } from "@/components/ui/hint";
import type { BatteryState } from "@/lib/energy/flow";
import { durationText, formatUnits, powerText } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, CardHeader } from "./card";

const STATE_TEXT: Record<BatteryState, string> = {
  charging: "Charging",
  discharging: "Powering your home",
  idle: "Standing by",
  full: "Full",
  empty: "Empty",
};

// The cell, on a 100 × 168 canvas.
const CELL = { x: 8, y: 14, w: 84, h: 148, r: 22 };

export function BatteryCard({
  pct,
  state,
  eta,
  capacityKwh,
  tempC,
  powerW,
  homeW,
  className,
}: {
  pct: number | null;
  state: BatteryState;
  eta: { kind: "untilEmpty" | "untilFull"; hours: number } | null;
  capacityKwh: number | null;
  tempC: number | null;
  /** > 0 powering the home, < 0 charging */
  powerW: number;
  /** What the home is using right now, for the "on battery alone" estimate. */
  homeW: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const level = pct ?? 0;
  const low = level <= 20 && state !== "charging";

  const etaText = eta
    ? eta.kind === "untilEmpty"
      ? `Lasts about ${durationText(eta.hours)} at this rate`
      : `Full in about ${durationText(eta.hours)}`
    : state === "full"
      ? "Ready for tonight or a power cut"
      : "Not charging or being used right now";

  // Pointer position tilts the cell and sloshes the liquid.
  const px = useMotionValue(0);
  const tilt = useSpring(useTransform(px, [-0.5, 0.5], [-9, 9]), { stiffness: 90, damping: 9, mass: 0.8 });
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-14, 14]), { stiffness: 150, damping: 20 });

  const color = low ? "var(--bad)" : "var(--battery)";

  return (
    <Card
      className={cn("relative isolate flex flex-col overflow-hidden", className)}
      aria-labelledby="battery-title"
      onPointerMove={(e) => {
        if (reduce) return;
        const r = e.currentTarget.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width - 0.5);
      }}
      onPointerLeave={() => px.set(0)}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-20 -z-10 size-72 rounded-full opacity-20 blur-3xl transition-colors"
        style={{ background: color }}
      />
      <CardHeader
        id="battery-title"
        title="Battery"
        hint={<Hint>Your battery stores spare solar power so you can use it at night or during a power cut.</Hint>}
      />

      <div className="mt-3 flex flex-1 items-center gap-6 py-1">
        <div className="[perspective:600px]">
          <motion.div style={{ rotateY }} className="relative h-[200px] w-[120px] shrink-0">
            <LiquidCell level={level} state={state} color={color} tilt={tilt} reduce={!!reduce} known={pct !== null} />
          </motion.div>
        </div>

        <div className="min-w-0">
          <p className="tabular text-[44px] leading-none font-bold tracking-tight">
            {pct === null ? "—" : <AnimatedNumber value={level} format={(n) => String(Math.round(n))} />}
            <span className="text-ink-3 text-lg font-semibold">%</span>
          </p>
          <p className={cn("mt-2 text-[17px] font-bold tracking-tight", low && "text-bad-ink")}>{low ? "Running low" : STATE_TEXT[state]}</p>
          <p className="text-ink-2 mt-1 text-sm leading-snug">{etaText}</p>
          {Math.abs(powerW) >= 15 && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold"
              style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color: `color-mix(in oklab, ${color} 60%, var(--ink))` }}
            >
              {powerW < 0 ? <ArrowDown className="size-3.5" /> : <ArrowUp className="size-3.5" />}
              {powerW < 0 ? "In" : "Out"} · {powerText(powerW)}
            </motion.p>
          )}
        </div>
      </div>

      <BackupTime pct={pct} capacityKwh={capacityKwh} homeW={homeW} reduce={!!reduce} />

      <dl className="grid grid-cols-2 gap-3 pt-3">
        <div className="rounded-tile bg-surface-2 border-line border px-4 py-3">
          <dt className="text-ink-3 text-xs">Stored now</dt>
          <dd className="tabular mt-0.5 text-[15px] font-bold">
            {capacityKwh && pct !== null ? (
              <>
                {formatUnits((capacityKwh * level) / 100)}
                <span className="text-ink-3 font-semibold"> / {formatUnits(capacityKwh)} units</span>
              </>
            ) : (
              "—"
            )}
          </dd>
          <div className="bg-surface-sunk mt-2 flex h-1.5 gap-0.5 overflow-hidden rounded-full">
            {Array.from({ length: 10 }, (_, i) => (
              <motion.span
                key={i}
                className="h-full flex-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: level / 10 > i ? 1 : 0.12 }}
                transition={{ delay: 0.2 + i * 0.04 }}
                style={{ background: color }}
              />
            ))}
          </div>
        </div>
        <TemperatureTile tempC={tempC} />
      </dl>
    </Card>
  );
}

function LiquidCell({
  level,
  state,
  color,
  tilt,
  reduce,
  known,
}: {
  level: number;
  state: BatteryState;
  color: string;
  tilt: ReturnType<typeof useSpring>;
  reduce: boolean;
  known: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const surfaceY = CELL.y + CELL.h * (1 - Math.min(100, Math.max(0, level)) / 100);
  const fullGlow = level >= 95;
  const waveAmp = state === "charging" || state === "discharging" ? 4 : 2.5;

  return (
    <svg viewBox="0 0 100 168" className="size-full overflow-visible" role="img" aria-label={known ? `Battery ${Math.round(level)}% charged` : "Battery level unknown"}>
      <defs>
        <clipPath id={`${id}-clip`}>
          <rect x={CELL.x + 4} y={CELL.y + 4} width={CELL.w - 8} height={CELL.h - 8} rx={CELL.r - 4} />
        </clipPath>
        <linearGradient id={`${id}-liquid`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={`color-mix(in oklab, ${color} 65%, white)`} />
          <stop offset="0.35" stopColor={color} />
          <stop offset="1" stopColor={`color-mix(in oklab, ${color} 70%, black)`} />
        </linearGradient>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="white" stopOpacity="0.16" />
          <stop offset="0.25" stopColor="white" stopOpacity="0.02" />
          <stop offset="0.8" stopColor="white" stopOpacity="0" />
          <stop offset="1" stopColor="white" stopOpacity="0.08" />
        </linearGradient>
      </defs>

      {/* Outer glow when full or active */}
      <rect
        x={CELL.x}
        y={CELL.y}
        width={CELL.w}
        height={CELL.h}
        rx={CELL.r}
        fill="none"
        stroke={color}
        strokeWidth={10}
        opacity={fullGlow || state === "charging" ? 0.18 : 0.06}
        style={{ filter: "blur(8px)" }}
      />
      {/* Terminal cap */}
      <rect x={36} y={4} width={28} height={12} rx={4} fill="var(--surface-2)" stroke="var(--line-strong)" />
      <rect x={42} y={7} width={16} height={3} rx={1.5} fill={color} opacity={state === "charging" ? 0.9 : 0.35} />
      {/* Glass body */}
      <rect x={CELL.x} y={CELL.y} width={CELL.w} height={CELL.h} rx={CELL.r} fill="var(--surface-sunk)" stroke="var(--line-strong)" strokeWidth={1.2} />

      <g clipPath={`url(#${id}-clip)`}>
        <motion.g
          initial={{ y: CELL.y + CELL.h }}
          animate={{ y: surfaceY }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 40, damping: 12, mass: 1.2 }}
        >
          <motion.g style={{ rotate: tilt, originX: "50px", originY: "0px" }}>
            {/* Back wave (lighter, slower) */}
            <g style={{ animation: reduce ? undefined : "wave-slide 5.5s linear infinite" }}>
              <path d={wavePath(waveAmp * 0.8, 1)} fill={color} opacity={0.35} />
            </g>
            {/* Front wave */}
            <g style={{ animation: reduce ? undefined : "wave-slide 3.2s linear infinite reverse" }}>
              <path d={wavePath(waveAmp, 0)} fill={`url(#${id}-liquid)`} />
            </g>
          </motion.g>
        </motion.g>

        {/* Bubbles rise while charging; sparks drift down while discharging */}
        {!reduce &&
          (state === "charging" || state === "discharging") &&
          Array.from({ length: 7 }, (_, i) => {
            const x = 22 + ((i * 37) % 56);
            const r = 1.4 + (i % 3) * 0.9;
            const dur = 2.4 + (i % 4) * 0.7;
            const top = surfaceY + 6;
            const bottom = CELL.y + CELL.h - 6;
            if (bottom - top < 8) return null;
            const up = state === "charging";
            return (
              <motion.circle
                key={i}
                cx={x}
                r={r}
                fill="white"
                initial={{ cy: up ? bottom : top, opacity: 0 }}
                animate={{ cy: up ? [bottom, top] : [top, bottom], opacity: [0, 0.7, 0] }}
                transition={{ duration: dur, repeat: Infinity, delay: i * 0.45, ease: up ? "easeIn" : "easeOut" }}
              />
            );
          })}

        {/* Scale ticks */}
        {[0.25, 0.5, 0.75].map((t) => (
          <line
            key={t}
            x1={CELL.x + CELL.w - 16}
            x2={CELL.x + CELL.w - 8}
            y1={CELL.y + CELL.h * t}
            y2={CELL.y + CELL.h * t}
            stroke="var(--ink-3)"
            strokeOpacity={0.45}
            strokeWidth={1}
          />
        ))}

        {/* Light sweep across the glass */}
        {!reduce && (
          <rect
            x={0}
            y={0}
            width={26}
            height={168}
            fill="white"
            opacity={0.1}
            style={{ animation: "shimmer-sweep 6s ease-in-out infinite", transformBox: "fill-box" }}
          />
        )}
      </g>

      <rect x={CELL.x} y={CELL.y} width={CELL.w} height={CELL.h} rx={CELL.r} fill={`url(#${id}-glass)`} pointerEvents="none" />
      <rect x={CELL.x + 10} y={CELL.y + 10} width={5} height={CELL.h * 0.45} rx={2.5} fill="white" opacity={0.14} pointerEvents="none" />
    </svg>
  );
}

// Matches batteryEta(): most inverters stop discharging around a 10% reserve.
const RESERVE_PCT = 10;
const DAY_TICKS = [6, 12, 18];

/** How long the stored energy alone would run the home at its current load: the "if the sun and grid both vanished" number. */
function BackupTime({ pct, capacityKwh, homeW, reduce }: { pct: number | null; capacityKwh: number | null; homeW: number; reduce: boolean }) {
  if (!capacityKwh || pct === null) return null;
  const usableKwh = (Math.max(0, pct - RESERVE_PCT) / 100) * capacityKwh;
  const load = Math.max(homeW, 0);
  const hours = load >= 15 ? (usableKwh * 1000) / load : null;
  // The bar shows one day; anything longer fills it and says so.
  const dayShare = hours === null ? 0 : Math.min(1, hours / 24);

  return (
    <div className="rounded-tile border-line bg-surface-2 relative mt-3 overflow-hidden border px-4 py-3.5">
      <span aria-hidden className="pointer-events-none absolute -top-10 -right-8 size-28 rounded-full bg-[var(--battery)] opacity-15 blur-2xl" />
      <div className="relative flex items-center justify-between gap-3">
        <p className="text-ink-2 flex items-center gap-1.5 text-xs font-semibold">
          <motion.span
            className="text-battery-ink inline-grid"
            animate={reduce ? undefined : { rotate: [0, 0, 180, 180] }}
            transition={{ duration: 4, repeat: Infinity, times: [0, 0.75, 0.9, 1], ease: "easeInOut" }}
          >
            <Hourglass className="size-3.5" />
          </motion.span>
          On battery alone
          <Hint>
            If the sun and the power company both stopped right now, this is roughly how long your stored energy would keep your home running at
            today&apos;s usage. It keeps a {RESERVE_PCT}% reserve, like most inverters do.
          </Hint>
        </p>
        {hours !== null && <span className="text-ink-3 tabular text-[11px]">at {powerText(load)}</span>}
      </div>

      <p className="tabular relative mt-1 text-[22px] leading-tight font-bold tracking-tight">
        {hours === null ? (
          <span className="text-ink-3 text-[15px] font-semibold">Home is barely using power</span>
        ) : (
          <span className="bg-[linear-gradient(100deg,var(--gilt-1),var(--battery-ink))] bg-clip-text text-transparent">≈ {hours < 72 && hours >= 24 ? `${Math.floor(hours)} h ${Math.round((hours % 1) * 60)} min` : durationText(hours)}</span>
        )}
      </p>

      {hours !== null && (
        <div className="relative mt-2.5">
          <div className="bg-surface-sunk relative h-2 overflow-hidden rounded-full">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, color-mix(in oklab, var(--battery) 55%, transparent), var(--battery))",
                boxShadow: "0 0 10px color-mix(in oklab, var(--battery) 60%, transparent)",
              }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(2, dayShare * 100)}%` }}
              transition={reduce ? { duration: 0 } : { duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
            />
            {DAY_TICKS.map((h) => (
              <span key={h} className="bg-surface/70 absolute top-0 h-full w-px" style={{ left: `${(h / 24) * 100}%` }} />
            ))}
          </div>
          <div className="text-ink-3 tabular mt-1 flex justify-between text-[10px]">
            <span>now</span>
            <span>+6 h</span>
            <span>+12 h</span>
            <span>+18 h</span>
            <span>{hours > 24 ? "a day +" : "+24 h"}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/** A filled wave two periods wide (0..200), so sliding by half loops seamlessly. Its surface sits at y=0. */
function wavePath(amp: number, phase: number) {
  const period = 50;
  let d = `M0 ${amp * Math.sin(phase)}`;
  for (let x = 2; x <= 200; x += 2) d += ` L${x} ${(amp * Math.sin(((x / period) * 2 * Math.PI) + phase)).toFixed(2)}`;
  return `${d} L200 200 L0 200 Z`;
}

function TemperatureTile({ tempC }: { tempC: number | null }) {
  // 10–50 °C scale; most batteries are happiest between 15 and 35.
  const t = tempC === null ? null : Math.min(1, Math.max(0, (tempC - 10) / 40));
  const status = tempC === null ? null : tempC < 10 ? "Cold" : tempC <= 35 ? "Healthy" : tempC <= 45 ? "Warm" : "Hot";
  const statusColor = tempC === null ? undefined : tempC <= 35 && tempC >= 10 ? "var(--home)" : tempC <= 45 ? "var(--warn)" : "var(--bad)";
  return (
    <div className="rounded-tile bg-surface-2 border-line border px-4 py-3">
      <dt className="text-ink-3 flex items-center gap-1 text-xs">
        <Thermometer className="size-3" /> Temperature
      </dt>
      <dd className="mt-0.5 flex items-baseline justify-between gap-2">
        <span className="tabular text-[15px] font-bold">{tempC !== null ? `${Math.round(tempC)}°C` : "—"}</span>
        {status && (
          <span className="text-[11px] font-semibold" style={{ color: statusColor }}>
            {status}
          </span>
        )}
      </dd>
      <div className="relative mt-2 h-1.5 rounded-full bg-[linear-gradient(90deg,var(--grid),var(--home)_40%,var(--home)_60%,var(--warn)_80%,var(--bad))] opacity-80">
        {t !== null && (
          <motion.span
            className="border-surface absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-[var(--ink)] shadow"
            initial={{ left: "0%" }}
            animate={{ left: `${t * 100}%` }}
            transition={{ type: "spring", stiffness: 80, damping: 14, delay: 0.3 }}
          />
        )}
      </div>
    </div>
  );
}
