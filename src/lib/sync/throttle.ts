import "server-only";
import { db } from "@/lib/db";

export type SyncTask = "live" | "devices" | "daily" | "alerts";

// Requests already running in this process, so simultaneous page loads share one call.
const inFlight = new Map<string, Promise<boolean>>();

/**
 * Runs `work` for (station, task) at most once per `minIntervalMs`, across all
 * tabs and server processes. Returns true if the work ran and succeeded.
 */
export async function runThrottled(
  stationId: number,
  task: SyncTask,
  minIntervalMs: number,
  work: () => Promise<void>,
  { force = false }: { force?: boolean } = {},
): Promise<boolean> {
  const key = `${stationId}:${task}`;
  const running = inFlight.get(key);
  if (running) return running;

  const promise = (async () => {
    if (!(await claim(stationId, task, force ? 0 : minIntervalMs))) return false;
    try {
      await work();
      await db.syncState.update({
        where: { stationId_task: { stationId, task } },
        data: { lastSuccessAt: new Date(), lastError: null },
      });
      return true;
    } catch (error) {
      await db.syncState.update({
        where: { stationId_task: { stationId, task } },
        data: { lastError: error instanceof Error ? error.message : String(error) },
      });
      throw error;
    }
  })().finally(() => inFlight.delete(key));

  inFlight.set(key, promise);
  return promise;
}

/** Atomically claims the next run slot; false if another run happened too recently. */
async function claim(stationId: number, task: SyncTask, minIntervalMs: number): Promise<boolean> {
  const now = new Date();
  await db.syncState.upsert({
    where: { stationId_task: { stationId, task } },
    create: { stationId, task },
    update: {},
  });
  const { count } = await db.syncState.updateMany({
    where: {
      stationId,
      task,
      OR: [{ lastAttemptAt: null }, { lastAttemptAt: { lt: new Date(now.getTime() - minIntervalMs) } }],
    },
    data: { lastAttemptAt: now },
  });
  return count === 1;
}
