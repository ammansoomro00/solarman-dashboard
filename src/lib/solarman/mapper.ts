import type { DeviceKind, DeviceStatus } from "@prisma/client";
import type { SolarmanDataPoint, SolarmanHistoryItem } from "./types";

// Sign conventions (checked against live data from a Deye hybrid inverter):
//   batteryPower  > 0 battery is discharging into the home, < 0 battery is charging
//   purchasePower > 0 buying from the power company, < 0 selling to it
// The app keeps exactly these conventions for batteryW and gridW.

export interface SampleFields {
  solarW: number;
  homeW: number;
  batteryW: number;
  gridW: number;
  batteryPct: number | null;
}

export function frameToSample(item: SolarmanHistoryItem): (SampleFields & { measuredAt: Date }) | null {
  if (!item.dateTime) return null;
  const batteryW = item.batteryPower ?? (item.dischargePower ?? 0) - (item.chargePower ?? 0);
  return {
    measuredAt: new Date(item.dateTime * 1000),
    solarW: Math.max(0, item.generationPower ?? 0),
    homeW: Math.max(0, item.usePower ?? 0),
    batteryW,
    gridW: item.purchasePower ?? item.wirePower ?? 0,
    batteryPct: item.batterySoc ?? null,
  };
}

export interface EnergyFields {
  solarKwh: number;
  homeKwh: number;
  boughtKwh: number;
  soldKwh: number;
  chargedKwh: number;
  dischargedKwh: number;
}

export function historyToEnergy(item: SolarmanHistoryItem): EnergyFields {
  return {
    solarKwh: item.generationValue ?? 0,
    homeKwh: item.useValue ?? 0,
    boughtKwh: item.buyValue ?? 0,
    soldKwh: item.gridValue ?? 0,
    chargedKwh: item.chargeValue ?? 0,
    dischargedKwh: item.dischargeValue ?? 0,
  };
}

/** Day key ("YYYY-MM-DD") of a daily history row. */
export function historyDayKey(item: SolarmanHistoryItem): string | null {
  if (!item.year || !item.month || !item.day) return null;
  return `${item.year}-${String(item.month).padStart(2, "0")}-${String(item.day).padStart(2, "0")}`;
}

type PointMap = Map<string, SolarmanDataPoint>;

export function pointMap(points: SolarmanDataPoint[] | null | undefined): PointMap {
  return new Map((points ?? []).map((p) => [p.key, p]));
}

function num(points: PointMap, ...keys: string[]): number | null {
  for (const key of keys) {
    const raw = points.get(key)?.value;
    if (raw === undefined) continue;
    const n = Number.parseFloat(raw);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export interface InverterSummary {
  todaySolarKwh: number | null;
  todayHomeKwh: number | null;
  todayBoughtKwh: number | null;
  todaySoldKwh: number | null;
  todayChargedKwh: number | null;
  todayDischargedKwh: number | null;
  lifetimeSolarKwh: number | null;
  lifetimeBoughtKwh: number | null;
  lifetimeSoldKwh: number | null;
  inverterTempC: number | null;
  batteryTempC: number | null;
  gridAvailable: boolean | null;
}

/** Pulls the numbers the dashboard needs out of an inverter's /device/currentData point list. */
export function summarizeInverter(points: PointMap): InverterSummary {
  const gridVolts = num(points, "G_V_LN", "G_V_L1", "AV1_G");
  const gridHz = num(points, "PG_F1");
  const relay = points.get("GRID_RELAY_ST1")?.value?.toLowerCase();

  let gridAvailable: boolean | null = null;
  if (gridVolts !== null || gridHz !== null) {
    // A live grid sits around 230 V / 50 Hz; a power cut reads close to zero.
    gridAvailable = (gridVolts ?? 0) > 150 || (gridHz ?? 0) > 40;
  } else if (relay) {
    gridAvailable = relay !== "break" && relay !== "open";
  }

  const temps = [num(points, "AC_T"), num(points, "T_DC")].filter((t): t is number => t !== null);

  return {
    todaySolarKwh: num(points, "Etdy_ge1", "PV_D_P_G"),
    todayHomeKwh: num(points, "Etdy_use1"),
    todayBoughtKwh: num(points, "Etdy_pu1"),
    todaySoldKwh: num(points, "t_gc_tdy1"),
    todayChargedKwh: num(points, "Etdy_cg1"),
    todayDischargedKwh: num(points, "Etdy_dcg1"),
    lifetimeSolarKwh: num(points, "Et_ge0", "PV_C_P_G_A"),
    lifetimeBoughtKwh: num(points, "Et_pu1"),
    lifetimeSoldKwh: num(points, "t_gc1"),
    inverterTempC: temps.length ? Math.max(...temps) : null,
    batteryTempC: num(points, "B_T1", "BMST"),
    gridAvailable,
  };
}

export interface DetailRow {
  label: string;
  value: string;
}

/** A short list of readings for the System page, using plain words instead of inverter jargon. */
export function friendlyDetails(kind: DeviceKind, points: PointMap): DetailRow[] {
  const rows: DetailRow[] = [];
  const add = (label: string, key: string, unit?: string) => {
    const p = points.get(key);
    if (!p || p.value === "" || p.value.trim() === "") return;
    const n = Number.parseFloat(p.value);
    const value = Number.isFinite(n) && /^-?[\d.]+$/.test(p.value.trim()) ? `${trimNumber(n)}${unit ?? (p.unit ? ` ${p.unit}` : "")}` : p.value.trim();
    rows.push({ label, value });
  };

  if (kind === "INVERTER") {
    add("Model", "INV_MOD1");
    add("Maximum output", "Pr1");
    add("Panel voltage", "DV1");
    add("Home supply voltage", "L_V_LN");
    add("Power company voltage", "G_V_LN");
    add("Temperature", "AC_T");
    add("Total made since install", "Et_ge0");
    add("Software version", "PTCv1");
  } else if (kind === "BATTERY") {
    add("Battery level", "Battery SOC");
    add("Health", "Battery SOH");
    add("Temperature", "Battery Temp");
    add("Temperature", "Temperate-AVE");
    add("Charge cycles used", "Cycles");
    add("Capacity", "Full Capacity");
    add("Voltage", "Battery voltage");
  }
  return rows;
}

/** Battery data points come keyed by display name, so index them by name instead of key. */
export function pointMapByName(points: SolarmanDataPoint[] | null | undefined): PointMap {
  return new Map((points ?? []).map((p) => [p.name, p]));
}

function trimNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
}

export function deviceKind(type: string): DeviceKind {
  switch (type) {
    case "INVERTER":
    case "MICRO_INVERTER":
      return "INVERTER";
    case "BATTERY":
      return "BATTERY";
    case "COLLECTOR":
    case "DTU":
      return "LOGGER";
    case "METER":
      return "METER";
    default:
      return "OTHER";
  }
}

/** Solarman connectStatus: 0 offline, 1 online, 2 alarm. */
export function deviceStatus(connectStatus: number | null | undefined): DeviceStatus {
  if (connectStatus === 1) return "ONLINE";
  if (connectStatus === 2) return "WARNING";
  return "OFFLINE";
}
