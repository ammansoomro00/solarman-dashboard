"use client";

import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Card } from "@/components/overview/card";
import { HEALTH_COLOR, HEALTH_TOKEN, type HealthTone } from "./device-meta";
import { type CoreSatellite, SystemCore } from "./system-core";

const ICON = { good: CircleCheck, warn: TriangleAlert, bad: CircleAlert } as const;

export function HealthHero({
  tone,
  title,
  body,
  online,
  total,
  satellites,
}: {
  tone: HealthTone;
  title: string;
  body: string;
  online: number;
  total: number;
  satellites: CoreSatellite[];
}) {
  const reduce = useReducedMotion();
  const color = HEALTH_COLOR[tone];
  const Icon = ICON[tone];

  return (
    <Card className="relative isolate overflow-hidden p-0" aria-live="polite" aria-labelledby="health-title">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-36 -left-24 -z-10 size-[420px] rounded-full opacity-20 blur-3xl"
        style={{ background: color }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -bottom-40 -z-10 size-[380px] rounded-full opacity-[0.12] blur-3xl"
        style={{ background: "var(--sun)" }}
      />

      <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
        <div className="flex flex-1 items-start gap-5 p-6 sm:p-8">
          <span className="relative grid size-14 shrink-0 place-items-center">
            {!reduce &&
              [0, 1].map((i) => (
                <motion.span
                  key={i}
                  className="absolute inset-0 rounded-full"
                  style={{ boxShadow: `0 0 0 1.5px color-mix(in oklab, ${color} 60%, transparent)` }}
                  animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
                  transition={{ duration: 2.6, repeat: Infinity, delay: i * 1.3, ease: "easeOut" }}
                />
              ))}
            <span
              className="relative grid size-14 place-items-center rounded-full"
              style={{
                background: `radial-gradient(120% 120% at 30% 20%, color-mix(in oklab, ${color} 40%, var(--surface)), color-mix(in oklab, ${color} 12%, var(--surface)))`,
                boxShadow: `inset 0 1px 0 rgb(255 255 255 / 0.18), 0 0 0 1px color-mix(in oklab, ${color} 35%, transparent), 0 14px 34px -8px color-mix(in oklab, ${color} 60%, transparent)`,
                color: `color-mix(in oklab, ${color} 55%, var(--ink))`,
              }}
            >
              <Icon className="size-6" />
            </span>
          </span>

          <div className="min-w-0">
            <p className="eyebrow">System health</p>
            <h2 id="health-title" className="mt-1.5 text-[24px] leading-tight font-bold tracking-tight text-balance sm:text-[28px]">
              {title}
            </h2>
            <p className="text-ink-2 mt-2 max-w-md text-[14px] leading-relaxed">{body}</p>

            {total > 0 && (
              <div className="mt-5 flex items-center gap-3">
                <div className="flex gap-1.5" aria-hidden>
                  {Array.from({ length: total }, (_, i) => (
                    <motion.span
                      key={i}
                      className="h-2 w-6 rounded-full"
                      style={{ background: i < online ? "var(--home)" : "var(--line-strong)" }}
                      initial={{ scaleX: 0, opacity: 0 }}
                      animate={{ scaleX: 1, opacity: 1 }}
                      transition={{ delay: 0.25 + i * 0.07, type: "spring", stiffness: 300, damping: 20 }}
                    />
                  ))}
                </div>
                <p className="text-ink-2 tabular text-[13px] font-semibold">
                  {online} of {total} devices online
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="relative h-[220px] w-full shrink-0 md:h-[260px] md:w-[380px]">
          <SystemCore tone={HEALTH_TOKEN[tone]} satellites={satellites} className="absolute inset-0" />
          <p className="text-ink-3 pointer-events-none absolute right-5 bottom-3 text-[10.5px] font-semibold tracking-wide">Drag to spin</p>
        </div>
      </div>
    </Card>
  );
}
