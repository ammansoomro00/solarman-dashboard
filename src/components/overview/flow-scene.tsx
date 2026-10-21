"use client";

import { BatteryCharging, BatteryFull, BatteryLow, BatteryMedium, Hand, House, Sun, UtilityPole, ZapOff } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import type { FlowSnapshot, PowerReading } from "@/lib/energy/flow";
import type { SunTimes } from "@/lib/energy/sun";
import { formatPower, powerText } from "@/lib/format";
import { cn } from "@/lib/utils";
import { buildFlowModel, NODE_IDS, TOKEN, type FlowNode, type NodeId, type Tone } from "./flow-model";
import type { SceneHandle, SceneState } from "./flow-scene-3d";

const cssVar = (t: Tone) => `var(${TOKEN[t]})`;

type Placement = "top" | "bottom" | "right" | "left";

/** Which side of its anchor each callout sits on, and where it rests before the 3D scene has placed it. */
const CALLOUT: Record<NodeId, { placement: Placement; fallback: { x: number; y: number } }> = {
  solar: { placement: "top", fallback: { x: 47, y: 24 } },
  grid: { placement: "left", fallback: { x: 22, y: 30 } },
  home: { placement: "bottom", fallback: { x: 30, y: 74 } },
  battery: { placement: "right", fallback: { x: 74, y: 58 } },
};

function dayProgress(sun: SunTimes | null, now: number) {
  if (!sun) {
    const h = new Date(now).getHours() + new Date(now).getMinutes() / 60;
    return (h - 6) / 12;
  }
  const a = new Date(sun.sunrise).getTime();
  const b = new Date(sun.sunset).getTime();
  return (now - a) / (b - a);
}

export function FlowScene({ reading, flow, sun }: { reading: PowerReading; flow: FlowSnapshot; sun: SunTimes | null }) {
  const reduce = useReducedMotion();
  const model = useMemo(() => buildFlowModel(reading, flow), [reading, flow]);
  const [hover, setHover] = useState<NodeId | null>(null);
  const [pinned, setPinned] = useState<NodeId | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [day, setDay] = useState<number | null>(null);
  const focus = hover ?? pinned;

  const host = useRef<HTMLDivElement>(null);
  const handle = useRef<SceneHandle | null>(null);
  const callouts = useRef<Partial<Record<NodeId, HTMLDivElement | null>>>({});

  // The sun's place in the sky depends on the viewer's clock, so it's worked out after mount.
  useEffect(() => {
    const tick = () => setDay(dayProgress(sun, Date.now()));
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [sun]);

  const sceneState: SceneState = useMemo(
    () => ({
      streams: NODE_IDS.map((id) => model.streams[id]),
      solarW: reading.solarW,
      homeW: reading.homeW,
      batteryPct: reading.batteryPct,
      outage: model.outage,
      day: day ?? 0.5,
      focus,
    }),
    [model, reading, day, focus],
  );
  const latest = useRef(sceneState);
  latest.current = sceneState;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let cancelled = false;
    import("./flow-scene-3d")
      .then(({ createFlowScene }) => {
        if (cancelled) return;
        handle.current = createFlowScene(el, {
          reduce: !!reduce,
          onAnchors: (anchors) => {
            for (const id of NODE_IDS) {
              const c = callouts.current[id];
              if (!c) continue;
              c.style.left = "0px";
              c.style.top = "0px";
              c.style.transform = `translate3d(${anchors[id].x.toFixed(1)}px, ${anchors[id].y.toFixed(1)}px, 0)`;
            }
          },
          onHover: setHover,
          onSelect: (id) => setPinned((p) => (p === id ? null : id)),
        });
        handle.current.update(latest.current);
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("failed"));
    return () => {
      cancelled = true;
      handle.current?.dispose();
      handle.current = null;
    };
  }, [reduce]);

  useEffect(() => {
    handle.current?.update(sceneState);
  }, [sceneState]);

  useEffect(() => {
    if (!pinned) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPinned(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pinned]);

  return (
    <div className="flex w-full flex-1 flex-col gap-4">
      <div className="relative min-h-[clamp(340px,46vw,480px)] w-full flex-1 overflow-hidden rounded-[20px]">
        {/* Soft stage light behind the diorama */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_55%_at_50%_58%,color-mix(in_oklab,var(--gilt-2)_9%,transparent),transparent_70%)]"
        />
        <div ref={host} className="absolute inset-0" aria-hidden />

        {status === "loading" && (
          <div aria-hidden className="absolute inset-0 grid place-items-center">
            <span className="border-line size-10 animate-spin rounded-full border-2 border-t-[var(--gilt-2)]" />
          </div>
        )}

        {NODE_IDS.map((id) => (
          <Callout
            key={id}
            ref={(el) => {
              callouts.current[id] = el;
            }}
            node={model.nodes[id]}
            batteryPct={reading.batteryPct}
            batteryState={flow.battery}
            outage={model.outage}
            placement={CALLOUT[id].placement}
            fallback={CALLOUT[id].fallback}
            focused={focus === id}
            dim={focus !== null && focus !== id}
            pinned={pinned === id}
            onHover={setHover}
            onPin={() => setPinned((p) => (p === id ? null : id))}
          />
        ))}

        {status === "ready" && (
          <p className="text-ink-3 bg-surface/60 border-line/60 pointer-events-none absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium backdrop-blur-md">
            <Hand className="size-3" /> Drag to turn
          </p>
        )}
      </div>

      <Inspector node={focus ? model.nodes[focus] : null} pinned={pinned !== null && pinned === focus} onClose={() => setPinned(null)} />
    </div>
  );
}

