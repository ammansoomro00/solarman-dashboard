// Overview cards the user can show, hide and reorder. Shared by server and client.

export const CARD_IDS = ["flow", "battery", "today", "curve", "week", "savings"] as const;
export type CardId = (typeof CARD_IDS)[number];

export const CARD_LABELS: Record<CardId, { title: string; description: string }> = {
  flow: { title: "Live power flow", description: "Where your power is coming from and going right now" },
  battery: { title: "Battery", description: "How full it is and how long it will last" },
  today: { title: "Today so far", description: "Units made, used, bought and sold today" },
  curve: { title: "Today's sun and usage", description: "A chart of solar power and home use through the day" },
  savings: { title: "Money and planet", description: "What solar saved you this week and pollution avoided" },
  week: { title: "Last 7 days", description: "How much sunshine you turned into power each day" },
};

/** Keeps saved card lists valid if card ids change between versions. */
export function normalizeCards(saved: string[]): CardId[] {
  return saved.filter((c): c is CardId => (CARD_IDS as readonly string[]).includes(c));
}
