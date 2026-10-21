import "server-only";
import { cache } from "react";
import type { Preference, Station } from "@prisma/client";
import { db } from "@/lib/db";
import type { EnergyTotals } from "@/lib/energy/insights";
import { sumTotals } from "@/lib/energy/insights";
import { activeSource, ensureStation } from "@/lib/sync";
import { addDays, dateKeyToDbDate, dbDateToKey, localDateKey, startOfLocalDay } from "@/lib/time";
import { periodBounds } from "./period";
import type { AnalyticsData, Range, SeriesPoint } from "./types";

// React `cache` dedupes these within one request, so layout and page can both ask.

export const getStation = cache(async (): Promise<Station> => ensureStation());

export const getPreferences = cache(async (): Promise<Preference> => db.preference.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} }));

export const getUnreadCount = cache(async (stationId: number) => db.notice.count({ where: { stationId, readAt: null } }));

export async function getNotices(stationId: number, take = 30) {
  return db.notice.findMany({ where: { stationId }, orderBy: { occurredAt: "desc" }, take });
}

export async function getSyncInfo(stationId: number) {
  const states = await db.syncState.findMany({ where: { stationId } });
  const live = states.find((s) => s.task === "live");
  return {
    source: activeSource(),
    lastSuccessAt: live?.lastSuccessAt ?? null,
    lastError: states.find((s) => s.lastError)?.lastError ?? null,
  };
}

const ENERGY_SELECT = {
  solarKwh: true,
  homeKwh: true,
  boughtKwh: true,
  soldKwh: true,
  chargedKwh: true,
  dischargedKwh: true,
} as const;

export async function getOverview(station: Station) {
  const today = localDateKey(new Date(), station.timezone);
  const dayStart = startOfLocalDay(today, station.timezone);
  const weekStart = addDays(today, -6);

  const [live, samples, week, devices, firstDay] = await Promise.all([
    db.liveStatus.findUnique({ where: { stationId: station.id } }),
    db.powerSample.findMany({
      where: { stationId: station.id, measuredAt: { gte: dayStart } },
      orderBy: { measuredAt: "asc" },
      select: { measuredAt: true, solarW: true, homeW: true, batteryW: true, gridW: true, batteryPct: true },
    }),
    db.dailyEnergy.findMany({
      where: { stationId: station.id, date: { gte: dateKeyToDbDate(weekStart), lte: dateKeyToDbDate(today) } },
      orderBy: { date: "asc" },
      select: { date: true, ...ENERGY_SELECT },
    }),
    db.device.findMany({ where: { stationId: station.id }, select: { kind: true, status: true } }),
    db.dailyEnergy.findFirst({ where: { stationId: station.id }, orderBy: { date: "asc" }, select: { date: true } }),
  ]);

  // Pad the week so every day has a bar, even with no data.
  const byDay = new Map(week.map((d) => [dbDateToKey(d.date), d]));
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const key = addDays(weekStart, i);
    const row = byDay.get(key);
    return { date: key, ...(row ? pick(row) : emptyTotals()) };
  });

  const todayTotals: EnergyTotals = live
    ? {
        solarKwh: live.todaySolarKwh ?? byDay.get(today)?.solarKwh ?? 0,
        homeKwh: live.todayHomeKwh ?? byDay.get(today)?.homeKwh ?? 0,
        boughtKwh: live.todayBoughtKwh ?? byDay.get(today)?.boughtKwh ?? 0,
        soldKwh: live.todaySoldKwh ?? byDay.get(today)?.soldKwh ?? 0,
        chargedKwh: live.todayChargedKwh ?? byDay.get(today)?.chargedKwh ?? 0,
        dischargedKwh: live.todayDischargedKwh ?? byDay.get(today)?.dischargedKwh ?? 0,
      }
    : byDay.get(today)
      ? pick(byDay.get(today)!)
      : emptyTotals();

  return {
    today,
    live,
    todayTotals,
    samples: samples.map(toPoint),
    week: weekDays,
    devices,
    since: firstDay ? dbDateToKey(firstDay.date) : today,
  };
}

