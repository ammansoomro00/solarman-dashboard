"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

/** Glass card with a soft spotlight and rim light that follow the pointer. */
export function Card({ className, children, onPointerMove, ...props }: React.HTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLElement>(null);

  return (
    <section
      ref={ref}
      className={cn("card group/card relative p-6", className)}
      onPointerMove={(e) => {
        // Written straight to CSS variables so following the pointer never re-renders the card.
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
        onPointerMove?.(e);
      }}
      {...props}
    >
      {children}
      <span aria-hidden className="card-spotlight" />
      <span aria-hidden className="card-rim" />
    </section>
  );
}

export function CardHeader({ title, hint, action, id }: { title: string; hint?: React.ReactNode; action?: React.ReactNode; id?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 id={id} className="flex items-center gap-1 text-[15px] font-bold tracking-tight">
        {title}
        {hint}
      </h2>
      {action}
    </div>
  );
}
