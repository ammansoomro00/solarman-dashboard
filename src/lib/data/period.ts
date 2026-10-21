// Calendar periods for the Trends page. Pure, shared by server queries and client controls.

import { addDays, dateKeyToDbDate, dbDateToKey } from "@/lib/time";
import type { Range } from "./types";

/** First/last day of the period containing `anchor`, and of the period before it. Weeks run Monday–Sunday. */
export function periodBounds(range: Range, anchor: string) {
  if (range === "day") return { start: anchor, end: anchor, prevStart: addDays(anchor, -1), prevEnd: addDays(anchor, -1) };
  if (range === "week") {
    const dow = (dateKeyToDbDate(anchor).getUTCDay() + 6) % 7; // Monday = 0
    const start = addDays(anchor, -dow);
    return { start, end: addDays(start, 6), prevStart: addDays(start, -7), prevEnd: addDays(start, -1) };
  }
  if (range === "month") {
    const start = `${anchor.slice(0, 7)}-01`;
    const end = addDays(shiftMonths(start, 1), -1);
    return { start, end, prevStart: shiftMonths(start, -1), prevEnd: addDays(start, -1) };
  }
  const year = Number(anchor.slice(0, 4));
  return { start: `${year}-01-01`, end: `${year}-12-31`, prevStart: `${year - 1}-01-01`, prevEnd: `${year - 1}-12-31` };
}

/** Anchor date one period earlier (-1) or later (+1). */
export function shiftPeriod(range: Range, anchor: string, dir: -1 | 1): string {
  if (range === "day") return addDays(anchor, dir);
  if (range === "week") return addDays(anchor, dir * 7);
  if (range === "month") return shiftMonths(`${anchor.slice(0, 7)}-01`, dir);
  return `${Number(anchor.slice(0, 4)) + dir}-01-01`;
}

function shiftMonths(firstOfMonth: string, months: number): string {
  const d = dateKeyToDbDate(firstOfMonth);
  d.setUTCMonth(d.getUTCMonth() + months);
  return dbDateToKey(d);
}

const fmt = (key: string, opts: Intl.DateTimeFormatOptions) => new Date(`${key}T12:00:00Z`).toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });

/** Human label for the period, e.g. "Today", "This week", "March 2026". */
export function periodLabel(range: Range, start: string, end: string, today: string): string {
  if (range === "day") {
    if (start === today) return "Today";
    if (start === addDays(today, -1)) return "Yesterday";
    return fmt(start, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }
  if (range === "week") {
    if (today >= start && today <= end) return "This week";
    if (today >= addDays(start, 7) && today <= addDays(end, 7)) return "Last week";
    const sameMonth = start.slice(0, 7) === end.slice(0, 7);
    return `${fmt(start, sameMonth ? { day: "numeric" } : { day: "numeric", month: "short" })} – ${fmt(end, { day: "numeric", month: "short", year: "numeric" })}`;
  }
  if (range === "month") return today.slice(0, 7) === start.slice(0, 7) ? "This month" : fmt(start, { month: "long", year: "numeric" });
  return today.slice(0, 4) === start.slice(0, 4) ? "This year" : start.slice(0, 4);
}

/** What "compared with" means, in plain words. */
export function previousLabel(range: Range, partial: boolean): string {
  if (partial) return { day: "the day before", week: "the same days last week", month: "the same days last month", year: "the same months last year" }[range];
  return { day: "the day before", week: "the week before", month: "the month before", year: "the year before" }[range];
}
