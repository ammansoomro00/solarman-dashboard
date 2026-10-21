import "server-only";
import type { DeviceKind, NoticeLevel, Prisma, Station } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { solarman } from "@/lib/solarman/client";
import {
  deviceKind,
  deviceStatus,
  frameToSample,
  friendlyDetails,
  historyDayKey,
  historyToEnergy,
  pointMap,
  pointMapByName,
  summarizeInverter,
} from "@/lib/solarman/mapper";
import { addDays, dateKeyToDbDate, localDateKey } from "@/lib/time";
import { detectLiveEvents } from "./events";
import { recordNotice } from "./notices";

const MINUTE = 60_000;

/** Finds the Solarman plant in the database, creating it from the API on first run. */
export async function ensureSolarmanStation(): Promise<Station> {
  const existing = await db.station.findFirst({ where: { source: "SOLARMAN" } });
  if (existing) return existing;

  const { stationList } = await solarman.stationList();
  const wanted = env().SOLARMAN_STATION_ID;
  const picked = stationList?.find((s) => String(s.id) === wanted) ?? stationList?.[0];
  if (!picked) throw new Error("No plants found on this Solarman account.");

  const base = await solarman.stationBase(picked.id);
  return db.station.create({
    data: {
      source: "SOLARMAN",
      externalId: String(picked.id),
      name: picked.name,
      capacityKw: picked.installedCapacity ?? base.installedCapacity ?? 0,
      timezone: base.region?.timezone ?? picked.regionTimezone ?? "UTC",
      address: base.locationAddress ?? picked.locationAddress ?? null,
      latitude: base.locationLat ?? null,
      longitude: base.locationLng ?? null,
      operatingSince: base.startOperatingTime ? new Date(base.startOperatingTime * 1000) : null,
    },
  });
}

/** Today's 5-minute readings plus the inverter's own counters → LiveStatus + PowerSample. */
export async function syncLive(station: Station): Promise<void> {
  const stationId = Number(station.externalId);
  const today = localDateKey(new Date(), station.timezone);

  const inverter = await db.device.findFirst({ where: { stationId: station.id, kind: "INVERTER" } });
  const [frames, current] = await Promise.all([
    solarman.stationFrames(stationId, today),
    inverter ? solarman.deviceCurrent(inverter.serial) : Promise.resolve(null),
  ]);

  const samples = (frames.stationDataItems ?? []).map(frameToSample).filter((s) => s !== null);
  if (samples.length) {
    await db.powerSample.createMany({
      data: samples.map((s) => ({ ...s, stationId: station.id })),
      skipDuplicates: true,
    });
  }

  const latest = samples.at(-1);
  if (!latest) return;

  const points = pointMap(current?.dataList);
  const summary = current ? summarizeInverter(points) : null;
  const previous = await db.liveStatus.findUnique({ where: { stationId: station.id } });

  const live = {
    measuredAt: latest.measuredAt,
    solarW: latest.solarW,
    homeW: latest.homeW,
    batteryW: latest.batteryW,
    gridW: latest.gridW,
    batteryPct: latest.batteryPct,
    ...(summary ?? {}),
  };
  await db.liveStatus.upsert({
    where: { stationId: station.id },
    create: { stationId: station.id, ...live },
    update: live,
  });

  if (inverter && current) {
    await db.device.update({
      where: { id: inverter.id },
      data: {
        details: friendlyDetails("INVERTER", points) as unknown as Prisma.InputJsonValue,
        lastSeenAt: current.collectionTime ? new Date(current.collectionTime * 1000) : undefined,
      },
    });
    const ratedAh = Number.parseFloat(points.get("BRC")?.value ?? "");
    if (!station.batteryKwh && Number.isFinite(ratedAh) && ratedAh > 0) {
      // Low-voltage lithium packs run at a nominal 51.2 V.
      await db.station.update({ where: { id: station.id }, data: { batteryKwh: (ratedAh * 51.2) / 1000 } });
    }
  }

  await detectLiveEvents(station, previous, live);
}

/** Device list and statuses, plus battery health details. */
export async function syncDevices(station: Station): Promise<void> {
  const { deviceListItems } = await solarman.stationDevices(Number(station.externalId));
  for (const d of deviceListItems ?? []) {
    const kind = deviceKind(d.deviceType);
    const status = deviceStatus(d.connectStatus);
    const before = await db.device.findUnique({
      where: { stationId_serial: { stationId: station.id, serial: d.deviceSn } },
    });

    let details: Prisma.InputJsonValue | undefined;
    if (kind === "BATTERY" && status !== "OFFLINE") {
      const cur = await solarman.deviceCurrent(d.deviceSn);
      details = friendlyDetails("BATTERY", pointMapByName(cur.dataList)) as unknown as Prisma.InputJsonValue;
    }

    await db.device.upsert({
      where: { stationId_serial: { stationId: station.id, serial: d.deviceSn } },
      create: {
        stationId: station.id,
        serial: d.deviceSn,
        kind,
        status,
        lastSeenAt: d.collectionTime ? new Date(d.collectionTime * 1000) : null,
        details,
      },
      update: { status, lastSeenAt: d.collectionTime ? new Date(d.collectionTime * 1000) : undefined, details },
    });

    if (before && before.status !== "OFFLINE" && status === "OFFLINE") {
      await recordNotice(station.id, {
        dedupeKey: `offline:${d.deviceSn}:${localDateKey(new Date(), station.timezone)}`,
        level: "WARNING",
        title: `${deviceLabel(kind)} stopped reporting`,
        body: `We haven't heard from your ${deviceLabel(kind).toLowerCase()} recently. Check that it has power and Wi-Fi.`,
        occurredAt: new Date(),
      });
    }
  }
}

