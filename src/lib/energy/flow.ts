// Works out where power is going right now, in a form the flow diagram and the
// plain-language summary can both use. Pure functions: no I/O, easy to test.

export interface PowerReading {
  solarW: number;
  homeW: number;
  /** > 0 battery is powering the home, < 0 battery is charging */
  batteryW: number;
  /** > 0 buying from the power company, < 0 selling to it */
  gridW: number;
  batteryPct: number | null;
  /** false during a power cut, null when unknown */
  gridAvailable: boolean | null;
}

export type FlowPath = "solarToHome" | "solarToBattery" | "solarToGrid" | "batteryToHome" | "gridToHome" | "gridToBattery";

export type Flows = Record<FlowPath, number>;

export type BatteryState = "charging" | "discharging" | "idle" | "full" | "empty";
export type GridState = "buying" | "selling" | "idle" | "outage" | "unknown";

export interface FlowSnapshot {
  flows: Flows;
  battery: BatteryState;
  grid: GridState;
  /** Share of the home's power coming from sun + battery (0..1). */
  selfPowered: number;
  /** Solar is making more than the home needs. */
  surplus: boolean;
}

/** Readings below this are sensor noise, not real flow. */
export const NOISE_W = 15;

const clean = (w: number) => (Math.abs(w) < NOISE_W ? 0 : w);

export function computeFlows(r: PowerReading): FlowSnapshot {
  const solar = Math.max(0, clean(r.solarW));
  const home = Math.max(0, clean(r.homeW));
  const batteryW = clean(r.batteryW);
  const gridW = r.gridAvailable === false ? 0 : clean(r.gridW);

  const charging = Math.max(0, -batteryW);
  const discharging = Math.max(0, batteryW);
  const buying = Math.max(0, gridW);
  const selling = Math.max(0, -gridW);

  // Sun serves the home first, then the battery, then anything left is sold.
  const solarToHome = Math.min(solar, home);
  let solarLeft = solar - solarToHome;
  const solarToBattery = Math.min(solarLeft, charging);
  solarLeft -= solarToBattery;
  const solarToGrid = Math.min(solarLeft, selling);

  // The rest of the home's need comes from the battery, then the power company.
  let homeLeft = home - solarToHome;
  const batteryToHome = Math.min(discharging, homeLeft);
  homeLeft -= batteryToHome;
  const gridToHome = Math.min(buying, homeLeft);
  const gridToBattery = Math.min(Math.max(0, buying - gridToHome), Math.max(0, charging - solarToBattery));

  const flows: Flows = { solarToHome, solarToBattery, solarToGrid, batteryToHome, gridToHome, gridToBattery };
  for (const k of Object.keys(flows) as FlowPath[]) flows[k] = clean(flows[k]);

  const pct = r.batteryPct;
  let battery: BatteryState = "idle";
  if (charging > 0) battery = "charging";
  else if (discharging > 0) battery = "discharging";
  else if (pct !== null && pct >= 99) battery = "full";
  else if (pct !== null && pct <= 5) battery = "empty";

  let grid: GridState;
  if (r.gridAvailable === false) grid = "outage";
  else if (buying > 0) grid = "buying";
  else if (selling > 0) grid = "selling";
  else grid = r.gridAvailable === null ? "unknown" : "idle";

  const selfPowered = home > 0 ? Math.min(1, (solarToHome + batteryToHome) / home) : 1;

  return { flows, battery, grid, selfPowered, surplus: solar > home && solar > 0 };
}

/** Rough hours left on the battery at the current draw, or to fill it at the current charge rate. */
export function batteryEta(
  r: Pick<PowerReading, "batteryW" | "batteryPct">,
  capacityKwh: number | null,
): { kind: "untilEmpty" | "untilFull"; hours: number } | null {
  if (!capacityKwh || r.batteryPct === null) return null;
  const w = clean(r.batteryW);
  if (w > 0) {
    // Keep a 10% reserve; most inverters stop discharging around there.
    const usableKwh = Math.max(0, (r.batteryPct - 10) / 100) * capacityKwh;
    return { kind: "untilEmpty", hours: (usableKwh * 1000) / w };
  }
  if (w < 0 && r.batteryPct < 99) {
    const missingKwh = ((100 - r.batteryPct) / 100) * capacityKwh;
    return { kind: "untilFull", hours: (missingKwh * 1000) / -w };
  }
  return null;
}
