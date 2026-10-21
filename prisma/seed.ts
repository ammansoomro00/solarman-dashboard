// Deterministic seed: default preferences, plus a full year of sample data for demo mode.
// Real Solarman history is imported separately with `npm run backfill`.

import { type Prisma, PrismaClient } from "@prisma/client";
import { DEMO_STATION, demoDay } from "../src/lib/demo/model";
import { addDays, dateKeyToDbDate, localDateKey, localParts, pad } from "../src/lib/time";

const db = new PrismaClient();
const HISTORY_DAYS = 400;
const SAMPLE_DAYS = 14;

async function main() {
  await db.preference.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });

  const { externalId, name, capacityKw, batteryKwh, timezone, address, latitude, longitude } = DEMO_STATION;
  const station = await db.station.upsert({
    where: { source_externalId: { source: "DEMO", externalId } },
    create: { source: "DEMO", externalId, name, capacityKw, batteryKwh, timezone, address, latitude, longitude },
    update: { name, capacityKw, batteryKwh },
  });

  const now = new Date();
  const today = localDateKey(now, timezone);
  const firstDay = addDays(today, -HISTORY_DAYS);
  await db.station.update({ where: { id: station.id }, data: { operatingSince: dateKeyToDbDate(firstDay) } });

  // Start clean so re-seeding gives the same result.
  await db.$transaction([
    db.powerSample.deleteMany({ where: { stationId: station.id } }),
    db.dailyEnergy.deleteMany({ where: { stationId: station.id } }),
    db.monthlyEnergy.deleteMany({ where: { stationId: station.id } }),
    db.notice.deleteMany({ where: { stationId: station.id } }),
    db.liveStatus.deleteMany({ where: { stationId: station.id } }),
    db.syncState.deleteMany({ where: { stationId: station.id } }),
    db.device.deleteMany({ where: { stationId: station.id } }),
  ]);

  const daily = [];
  const months = new Map<string, { solarKwh: number; homeKwh: number; boughtKwh: number; soldKwh: number; chargedKwh: number; dischargedKwh: number }>();
  const notices: Prisma.NoticeCreateManyInput[] = [];

  for (let key = firstDay; key < today; key = addDays(key, 1)) {
    const day = demoDay(key);
    daily.push({ stationId: station.id, date: dateKeyToDbDate(key), ...day.totals });

    const m = months.get(key.slice(0, 7)) ?? { solarKwh: 0, homeKwh: 0, boughtKwh: 0, soldKwh: 0, chargedKwh: 0, dischargedKwh: 0 };
    for (const k of Object.keys(m) as Array<keyof typeof m>) m[k] += day.totals[k];
    months.set(key.slice(0, 7), m);

    if (key >= addDays(today, -SAMPLE_DAYS)) {
      await db.powerSample.createMany({
        data: day.samples.map(({ gridAvailable: _, ...s }) => ({ ...s, stationId: station.id })),
        skipDuplicates: true,
      });
    }

    // Recent power cuts become notices, like the live sync would have recorded.
    if (key >= addDays(today, -5)) {
      day.samples.forEach((s, i) => {
        const prev = day.samples[i - 1];
        if (!s.gridAvailable && (prev?.gridAvailable ?? true)) {
          const p = localParts(s.measuredAt, timezone);
          notices.push({
            stationId: station.id,
            dedupeKey: `outage:${key}T${pad(p.hour)}`,
            level: "WARNING" as const,
            title: "Power cut started",
            body: "The power company's supply went off. Your solar panels and battery are running your home.",
            occurredAt: s.measuredAt,
            readAt: key < addDays(today, -1) ? s.measuredAt : null,
          });
        }
      });
    }
  }

  await db.dailyEnergy.createMany({ data: daily });
  await db.monthlyEnergy.createMany({
    data: [...months].map(([ym, t]) => ({
      stationId: station.id,
      year: Number(ym.slice(0, 4)),
      month: Number(ym.slice(5, 7)),
      ...Object.fromEntries(Object.entries(t).map(([k, v]) => [k, Math.round(v * 10) / 10])),
    })) as never,
  });
  await db.notice.createMany({ data: notices, skipDuplicates: true });

  await db.device.createMany({
    data: [
      {
        stationId: station.id,
        serial: "DEMO-INV-5K",
        kind: "INVERTER",
        status: "ONLINE",
        model: "5 kW hybrid inverter",
        lastSeenAt: now,
        details: [
          { label: "Model", value: "Single phase hybrid" },
          { label: "Maximum output", value: "5000 W" },
          { label: "Home supply voltage", value: "231 V" },
          { label: "Software version", value: "V1.4.2" },
        ],
      },
      {
        stationId: station.id,
        serial: "DEMO-BAT-10K",
        kind: "BATTERY",
        status: "ONLINE",
        model: "10 kWh lithium battery",
        lastSeenAt: now,
        details: [
          { label: "Health", value: "98%" },
          { label: "Charge cycles used", value: "412" },
          { label: "Capacity", value: "200 Ah" },
          { label: "Temperature", value: "29 ℃" },
        ],
      },
      { stationId: station.id, serial: "DEMO-WIFI-01", kind: "LOGGER", status: "ONLINE", model: "Wi-Fi data logger", lastSeenAt: now },
    ],
  });

  console.log(`Seeded demo plant "${name}": ${daily.length} days of totals, ${SAMPLE_DAYS} days of 5-minute readings, ${notices.length} notices.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
