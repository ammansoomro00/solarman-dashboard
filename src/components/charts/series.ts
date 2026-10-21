// Series definitions for the energy charts, kept apart from Recharts so pages can use them without loading the chart library.

import type { EnergyBar } from "@/lib/data/types";

export type Metric = "sun" | "home" | "grid" | "battery";

export interface SeriesDef {
  key: string;
  label: string;
  color: string;
  value: (b: EnergyBar) => number;
  stack?: string;
}

export const METRIC_SERIES: Record<Metric, SeriesDef[]> = {
  sun: [{ key: "solar", label: "Made by panels", color: "var(--sun)", value: (b) => b.solarKwh }],
  home: [
    { key: "own", label: "From your own system", color: "var(--home)", value: (b) => Math.max(0, b.homeKwh - b.boughtKwh), stack: "home" },
    { key: "bought", label: "Bought", color: "var(--grid)", value: (b) => b.boughtKwh, stack: "home" },
  ],
  grid: [
    { key: "bought", label: "Bought", color: "var(--grid)", value: (b) => b.boughtKwh },
    { key: "sold", label: "Sold back", color: "var(--sun)", value: (b) => b.soldKwh },
  ],
  battery: [
    { key: "charged", label: "Stored in battery", color: "var(--battery)", value: (b) => b.chargedKwh },
    { key: "discharged", label: "Used from battery", color: "var(--home)", value: (b) => b.dischargedKwh },
  ],
};