/** Yesterday + today daily totals, and this month's total. */
export async function syncDaily(station: Station): Promise<void> {
  const stationId = Number(station.externalId);
  const today = localDateKey(new Date(), station.timezone);
  await upsertDaily(station, await solarman.stationDaily(stationId, addDays(today, -1), today));
  const month = today.slice(0, 7);
  await upsertMonthly(station, await solarman.stationMonthly(stationId, month, month));
}

export async function syncAlerts(station: Station): Promise<void> {
  const today = localDateKey(new Date(), station.timezone);
  const { stationAlertItems } = await solarman.stationAlerts(Number(station.externalId), addDays(today, -6), today);
  for (const a of stationAlertItems ?? []) {
    if (!a.alertTime) continue;
    const level: NoticeLevel = a.level === 2 ? "FAULT" : a.level === 1 ? "WARNING" : "INFO";
    await recordNotice(station.id, {
      dedupeKey: `alert:${a.deviceSn}:${a.ruleId ?? a.code}:${a.alertTime}`,
      level,
      title: a.showName ?? "System alert",
      body: `Reported by your ${deviceLabel(deviceKind(a.deviceType ?? "")).toLowerCase()}${a.code ? ` (code ${a.code})` : ""}.`,
      occurredAt: new Date(a.alertTime * 1000),
    });
  }
}

/** One-off history import: daily totals since install, monthly totals, and recent 5-minute readings. */
export async function backfill(station: Station, { frameDays = 7 } = {}): Promise<void> {
  const stationId = Number(station.externalId);
  const today = localDateKey(new Date(), station.timezone);
  const firstDay = station.operatingSince ? localDateKey(station.operatingSince, station.timezone) : addDays(today, -365);

  for (let end = today; end >= firstDay; end = addDays(end, -30)) {
    const start = addDays(end, -29) < firstDay ? firstDay : addDays(end, -29);
    await upsertDaily(station, await solarman.stationDaily(stationId, start, end));
  }

  const firstYear = Number(firstDay.slice(0, 4));
  for (let year = firstYear; year <= Number(today.slice(0, 4)); year++) {
    const endMonth = year === Number(today.slice(0, 4)) ? today.slice(0, 7) : `${year}-12`;
    await upsertMonthly(station, await solarman.stationMonthly(stationId, `${year}-01`, endMonth));
  }

  for (let i = frameDays - 1; i >= 1; i--) {
    const day = addDays(today, -i);
    if (day < firstDay) continue;
    const frames = await solarman.stationFrames(stationId, day);
    const samples = (frames.stationDataItems ?? []).map(frameToSample).filter((s) => s !== null);
    if (samples.length) {
      await db.powerSample.createMany({ data: samples.map((s) => ({ ...s, stationId: station.id })), skipDuplicates: true });
    }
  }
}

async function upsertDaily(station: Station, res: Awaited<ReturnType<typeof solarman.stationDaily>>) {
  for (const item of res.stationDataItems ?? []) {
    const key = historyDayKey(item);
    if (!key) continue;
    const energy = historyToEnergy(item);
    const date = dateKeyToDbDate(key);
    await db.dailyEnergy.upsert({
      where: { stationId_date: { stationId: station.id, date } },
      create: { stationId: station.id, date, ...energy },
      update: energy,
    });
  }
}

async function upsertMonthly(station: Station, res: Awaited<ReturnType<typeof solarman.stationMonthly>>) {
  for (const item of res.stationDataItems ?? []) {
    if (!item.year || !item.month) continue;
    const energy = historyToEnergy(item);
    await db.monthlyEnergy.upsert({
      where: { stationId_year_month: { stationId: station.id, year: item.year, month: item.month } },
      create: { stationId: station.id, year: item.year, month: item.month, ...energy },
      update: energy,
    });
  }
}

export function deviceLabel(kind: DeviceKind): string {
  switch (kind) {
    case "INVERTER":
      return "Inverter";
    case "BATTERY":
      return "Battery";
    case "LOGGER":
      return "Wi-Fi data logger";
    case "METER":
      return "Electricity meter";
    default:
      return "Device";
  }
}

export const syncIntervals = {
  live: () => env().SYNC_INTERVAL_MINUTES * MINUTE,
  devices: () => 30 * MINUTE,
  daily: () => 60 * MINUTE,
  alerts: () => 30 * MINUTE,
};