export async function getAnalytics(station: Station, range: Range, anchor: string): Promise<AnalyticsData> {
  const firstRow = await db.dailyEnergy.findFirst({
    where: { stationId: station.id },
    orderBy: { date: "asc" },
    select: { date: true },
  });
  const today = localDateKey(new Date(), station.timezone);
  const earliest = firstRow ? dbDateToKey(firstRow.date) : today;
  const { start, end, prevStart, prevEnd } = periodBounds(range, anchor);

  const base = {
    range,
    anchor,
    start,
    end,
    earliest,
    latest: today,
  };

  if (range === "day") {
    const from = startOfLocalDay(start, station.timezone);
    const to = startOfLocalDay(addDays(start, 1), station.timezone);
    const [samples, totalsRow, prevRow] = await Promise.all([
      db.powerSample.findMany({
        where: { stationId: station.id, measuredAt: { gte: from, lt: to } },
        orderBy: { measuredAt: "asc" },
        select: { measuredAt: true, solarW: true, homeW: true, batteryW: true, gridW: true, batteryPct: true },
      }),
      db.dailyEnergy.findUnique({ where: { stationId_date: { stationId: station.id, date: dateKeyToDbDate(start) } }, select: ENERGY_SELECT }),
      db.dailyEnergy.findUnique({ where: { stationId_date: { stationId: station.id, date: dateKeyToDbDate(prevStart) } }, select: ENERGY_SELECT }),
    ]);
    return {
      ...base,
      kind: "power",
      power: samples.map(toPoint),
      bars: [],
      totals: totalsRow ?? emptyTotals(),
      previous: prevRow ?? null,
      partial: false,
    };
  }

  if (range === "year") {
    const year = Number(start.slice(0, 4));
    const [months, prevMonths, daily] = await Promise.all([
      db.monthlyEnergy.findMany({ where: { stationId: station.id, year }, orderBy: { month: "asc" } }),
      db.monthlyEnergy.findMany({ where: { stationId: station.id, year: year - 1 } }),
      db.dailyEnergy.findMany({
        where: { stationId: station.id, date: { gte: dateKeyToDbDate(start), lte: dateKeyToDbDate(end) } },
        select: { date: true, ...ENERGY_SELECT },
      }),
    ]);
    // Prefer the provider's monthly totals; fill gaps from daily rows.
    const bars = Array.from({ length: 12 }, (_, i) => {
      const m = months.find((r) => r.month === i + 1);
      const key = `${year}-${String(i + 1).padStart(2, "0")}`;
      const fromDaily = sumTotals(daily.filter((d) => dbDateToKey(d.date).startsWith(key)).map(pick));
      return { date: `${key}-01`, ...(m ? pick(m) : fromDaily) };
    });
    // While the year is still running, compare with the same months of last year.
    const partial = end > today;
    const monthNow = Number(today.slice(5, 7));
    const prevComparable = partial ? prevMonths.filter((m) => m.month <= monthNow) : prevMonths;
    return {
      ...base,
      kind: "energy",
      power: [],
      bars,
      totals: sumTotals(bars),
      previous: prevComparable.length ? sumTotals(prevComparable.map(pick)) : null,
      partial,
    };
  }

  // While the period is still running, compare with the same number of days of the previous one.
  const partial = end > today;
  const elapsedDays = Math.round((dateKeyToDbDate(partial ? today : end).getTime() - dateKeyToDbDate(start).getTime()) / 86_400_000);
  const comparableEnd = partial ? addDays(prevStart, elapsedDays) : prevEnd;

  const [rows, prevRows] = await Promise.all([
    db.dailyEnergy.findMany({
      where: { stationId: station.id, date: { gte: dateKeyToDbDate(start), lte: dateKeyToDbDate(end) } },
      orderBy: { date: "asc" },
      select: { date: true, ...ENERGY_SELECT },
    }),
    db.dailyEnergy.findMany({
      where: { stationId: station.id, date: { gte: dateKeyToDbDate(prevStart), lte: dateKeyToDbDate(comparableEnd) } },
      select: ENERGY_SELECT,
    }),
  ]);
  const byDay = new Map(rows.map((r) => [dbDateToKey(r.date), r]));
  const bars = [];
  for (let key = start; key <= end; key = addDays(key, 1)) {
    const r = byDay.get(key);
    bars.push({ date: key, ...(r ? pick(r) : emptyTotals()) });
  }
  return {
    ...base,
    kind: "energy",
    power: [],
    bars,
    totals: sumTotals(bars),
    previous: prevRows.length ? sumTotals(prevRows) : null,
    partial,
  };
}

export async function getSystem(station: Station) {
  const [devices, live, syncStates] = await Promise.all([
    db.device.findMany({ where: { stationId: station.id }, orderBy: [{ kind: "asc" }, { serial: "asc" }] }),
    db.liveStatus.findUnique({ where: { stationId: station.id } }),
    db.syncState.findMany({ where: { stationId: station.id } }),
  ]);
  return { devices, live, syncStates };
}

function pick(r: EnergyTotals): EnergyTotals {
  return {
    solarKwh: r.solarKwh,
    homeKwh: r.homeKwh,
    boughtKwh: r.boughtKwh,
    soldKwh: r.soldKwh,
    chargedKwh: r.chargedKwh,
    dischargedKwh: r.dischargedKwh,
  };
}

function emptyTotals(): EnergyTotals {
  return { solarKwh: 0, homeKwh: 0, boughtKwh: 0, soldKwh: 0, chargedKwh: 0, dischargedKwh: 0 };
}

function toPoint(s: { measuredAt: Date; solarW: number; homeW: number; batteryW: number; gridW: number; batteryPct: number | null }): SeriesPoint {
  return {
    t: s.measuredAt.getTime(),
    solarW: s.solarW,
    homeW: s.homeW,
    batteryW: s.batteryW,
    gridW: s.gridW,
    batteryPct: s.batteryPct,
  };
}
