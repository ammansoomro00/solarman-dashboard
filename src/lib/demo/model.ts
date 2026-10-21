// Deterministic model of a 5 kW solar home with a 10 kWh battery in Hyderabad, Sindh.
// Same date in → same numbers out, so demo data is stable across reloads and seeds.
// No I/O here; the seed script and the demo sync both use it.

import { addDays, startOfLocalDay } from "@/lib/time";

export const DEMO_STATION = {
  externalId: "demo",
  name: "Sunny Villa (sample)",
  capacityKw: 5,
  batteryKwh: 10,
  timezone: "Asia/Karachi",
  address: "Hyderabad, Sindh",
  latitude: 25.396,
  longitude: 68.3578,
};

const EPOCH = "2025-01-01";
const STEP_MIN = 5;
const STEPS = (24 * 60) / STEP_MIN;
const MAX_CHARGE_W = 3000;
const MAX_DISCHARGE_W = 4000;
const RESERVE = 0.15;

export interface DemoSample {
  measuredAt: Date;
  solarW: number;
  homeW: number;
  batteryW: number;
  gridW: number;
  batteryPct: number;
  gridAvailable: boolean;
}

export interface DemoDay {
  dateKey: string;
  samples: DemoSample[];
  totals: { solarKwh: number; homeKwh: number; boughtKwh: number; soldKwh: number; chargedKwh: number; dischargedKwh: number };
  endSoc: number;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function dayOfYear(dateKey: string): number {
  const d = new Date(`${dateKey}T00:00:00Z`);
  return Math.floor((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86_400_000) + 1;
}

/** Simulates one day from a starting battery level. */
export function simulateDay(dateKey: string, startSoc: number): DemoDay {
  const rand = mulberry32(hash(dateKey));
  const doy = dayOfYear(dateKey);
  const month = Number(dateKey.slice(5, 7));

  // Season: longer, stronger sun in summer; hotter months add air-conditioning load.
  const season = Math.cos(((doy - 172) / 365) * 2 * Math.PI); // 1 at midsummer, -1 at midwinter
  const sunrise = 6.4 - season * 0.9;
  const sunset = 17.9 + season * 1.2;
  const peakFactor = 0.78 + season * 0.1;
  const hot = month >= 4 && month <= 10;

  // Weather for the day: mostly clear, sometimes hazy or cloudy (more clouds in monsoon months).
  const monsoon = month >= 7 && month <= 8;
  const w = rand();
  const weather = w < (monsoon ? 0.35 : 0.12) ? 0.35 + rand() * 0.25 : w < (monsoon ? 0.6 : 0.3) ? 0.7 + rand() * 0.15 : 0.92 + rand() * 0.08;

  // Scheduled power cuts ("load-shedding"): one or two blocks most days.
  const outages: Array<[number, number]> = [];
  const cutCount = rand() < 0.15 ? 0 : rand() < 0.6 ? 1 : 2;
  for (let i = 0; i < cutCount; i++) {
    const start = Math.floor(rand() * 22);
    outages.push([start, start + 1 + Math.floor(rand() * 2)]);
  }

  // Passing clouds as smooth dips rather than per-sample noise.
  const clouds = Array.from({ length: 6 }, () => ({
    at: sunrise + rand() * (sunset - sunrise),
    width: 0.2 + rand() * 0.6,
    depth: rand() * (1 - weather) * 1.4,
  }));

  const dayStart = startOfLocalDay(dateKey, DEMO_STATION.timezone).getTime();
  const capWh = DEMO_STATION.batteryKwh * 1000;
  let socWh = startSoc * capWh;
  const samples: DemoSample[] = [];
  const totals = { solarKwh: 0, homeKwh: 0, boughtKwh: 0, soldKwh: 0, chargedKwh: 0, dischargedKwh: 0 };
  const hours = STEP_MIN / 60;

  for (let i = 0; i < STEPS; i++) {
    const h = (i * STEP_MIN) / 60;

    let solar = 0;
    if (h > sunrise && h < sunset) {
      const x = (h - sunrise) / (sunset - sunrise);
      solar = DEMO_STATION.capacityKw * 1000 * peakFactor * weather * Math.pow(Math.sin(Math.PI * x), 1.35);
      for (const c of clouds) solar *= 1 - c.depth * Math.exp(-(((h - c.at) / c.width) ** 2));
    }

    // Household: fridge + lights at night, breakfast and dinner peaks, afternoon AC when hot.
    let home = 220;
    home += 650 * Math.exp(-(((h - 7.6) / 0.8) ** 2));
    home += 900 * Math.exp(-(((h - 20.5) / 1.6) ** 2));
    if (hot) home += 1400 * Math.exp(-(((h - 14.5) / 2.2) ** 2)) + 500 * Math.exp(-(((h - 23) / 2) ** 2));
    home *= 0.92 + 0.16 * Math.sin(i * 0.37 + doy);

    const gridUp = !outages.some(([s, e]) => h >= s && h < e);
    let battery = 0; // > 0 discharging
    let grid = 0; // > 0 buying
    const net = solar - home;

    if (net >= 0) {
      const charge = Math.min(net, MAX_CHARGE_W, Math.max(0, (capWh - socWh) / hours));
      battery = -charge;
      if (gridUp)
        grid = -(net - charge); // sell the rest
      else solar = home + charge; // power cut + full battery: the inverter throttles the panels
    } else {
      const need = -net;
      const available = Math.max(0, (socWh - RESERVE * capWh) / hours);
      // During a cut the battery may go below the reserve to keep the lights on.
      const discharge = Math.min(need, MAX_DISCHARGE_W, gridUp ? available : Math.max(0, socWh / hours));
      battery = discharge;
      if (gridUp) grid = need - discharge;
      else if (discharge < need) home = solar + discharge; // load shed: only what the system can supply
    }

    socWh = Math.min(capWh, Math.max(0, socWh - battery * hours));

    samples.push({
      measuredAt: new Date(dayStart + i * STEP_MIN * 60_000),
      solarW: Math.round(solar),
      homeW: Math.round(home),
      batteryW: Math.round(battery),
      gridW: Math.round(grid),
      batteryPct: Math.round((socWh / capWh) * 1000) / 10,
      gridAvailable: gridUp,
    });

    totals.solarKwh += (solar * hours) / 1000;
    totals.homeKwh += (home * hours) / 1000;
    if (grid > 0) totals.boughtKwh += (grid * hours) / 1000;
    else totals.soldKwh += (-grid * hours) / 1000;
    if (battery < 0) totals.chargedKwh += (-battery * hours) / 1000;
    else totals.dischargedKwh += (battery * hours) / 1000;
  }

  for (const k of Object.keys(totals) as Array<keyof typeof totals>) totals[k] = Math.round(totals[k] * 10) / 10;
  return { dateKey, samples, totals, endSoc: socWh / capWh };
}

const socCache = new Map<string, number>();

/** Battery level at the start of a day, carried over day by day from a fixed starting point. */
export function startSocFor(dateKey: string): number {
  if (dateKey <= EPOCH) return 0.6;
  const cached = socCache.get(dateKey);
  if (cached !== undefined) return cached;

  // Walk forward from the latest cached day before this one.
  let day = EPOCH;
  let soc = 0.6;
  for (const [k, v] of socCache) if (k < dateKey && k > day) [day, soc] = [k, v];
  while (day < dateKey) {
    soc = simulateDay(day, soc).endSoc;
    day = addDays(day, 1);
    socCache.set(day, soc);
  }
  return soc;
}

export function demoDay(dateKey: string): DemoDay {
  return simulateDay(dateKey, startSocFor(dateKey));
}
