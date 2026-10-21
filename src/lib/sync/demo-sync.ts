import "server-only";
import type { Station } from "@prisma/client";
import { db } from "@/lib/db";
import { DEMO_STATION, demoDay } from "@/lib/demo/model";
import { dateKeyToDbDate, localDateKey } from "@/lib/time";
import { detectLiveEvents } from "./events";

export async function ensureDemoStation(): Promise<Station> {
  const existing = await db.station.findFirst({ where: { source: "DEMO" } });
  if (existing) return existing;
  const { externalId, name, capacityKw, batteryKwh, timezone, address, latitude, longitude } = DEMO_STATION;
  return db.station.create({
    data: { source: "DEMO", externalId, name, capacityKw, batteryKwh, timezone, address, latitude, longitude },
  });
}

/** Brings today's modelled readings up to the current time. Nothing random: the model is a function of the date. */
export async function syncDemoLive(station: Station): Promise<void> {
  const now = new Date();
  const today = localDateKey(now, station.timezone);
  const day = demoDay(today);
  const upToNow = day.samples.filter((s) => s.measuredAt <= now);
  const latest = upToNow.at(-1);
  if (!latest) return;

  await db.powerSample.createMany({
    data: upToNow.map(({ gridAvailable: _, ...s }) => ({ ...s, stationId: station.id })),
    skipDuplicates: true,
  });

  const hours = 5 / 60;
  const sum = (pick: (s: (typeof upToNow)[number]) => number) => Math.round(upToNow.reduce((a, s) => a + (pick(s) * hours) / 1000, 0) * 10) / 10;
  const totals = {
    solarKwh: sum((s) => s.solarW),
    homeKwh: sum((s) => s.homeW),
    boughtKwh: sum((s) => Math.max(0, s.gridW)),
    soldKwh: sum((s) => Math.max(0, -s.gridW)),
    chargedKwh: sum((s) => Math.max(0, -s.batteryW)),
    dischargedKwh: sum((s) => Math.max(0, s.batteryW)),
  };

  const lifetime = await db.dailyEnergy.aggregate({
    where: { stationId: station.id, date: { lt: dateKeyToDbDate(today) } },
    _sum: { solarKwh: true, boughtKwh: true, soldKwh: true },
  });

  const previous = await db.liveStatus.findUnique({ where: { stationId: station.id } });
  const live = {
    measuredAt: latest.measuredAt,
    solarW: latest.solarW,
    homeW: latest.homeW,
    batteryW: latest.batteryW,
    gridW: latest.gridW,
    batteryPct: latest.batteryPct,
    gridAvailable: latest.gridAvailable,
    todaySolarKwh: totals.solarKwh,
    todayHomeKwh: totals.homeKwh,
    todayBoughtKwh: totals.boughtKwh,
    todaySoldKwh: totals.soldKwh,
    todayChargedKwh: totals.chargedKwh,
    todayDischargedKwh: totals.dischargedKwh,
    lifetimeSolarKwh: (lifetime._sum.solarKwh ?? 0) + totals.solarKwh,
    lifetimeBoughtKwh: (lifetime._sum.boughtKwh ?? 0) + totals.boughtKwh,
    lifetimeSoldKwh: (lifetime._sum.soldKwh ?? 0) + totals.soldKwh,
    inverterTempC: Math.round((32 + latest.solarW / 250) * 10) / 10,
    batteryTempC: 29,
  };
  await db.liveStatus.upsert({ where: { stationId: station.id }, create: { stationId: station.id, ...live }, update: live });

  const date = dateKeyToDbDate(today);
  await db.dailyEnergy.upsert({
    where: { stationId_date: { stationId: station.id, date } },
    create: { stationId: station.id, date, ...totals },
    update: totals,
  });
  await db.device.updateMany({ where: { stationId: station.id, status: { not: "OFFLINE" } }, data: { lastSeenAt: latest.measuredAt } });

  await detectLiveEvents(station, previous, live);
}
