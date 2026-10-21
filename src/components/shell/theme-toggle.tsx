"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { saveTheme } from "@/app/actions";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun, glow: "var(--sun)", spin: 90 },
  { value: "dark", label: "Dark", icon: Moon, glow: "var(--battery)", spin: -25 },
  { value: "system", label: "Match device", icon: Monitor, glow: "var(--grid)", spin: 0 },
] as const;

/** Switches theme with a short colour cross-fade and remembers the choice in the database. */
export function useThemeSwitch() {
  const { theme, setTheme } = useTheme();
  return {
    theme: theme ?? "system",
    change(next: string) {
      const root = document.documentElement;
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        root.classList.add("theme-transition");
        window.setTimeout(() => root.classList.remove("theme-transition"), 320);
      }
      setTheme(next);
      void saveTheme(next);
    },
  };
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, change } = useThemeSwitch();
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn("border-line/80 bg-surface-sunk/60 flex rounded-full border p-1 backdrop-blur-xl", className)}
    >
      {OPTIONS.map(({ value, label, icon: Icon, glow, spin }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => change(value)}
            className={cn("relative grid h-8 flex-1 place-items-center rounded-full transition-colors", active ? "text-ink" : "text-ink-3 hover:text-ink-2")}
          >
            {active && (
              <motion.span
                layoutId="theme-pill"
                className="bg-surface absolute inset-0 rounded-full"
                style={{ boxShadow: `0 0 0 1px var(--line), 0 4px 14px -4px color-mix(in oklab, ${glow} 60%, transparent)` }}
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <motion.span
              className="relative grid"
              initial={false}
              animate={active && !reduce ? { rotate: spin, scale: 1.12 } : { rotate: 0, scale: 1 }}
              whileHover={reduce ? undefined : { scale: 1.18 }}
              whileTap={reduce ? undefined : { scale: 0.85 }}
              transition={{ type: "spring", stiffness: 300, damping: 14 }}
              style={{ color: active ? glow : undefined }}
            >
              <Icon className="size-3.5" />
            </motion.span>
          </button>
        );
      })}
    </div>
  );
}
