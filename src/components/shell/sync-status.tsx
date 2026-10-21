"use client";

import { RefreshCw } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { agoText } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLiveSync } from "./live-sync";

/** Readings arrive about this often; the ring drains as the data ages toward the next one. */
const EXPECTED_MS = 5 * 60_000;
const TICK_MS = 15_000;

/** "Updated 3 min ago" in a glass pill with a freshness ring; doubles as the refresh button. */
export function SyncStatus({ className }: { className?: string }) {
  const { status, lastSyncedAt, error, refreshNow } = useLiveSync();
  const reduce = useReducedMotion();
  const [now, setNow] = useState(() => Date.now());

  // Re-render the relative time without refetching anything.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const syncing = status === "syncing";
  const text = syncing
    ? "Checking for new readings…"
    : status === "error"
      ? (error ?? "Couldn't update")
      : lastSyncedAt
        ? `Updated ${agoText(lastSyncedAt)}`
        : "Waiting for first reading";

  const age = lastSyncedAt ? Math.max(0, now - lastSyncedAt.getTime()) : EXPECTED_MS;
  const freshness = Math.max(0, 1 - age / EXPECTED_MS);
  const tone = status === "error" ? "var(--warn)" : syncing ? "var(--grid)" : "var(--good)";
  const R = 7;
  const C = 2 * Math.PI * R;

  return (
    <div className={cn("flex min-w-0 items-center", className)}>
      <button
        type="button"
        onClick={() => void refreshNow()}
        disabled={syncing}
        title="Refresh now"
        className="group border-line/80 bg-surface/60 hover:border-line-strong hover:bg-surface/80 relative flex h-9 max-w-full min-w-0 items-center gap-2.5 overflow-hidden rounded-full border py-1 pr-3 pl-1.5 backdrop-blur-xl transition-colors disabled:cursor-progress"
      >
        <span className="sr-only">Refresh now. </span>
        {/* Freshness ring with a live core */}
        <span className="relative grid size-6 shrink-0 place-items-center" aria-hidden>
          <svg viewBox="0 0 18 18" className="absolute inset-0 size-full -rotate-90">
            <circle cx="9" cy="9" r={R} fill="none" stroke="var(--line)" strokeWidth="1.6" />
            <motion.circle
              cx="9"
              cy="9"
              r={R}
              fill="none"
              stroke={tone}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeDasharray={C}
              animate={syncing && !reduce ? { strokeDashoffset: [C, 0], rotate: [0, 360] } : { strokeDashoffset: C * (1 - freshness), rotate: 0 }}
              transition={syncing ? { duration: 1.1, repeat: Infinity, ease: "easeInOut" } : { duration: reduce ? 0 : 0.8, ease: [0.22, 1, 0.36, 1] }}
              style={{ originX: "9px", originY: "9px" }}
            />
          </svg>
          <span className="relative grid size-2 place-items-center">
            {!reduce && status === "idle" && (
              <span className="absolute inset-0 animate-ping rounded-full opacity-50 [animation-duration:2.4s]" style={{ background: tone }} />
            )}
            <span className="relative size-2 rounded-full transition-colors" style={{ background: tone, boxShadow: `0 0 8px ${tone}` }} />
          </span>
        </span>

        <span className="text-ink-2 relative min-w-0 truncate text-[13px] font-medium" role="status" aria-live="polite" title={text}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={syncing ? "sync" : status === "error" ? "err" : "ok"}
              className="block truncate"
              initial={{ opacity: 0, y: 6, filter: "blur(3px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -6, filter: "blur(3px)" }}
              transition={{ duration: 0.2 }}
            >
              {text}
            </motion.span>
          </AnimatePresence>
        </span>

        <motion.span
          aria-hidden
          className="text-ink-3 group-hover:text-ink grid shrink-0 transition-colors"
          animate={syncing ? { rotate: 360 } : { rotate: 0 }}
          transition={syncing ? { repeat: Infinity, duration: 1, ease: "linear" } : { type: "spring", stiffness: 200, damping: 18 }}
          whileHover={syncing || reduce ? undefined : { rotate: 120 }}
        >
          <RefreshCw className="size-3.5" />
        </motion.span>
      </button>
    </div>
  );
}
