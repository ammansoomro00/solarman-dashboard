"use client";

import { CircleAlert, Info, TriangleAlert } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Card, CardHeader } from "@/components/overview/card";
import { cn } from "@/lib/utils";

export interface TimelineEvent {
  id: number;
  level: "FAULT" | "WARNING" | "INFO";
  title: string;
  body: string;
  iso: string;
  when: string;
}

const LEVEL = {
  FAULT: { color: "var(--bad)", icon: CircleAlert, label: "Problem" },
  WARNING: { color: "var(--warn)", icon: TriangleAlert, label: "Warning" },
  INFO: { color: "var(--grid)", icon: Info, label: "Info" },
} as const;

type Filter = "all" | "FAULT" | "WARNING" | "INFO";

export function EventsTimeline({ events }: { events: TimelineEvent[] }) {
  const reduce = useReducedMotion();
  const [filter, setFilter] = useState<Filter>("all");
  const counts = { FAULT: 0, WARNING: 0, INFO: 0 };
  for (const e of events) counts[e.level in counts ? e.level : "INFO"]++;
  const shown = filter === "all" ? events : events.filter((e) => e.level === filter);
  const filters: { value: Filter; label: string; count: number; color?: string }[] = [
    { value: "all", label: "All", count: events.length },
    ...(["FAULT", "WARNING", "INFO"] as const)
      .filter((l) => counts[l] > 0)
      .map((l) => ({ value: l, label: LEVEL[l].label, count: counts[l], color: LEVEL[l].color })),
  ];

  return (
    <Card aria-labelledby="events-title">
      <CardHeader
        id="events-title"
        title="Recent events"
        action={
          events.length > 0 && filters.length > 2 ? (
            <div className="bg-surface-sunk flex gap-0.5 rounded-full p-0.5" role="group" aria-label="Filter events">
              {filters.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFilter(f.value)}
                  aria-pressed={filter === f.value}
                  className={cn(
                    "relative rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition-colors",
                    filter === f.value ? "text-ink" : "text-ink-3 hover:text-ink-2",
                  )}
                >
                  {filter === f.value && (
                    <motion.span
                      layoutId="event-filter"
                      className="bg-surface shadow-card absolute inset-0 rounded-full"
                      transition={{ type: "spring", stiffness: 500, damping: 38 }}
                    />
                  )}
                  <span className="relative inline-flex items-center gap-1.5">
                    {f.color && <span className="size-1.5 rounded-full" style={{ background: f.color }} />}
                    {f.label}
                    <span className="text-ink-3 tabular">{f.count}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : undefined
        }
      />
      {events.length === 0 ? (
        <p className="text-ink-2 mt-4 text-sm">Nothing to report. Power cuts, low battery and inverter alerts will show up here.</p>
      ) : (
        <ol className="relative mt-5">
          {/* The spine */}
          <span aria-hidden className="absolute top-2 bottom-2 left-[13px] w-px bg-[linear-gradient(to_bottom,var(--line-strong),transparent)]" />
          {shown.map((e, i) => {
            const lv = LEVEL[e.level] ?? LEVEL.INFO;
            const Icon = lv.icon;
            return (
              <motion.li
                key={`${filter}-${e.id}`}
                initial={reduce ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i, 8) * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="group/ev relative flex items-start gap-4 py-2.5"
              >
                <span
                  className="relative z-10 mt-0.5 grid size-[27px] shrink-0 place-items-center rounded-full transition-transform group-hover/ev:scale-110"
                  style={{
                    background: `color-mix(in oklab, ${lv.color} 16%, var(--surface))`,
                    boxShadow: `0 0 0 3px var(--surface), 0 0 0 4px color-mix(in oklab, ${lv.color} 30%, transparent), 0 6px 16px -6px ${lv.color}`,
                    color: `color-mix(in oklab, ${lv.color} 60%, var(--ink))`,
                  }}
                >
                  <Icon className="size-3.5" />
                </span>
                <div className="group-hover/ev:bg-surface-2 -my-1 min-w-0 flex-1 rounded-xl px-3 py-1.5 transition-colors">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <p className="text-sm font-semibold">{e.title}</p>
                    <time className="text-ink-3 shrink-0 text-xs" dateTime={e.iso}>
                      {e.when}
                    </time>
                  </div>
                  <p className="text-ink-2 text-[13px] leading-relaxed">{e.body}</p>
                </div>
              </motion.li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
