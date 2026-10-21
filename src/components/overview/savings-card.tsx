"use client";

import { Leaf, PiggyBank, ShieldCheck, TreeDeciduous } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Hint } from "@/components/ui/hint";
import type { Insights } from "@/lib/energy/insights";
import { formatUnits, moneyText } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card } from "./card";

export function SavingsCard({ week, currency, pricePerUnit, className }: { week: Insights; currency: string; pricePerUnit: number; className?: string }) {
  const reduce = useReducedMotion();
  const treeCount = week.trees < 10 ? Math.round(week.trees * 10) / 10 : Math.round(week.trees);

  return (
    <Card className={cn("overflow-hidden p-0", className)} aria-labelledby="savings-title">
      <div className="grid md:grid-cols-[1.3fr_repeat(3,1fr)]">
        {/* Hero: money saved, on a deep panel lit by drifting sun and leaf-green light */}
        <div
          className="relative isolate overflow-hidden bg-[#0b0d13] p-6 text-[#f1eee7] sm:p-7"
          // The panel is always midnight, so it keeps the dark-theme champagne in light mode too.
          style={{ "--gilt-1": "#fff8ec", "--gilt-2": "#edc27a" } as React.CSSProperties}
        >
          <motion.span
            aria-hidden
            className="absolute -top-24 -left-16 -z-10 size-72 rounded-full bg-[#e2b25e] opacity-25 blur-3xl"
            animate={reduce ? undefined : { x: [0, 40, 0], y: [0, 20, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.span
            aria-hidden
            className="absolute -right-24 -bottom-28 -z-10 size-72 rounded-full bg-[#6d5bd0] opacity-20 blur-3xl"
            animate={reduce ? undefined : { x: [0, -30, 0], y: [0, -24, 0] }}
            transition={{ duration: 17, repeat: Infinity, ease: "easeInOut" }}
          />
          <span
            aria-hidden
            className="absolute inset-0 -z-10 [background-image:radial-gradient(rgb(255_255_255/0.05)_1px,transparent_1px)] [mask-image:linear-gradient(120deg,black,transparent_75%)] [background-size:16px_16px]"
          />

          <p className="flex items-center gap-2 text-xs font-bold tracking-[0.1em] text-[#edc27a]/80 uppercase">
            <PiggyBank className="size-4" /> Last 7 days
          </p>
          <h2 id="savings-title" className="mt-3 text-[15px] font-semibold text-white/80">
            Solar saved you
          </h2>
          <p className="tabular text-display relative mt-1 overflow-hidden font-bold">
            <span className="bg-[linear-gradient(100deg,var(--gilt-1)_20%,var(--gilt-2)_50%,var(--gilt-1)_80%)] bg-clip-text text-transparent">
              <AnimatedNumber value={week.saved} format={(n) => moneyText(n, currency)} />
            </span>
            {!reduce && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-[shimmer-sweep_4.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/25 to-transparent"
              />
            )}
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-white/60">
            Based on {moneyText(pricePerUnit, currency)} per unit. You still paid{" "}
            <span className="font-semibold text-white/85">{moneyText(week.spent, currency)}</span> for power you bought.
          </p>
        </div>

        <SelfPoweredTile share={week.selfPowered} ownUnits={week.ownUnits} reduce={!!reduce} />
        <Co2Tile kg={week.co2Kg} reduce={!!reduce} />
        <TreesTile trees={treeCount} reduce={!!reduce} />
      </div>
    </Card>
  );
}

function Tile({ children, color, className }: { children: React.ReactNode; color: string; className?: string }) {
  return (
    <motion.div whileHover="hover" className={cn("border-line group/tile relative isolate overflow-hidden border-t p-6 md:border-t-0 md:border-l", className)}>
      <motion.span
        aria-hidden
        className="absolute -right-10 -bottom-12 -z-10 size-40 rounded-full blur-3xl"
        style={{ background: color }}
        initial={{ opacity: 0.08 }}
        variants={{ hover: { opacity: 0.22, scale: 1.15 } }}
        transition={{ duration: 0.5 }}
      />
      {children}
    </motion.div>
  );
}

function TileText({ label, hint, value, sub }: { label: string; hint: string; value: React.ReactNode; sub: string }) {
  return (
    <>
      <p className="text-ink-2 mt-4 flex items-center gap-1 text-[13px]">
        {label}
        <Hint>{hint}</Hint>
      </p>
      <p className="tabular mt-0.5 text-[28px] leading-tight font-bold tracking-tight">{value}</p>
      <p className="text-ink-3 mt-1 text-xs leading-relaxed">{sub}</p>
    </>
  );
}

function SelfPoweredTile({ share, ownUnits, reduce }: { share: number; ownUnits: number; reduce: boolean }) {
  const gid = useId();
  const R = 17;
  const C = 2 * Math.PI * R;
  return (
    <Tile color="var(--gilt-2)">
      <span className="relative grid size-11 place-items-center">
        <svg viewBox="0 0 40 40" className="absolute inset-0 size-full -rotate-90" aria-hidden>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="var(--gilt-2)" />
              <stop offset="1" stopColor="var(--gilt-1)" />
            </linearGradient>
          </defs>
          <circle cx="20" cy="20" r={R} fill="none" stroke="var(--line)" strokeWidth={3} />
          <motion.circle
            cx="20"
            cy="20"
            r={R}
            fill="none"
            stroke={`url(#${gid})`}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={C}
            initial={{ strokeDashoffset: C }}
            whileInView={{ strokeDashoffset: C * (1 - share) }}
            viewport={{ once: true }}
            transition={reduce ? { duration: 0 } : { duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <motion.span className="text-sun-ink" variants={{ hover: { scale: 1.15 } }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
          <ShieldCheck className="size-[18px]" />
        </motion.span>
      </span>
      <TileText
        label="Powered by your own system"
        hint="The share of everything your home used this week that came from your panels and battery."
        value={<AnimatedNumber value={Math.round(share * 100)} format={(n) => `${Math.round(n)}%`} />}
        sub={`${formatUnits(ownUnits)} units you didn't have to buy`}
      />
    </Tile>
  );
}

function Co2Tile({ kg, reduce }: { kg: number; reduce: boolean }) {
  return (
    <Tile color="var(--home)">
      <span className="relative grid size-11 place-items-center">
        <span className="bg-home-soft absolute inset-0 rounded-full" />
        {/* CO₂ bubbles drifting away */}
        {!reduce &&
          [0, 1, 2].map((i) => (
            <motion.span
              key={i}
              aria-hidden
              className="border-home-ink/50 absolute size-1.5 rounded-full border"
              style={{ left: `${30 + i * 18}%`, top: "20%" }}
              animate={{ y: [0, -18], opacity: [0, 0.8, 0], scale: [0.6, 1.2] }}
              transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.8, ease: "easeOut" }}
            />
          ))}
        <motion.span
          className="text-home-ink relative"
          animate={reduce ? undefined : { rotate: [-8, 8, -8] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{ originX: "20%", originY: "90%" }}
        >
          <Leaf className="size-[18px]" />
        </motion.span>
      </span>
      <TileText
        label="Pollution avoided"
        hint="Making electricity from gas and oil releases carbon dioxide. Every unit of solar avoids roughly that much."
        value={
          <>
            <AnimatedNumber value={kg} format={(n) => String(Math.round(n))} />
            <span className="text-ink-3 ml-1 text-base font-semibold">kg</span>
          </>
        }
        sub="of carbon dioxide (CO₂) not released"
      />
    </Tile>
  );
}

function TreesTile({ trees, reduce }: { trees: number; reduce: boolean }) {
  // Up to 10 little trees grow in; partial trees fade in partway.
  const shown = Math.min(10, Math.max(1, Math.ceil(trees)));
  return (
    <Tile color="var(--home)">
      <span className="flex h-11 items-end gap-0.5" aria-hidden>
        {Array.from({ length: shown }, (_, i) => {
          const fill = Math.min(1, Math.max(0.25, trees - i));
          return (
            <motion.span
              key={i}
              className="text-home-ink"
              style={{ originY: 1, opacity: trees > 10 ? 1 : fill }}
              initial={reduce ? false : { scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              variants={{ hover: { y: -2 } }}
              transition={{ type: "spring", stiffness: 260, damping: 14, delay: reduce ? 0 : 0.2 + i * 0.07 }}
            >
              <TreeDeciduous className={cn(i % 2 ? "size-4" : "size-5")} />
            </motion.span>
          );
        })}
      </span>
      <TileText
        label="Like planting"
        hint="A tree takes in about 21 kg of carbon dioxide a year."
        value={
          <>
            {trees}
            <span className="text-ink-3 ml-1 text-base font-semibold">{trees === 1 ? "tree" : "trees"}</span>
          </>
        }
        sub="the CO₂ they'd soak up in a year"
      />
    </Tile>
  );
}
