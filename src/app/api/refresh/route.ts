import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getStation } from "@/lib/data/queries";
import { refresh } from "@/lib/sync";

const body = z.object({ manual: z.boolean().optional() });

/** Brings data up to date (throttled server-side) and tells the client whether to re-render. */
export async function POST(request: Request) {
  const parsed = body.safeParse(await request.json().catch(() => ({})));
  const manual = parsed.success && parsed.data.manual === true;

  const station = await getStation();
  let force = false;
  if (manual) {
    // A manual refresh skips the normal wait, but never more than once a minute.
    const live = await db.syncState.findUnique({ where: { stationId_task: { stationId: station.id, task: "live" } } });
    force = !live?.lastAttemptAt || Date.now() - live.lastAttemptAt.getTime() > 60_000;
  }

  const result = await refresh({ force });
  const live = await db.syncState.findUnique({ where: { stationId_task: { stationId: station.id, task: "live" } } });

  return NextResponse.json({
    changed: result.changed,
    error: result.error ? friendlyError(result.error) : undefined,
    lastSyncedAt: live?.lastSuccessAt?.toISOString() ?? null,
  });
}

function friendlyError(message: string): string {
  if (/login failed|auth/i.test(message)) return "Solarman rejected the login. Check the account details in your .env file.";
  if (/insufficient allowance/i.test(message)) return "Your Solarman API allowance has run out. Contact Solarman support to top it up.";
  if (/fetch failed|timeout|network/i.test(message)) return "Couldn't reach Solarman. Showing the last readings we have.";
  return "Couldn't get new readings from Solarman. Showing the last readings we have.";
}
