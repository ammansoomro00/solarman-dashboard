"use client";

import { CircleHelp } from "lucide-react";
import { Popover } from "radix-ui";
import { cn } from "@/lib/utils";

/** A small "?" that explains a term in plain words. Works with tap as well as hover. */
export function Hint({ children, label = "What does this mean?", className }: { children: React.ReactNode; label?: string; className?: string }) {
  return (
    <Popover.Root>
      <Popover.Trigger
        className={cn("text-ink-3 hover:text-ink data-[state=open]:text-ink inline-grid size-5 place-items-center rounded-full transition-colors", className)}
        aria-label={label}
      >
        <CircleHelp className="size-3.5" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="center"
          sideOffset={6}
          collisionPadding={16}
          className="border-line bg-surface/90 text-ink-2 shadow-pop z-50 max-w-[260px] animate-[hint-in_160ms_ease-out] rounded-2xl border px-4 py-3 text-[13px] leading-relaxed backdrop-blur-xl"
        >
          {children}
          <Popover.Arrow className="fill-surface" width={12} height={6} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
