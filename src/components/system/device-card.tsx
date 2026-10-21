"use client";

import type { DeviceKind, DeviceStatus } from "@prisma/client";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useState } from "react";
import { Card } from "@/components/overview/card";
import { KIND, KIND_TONE, STATUS } from "./device-meta";

export interface DetailRow {
  label: string;
  value: string;
}

const PREVIEW = 3;

export function DeviceCard({
  kind,
  status,
  serial,
  model,
  heard,
  details,
}: {
  kind: DeviceKind;
  status: DeviceStatus;
  serial: string;
  model: string | null;
  heard: string | null;
  details: DetailRow[];
}) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const meta = KIND[kind];
  const st = STATUS[status];
  const Icon = meta.icon;
  const StatusIcon = st.icon;
  const color = KIND_TONE[kind];
  const shown = open ? details : details.slice(0, PREVIEW);

  // The icon tile leans toward the pointer.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rx = useSpring(useTransform(py, [-0.5, 0.5], [10, -10]), { stiffness: 200, damping: 18 });
  const ry = useSpring(useTransform(px, [-0.5, 0.5], [-12, 12]), { stiffness: 200, damping: 18 });

  return (
    <Card
      className="relative isolate flex h-full flex-col overflow-hidden"
      aria-label={`${meta.label} ${serial}`}
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
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -left-16 -z-10 size-48 rounded-full opacity-[0.16] blur-3xl"
        style={{ background: color }}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="[perspective:400px]">
          <motion.span
            style={{
              rotateX: rx,
              rotateY: ry,
              background: `radial-gradient(120% 120% at 30% 20%, color-mix(in oklab, ${color} 36%, var(--surface)), color-mix(in oklab, ${color} 10%, var(--surface-2)))`,
              boxShadow: `inset 0 1px 0 rgb(255 255 255 / 0.16), 0 0 0 1px color-mix(in oklab, ${color} 30%, transparent), 0 12px 28px -10px color-mix(in oklab, ${color} 60%, transparent)`,
              color: `color-mix(in oklab, ${color} 55%, var(--ink))`,
            }}
            className="grid size-12 place-items-center rounded-2xl"
          >
            <Icon className="size-[22px]" />
          </motion.span>
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ background: `color-mix(in oklab, ${st.color} 14%, transparent)`, color: `color-mix(in oklab, ${st.color} 60%, var(--ink))` }}
        >
          <span className="relative grid size-3.5 place-items-center">
            {status === "ONLINE" && !reduce && (
              <motion.span
                className="absolute inset-0 rounded-full"
                style={{ background: st.color }}
                animate={{ scale: [0.6, 1.6], opacity: [0.5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
              />
            )}
            <StatusIcon className="relative size-3.5" />
          </span>
          {st.label}
        </span>
      </div>

      <h3 className="mt-4 text-[17px] font-bold tracking-tight">{meta.label}</h3>
      {model && <p className="text-ink-3 mt-0.5 text-xs font-semibold">{model}</p>}
      <p className="text-ink-2 mt-1.5 text-[13px] leading-relaxed">{meta.explain}</p>

      {details.length > 0 && (
        <div className="border-line mt-4 border-t pt-3">
          <dl className="text-[13px]">
            <AnimatePresence initial={false}>
              {shown.map((row, i) => (
                <motion.div
                  key={row.label}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, delay: i >= PREVIEW ? (i - PREVIEW) * 0.03 : 0 }}
                  className="group/row hover:bg-surface-2 -mx-2 flex justify-between gap-3 overflow-hidden rounded-lg px-2 py-1 transition-colors"
                >
                  <dt className="text-ink-3">{row.label}</dt>
                  <dd className="tabular text-right font-semibold">{row.value}</dd>
                </motion.div>
              ))}
            </AnimatePresence>
          </dl>
          {details.length > PREVIEW && (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className="text-ink-2 hover:text-ink mt-2 inline-flex items-center gap-1 text-xs font-semibold transition-colors"
            >
              {open ? "Show less" : `Show ${details.length - PREVIEW} more`}
              <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                <ChevronDown className="size-3.5" />
              </motion.span>
            </button>
          )}
        </div>
      )}

      <p className="text-ink-3 mt-auto pt-4 text-xs">
        Serial {serial}
        {heard ? ` · heard from ${heard}` : ""}
      </p>
    </Card>
  );
}
