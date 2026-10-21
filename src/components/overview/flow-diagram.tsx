"use client";

import { BatteryCharging, BatteryFull, BatteryLow, BatteryMedium, House, Sun, UtilityPole, Zap, ZapOff } from "lucide-react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useEffect, useState } from "react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { applianceEquivalent } from "@/lib/energy/appliances";
import type { FlowSnapshot, PowerReading } from "@/lib/energy/flow";
import { formatPower, powerText } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EnergyField, type FieldGlow, type FieldSegment } from "./energy-field";

type NodeId = "solar" | "home" | "battery" | "grid";
type Tone = "sun" | "home" | "battery" | "grid" | "bad";

// Layout on a 400 × 300 canvas; the inverter sits in the middle.
const HUB = { x: 200, y: 150 };
const POS: Record<NodeId, { x: number; y: number }> = {
  solar: { x: 200, y: 46 },
  grid: { x: 56, y: 150 },
  home: { x: 344, y: 150 },
  battery: { x: 200, y: 254 },
};
const ORDER: NodeId[] = ["solar", "grid", "home", "battery"];

const TOKEN: Record<Tone, string> = { sun: "--sun", home: "--home", battery: "--battery", grid: "--grid", bad: "--bad" };
const cssVar = (t: Tone) => `var(${TOKEN[t]})`;

interface Segment {
  id: NodeId;
  watts: number;
  /** true: power travels toward the inverter; false: away from it */
  inbound: boolean;
  tone: Tone;
}

/** Seconds for a pulse to cross a line: faster when more power flows. */
function travelSeconds(watts: number) {
  return Math.max(0.9, 3.4 - Math.log10(Math.max(watts, 10)) * 0.75);
}

/** 0..1 visual weight for a flow, on a log scale so 50 W still shows and 5 kW doesn't blind. */
function strength(watts: number) {
  if (watts <= 0) return 0;
  return Math.min(1, 0.35 + Math.log10(Math.max(watts, 10) / 10) * 0.25);
}

interface Line {
  label: string;
  watts: number;
  tone: Tone;
  direction: "in" | "out";
}

