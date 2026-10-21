// Turns energy totals into everyday outcomes: money saved, independence, pollution avoided.

export interface EnergyTotals {
  solarKwh: number;
  homeKwh: number;
  boughtKwh: number;
  soldKwh: number;
  chargedKwh: number;
  dischargedKwh: number;
}

export interface Tariff {
  pricePerUnit: number;
  sellPricePerUnit: number;
  co2KgPerUnit: number;
}

/** A tree soaks up roughly 21 kg of CO₂ a year. */
export const KG_CO2_PER_TREE_YEAR = 21;

export interface Insights {
  /** Units the home used that did NOT come from the power company. */
  ownUnits: number;
  /** Share of home use covered by your own system (0..1). */
  selfPowered: number;
  /** What you would have paid without solar, minus what you actually paid, plus sales. */
  saved: number;
  /** What the bought units cost. */
  spent: number;
  earned: number;
  co2Kg: number;
  trees: number;
}

export function insightsFor(t: EnergyTotals, tariff: Tariff): Insights {
  const ownUnits = Math.max(0, t.homeKwh - t.boughtKwh);
  const selfPowered = t.homeKwh > 0 ? Math.min(1, ownUnits / t.homeKwh) : 0;
  const earned = t.soldKwh * tariff.sellPricePerUnit;
  const co2Kg = t.solarKwh * tariff.co2KgPerUnit;
  return {
    ownUnits,
    selfPowered,
    saved: ownUnits * tariff.pricePerUnit + earned,
    spent: t.boughtKwh * tariff.pricePerUnit,
    earned,
    co2Kg,
    trees: co2Kg / KG_CO2_PER_TREE_YEAR,
  };
}

export function sumTotals(rows: EnergyTotals[]): EnergyTotals {
  const out: EnergyTotals = { solarKwh: 0, homeKwh: 0, boughtKwh: 0, soldKwh: 0, chargedKwh: 0, dischargedKwh: 0 };
  for (const r of rows) for (const k of Object.keys(out) as Array<keyof EnergyTotals>) out[k] += r[k];
  return out;
}

/** Relative change, or null when there is nothing to compare against. */
export function change(current: number, previous: number): number | null {
  if (previous <= 0.05) return null;
  return (current - previous) / previous;
}
