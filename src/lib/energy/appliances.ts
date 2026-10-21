// Makes watts tangible: "enough to run about 3 ceiling fans".

const APPLIANCES = [
  { name: "air conditioner", plural: "air conditioners", watts: 1500 },
  { name: "fridge", plural: "fridges", watts: 150 },
  { name: "ceiling fan", plural: "ceiling fans", watts: 75 },
  { name: "LED bulb", plural: "LED bulbs", watts: 10 },
] as const;

/** Picks the largest appliance that fits at least once and says how many it could run. */
export function applianceEquivalent(watts: number): string | null {
  if (watts < 10) return null;
  const a = APPLIANCES.find((x) => watts >= x.watts * (x.watts >= 1000 ? 1 : 2)) ?? APPLIANCES[APPLIANCES.length - 1];
  const n = Math.floor(watts / a.watts);
  if (n < 1) return null;
  return `about ${n} ${n === 1 ? a.name : a.plural}`;
}
