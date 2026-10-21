"use client";

import { motion } from "motion/react";
import { useId } from "react";
import { cn } from "@/lib/utils";

/** Pill tabs with a sliding indicator. Keyboard: arrow keys move between options. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
  size = "md",
}: {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
  label: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const id = useId();
  const index = options.findIndex((o) => o.value === value);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (index + (e.key === "ArrowRight" ? 1 : -1) + options.length) % options.length;
    onChange(options[next].value);
    (e.currentTarget.children[next] as HTMLElement | undefined)?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn("border-line/80 bg-surface-sunk/60 inline-flex rounded-full border p-1 backdrop-blur-xl", className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative rounded-full font-semibold transition-[color,transform] active:scale-95",
              size === "sm" ? "h-7 px-3 text-xs" : "h-8 px-4 text-[13px]",
              active ? "text-ink" : "text-ink-3 hover:text-ink-2",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="bg-surface absolute inset-0 rounded-full shadow-[0_1px_2px_rgb(0_0_0/0.06),0_0_0_1px_var(--line),0_6px_16px_-8px_color-mix(in_oklab,var(--ink)_40%,transparent),inset_0_1px_0_rgb(255_255_255/0.08)]"
                transition={{ type: "spring", stiffness: 520, damping: 34 }}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
