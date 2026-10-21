import "server-only";
import type { NoticeLevel } from "@prisma/client";
import { db } from "@/lib/db";

export interface NewNotice {
  dedupeKey: string;
  level: NoticeLevel;
  title: string;
  body: string;
  occurredAt: Date;
}

/** Stores a notice once; repeated detections of the same event are ignored. */
export async function recordNotice(stationId: number, notice: NewNotice): Promise<void> {
  await db.notice.upsert({
    where: { stationId_dedupeKey: { stationId, dedupeKey: notice.dedupeKey } },
    create: { stationId, ...notice },
    update: {},
  });
}
