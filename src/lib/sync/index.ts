import "server-only";
import type { Station } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { ensureDemoStation, syncDemoLive } from "./demo-sync";
import { ensureSolarmanStation, syncAlerts, syncDaily, syncDevices, syncIntervals, syncLive } from "./solarman-sync";
import { runThrottled } from "./throttle";

export function activeSource() {
  return env().SOLAR_DATA_SOURCE === "solarman" ? ("SOLARMAN" as const) : ("DEMO" as const);
}

export async function ensureStation(): Promise<Station> {
  return activeSource() === "SOLARMAN" ? ensureSolarmanStation() : ensureDemoStation();
}

export interface RefreshResult {
  /** Fresh data was written, so the page should re-render. */
  changed: boolean;
  error?: string;
}

/**
 * Brings the database up to date, calling the provider only when each piece of
 * data is due. Safe to call on every page view: throttled and deduplicated.
 */
export async function refresh({ force = false }: { force?: boolean } = {}): Promise<RefreshResult> {
  const station = await ensureStation();

  try {
    if (station.source === "DEMO") {
      const changed = await runThrottled(station.id, "live", syncIntervals.live(), () => syncDemoLive(station), { force });
      return { changed };
    }

    // The live refresh needs to know which device is the inverter, so load devices first on a fresh install.
    const hasDevices = (await db.device.count({ where: { stationId: station.id } })) > 0;
    const devices = await runThrottled(station.id, "devices", hasDevices ? syncIntervals.devices() : 0, () => syncDevices(station), {
      force: force || !hasDevices,
    });

    const results = await Promise.allSettled([
      runThrottled(station.id, "live", syncIntervals.live(), () => syncLive(station), { force }),
      runThrottled(station.id, "daily", syncIntervals.daily(), () => syncDaily(station), { force }),
      runThrottled(station.id, "alerts", syncIntervals.alerts(), () => syncAlerts(station), { force }),
    ]);

    const failure = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
    const changed = devices || results.some((r) => r.status === "fulfilled" && r.value);
    return { changed, error: failure ? String(failure.reason instanceof Error ? failure.reason.message : failure.reason) : undefined };
  } catch (error) {
    return { changed: false, error: error instanceof Error ? error.message : String(error) };
  }
}
