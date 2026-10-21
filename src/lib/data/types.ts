import type { EnergyTotals } from "@/lib/energy/insights";

export const RANGES = ["day", "week", "month", "year"] as const;
export type Range = (typeof RANGES)[number];

/** A five-minute reading, serialisable for client components (time as epoch ms). */
export interface SeriesPoint {
  t: number;
  solarW: number;
  homeW: number;
  batteryW: number;
  gridW: number;
  batteryPct: number | null;
}

export interface EnergyBar extends EnergyTotals {
  /** "YYYY-MM-DD" (for the year view, the first of the month) */
  date: string;
}

export interface AnalyticsData {
  range: Range;
  anchor: string;
  start: string;
  end: string;
  earliest: string;
  latest: string;
  kind: "power" | "energy";
  power: SeriesPoint[];
  bars: EnergyBar[];
  totals: EnergyTotals;
  previous: EnergyTotals | null;
  /** The period is still running, so `previous` covers only the same elapsed part of the period before. */
  partial: boolean;
}
