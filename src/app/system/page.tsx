import type { Metadata } from "next";
import { KIND, KIND_TOKEN, STATUS } from "@/components/system/device-meta";
import { type DetailRow, DeviceCard } from "@/components/system/device-card";
import { EventsTimeline } from "@/components/system/events-timeline";
import { HealthHero } from "@/components/system/health-hero";
import { ConnectionCard, SupplyCard } from "@/components/system/status-cards";
import { Reveal } from "@/components/ui/reveal";
import { getNotices, getStation, getSystem } from "@/lib/data/queries";
import { agoText } from "@/lib/format";
import { activeSource } from "@/lib/sync";

export const metadata: Metadata = { title: "My system" };

export default async function SystemPage() {
  const station = await getStation();
  const [{ devices, live, syncStates }, notices] = await Promise.all([getSystem(station), getNotices(station.id, 8)]);
  const source = activeSource();

  const offline = devices.filter((d) => d.status === "OFFLINE");
  const warning = devices.filter((d) => d.status === "WARNING");
  const liveSync = syncStates.find((s) => s.task === "live");
  const stale = live ? Date.now() - live.measuredAt.getTime() > 30 * 60_000 : true;

  const health =
    offline.length > 0
      ? {
          tone: "bad" as const,
          title: `${offline.length === 1 ? KIND[offline[0].kind].label : `${offline.length} devices`} not reporting`,
          body: "We haven't heard from part of your system recently. Check that it has power and that your Wi-Fi is working.",
        }
      : warning.length > 0
        ? { tone: "warn" as const, title: "Something needs a look", body: "Your inverter has reported a warning. See the recent events below." }
        : stale
          ? {
              tone: "warn" as const,
              title: "No recent readings",
              body: "Your system hasn't sent new readings for a while. It may be offline, or Solarman may be slow.",
            }
          : { tone: "good" as const, title: "Everything is working", body: "All parts of your system are online and sending readings." };

  const time = (d: Date) => d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short", timeZone: station.timezone });

  // The inverter is the core of the 3D model; everything else orbits it.
  const satellites = devices
    .filter((d) => d.kind !== "INVERTER")
    .map((d) => ({ kind: KIND_TOKEN[d.kind], status: STATUS[d.status].token, online: d.status !== "OFFLINE" }));

  const facts = [
    station.capacityKw ? { label: "Panels", value: `${station.capacityKw} kW` } : null,
    station.batteryKwh ? { label: "Battery", value: `${Math.round(station.batteryKwh * 10) / 10} units` } : null,
    station.operatingSince
      ? { label: "Running since", value: station.operatingSince.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: station.timezone }) }
      : null,
    station.address ? { label: "Location", value: cleanAddress(station.address) } : null,
  ].filter((f): f is { label: string; value: string } => f !== null);

  return (
    <>
      <div className="mb-6 lg:mb-8">
        <h1 className="text-[28px] leading-tight font-bold tracking-tight sm:text-[34px]">
          My system<span className="text-ink-3"> · {station.name}</span>
        </h1>
        {facts.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {facts.map((f) => (
              <li
                key={f.label}
                className="border-line bg-surface/60 inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] backdrop-blur"
              >
                <span className="text-ink-3">{f.label}</span>
                <span className="truncate font-semibold">{f.value}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12 lg:gap-5">
        <Reveal index={0} className="md:col-span-2 lg:col-span-12">
          <HealthHero
            tone={health.tone}
            title={health.title}
            body={health.body}
            online={devices.length - offline.length}
            total={devices.length}
            satellites={satellites}
          />
        </Reveal>

        <Reveal index={1} className="lg:col-span-6">
          <SupplyCard available={live?.gridAvailable ?? null} boughtKwh={live?.lifetimeBoughtKwh ?? null} soldKwh={live?.lifetimeSoldKwh ?? null} />
        </Reveal>

        <Reveal index={2} className="lg:col-span-6">
          <ConnectionCard
            connected={source === "SOLARMAN"}
            latest={live ? time(live.measuredAt) : null}
            checked={liveSync?.lastSuccessAt ? agoText(liveSync.lastSuccessAt) : null}
            error={liveSync?.lastError ?? null}
          />
        </Reveal>

        <Reveal index={3} className="md:col-span-2 lg:col-span-12">
          <h2 className="mt-4 mb-1 flex items-baseline gap-2 text-[15px] font-bold tracking-tight">
            Your equipment <span className="text-ink-3 text-[13px] font-semibold">{devices.length}</span>
          </h2>
        </Reveal>

        {devices.map((d, i) => (
          <Reveal key={d.id} index={4 + i} className="md:col-span-1 lg:col-span-6 xl:col-span-3">
            <DeviceCard
              kind={d.kind}
              status={d.status}
              serial={d.serial}
              model={d.model}
              heard={d.lastSeenAt ? agoText(d.lastSeenAt) : null}
              details={(Array.isArray(d.details) ? d.details : []) as unknown as DetailRow[]}
            />
          </Reveal>
        ))}

        <Reveal index={10} className="md:col-span-2 lg:col-span-12">
          <EventsTimeline
            events={notices.map((n) => ({ id: n.id, level: n.level, title: n.title, body: n.body, iso: n.occurredAt.toISOString(), when: time(n.occurredAt) }))}
          />
        </Reveal>
      </div>
    </>
  );
}

/** Solarman addresses can contain "(null)" and repeated parts; tidy them for display. */
function cleanAddress(address: string): string {
  return address
    .replace(/\(null\)\s*/g, "")
    .replace(/\b(.+?)\s+\1\b/g, "$1")
    .trim();
}
