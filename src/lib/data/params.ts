import { z } from "zod";
import { RANGES, type Range } from "./types";

export const VIEWS = ["sun", "home", "grid", "battery"] as const;
export type View = (typeof VIEWS)[number];

const schema = z.object({
  range: z.enum(RANGES).catch("week"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined),
  view: z.enum(VIEWS).catch("sun"),
});

/** Parses Trends URL params, falling back to sensible defaults instead of erroring. */
export function parseTrendsParams(params: Record<string, string | string[] | undefined>, today: string): { range: Range; date: string; view: View } {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const parsed = schema.parse({ range: first(params.range), date: first(params.date), view: first(params.view) });
  const date = parsed.date && parsed.date <= today ? parsed.date : today;
  return { range: parsed.range, date, view: parsed.view };
}
