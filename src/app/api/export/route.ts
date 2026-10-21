import { getAnalytics, getStation } from "@/lib/data/queries";
import { parseTrendsParams } from "@/lib/data/params";
import { localDateKey } from "@/lib/time";

/** CSV download of the period shown on the Trends page. */
export async function GET(request: Request) {
  const station = await getStation();
  const today = localDateKey(new Date(), station.timezone);
  const { range, date } = parseTrendsParams(Object.fromEntries(new URL(request.url).searchParams), today);
  const data = await getAnalytics(station, range, date);

  let csv: string;
  if (data.kind === "power") {
    const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: station.timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    csv = [
      "Time,Solar made (W),Home used (W),Battery (W; + = powering home),Power company (W; + = buying),Battery level (%)",
      ...data.power.map((p) => [fmt.format(new Date(p.t)), p.solarW, p.homeW, p.batteryW, p.gridW, p.batteryPct ?? ""].join(",")),
    ].join("\n");
  } else {
    csv = [
      `${range === "year" ? "Month" : "Date"},Made by panels (units),Used by home (units),Bought (units),Sold back (units),Stored in battery (units),Used from battery (units)`,
      ...data.bars.map((b) =>
        [range === "year" ? b.date.slice(0, 7) : b.date, b.solarKwh, b.homeKwh, b.boughtKwh, b.soldKwh, b.chargedKwh, b.dischargedKwh]
          .map((v) => (typeof v === "number" ? Math.round(v * 100) / 100 : v))
          .join(","),
      ),
    ].join("\n");
  }

  const filename = `solar-${range}-${data.start}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
