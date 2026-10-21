"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Card, CardHeader } from "@/components/overview/card";
import { useThemeSwitch } from "@/components/shell/theme-toggle";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun, accent: "var(--sun)" },
  { value: "dark", label: "Dark", icon: Moon, accent: "var(--battery)" },
  { value: "system", label: "Match my device", icon: Monitor, accent: "var(--grid)" },
] as const;

export function AppearanceSettings() {
  const { theme, change } = useThemeSwitch();
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <Card aria-labelledby="appearance-title">
      <CardHeader id="appearance-title" title="Appearance" />
      <p className="text-ink-2 mt-1 text-[13px]">The sky behind the app follows the real sun either way.</p>
      <div role="radiogroup" aria-labelledby="appearance-title" className="mt-4 grid grid-cols-3 gap-3">
        {OPTIONS.map(({ value, label, icon: Icon, accent }) => {
          const active = mounted && theme === value;
          return (
            <motion.button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => change(value)}
              whileHover={reduce ? undefined : { y: -3 }}
              whileTap={reduce ? undefined : { scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
              className={cn(
                "relative flex flex-col overflow-hidden rounded-2xl border text-left text-[13px] font-semibold transition-[border-color,box-shadow]",
                active ? "text-ink" : "border-line text-ink-2 hover:border-line-strong",
              )}
              style={
                active
                  ? { borderColor: `color-mix(in oklab, ${accent} 55%, var(--line))`, boxShadow: `0 10px 30px -14px ${accent}` }
                  : undefined
              }
            >
              <Preview kind={value} reduce={!!reduce} />
              <span className="bg-surface/80 flex items-center gap-2 px-3 py-2.5 backdrop-blur">
                <Icon className="size-4 shrink-0" style={{ color: active ? accent : undefined }} />
                <span className="min-w-0 truncate">{label}</span>
              </span>
              <AnimatePresence>
                {active && (
                  <motion.span
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 20 }}
                    className="absolute top-2 right-2 grid size-5 place-items-center rounded-full text-white"
                    style={{ background: accent, boxShadow: `0 0 12px ${accent}` }}
                  >
                    <Check className="size-3" strokeWidth={3} />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>
    </Card>
  );
}

/** A tiny scene of each theme: a day sky with a sun, a night sky with a moon and stars, or both split. */
function Preview({ kind, reduce }: { kind: "light" | "dark" | "system"; reduce: boolean }) {
  const day = (
    <div className="absolute inset-0 bg-[linear-gradient(180deg,#fbe8bf,#f4f1e9)]">
      <motion.span
        className="absolute top-3 left-4 size-6 rounded-full bg-[radial-gradient(circle_at_40%_35%,#ffe7a6,#eda100)] shadow-[0_0_18px_#eda100]"
        animate={reduce ? undefined : { y: [0, -2, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <span className="absolute right-2 bottom-2 left-2 h-3 rounded-md bg-white shadow-sm" />
    </div>
  );
  const night = (
    <div className="absolute inset-0 bg-[linear-gradient(180deg,#1e1a33,#0e1116)]">
      {[
        [12, 18],
        [30, 10],
        [60, 22],
        [75, 8],
        [45, 30],
      ].map(([x, y], i) => (
        <motion.span
          key={i}
          className="absolute size-[2px] rounded-full bg-white"
          style={{ left: `${x}%`, top: `${y}%` }}
          animate={reduce ? undefined : { opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2 + i * 0.4, repeat: Infinity }}
        />
      ))}
      <span className="absolute top-3 right-4 size-5 rounded-full bg-[#e9e4ff] shadow-[0_0_14px_#8b6cff] [mask-image:radial-gradient(circle_at_70%_35%,transparent_42%,black_44%)]" />
      <span className="absolute right-2 bottom-2 left-2 h-3 rounded-md bg-[#161a20] ring-1 ring-white/10" />
    </div>
  );

  return (
    <div className="relative h-20 w-full overflow-hidden">
      {kind === "light" && day}
      {kind === "dark" && night}
      {kind === "system" && (
        <>
          {day}
          <div className="absolute inset-0 [clip-path:polygon(60%_0,100%_0,100%_100%,40%_100%)]">{night}</div>
        </>
      )}
    </div>
  );
}
