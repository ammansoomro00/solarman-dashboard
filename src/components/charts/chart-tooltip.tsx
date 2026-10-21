import { cn } from "@/lib/utils";

export interface TooltipRow {
  label: string;
  value: string;
  color: string;
}

/** Shared tooltip body for all charts: frosted glass, values in ink, colour on a glowing swatch. */
export function ChartTooltipBox({ title, rows, className }: { title: string; rows: TooltipRow[]; className?: string }) {
  return (
    <div
      className={cn(
        "border-line bg-surface/85 shadow-pop relative min-w-[190px] overflow-hidden rounded-2xl border px-3.5 py-3 backdrop-blur-xl backdrop-saturate-150",
        className,
      )}
    >
      {/* A thin light along the top edge, tinted by the first series */}
      <span
        aria-hidden
        className="absolute inset-x-3 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${rows[0]?.color ?? "var(--line)"}, transparent)` }}
      />
      <p className="text-ink-3 text-[11px] font-bold tracking-[0.08em] uppercase">{title}</p>
      <ul className="mt-2 space-y-1.5">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-4 text-[13px]">
            <span className="text-ink-2 flex items-center gap-2">
              <span className="size-2 rounded-full" style={{ background: r.color, boxShadow: `0 0 8px ${r.color}` }} />
              {r.label}
            </span>
            <span className="tabular text-ink font-bold">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Legend({ items }: { items: Array<{ label: string; color: string; dashed?: boolean }> }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
      {items.map((i) => (
        <li
          key={i.label}
          className="border-line bg-surface-2/60 text-ink-2 flex items-center gap-1.5 rounded-full border py-0.5 pr-2.5 pl-2 text-[11.5px] font-semibold"
        >
          {i.dashed ? (
            <span className="h-0.5 w-3.5 rounded-full" style={{ background: `repeating-linear-gradient(90deg, ${i.color} 0 4px, transparent 4px 6px)` }} />
          ) : (
            <span className="size-2 rounded-full" style={{ background: i.color, boxShadow: `0 0 6px ${i.color}` }} />
          )}
          {i.label}
        </li>
      ))}
    </ul>
  );
}
