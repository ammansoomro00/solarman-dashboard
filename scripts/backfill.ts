// Imports your real history from Solarman: daily totals since install, monthly
// totals, and the last week of 5-minute readings. Run once after setup:
//   npm run backfill            (or: npm run backfill -- --days 14)

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { refresh } from "@/lib/sync";
import { backfill, ensureSolarmanStation } from "@/lib/sync/solarman-sync";

async function main() {
  if (env().SOLAR_DATA_SOURCE !== "solarman") {
    console.log("SOLAR_DATA_SOURCE is not 'solarman'; nothing to import. Demo data comes from `npm run db:seed`.");
    return;
  }
  const daysArg = process.argv.indexOf("--days");
  const frameDays = daysArg > 0 ? Number(process.argv[daysArg + 1]) : 7;

  const station = await ensureSolarmanStation();
  console.log(`Importing history for "${station.name}" (${station.externalId})…`);
  await db.preference.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });
  await backfill(station, { frameDays });

  const result = await refresh({ force: true });
  if (result.error) console.warn("Live refresh reported:", result.error);

  const [days, samples, devices] = await Promise.all([
    db.dailyEnergy.count({ where: { stationId: station.id } }),
    db.powerSample.count({ where: { stationId: station.id } }),
    db.device.count({ where: { stationId: station.id } }),
  ]);
  console.log(`Done: ${days} days of totals, ${samples} five-minute readings, ${devices} devices.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
