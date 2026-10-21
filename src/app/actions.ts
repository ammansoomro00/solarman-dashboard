"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getNotices, getStation } from "@/lib/data/queries";
import { CARD_IDS } from "@/lib/preferences";

export type ActionResult = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

const themeSchema = z.enum(["light", "dark", "system"]);

export async function saveTheme(theme: string): Promise<ActionResult> {
  const parsed = themeSchema.safeParse(theme);
  if (!parsed.success) return { ok: false, error: "Unknown theme" };
  await db.preference.upsert({ where: { id: 1 }, create: { id: 1, theme: parsed.data }, update: { theme: parsed.data } });
  return { ok: true };
}

const money = (label: string) =>
  z.coerce
    .number({ message: `${label} must be a number` })
    .min(0, `${label} can't be negative`)
    .max(100_000, `${label} looks too high`);

const preferenceSchema = z.object({
  pricePerUnit: money("Price per unit").refine((n) => n > 0, "Price per unit must be more than 0"),
  sellPricePerUnit: money("Sell-back price"),
  currency: z.enum(["PKR", "USD", "EUR", "GBP", "INR", "AED"]),
  co2KgPerUnit: z.coerce.number({ message: "Must be a number" }).min(0, "Can't be negative").max(2, "Should be between 0 and 2 kg"),
});

export type PreferenceInput = z.input<typeof preferenceSchema>;

export async function savePreferences(input: PreferenceInput): Promise<ActionResult> {
  const parsed = preferenceSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }
  await db.preference.upsert({ where: { id: 1 }, create: { id: 1, ...parsed.data }, update: parsed.data });
  revalidatePath("/", "layout");
  return { ok: true };
}

const cardsSchema = z
  .array(z.enum(CARD_IDS))
  .max(CARD_IDS.length)
  .refine((a) => new Set(a).size === a.length, "Duplicate cards");

export async function saveOverviewCards(cards: string[]): Promise<ActionResult> {
  const parsed = cardsSchema.safeParse(cards);
  if (!parsed.success) return { ok: false, error: "That card layout isn't valid." };
  await db.preference.upsert({ where: { id: 1 }, create: { id: 1, overviewCards: parsed.data }, update: { overviewCards: parsed.data } });
  revalidatePath("/");
  return { ok: true };
}

export async function loadNotices() {
  const station = await getStation();
  const notices = await getNotices(station.id);
  return notices.map((n) => ({
    id: n.id,
    level: n.level,
    title: n.title,
    body: n.body,
    occurredAt: n.occurredAt.toISOString(),
    read: n.readAt !== null,
  }));
}

export async function markNoticesRead(ids: number[] | "all"): Promise<ActionResult> {
  const station = await getStation();
  if (ids !== "all" && (!Array.isArray(ids) || !ids.every((n) => Number.isInteger(n)))) return { ok: false, error: "Invalid request" };
  await db.notice.updateMany({
    where: { stationId: station.id, readAt: null, ...(ids === "all" ? {} : { id: { in: ids } }) },
    data: { readAt: new Date() },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
