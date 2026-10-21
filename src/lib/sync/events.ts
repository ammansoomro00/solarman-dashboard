import "server-only";
import type { Station } from "@prisma/client";
import { localParts, pad } from "@/lib/time";
import { recordNotice } from "./notices";

/** Compares the new live reading with the previous one and records power cuts and low battery. */
export async function detectLiveEvents(
  station: Station,
  previous: { gridAvailable: boolean | null; batteryPct: number | null } | null,
  live: { measuredAt: Date; gridAvailable?: boolean | null; batteryPct: number | null },
) {
  const hourKey = (() => {
    const p = localParts(live.measuredAt, station.timezone);
    return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}`;
  })();

  if (live.gridAvailable === false && previous?.gridAvailable !== false) {
    await recordNotice(station.id, {
      dedupeKey: `outage:${hourKey}`,
      level: "WARNING",
      title: "Power cut started",
      body: "The power company's supply went off. Your solar panels and battery are running your home.",
      occurredAt: live.measuredAt,
    });
  }
  if (live.gridAvailable === true && previous?.gridAvailable === false) {
    await recordNotice(station.id, {
      dedupeKey: `restored:${hourKey}`,
      level: "INFO",
      title: "Power is back",
      body: "The power company's supply has come back on.",
      occurredAt: live.measuredAt,
    });
  }
  if (live.batteryPct !== null && live.batteryPct <= 20 && (previous?.batteryPct ?? 100) > 20) {
    await recordNotice(station.id, {
      dedupeKey: `battery-low:${hourKey}`,
      level: "WARNING",
      title: "Battery is running low",
      body: `Your battery is down to ${Math.round(live.batteryPct)}%. Try to save power until the sun is back or the supply returns.`,
      occurredAt: live.measuredAt,
    });
  }
}
