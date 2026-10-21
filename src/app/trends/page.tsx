import type { Metadata } from "next";
import { TrendsView } from "@/components/trends/trends-view";
import { getAnalytics, getPreferences, getStation } from "@/lib/data/queries";
import { parseTrendsParams } from "@/lib/data/params";
import { insightsFor } from "@/lib/energy/insights";
import { localDateKey, startOfLocalDay } from "@/lib/time";

export const metadata: Metadata = { title: "Trends" };

export default async function TrendsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const station = await getStation();
  const today = localDateKey(new Date(), station.timezone);
  const { range, date, view } = parseTrendsParams(await searchParams, today);
  const [data, prefs] = await Promise.all([getAnalytics(station, range, date), getPreferences()]);

  const tariff = { pricePerUnit: prefs.pricePerUnit, sellPricePerUnit: prefs.sellPricePerUnit, co2KgPerUnit: prefs.co2KgPerUnit };

  return (
    <>
      <div className="mb-6 lg:mb-8">
        <p className="eyebrow">Your energy over time</p>
        <h1 className="mt-1 text-[28px] leading-tight font-bold tracking-tight sm:text-[34px]">
          Trends
          <span className="bg-[linear-gradient(100deg,var(--gilt-1),var(--gilt-2))] bg-clip-text text-transparent">.</span>
        </h1>
        <p className="text-ink-2 mt-1 max-w-2xl text-sm">
          See how much power your panels made, what your home used, and what you bought, over any day, week, month or year.
        </p>
      </div>
      <TrendsView
        data={data}
        view={view}
        timeZone={station.timezone}
        dayStart={startOfLocalDay(data.start, station.timezone).getTime()}
        currency={prefs.currency}
        insights={insightsFor(data.totals, tariff)}
        previousInsights={data.previous ? insightsFor(data.previous, tariff) : null}
      />
    </>
  );
}
