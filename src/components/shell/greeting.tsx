"use client";

import { SlidersHorizontal } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";

type Period = "night" | "morning" | "afternoon" | "evening";

const PERIOD: Record<Period, { text: string; gradient: string; glyph: string }> = {
  morning: { text: "Good morning", gradient: "var(--gilt-1), var(--gilt-2), var(--gilt-1)", glyph: "var(--sun)" },
  afternoon: { text: "Good afternoon", gradient: "var(--gilt-1), var(--gilt-2), var(--gilt-1)", glyph: "var(--sun)" },
  evening: { text: "Good evening", gradient: "var(--gilt-1), color-mix(in oklab, var(--gilt-2) 60%, var(--battery)), var(--gilt-1)", glyph: "var(--battery)" },
  night: { text: "Good night", gradient: "var(--gilt-1), color-mix(in oklab, var(--gilt-1) 40%, var(--battery)), var(--gilt-1)", glyph: "var(--battery)" },
};

/** Overview header: the greeting shimmers in the colours of the time of day, words rise in one by one. */
export function Greeting({ hour, dateText }: { hour: number; dateText: string }) {
  const reduce = useReducedMotion();
  const period: Period = hour < 5 ? "night" : hour < 12 ? "morning" : hour < 17 ? "afternoon" : hour < 21 ? "evening" : "night";
  const p = PERIOD[period];
  const rest = "Here's your home's power.".split(" ");

  const word = (i: number) => ({
    initial: reduce ? false : { opacity: 0, y: 14, filter: "blur(6px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    transition: { type: "spring" as const, stiffness: 220, damping: 22, delay: 0.08 + i * 0.05 },
  });

  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 lg:mb-8">
      <div>
        <motion.p
          className="text-ink-3 flex items-center gap-2 text-sm"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <span className="size-1.5 rounded-full" style={{ background: p.glyph, boxShadow: `0 0 8px ${p.glyph}` }} />
          {dateText}
        </motion.p>
        <h1 className="mt-1 text-[28px] leading-tight font-bold tracking-tight sm:text-[38px]">
          <motion.span {...word(0)} className="inline-block">
            <motion.span
              className="inline-block bg-[length:200%_auto] bg-clip-text text-transparent"
              style={{ backgroundImage: `linear-gradient(100deg, ${p.gradient})` }}
              animate={reduce ? undefined : { backgroundPosition: ["0% 50%", "200% 50%"] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              {p.text}
            </motion.span>
          </motion.span>
          <span className="text-ink-3">. </span>
          {rest.map((w, i) => (
            <motion.span key={i} {...word(i + 1)} className="text-ink-3 mr-[0.25em] inline-block last:mr-0">
              {w}
            </motion.span>
          ))}
        </h1>
      </div>
      <motion.div whileHover={reduce ? undefined : { y: -2 }} whileTap={reduce ? undefined : { scale: 0.96 }}>
        <Link
          href="/settings#cards"
          className="group border-line/80 bg-surface/60 text-ink-2 hover:border-line-strong hover:text-ink inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-[13px] font-semibold backdrop-blur-xl transition-colors"
        >
          <SlidersHorizontal className="size-4 transition-transform duration-300 group-hover:rotate-90" /> Customize
        </Link>
      </motion.div>
    </div>
  );
}