function nodeIcon(node: FlowNode, batteryPct: number | null, batteryState: FlowSnapshot["battery"], outage: boolean) {
  if (node.id === "solar") return Sun;
  if (node.id === "home") return House;
  if (node.id === "grid") return outage ? ZapOff : UtilityPole;
  if (batteryState === "charging") return BatteryCharging;
  if (batteryPct === null) return BatteryMedium;
  if (batteryPct >= 90) return BatteryFull;
  if (batteryPct <= 25) return BatteryLow;
  return BatteryMedium;
}

const PLACEMENT_CLASS: Record<Placement, { chip: string; stem: string; dir: string }> = {
  top: { chip: "bottom-4 left-0 -translate-x-1/2", stem: "bottom-0 left-0 h-4 w-px -translate-x-1/2", dir: "to top" },
  bottom: { chip: "top-4 left-0 -translate-x-1/2", stem: "top-0 left-0 h-4 w-px -translate-x-1/2", dir: "to bottom" },
  right: { chip: "top-0 left-5 -translate-y-1/2", stem: "top-0 left-0 h-px w-5 -translate-y-1/2", dir: "to right" },
  left: { chip: "top-0 right-5 -translate-y-1/2", stem: "top-0 right-0 h-px w-5 -translate-y-1/2", dir: "to left" },
};

