// Number formatting in everyday language. "Units" is what electricity bills in
// Pakistan call a kilowatt-hour, so energy is shown in units throughout.

export function formatPower(watts: number): { value: string; unit: string } {
  const w = Math.abs(watts);
  if (w >= 1000) return { value: trim(w / 1000, w >= 10_000 ? 1 : 2), unit: "kW" };
  return { value: String(Math.round(w)), unit: "W" };
}

export function powerText(watts: number): string {
  const { value, unit } = formatPower(watts);
  return `${value} ${unit}`;
}

export function formatUnits(kwh: number, digits = 1): string {
  if (kwh >= 1000) return trim(kwh, 0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return trim(kwh, digits);
}

export function unitsText(kwh: number): string {
  const v = formatUnits(kwh);
  return `${v} ${v === "1" ? "unit" : "units"}`;
}

const currencySymbols: Record<string, string> = { PKR: "Rs", USD: "$", EUR: "€", GBP: "£", INR: "₹", AED: "AED" };

export function moneyText(amount: number, currency: string): string {
  const symbol = currencySymbols[currency] ?? currency;
  const rounded = Math.round(amount);
  const grouped = Math.abs(rounded).toLocaleString("en-US");
  const sign = rounded < 0 ? "−" : "";
  return symbol.length > 1 ? `${sign}${symbol} ${grouped}` : `${sign}${symbol}${grouped}`;
}

export function percentText(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

export function durationText(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return "—";
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 24) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m >= 5 ? `${h} h ${m} min` : `${h} h`;
  }
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"}`;
}

/** "just now", "4 min ago", "2 h ago", "3 days ago" */
export function agoText(date: Date, now: Date = new Date()): string {
  const s = Math.max(0, (now.getTime() - date.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86_400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86_400)} days ago`;
}

function trim(n: number, digits: number): string {
  const f = 10 ** digits;
  return String(Math.round(n * f) / f);
}
