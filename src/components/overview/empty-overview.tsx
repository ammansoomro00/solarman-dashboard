"use client";

import { Sun } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useLiveSync } from "@/components/shell/live-sync";
import { Button } from "@/components/ui/button";

/** Shown before the very first reading has arrived. */
export function EmptyOverview() {
  const { status, error, refreshNow } = useLiveSync();
  const reduce = useReducedMotion();
  const syncing = status === "syncing";

  return (
    <div className="card relative isolate grid place-items-center overflow-hidden px-6 py-20 text-center">
      <div
        aria-hidden
        className="bg-sun pointer-events-none absolute top-0 left-1/2 -z-10 size-80 -translate-x-1/2 -translate-y-1/3 rounded-full opacity-20 blur-3xl"
      />

      {/* A rising sun: glowing core, turning rays, pulsing halo while we check */}
      <div className="relative grid size-28 place-items-center" aria-hidden>
        {!reduce &&
          [0, 1].map((i) => (
            <motion.span
              key={i}
              className="border-sun absolute inset-4 rounded-full border"
              animate={{ scale: [1, 1.9], opacity: [0.5, 0] }}
              transition={{ duration: syncing ? 1.6 : 3.2, repeat: Infinity, delay: i * (syncing ? 0.8 : 1.6), ease: "easeOut" }}
            />
          ))}
        <motion.svg
          viewBox="0 0 100 100"
          className="absolute inset-0 size-full"
          animate={reduce ? undefined : { rotate: 360 }}
          transition={{ duration: syncing ? 6 : 24, repeat: Infinity, ease: "linear" }}
        >
          {Array.from({ length: 12 }, (_, i) => (
            <line
              key={i}
              x1="50"
              y1="8"
              x2="50"
              y2={i % 2 ? "16" : "20"}
              stroke="var(--sun)"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity={i % 2 ? 0.45 : 0.85}
              transform={`rotate(${i * 30} 50 50)`}
            />
          ))}
        </motion.svg>
        <span
          className="relative grid size-14 place-items-center rounded-full text-white"
          style={{
            background:
              "radial-gradient(circle at 35% 30%, color-mix(in oklab, var(--sun) 55%, white), var(--sun) 60%, color-mix(in oklab, var(--sun) 70%, var(--bad)))",
            boxShadow: "0 0 40px -4px var(--sun), inset 0 1px 0 rgb(255 255 255 / 0.4)",
          }}
        >
          <Sun className="size-6" />
        </span>
      </div>

      <motion.h2
        key={syncing ? "s" : "n"}
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 text-xl font-bold tracking-tight"
      >
        {syncing ? "Getting your first readings…" : "No readings yet"}
      </motion.h2>
      <p className="text-ink-2 mt-2 max-w-sm text-sm leading-relaxed">
        {error ?? "As soon as your inverter sends data, you'll see what your panels, battery and home are doing here."}
      </p>
      <Button className="mt-6" variant="primary" onClick={() => void refreshNow()} disabled={syncing}>
        {syncing ? "Checking…" : "Check now"}
      </Button>
    </div>
  );
}
