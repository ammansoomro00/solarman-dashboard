"use client";

import { Cloud, Radio, UtilityPole, ZapOff } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Card, CardHeader } from "@/components/overview/card";
import { CountUp } from "@/components/trends/count-up";
import { cn } from "@/lib/utils";

/** Glass orb with an icon, used for the big status symbol on each card. */
function Orb({ color, children, className }: { color: string; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn("relative grid size-12 shrink-0 place-items-center rounded-full", className)}
      style={{
        background: `radial-gradient(120% 120% at 30% 20%, color-mix(in oklab, ${color} 38%, var(--surface)), color-mix(in oklab, ${color} 10%, var(--surface)))`,
        boxShadow: `inset 0 1px 0 rgb(255 255 255 / 0.16), 0 0 0 1px color-mix(in oklab, ${color} 30%, transparent), 0 10px 26px -8px color-mix(in oklab, ${color} 55%, transparent)`,
        color: `color-mix(in oklab, ${color} 55%, var(--ink))`,
      }}
    >
      {children}
    </span>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="rounded-tile bg-surface-2/80 border-line border px-4 py-3"
    >
      <dt className="text-ink-3 text-xs">{label}</dt>
      <dd className="tabular mt-0.5 text-[15px] font-bold">{children}</dd>
    </motion.div>
  );
}

export function SupplyCard({ available, boughtKwh, soldKwh }: { available: boolean | null; boughtKwh: number | null; soldKwh: number | null }) {
  const reduce = useReducedMotion();
  const color = available === false ? "var(--bad)" : "var(--grid)";
  const total = (boughtKwh ?? 0) + (soldKwh ?? 0);

  return (
    <Card className="relative isolate h-full overflow-hidden" aria-labelledby="supply-title">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-16 -z-10 size-64 rounded-full opacity-[0.16] blur-3xl"
        style={{ background: color }}
      />
      <CardHeader id="supply-title" title="Power company supply" />

      <div className="mt-5 flex items-center gap-4">
        <Orb color={color}>
          {available === false ? (
            <motion.span
              animate={reduce ? undefined : { opacity: [1, 0.3, 1, 0.7, 1] }}
              transition={{ duration: 2.6, repeat: Infinity, times: [0, 0.1, 0.2, 0.3, 1] }}
            >
              <ZapOff className="size-5" />
            </motion.span>
          ) : (
            <UtilityPole className="size-5" />
          )}
          {available === true && !reduce && (
            <motion.span
              className="absolute inset-0 rounded-full"
              style={{ boxShadow: `0 0 0 1.5px color-mix(in oklab, ${color} 55%, transparent)` }}
              animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
            />
          )}
        </Orb>
        {available === null ? (
          <p className="text-ink-2 text-sm">Your system doesn&apos;t report whether the power company&apos;s supply is on.</p>
        ) : (
          <div>
            <p className="text-lg font-bold">{available ? "On" : "Off right now"}</p>
            <p className="text-ink-2 text-sm">
              {available
                ? "The power company's supply is available if your home needs it."
                : "There's a power cut. Your panels and battery are running the home."}
            </p>
          </div>
        )}
      </div>

      {/* Bought vs sold, as a balance */}
      {total > 0 && (
        <div className="mt-5" aria-hidden>
          <div className="bg-surface-sunk flex h-2 overflow-hidden rounded-full">
            <motion.span
              className="h-full"
              style={{ background: "var(--grid)" }}
              initial={{ width: 0 }}
              animate={{ width: `${((boughtKwh ?? 0) / total) * 100}%` }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            />
            <motion.span
              className="h-full"
              style={{ background: "var(--sun)" }}
              initial={{ width: 0 }}
              animate={{ width: `${((soldKwh ?? 0) / total) * 100}%` }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.35 }}
            />
          </div>
        </div>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-3">
        <Stat label="Bought since install">
          {boughtKwh != null ? (
            <>
              <CountUp value={boughtKwh} format={(n) => Math.round(n).toLocaleString("en-US")} /> units
            </>
          ) : (
            "—"
          )}
        </Stat>
        <Stat label="Sold back since install">
          {soldKwh != null ? (
            <>
              <CountUp value={soldKwh} format={(n) => (Math.round(n * 10) / 10).toLocaleString("en-US")} /> units
            </>
          ) : (
            "—"
          )}
        </Stat>
      </dl>
    </Card>
  );
}

export function ConnectionCard({
  connected,
  latest,
  checked,
  error,
}: {
  connected: boolean;
  latest: string | null;
  checked: string | null;
  error: string | null;
}) {
  const reduce = useReducedMotion();
  const color = error ? "var(--warn)" : connected ? "var(--home)" : "var(--sun)";

  return (
    <Card className="relative isolate h-full overflow-hidden" aria-labelledby="connection-title">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-16 -z-10 size-64 rounded-full opacity-[0.14] blur-3xl"
        style={{ background: color }}
      />
      <CardHeader id="connection-title" title="Data connection" />

      <div className="mt-5 flex items-center gap-4">
        <Orb color={color}>
          <Radio className="relative size-5" />
          {!reduce &&
            [0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="absolute inset-0 rounded-full"
                style={{ boxShadow: `0 0 0 1px color-mix(in oklab, ${color} 50%, transparent)` }}
                animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: i, ease: "easeOut" }}
              />
            ))}
        </Orb>
        <div>
          <p className="text-lg font-bold">{connected ? "Connected to Solarman" : "Sample data"}</p>
          <p className="text-ink-2 text-sm">
            {connected
              ? "Readings come from your inverter through the Solarman service, about every 5 minutes."
              : "This is a made-up home for trying the app. Add your Solarman details to .env to connect your own system."}
          </p>
        </div>
      </div>

      {/* Inverter → cloud → this app, with a reading travelling along */}
      <div className="text-ink-3 mt-5 flex items-center gap-2 text-[11px] font-semibold" aria-hidden>
        <span>Inverter</span>
        <span className="bg-line relative h-px flex-1 overflow-visible">
          {!reduce && (
            <motion.span
              className="absolute top-1/2 size-1.5 -translate-y-1/2 rounded-full"
              style={{ background: color, boxShadow: `0 0 8px ${color}` }}
              animate={{ left: ["0%", "100%"], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
        </span>
        <Cloud className="size-3.5" />
        <span className="bg-line relative h-px flex-1 overflow-visible">
          {!reduce && (
            <motion.span
              className="absolute top-1/2 size-1.5 -translate-y-1/2 rounded-full"
              style={{ background: color, boxShadow: `0 0 8px ${color}` }}
              animate={{ left: ["0%", "100%"], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 1.1 }}
            />
          )}
        </span>
        <span>This app</span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3">
        <Stat label="Latest reading">{latest ?? "—"}</Stat>
        <Stat label="Last checked">{checked ?? "—"}</Stat>
      </dl>
      {error && (
        <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="rounded-tile bg-sun-soft text-sun-ink mt-3 px-4 py-3 text-[13px]">
          The last check had a problem: {error}
        </motion.p>
      )}
    </Card>
  );
}
