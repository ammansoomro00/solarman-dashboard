"use client";

import { Bell, BellOff, CircleAlert, Info, TriangleAlert } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useOptimistic, useState, useTransition } from "react";
import { loadNotices, markNoticesRead } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { agoText } from "@/lib/format";
import { cn } from "@/lib/utils";

type Notice = Awaited<ReturnType<typeof loadNotices>>[number];

const LEVEL = {
  INFO: { icon: Info, tint: "bg-grid-soft text-grid-ink", label: "Update", color: "var(--grid)" },
  WARNING: { icon: TriangleAlert, tint: "bg-sun-soft text-warn-ink", label: "Heads up", color: "var(--sun)" },
  FAULT: { icon: CircleAlert, tint: "bg-[color-mix(in_oklab,var(--bad)_14%,transparent)] text-bad-ink", label: "Problem", color: "var(--bad)" },
} as const;

export function NotificationsButton({ unread }: { unread: number }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [notices, setNotices] = useState<Notice[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [, startTransition] = useTransition();
  const [optimisticNotices, markOptimistic] = useOptimistic(
    notices,
    (state, ids: number[] | "all") => state?.map((n) => (ids === "all" || ids.includes(n.id) ? { ...n, read: true } : n)) ?? null,
  );
  const [optimisticUnread, setOptimisticUnread] = useOptimistic(unread);

  // Notices are loaded only when the drawer opens, not on every page view.
  const openDrawer = () => {
    setOpen(true);
    setFailed(false);
    loadNotices()
      .then(setNotices)
      .catch(() => setFailed(true));
  };

  const markAll = () =>
    startTransition(async () => {
      markOptimistic("all");
      setOptimisticUnread(0);
      const res = await markNoticesRead("all");
      if (res.ok) setNotices((s) => s?.map((n) => ({ ...n, read: true })) ?? null);
    });

  const list = optimisticNotices;
  const unreadInList = list?.filter((n) => !n.read).length ?? 0;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={openDrawer}
        aria-label={`Notifications${optimisticUnread ? `, ${optimisticUnread} unread` : ""}`}
        className="border-line/80 bg-surface/60 hover:bg-surface/80 relative border backdrop-blur-xl"
      >
        <motion.span
          className="grid"
          style={{ originY: "2px" }}
          animate={optimisticUnread > 0 && !reduce ? { rotate: [0, 14, -12, 8, -4, 0] } : { rotate: 0 }}
          transition={{ duration: 1.1, repeat: optimisticUnread > 0 && !reduce ? Infinity : 0, repeatDelay: 5 }}
          whileHover={reduce ? undefined : { rotate: [0, 12, -10, 0], transition: { duration: 0.5 } }}
        >
          <Bell className="size-[18px]!" />
        </motion.span>
        <AnimatePresence>
          {optimisticUnread > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 18 }}
              className="bg-sun ring-page absolute -top-0.5 -right-0.5 grid min-w-[18px] place-items-center rounded-full px-1 text-[10px] leading-[18px] font-bold text-[#1b1914] shadow-[0_0_12px_var(--sun)] ring-2"
            >
              {optimisticUnread > 9 ? "9+" : optimisticUnread}
            </motion.span>
          )}
        </AnimatePresence>
      </Button>

      <Sheet open={open} onOpenChange={setOpen} title="Notifications" description="Power cuts, battery warnings and messages from your inverter.">
        {failed ? (
          <p className="bg-surface-sunk text-ink-2 rounded-2xl p-4 text-sm">Couldn&apos;t load notifications. Please try again.</p>
        ) : list === null ? (
          <ul className="space-y-3" aria-busy>
            {Array.from({ length: 4 }, (_, i) => (
              <li key={i} className="bg-surface-sunk/70 relative h-[76px] overflow-hidden rounded-2xl">
                <span className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent [animation:shimmer-sweep_1.6s_ease-in-out_infinite]" />
              </li>
            ))}
          </ul>
        ) : list.length === 0 ? (
          <div className="grid place-items-center py-16 text-center">
            <span className="relative grid size-16 place-items-center">
              <span className="bg-home absolute inset-0 rounded-full opacity-15 blur-xl" />
              <motion.span
                className="border-line bg-surface-2 text-ink-3 relative grid size-14 place-items-center rounded-full border"
                animate={reduce ? undefined : { y: [0, -4, 0] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              >
                <BellOff className="size-5" />
              </motion.span>
            </span>
            <p className="mt-4 font-semibold">All quiet</p>
            <p className="text-ink-2 mt-1 max-w-[240px] text-sm">We&apos;ll let you know about power cuts, low battery or anything that needs attention.</p>
          </div>
        ) : (
          <>
            {unreadInList > 0 && (
              <div className="mb-3 flex justify-end">
                <Button size="sm" variant="ghost" onClick={markAll}>
                  Mark all as read
                </Button>
              </div>
            )}
            <motion.ul className="space-y-2" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05, delayChildren: 0.08 } } }}>
              {list.map((n) => {
                const meta = LEVEL[n.level];
                const Icon = meta.icon;
                return (
                  <motion.li
                    key={n.id}
                    variants={{
                      hidden: { opacity: 0, x: 24, scale: 0.98 },
                      show: { opacity: 1, x: 0, scale: 1, transition: { type: "spring", stiffness: 380, damping: 30 } },
                    }}
                    whileHover={reduce ? undefined : { x: -2 }}
                    className={cn(
                      "relative flex gap-3 overflow-hidden rounded-2xl border p-4 transition-colors",
                      n.read ? "bg-surface-2/60 border-transparent" : "border-line bg-surface",
                    )}
                    style={n.read ? undefined : { boxShadow: `inset 3px 0 0 ${meta.color}, 0 8px 24px -16px ${meta.color}` }}
                  >
                    <span className={cn("relative grid size-9 shrink-0 place-items-center rounded-full", meta.tint)}>
                      {!n.read && <span className="absolute inset-0 rounded-full opacity-40 blur-md" style={{ background: meta.color }} />}
                      <Icon className="relative size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-semibold">{n.title}</p>
                        <time className="text-ink-3 shrink-0 text-xs" dateTime={n.occurredAt} title={new Date(n.occurredAt).toLocaleString()}>
                          {agoText(new Date(n.occurredAt))}
                        </time>
                      </div>
                      <p className="text-ink-2 mt-0.5 text-[13px] leading-relaxed">{n.body}</p>
                    </div>
                    {!n.read && <span className="bg-sun mt-1.5 size-2 shrink-0 rounded-full shadow-[0_0_8px_var(--sun)]" aria-label="Unread" />}
                  </motion.li>
                );
              })}
            </motion.ul>
          </>
        )}
      </Sheet>
    </>
  );
}
