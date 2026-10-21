import Link from "next/link";
import { BatteryCard } from "@/components/overview/battery-card";
import { CurveCard } from "@/components/overview/curve-card";
import { EmptyOverview } from "@/components/overview/empty-overview";
import { FlowCard } from "@/components/overview/flow-card";
import { SavingsCard } from "@/components/overview/savings-card";
import { TodayCard } from "@/components/overview/today-card";
import { WeekCard } from "@/components/overview/week-card";
import { Greeting } from "@/components/shell/greeting";
import { Reveal } from "@/components/ui/reveal";
import { getOverview, getPreferences, getStation } from "@/lib/data/queries";
import { batteryEta, computeFlows, type PowerReading } from "@/lib/energy/flow";
import { insightsFor, sumTotals } from "@/lib/energy/insights";
import { describe } from "@/lib/energy/story";
import { sunTimes } from "@/lib/energy/sun";
import { type CardId, normalizeCards } from "@/lib/preferences";
import { localParts, startOfLocalDay } from "@/lib/time";

export default async function OverviewPage() {
  const station = await getStation();
  const [overview, prefs] = await Promise.all([getOverview(station), getPreferences()]);
  const { live } = overview;

  const now = new Date();
  const hour = localParts(now, station.timezone).hour;
  const dateText = now.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", timeZone: station.timezone });

  const header = <Greeting hour={hour} dateText={dateText} />;

  if (!live) {
    return (
      <>
        {header}
        <EmptyOverview />
      </>
    );
  }

  const reading: PowerReading = {
    solarW: live.solarW,
    homeW: live.homeW,
    batteryW: live.batteryW,
    gridW: live.gridW,
    batteryPct: live.batteryPct,
    gridAvailable: live.gridAvailable,
  };
  const flow = computeFlows(reading);
  const sun = station.latitude !== null && station.longitude !== null ? sunTimes(now, station.latitude, station.longitude) : null;
  const isDaylight = sun ? now > sun.sunrise && now < sun.sunset : hour >= 6 && hour < 18;
  const story = describe(reading, flow, isDaylight);
  const tariff = { pricePerUnit: prefs.pricePerUnit, sellPricePerUnit: prefs.sellPricePerUnit, co2KgPerUnit: prefs.co2KgPerUnit };
  const weekInsights = insightsFor(sumTotals(overview.week), tariff);
  const dayStart = startOfLocalDay(overview.today, station.timezone).getTime();

  const cards: Record<CardId, { node: React.ReactNode; span: string }> = {
    flow: {
      span: "md:col-span-2 lg:col-span-8 lg:row-span-2",
      node: <FlowCard
          className="h-full"
          reading={reading}
          flow={flow}
          story={story}
          measuredAt={live.measuredAt}
          sun={sun}
          timeZone={station.timezone}
          capacityKw={station.capacityKw}
        />,
    },
    battery: {
      span: "lg:col-span-4",
      node: (
        <BatteryCard
          className="h-full"
          pct={live.batteryPct}
          state={flow.battery}
          eta={batteryEta(reading, station.batteryKwh)}
          capacityKwh={station.batteryKwh}
          tempC={live.batteryTempC}
          powerW={live.batteryW}
          homeW={live.homeW}
        />
      ),
    },
    today: { span: "lg:col-span-4", node: <TodayCard className="h-full" totals={overview.todayTotals} /> },
    curve: {
      span: "md:col-span-2 lg:col-span-8",
      node: <CurveCard className="h-full" points={overview.samples} dayStart={dayStart} timeZone={station.timezone} />,
    },
    week: { span: "md:col-span-2 lg:col-span-4", node: <WeekCard className="h-full" days={overview.week} today={overview.today} /> },
    savings: { span: "md:col-span-2 lg:col-span-12", node: <SavingsCard week={weekInsights} currency={prefs.currency} pricePerUnit={prefs.pricePerUnit} /> },
  };

  const order = normalizeCards(prefs.overviewCards);

  return (
    <>
      {header}
      {order.length === 0 ? (
        <div className="card grid place-items-center px-6 py-16 text-center">
          <p className="font-semibold">All cards are hidden</p>
          <p className="text-ink-2 mt-1 text-sm">Choose what to show on this page in Settings.</p>
          <Link href="/settings#cards" className="mt-4 text-sm font-semibold underline underline-offset-4">
            Choose cards
          </Link>
        </div>
      ) : (
        <div className="grid grid-flow-row-dense grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12 lg:gap-5">
          {order.map((id, i) => (
            <Reveal key={id} index={i} className={cards[id].span}>
              {cards[id].node}
            </Reveal>
          ))}
        </div>
      )}
    </>
  );
}