export function FlowDiagram({ reading, flow, capacityKw }: { reading: PowerReading; flow: FlowSnapshot; capacityKw: number | null }) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<NodeId | null>(null);
  const [pinned, setPinned] = useState<NodeId | null>(null);
  const focus = hover ?? pinned;
  const f = flow.flows;

  const solarOut = f.solarToHome + f.solarToBattery + f.solarToGrid;
  const batteryNet = f.batteryToHome - (f.solarToBattery + f.gridToBattery);
  const gridNet = f.gridToHome + f.gridToBattery - f.solarToGrid;
  const homeIn = f.solarToHome + f.batteryToHome + f.gridToHome;
  const outage = flow.grid === "outage";

  // Home's line takes the colour of whatever is mostly feeding it.
  const homeTone: Tone = f.solarToHome >= Math.max(f.batteryToHome, f.gridToHome) ? "sun" : f.batteryToHome >= f.gridToHome ? "battery" : "grid";

  const segments: Record<NodeId, Segment> = {
    solar: { id: "solar", watts: solarOut, inbound: true, tone: "sun" },
    battery: {
      id: "battery",
      watts: Math.abs(batteryNet),
      inbound: batteryNet > 0,
      tone: batteryNet > 0 ? "battery" : f.gridToBattery > f.solarToBattery ? "grid" : "sun",
    },
    grid: { id: "grid", watts: Math.abs(gridNet), inbound: gridNet > 0, tone: gridNet > 0 ? "grid" : "sun" },
    home: { id: "home", watts: homeIn, inbound: false, tone: homeTone },
  };

  const throughput = solarOut + Math.max(0, batteryNet) + Math.max(0, gridNet);
  const hubTone: Tone = outage && throughput === 0 ? "bad" : homeTone;

  // Particle streams for the WebGL layer: always drawn in the direction power moves.
  const fieldSegments: FieldSegment[] = ORDER.map((id) => {
    const s = segments[id];
    return {
      from: s.inbound ? POS[id] : HUB,
      to: s.inbound ? HUB : POS[id],
      color: TOKEN[s.tone],
      strength: strength(s.watts) * (focus && focus !== id ? 0.2 : 1),
      seconds: travelSeconds(s.watts),
    };
  });
  const fieldGlows: FieldGlow[] = [
    { at: POS.solar, color: "--sun", strength: strength(reading.solarW) * 0.9 },
    { at: POS.home, color: TOKEN[homeTone], strength: strength(reading.homeW) * 0.55 },
    { at: POS.battery, color: "--battery", strength: Math.abs(batteryNet) > 0 ? 0.55 : (reading.batteryPct ?? 0) / 300 },
    { at: POS.grid, color: outage ? "--bad" : "--grid", strength: outage ? 0.4 : strength(Math.abs(gridNet)) * 0.6 },
    { at: HUB, color: TOKEN[hubTone], strength: Math.min(0.7, strength(throughput) * 0.7) },
  ];

  // Gentle 3D tilt that follows the pointer.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rx = useSpring(useTransform(py, [-0.5, 0.5], [6, -6]), { stiffness: 120, damping: 18 });
  const ry = useSpring(useTransform(px, [-0.5, 0.5], [-8, 8]), { stiffness: 120, damping: 18 });

  useEffect(() => {
    if (!pinned) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPinned(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pinned]);

  const batteryCaption =
    flow.battery === "charging"
      ? "charging"
      : flow.battery === "discharging"
        ? "powering home"
        : flow.battery === "full"
          ? "full"
          : flow.battery === "empty"
            ? "empty"
            : "standing by";

  const nodes: Record<NodeId, NodeSpec> = {
    solar: {
      icon: Sun,
      label: "Solar panels",
      tone: "sun",
      watts: reading.solarW,
      caption: reading.solarW >= 15 ? "making power" : "resting",
      ring: capacityKw ? Math.min(1, reading.solarW / (capacityKw * 1000)) : null,
      ringLabel: capacityKw ? `${Math.round(Math.min(1, reading.solarW / (capacityKw * 1000)) * 100)}% of peak` : undefined,
      active: reading.solarW >= 15,
      explain:
        reading.solarW >= 15
          ? `Your panels are turning sunlight into ${powerText(reading.solarW)}${applianceEquivalent(reading.solarW) ? `, enough to run ${applianceEquivalent(reading.solarW)}` : ""}.`
          : "Your panels aren't making power right now. They need daylight.",
      lines: [
        { label: "To your home", watts: f.solarToHome, tone: "home", direction: "out" },
        { label: "Into the battery", watts: f.solarToBattery, tone: "battery", direction: "out" },
        { label: "Sold to power company", watts: f.solarToGrid, tone: "grid", direction: "out" },
      ],
    },
    home: {
      icon: House,
      label: "Your home",
      tone: "home",
      watts: reading.homeW,
      caption: "using",
      mix: homeIn > 0 ? [f.solarToHome / homeIn, f.batteryToHome / homeIn, f.gridToHome / homeIn] : null,
      active: reading.homeW >= 15,
      explain: `Everything switched on in your home is using ${powerText(reading.homeW)}${applianceEquivalent(reading.homeW) ? `, about the same as ${applianceEquivalent(reading.homeW)!.replace("about ", "")}` : ""}.`,
      lines: [
        { label: "From the sun", watts: f.solarToHome, tone: "sun", direction: "in" },
        { label: "From the battery", watts: f.batteryToHome, tone: "battery", direction: "in" },
        { label: "From the power company", watts: f.gridToHome, tone: "grid", direction: "in" },
      ],
    },
    battery: {
      icon: batteryIcon(reading.batteryPct, flow.battery),
      label: "Battery",
      tone: reading.batteryPct !== null && reading.batteryPct <= 20 && flow.battery !== "charging" ? "bad" : "battery",
      watts: Math.abs(batteryNet),
      valueOverride: reading.batteryPct !== null ? `${Math.round(reading.batteryPct)}%` : undefined,
      caption: Math.abs(batteryNet) > 0 ? `${batteryCaption} · ${powerText(Math.abs(batteryNet))}` : batteryCaption,
      ring: reading.batteryPct !== null ? reading.batteryPct / 100 : null,
      active: Math.abs(batteryNet) > 0,
      explain:
        flow.battery === "charging"
          ? "Spare power is being stored in your battery for later."
          : flow.battery === "discharging"
            ? "Your battery is giving back power it stored earlier."
            : flow.battery === "full"
              ? "Your battery is full and ready for the evening or a power cut."
              : "Your battery isn't charging or being used right now.",
      lines: [
        { label: "Charging from the sun", watts: f.solarToBattery, tone: "sun", direction: "in" },
        { label: "Charging from power company", watts: f.gridToBattery, tone: "grid", direction: "in" },
        { label: "Powering your home", watts: f.batteryToHome, tone: "home", direction: "out" },
      ],
    },
    grid: {
      icon: outage ? ZapOff : UtilityPole,
      label: "Power company",
      tone: outage ? "bad" : "grid",
      watts: Math.abs(gridNet),
      valueOverride: outage ? "Off" : gridNet === 0 ? "—" : undefined,
      caption: outage ? "power cut" : gridNet > 0 ? "buying" : gridNet < 0 ? "selling back" : "not in use",
      active: outage || gridNet !== 0,
      outage,
      explain: outage
        ? "The power company's supply is off (load-shedding or a fault). Your system is running the home on its own."
        : gridNet > 0
          ? "You're buying this electricity from the power company. It shows up on your bill."
          : gridNet < 0
            ? "You're selling spare solar power back to the power company."
            : "You aren't buying or selling electricity right now.",
      lines: [
        { label: "To your home", watts: f.gridToHome, tone: "home", direction: "out" },
        { label: "Into the battery", watts: f.gridToBattery, tone: "battery", direction: "out" },
        { label: "Bought from you", watts: f.solarToGrid, tone: "sun", direction: "in" },
      ],
    },
  };

  const inspected = focus ? nodes[focus] : null;

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div
        className="relative mx-auto mb-14 aspect-[4/3] w-full max-w-[620px] select-none [perspective:1100px] sm:mb-16"
        onPointerMove={(e) => {
          if (reduce) return;
          const r = e.currentTarget.getBoundingClientRect();
          px.set((e.clientX - r.left) / r.width - 0.5);
          py.set((e.clientY - r.top) / r.height - 0.5);
        }}
        onPointerLeave={() => {
          px.set(0);
          py.set(0);
        }}
      >
        <motion.div className="absolute inset-0 [transform-style:preserve-3d]" style={{ rotateX: rx, rotateY: ry }}>
          <EnergyField segments={fieldSegments} glows={fieldGlows} className="pointer-events-none absolute -inset-[10%] [transform:translateZ(-40px)]" />

          <svg viewBox="0 0 400 300" className="absolute inset-0 size-full overflow-visible" aria-hidden>
            <defs>
              {ORDER.map((id) => {
                const s = segments[id];
                return (
                  <linearGradient
                    key={id}
                    id={`beam-${id}`}
                    gradientUnits="userSpaceOnUse"
                    x1={POS[id].x}
                    y1={POS[id].y}
                    x2={HUB.x}
                    y2={HUB.y}
                  >
                    <stop offset="0" stopColor={cssVar(s.inbound ? s.tone : s.tone)} stopOpacity={s.inbound ? 0.9 : 0.35} />
                    <stop offset="1" stopColor={cssVar(s.tone)} stopOpacity={s.inbound ? 0.35 : 0.9} />
                  </linearGradient>
                );
              })}
              <filter id="beam-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" />
              </filter>
            </defs>

            {ORDER.map((id) => {
              const s = segments[id];
              const d = `M${POS[id].x} ${POS[id].y} L${HUB.x} ${HUB.y}`;
              const active = s.watts > 0;
              const dim = focus !== null && focus !== id;
              const dur = travelSeconds(s.watts);
              return (
                <g key={id} style={{ opacity: dim ? 0.18 : 1, transition: "opacity 300ms" }}>
                  <path d={d} stroke="var(--line)" strokeWidth={9} strokeLinecap="round" fill="none" opacity={0.55} />
                  <path d={d} stroke="var(--line-strong)" strokeWidth={1.25} strokeDasharray="1 5" strokeLinecap="round" fill="none" />
                  {id === "grid" && outage && (
                    <g transform={`translate(${(POS.grid.x + HUB.x) / 2} ${HUB.y})`}>
                      <circle r={9} fill="var(--surface)" stroke="var(--bad)" strokeOpacity={0.5} />
                      <path d="M-3.5 -3.5 L3.5 3.5 M3.5 -3.5 L-3.5 3.5" stroke="var(--bad)" strokeWidth={1.6} strokeLinecap="round" />
                    </g>
                  )}
                  {active && (
                    <>
                      <motion.path
                        d={d}
                        stroke={`url(#beam-${id})`}
                        strokeWidth={3}
                        strokeLinecap="round"
                        fill="none"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                      />
                      {!reduce && (
                        <>
                          {/* Glowing pulses; the blurred copy underneath gives them their halo. */}
                          {[{ filter: "url(#beam-glow)", width: 8, opacity: 0.9 }, { filter: undefined, width: 2.2, opacity: 1 }].map((layer, i) => (
                            <path
                              key={`${i}-${s.inbound}`}
                              d={d}
                              pathLength={100}
                              stroke={i === 0 ? cssVar(s.tone) : `color-mix(in oklab, ${cssVar(s.tone)} 45%, white)`}
                              strokeOpacity={i === 0 ? layer.opacity : 0.95}
                              strokeWidth={layer.width}
                              strokeLinecap="round"
                              strokeDasharray="4 29.33"
                              fill="none"
                              filter={layer.filter}
                              style={{ animation: `${s.inbound ? "flow-in" : "flow-out"} ${dur * 1.6}s linear infinite` }}
                            />
                          ))}
                        </>
                      )}
                      {reduce && <Arrow from={POS[id]} inbound={s.inbound} tone={s.tone} />}
                    </>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Wattage chips riding on each active line */}
          {ORDER.map((id) => {
            const s = segments[id];
            if (s.watts <= 0 || id === "battery") return null;
            const t = id === "solar" ? 0.5 : 0.48;
            const x = POS[id].x + (HUB.x - POS[id].x) * t;
            const y = POS[id].y + (HUB.y - POS[id].y) * t;
            return (
              <motion.span
                key={`chip-${id}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: focus && focus !== id ? 0.2 : 1, scale: 1 }}
                className={cn(
                  "border-line bg-surface/80 text-ink-2 tabular pointer-events-none absolute rounded-full border px-2 py-0.5 text-[10.5px] font-bold whitespace-nowrap shadow-sm backdrop-blur-md",
                  id === "solar" ? "translate-x-3 -translate-y-1/2" : "-translate-x-1/2 -translate-y-[calc(100%+10px)]",
                )}
                style={{ left: `${(x / 400) * 100}%`, top: `${(y / 300) * 100}%`, transform: "translateZ(20px)" }}
              >
                {powerText(s.watts)}
              </motion.span>
            );
          })}

          <Hub tone={hubTone} throughput={throughput} outage={outage} reduce={!!reduce} />

          {ORDER.map((id) => (
            <Node
              key={id}
              id={id}
              spec={nodes[id]}
              focused={focus === id}
              dim={focus !== null && focus !== id}
              pinned={pinned === id}
              onHover={setHover}
              onPin={() => setPinned((p) => (p === id ? null : id))}
              reduce={!!reduce}
            />
          ))}
        </motion.div>
      </div>

      <Inspector spec={inspected} id={focus} pinned={pinned !== null && pinned === focus} onClose={() => setPinned(null)} />
    </div>
  );
}

interface NodeSpec {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tone: Tone;
  watts: number;
  valueOverride?: string;
  caption: string;
  explain: string;
  /** 0..1 progress ring around the orb */
  ring?: number | null;
  ringLabel?: string;
  /** Home only: shares of [sun, battery, grid] drawn as a segmented ring. */
  mix?: [number, number, number] | null;
  active: boolean;
  outage?: boolean;
  lines: Line[];
}

function batteryIcon(pct: number | null, state: FlowSnapshot["battery"]) {
  if (state === "charging") return BatteryCharging;
  if (pct === null) return BatteryMedium;
  if (pct >= 90) return BatteryFull;
  if (pct <= 25) return BatteryLow;
  return BatteryMedium;
}

function Hub({ tone, throughput, outage, reduce }: { tone: Tone; throughput: number; outage: boolean; reduce: boolean }) {
  const spin = Math.max(2.5, 9 - Math.log10(Math.max(throughput, 10)) * 1.6);
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${(HUB.x / 400) * 100}%`, top: `${(HUB.y / 300) * 100}%`, transform: "translateZ(30px)" }}
      title="Your inverter: it directs power between the panels, battery, home and power company"
    >
      <div className="relative grid size-14 place-items-center sm:size-16">
        {!reduce && throughput > 0 && (
          <motion.span
            className="absolute inset-0 rounded-[22px]"
            style={{ boxShadow: `0 0 0 1px color-mix(in oklab, ${cssVar(tone)} 50%, transparent)` }}
            animate={{ scale: [1, 1.45], opacity: [0.7, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        {/* Rotating light around the rim: an oversized conic square spinning inside a clipped frame. */}
        <span className="absolute inset-0 overflow-hidden rounded-[22px]" style={{ opacity: throughput === 0 ? 0.25 : 1 }}>
          <span
            className="absolute top-1/2 left-1/2 size-[160%] -translate-x-1/2 -translate-y-1/2"
            style={{
              background: `conic-gradient(from 0deg, transparent 0deg, ${cssVar(tone)} 70deg, transparent 140deg, transparent 180deg, color-mix(in oklab, ${cssVar(tone)} 60%, white) 250deg, transparent 320deg)`,
              animation: reduce || throughput === 0 ? undefined : `orbit ${spin}s linear infinite`,
            }}
          />
        </span>
        <span
          className="bg-surface/90 relative grid size-[calc(100%-6px)] place-items-center rounded-[19px] backdrop-blur-md"
          style={{
            boxShadow: `inset 0 1px 0 rgb(255 255 255 / 0.08), 0 10px 30px -8px color-mix(in oklab, ${cssVar(tone)} ${throughput ? 55 : 0}%, transparent)`,
          }}
        >
          {outage && throughput === 0 ? <ZapOff className="text-bad-ink size-5" /> : <Zap className="size-5" style={{ color: cssVar(tone) }} fill="currentColor" fillOpacity={0.2} />}
        </span>
      </div>
    </div>
  );
}

const MIX_TONES: Tone[] = ["sun", "battery", "grid"];

function Node({
  id,
  spec,
  focused,
  dim,
  pinned,
  onHover,
  onPin,
  reduce,
}: {
  id: NodeId;
  spec: NodeSpec;
  focused: boolean;
  dim: boolean;
  pinned: boolean;
  onHover: (id: NodeId | null) => void;
  onPin: () => void;
  reduce: boolean;
}) {
  const p = POS[id];
  const Icon = spec.icon;
  const labelAbove = id === "solar";
  const color = cssVar(spec.tone);
  const R = 34;
  const C = 2 * Math.PI * R;

  return (
    <div
      className={cn("absolute -translate-x-1/2", labelAbove ? "-translate-y-[calc(100%-32px)] sm:-translate-y-[calc(100%-36px)]" : "-translate-y-8 sm:-translate-y-9")}
      style={{ left: `${(p.x / 400) * 100}%`, top: `${(p.y / 300) * 100}%`, zIndex: focused ? 20 : 10, transform: "translateZ(50px)" }}
    >
      <button
        type="button"
        onMouseEnter={() => onHover(id)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(id)}
        onBlur={() => onHover(null)}
        onClick={onPin}
        aria-pressed={pinned}
        aria-controls="flow-inspector"
        aria-label={`${spec.label}: ${spec.valueOverride ?? powerText(spec.watts)}, ${spec.caption}. Show details.`}
        className={cn("group flex cursor-pointer flex-col items-center text-center transition-opacity duration-300 outline-none", dim && "opacity-35")}
      >
        <motion.span
          whileHover={{ scale: 1.08, y: -2 }}
          whileTap={{ scale: 0.95 }}
          animate={{ scale: focused ? 1.06 : 1 }}
          transition={{ type: "spring", stiffness: 380, damping: 20 }}
          className={cn(
            "relative grid size-16 place-items-center rounded-full sm:size-[72px]",
            "group-focus-visible:outline-ink group-focus-visible:outline-2 group-focus-visible:outline-offset-4",
            labelAbove && "order-last mt-2",
          )}
        >
          {/* Progress / mix ring */}
          <svg viewBox="0 0 80 80" className="absolute inset-0 size-full -rotate-90 overflow-visible">
            <circle cx="40" cy="40" r={R} fill="none" stroke="var(--line)" strokeWidth={3} opacity={0.8} />
            {spec.mix
              ? (() => {
                  let acc = 0;
                  const gap = 3;
                  return spec.mix.map((share, i) => {
                    if (share <= 0.005) return null;
                    const len = Math.max(0, share * C - (share < 1 ? gap : 0));
                    const el = (
                      <motion.circle
                        key={i}
                        cx="40"
                        cy="40"
                        r={R}
                        fill="none"
                        stroke={cssVar(MIX_TONES[i])}
                        strokeWidth={3}
                        strokeLinecap="round"
                        initial={{ strokeDasharray: `0 ${C}` }}
                        animate={{ strokeDasharray: `${len} ${C}`, strokeDashoffset: -acc * C }}
                        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.2 + i * 0.1 }}
                      />
                    );
                    acc += share;
                    return el;
                  });
                })()
              : spec.ring != null && (
                  <motion.circle
                    cx="40"
                    cy="40"
                    r={R}
                    fill="none"
                    stroke={color}
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeDasharray={C}
                    initial={{ strokeDashoffset: C }}
                    animate={{ strokeDashoffset: C * (1 - Math.max(0.01, spec.ring)) }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                  />
                )}
            {spec.outage && <circle cx="40" cy="40" r={R} fill="none" stroke="var(--bad)" strokeWidth={1.5} strokeDasharray="3 5" opacity={0.7} />}
          </svg>

          {/* Glass orb */}
          <span
            className="relative grid size-[calc(100%-16px)] place-items-center overflow-hidden rounded-full transition-shadow duration-500"
            style={{
              background: `radial-gradient(120% 120% at 30% 20%, color-mix(in oklab, ${color} 38%, var(--surface)) 0%, color-mix(in oklab, ${color} 14%, var(--surface)) 55%, color-mix(in oklab, ${color} 6%, var(--surface-sunk)) 100%)`,
              boxShadow: spec.active
                ? `inset 0 1px 0 rgb(255 255 255 / 0.18), inset 0 -8px 16px -8px color-mix(in oklab, ${color} 50%, transparent), 0 0 0 1px color-mix(in oklab, ${color} 35%, transparent), 0 12px 32px -6px color-mix(in oklab, ${color} ${focused ? 75 : 50}%, transparent)`
                : `inset 0 1px 0 rgb(255 255 255 / 0.1), 0 0 0 1px var(--line)`,
            }}
          >
            {/* Specular highlight */}
            <span className="pointer-events-none absolute top-[8%] left-[18%] h-[30%] w-[45%] rounded-full bg-white/25 blur-[3px]" />
            <motion.span
              className="relative"
              style={{ color: spec.active ? `color-mix(in oklab, ${color} 55%, var(--ink))` : "var(--ink-3)" }}
              animate={
                reduce || !spec.active
                  ? undefined
                  : id === "solar"
                    ? { rotate: 360 }
                    : spec.outage
                      ? { opacity: [1, 0.35, 1, 0.8, 1] }
                      : { scale: [1, 1.08, 1] }
              }
              transition={
                id === "solar"
                  ? { duration: 16, repeat: Infinity, ease: "linear" }
                  : spec.outage
                    ? { duration: 2.6, repeat: Infinity, times: [0, 0.1, 0.2, 0.3, 1] }
                    : { duration: 2.8, repeat: Infinity, ease: "easeInOut" }
              }
            >
              <Icon className="size-[22px] sm:size-6" />
            </motion.span>
          </span>
          {pinned && <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full border-2 border-[var(--surface)]" style={{ background: color }} />}
        </motion.span>

        <span className={cn("text-ink-3 text-[10.5px] font-bold tracking-[0.12em] whitespace-nowrap uppercase sm:text-[11px]", !labelAbove && "mt-2.5")}>
          {spec.label}
        </span>
        <span className="tabular text-xl leading-tight font-bold tracking-tight sm:text-[22px]">
          {spec.valueOverride ?? (
            <>
              <AnimatedNumber value={spec.watts} format={(n) => formatPower(n).value} />
              <span className="text-ink-3 ml-0.5 text-[13px] font-semibold">{formatPower(spec.watts).unit}</span>
            </>
          )}
        </span>
        <span className="text-ink-2 text-[11px] whitespace-nowrap sm:text-xs">{spec.caption}</span>
      </button>
    </div>
  );
}

function Inspector({ spec, id, pinned, onClose }: { spec: NodeSpec | null; id: NodeId | null; pinned: boolean; onClose: () => void }) {
  return (
    <div id="flow-inspector" aria-live="polite" className="relative w-full max-w-[620px]">
      <AnimatePresence mode="wait" initial={false}>
        {spec && id ? (
          <motion.div
            key={id}
            initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="border-line bg-surface-2/80 rounded-tile relative overflow-hidden border p-4 backdrop-blur-md"
          >
            <span
              className="pointer-events-none absolute -top-16 -left-10 size-40 rounded-full opacity-25 blur-3xl"
              style={{ background: cssVar(spec.tone) }}
            />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="min-w-0 sm:w-[46%]">
                <p className="flex items-center gap-2 text-[13px] font-bold">
                  <span className="size-2 rounded-full" style={{ background: cssVar(spec.tone) }} />
                  {spec.label}
                  {spec.ringLabel && <span className="text-ink-3 font-semibold">· {spec.ringLabel}</span>}
                </p>
                <p className="text-ink-2 mt-1.5 text-[13px] leading-relaxed">{spec.explain}</p>
                {pinned && (
                  <button type="button" onClick={onClose} className="text-ink-3 hover:text-ink mt-2 text-[11px] font-semibold transition-colors">
                    Unpin · Esc
                  </button>
                )}
              </div>
              <ul className="min-w-0 flex-1 space-y-2">
                {spec.lines.map((l, i) => {
                  const max = Math.max(...spec.lines.map((x) => x.watts), 1);
                  return (
                    <li key={l.label} className={cn("text-[12px]", l.watts === 0 && "opacity-45")}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-ink-2 truncate">
                          <span className="text-ink-3 mr-1">{l.direction === "in" ? "←" : "→"}</span>
                          {l.label}
                        </span>
                        <span className="tabular font-bold">{l.watts > 0 ? powerText(l.watts) : "—"}</span>
                      </div>
                      <div className="bg-surface-sunk mt-1 h-1.5 overflow-hidden rounded-full">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: `linear-gradient(90deg, color-mix(in oklab, ${cssVar(l.tone)} 60%, transparent), ${cssVar(l.tone)})` }}
                          initial={{ width: 0 }}
                          animate={{ width: `${(l.watts / max) * 100}%` }}
                          transition={{ duration: 0.7, delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </motion.div>
        ) : (
          <motion.p
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-ink-3 py-3 text-center text-[12.5px]"
          >
            Hover or tap any part of your system to see where its power is going.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Static direction marker for people who prefer reduced motion. */
function Arrow({ from, inbound, tone }: { from: { x: number; y: number }; inbound: boolean; tone: Tone }) {
  const mx = (from.x + HUB.x) / 2;
  const my = (from.y + HUB.y) / 2;
  const angle = (Math.atan2(HUB.y - from.y, HUB.x - from.x) * 180) / Math.PI + (inbound ? 0 : 180);
  return (
    <path
      d="M-5 -5 L4 0 L-5 5"
      transform={`translate(${mx} ${my}) rotate(${angle})`}
      stroke={cssVar(tone)}
      strokeWidth={2.4}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}