function Callout({
  ref,
  node,
  batteryPct,
  batteryState,
  outage,
  placement,
  fallback,
  focused,
  dim,
  pinned,
  onHover,
  onPin,
}: {
  ref: (el: HTMLDivElement | null) => void;
  node: FlowNode;
  batteryPct: number | null;
  batteryState: FlowSnapshot["battery"];
  outage: boolean;
  placement: Placement;
  fallback: { x: number; y: number };
  focused: boolean;
  dim: boolean;
  pinned: boolean;
  onHover: (id: NodeId | null) => void;
  onPin: () => void;
}) {
  const Icon = nodeIcon(node, batteryPct, batteryState, outage);
  const color = cssVar(node.tone);
  const p = PLACEMENT_CLASS[placement];
  const value = node.valueOverride ?? null;

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute z-10 transition-opacity duration-300"
      style={{ left: `${fallback.x}%`, top: `${fallback.y}%`, opacity: dim ? 0.4 : 1, zIndex: focused ? 20 : 10 }}
    >
      {/* Anchor dot on the object, with a stem up to the chip */}
      <span
        className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: color, boxShadow: `0 0 0 3px color-mix(in oklab, ${color} 25%, transparent), 0 0 12px ${color}` }}
      />
      <span className={cn("absolute", p.stem)} style={{ background: `linear-gradient(${p.dir}, ${color}, transparent)`, opacity: 0.8 }} />

      <motion.button
        type="button"
        onMouseEnter={() => onHover(node.id)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(node.id)}
        onBlur={() => onHover(null)}
        onClick={onPin}
        aria-pressed={pinned}
        aria-controls="flow-inspector"
        aria-label={`${node.label}: ${value ?? powerText(node.watts)}, ${node.caption}. Show details.`}
        whileHover={{ y: placement === "bottom" ? 2 : -2 }}
        whileTap={{ scale: 0.97 }}
        animate={{ scale: focused ? 1.04 : 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 26 }}
        className={cn(
          "pointer-events-auto absolute flex items-center gap-2.5 rounded-2xl border py-2 pr-3.5 pl-2 text-left whitespace-nowrap backdrop-blur-xl",
          "bg-surface/75 border-line/80 shadow-[0_1px_0_rgb(255_255_255/0.06)_inset,0_14px_32px_-16px_rgb(0_0_0/0.6)]",
          p.chip,
        )}
        style={focused ? { borderColor: `color-mix(in oklab, ${color} 55%, transparent)`, boxShadow: `0 0 0 1px color-mix(in oklab, ${color} 30%, transparent), 0 14px 36px -12px color-mix(in oklab, ${color} 55%, transparent)` } : undefined}
      >
        <span
          className="grid size-8 shrink-0 place-items-center rounded-xl"
          style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color: `color-mix(in oklab, ${color} 70%, var(--ink))` }}
        >
          <Icon className="size-4" />
        </span>
        <span className="flex flex-col">
          <span className="text-ink-3 flex items-center gap-1.5 text-[10px] font-bold tracking-[0.12em] uppercase">
            {node.label}
            {node.active && <span className="size-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />}
          </span>
          <span className="tabular text-[17px] leading-tight font-bold tracking-tight">
            {value ?? (
              <>
                <AnimatedNumber value={node.watts} format={(n) => formatPower(n).value} />
                <span className="text-ink-3 ml-0.5 text-[12px] font-semibold">{formatPower(node.watts).unit}</span>
              </>
            )}
          </span>
          <span className="text-ink-2 text-[11px] leading-tight">{node.caption}</span>
        </span>
      </motion.button>
    </div>
  );
}

function Inspector({ node, pinned, onClose }: { node: FlowNode | null; pinned: boolean; onClose: () => void }) {
  return (
    <div id="flow-inspector" aria-live="polite" className="relative min-h-[52px] w-full">
      <AnimatePresence mode="wait" initial={false}>
        {node ? (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="border-line bg-surface-2/70 rounded-tile relative overflow-hidden border p-4 backdrop-blur-md"
          >
            <span className="pointer-events-none absolute -top-16 -left-10 size-40 rounded-full opacity-20 blur-3xl" style={{ background: cssVar(node.tone) }} />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="min-w-0 sm:w-[46%]">
                <p className="flex items-center gap-2 text-[13px] font-bold">
                  <span className="size-2 rounded-full" style={{ background: cssVar(node.tone) }} />
                  {node.label}
                </p>
                <p className="text-ink-2 mt-1.5 text-[13px] leading-relaxed">{node.explain}</p>
                {pinned && (
                  <button type="button" onClick={onClose} className="text-ink-3 hover:text-ink mt-2 text-[11px] font-semibold transition-colors">
                    Unpin · Esc
                  </button>
                )}
              </div>
              <ul className="min-w-0 flex-1 space-y-2">
                {node.lines.map((l, i) => {
                  const max = Math.max(...node.lines.map((x) => x.watts), 1);
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
                          style={{ background: `linear-gradient(90deg, color-mix(in oklab, ${cssVar(l.tone)} 55%, transparent), ${cssVar(l.tone)})` }}
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
          <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-ink-3 py-3 text-center text-[12.5px]">
            Tap a label or any part of the house to see where its power is going.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
