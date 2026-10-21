import type { FlowSnapshot, PowerReading } from "@/lib/energy/flow";
import type { Story } from "@/lib/energy/story";
import type { SunTimes } from "@/lib/energy/sun";
import { cn } from "@/lib/utils";
import { Card } from "./card";
import { FlowDiagram } from "./flow-diagram";
import { SelfPoweredDial } from "./self-powered-dial";

const TONE_COLOR: Record<Story["tone"], string> = {
  sun: "var(--sun)",
  battery: "var(--battery)",
  grid: "var(--grid)",
  outage: "var(--bad)",
  night: "var(--ink-3)",
};

const TONE_LABEL: Record<Story["tone"], string> = {
  sun: "Solar",
  battery: "On battery",
  grid: "Power company",
  outage: "Power cut",
  night: "Night",
};

export function FlowCard({
  reading,
  flow,
  story,
  measuredAt,
  sun,
  timeZone,
  capacityKw,
  className,
}: {
  reading: PowerReading;
  flow: FlowSnapshot;
  story: Story;
  measuredAt: Date;
  sun: SunTimes | null;
  timeZone: string;
  capacityKw: number | null;
  className?: string;
}) {
  const time = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone });
  const tone = TONE_COLOR[story.tone];
  const f = flow.flows;
  const homeIn = f.solarToHome + f.batteryToHome + f.gridToHome;
  const mix = homeIn > 0 ? { sun: f.solarToHome / homeIn, battery: f.batteryToHome / homeIn, grid: f.gridToHome / homeIn } : { sun: 0, battery: 0, grid: 0 };

  // "Power cut — running on sunshine": the second half gets the tone's colour.
  const [lead, rest] = story.headline.includes(" — ") ? story.headline.split(" — ") : [story.headline, null];

  return (
    <Card className={cn("relative isolate flex flex-col overflow-hidden p-0", className)} aria-labelledby="flow-title">
      {/* Tone wash in the corner */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-32 -z-10 size-[460px] rounded-full opacity-[0.09] blur-3xl"
        style={{ background: tone }}
      />

      <div className="flex flex-col gap-5 p-6 sm:p-8 xl:flex-row xl:items-center xl:justify-between">
        <div className="max-w-xl min-w-0">
          <p className="border-line bg-surface-2/70 text-ink-2 inline-flex items-center gap-2 rounded-full border py-1 pr-3 pl-2 text-[11px] font-bold tracking-[0.1em] uppercase backdrop-blur">
            <span className="relative grid size-2 place-items-center">
              <span className="absolute inline-flex size-full animate-ping rounded-full opacity-60" style={{ background: tone }} />
              <span className="relative size-2 rounded-full" style={{ background: tone }} />
            </span>
            Live · {TONE_LABEL[story.tone]}
          </p>
          <h2 id="flow-title" className="sm:text-hero mt-4 text-[28px] leading-[1.08] font-bold tracking-tight text-balance">
            {lead}
            {rest && (
              <>
                <span className="text-ink-3"> — </span>
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: "linear-gradient(100deg, var(--gilt-1), var(--gilt-2))" }}
                >
                  {rest}
                </span>
              </>
            )}
          </h2>
          <p className="text-ink-2 mt-3 text-[15px] leading-relaxed text-pretty">{story.detail}</p>
        </div>

        <SelfPoweredDial selfPowered={flow.selfPowered} mix={mix} />
      </div>

      <div className="border-line relative flex flex-1 items-center justify-center border-t px-4 pt-8 pb-5 sm:px-8">
        <div aria-hidden className="pointer-events-none absolute inset-0 [background-image:radial-gradient(var(--line)_1px,transparent_1px)] [background-size:22px_22px] opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <FlowDiagram reading={reading} flow={flow} capacityKw={capacityKw} />
      </div>

      <div className="border-line text-ink-3 flex flex-wrap items-center justify-between gap-3 border-t px-6 py-3 text-xs sm:px-8">
        <span>Reading taken at {time(measuredAt)}</span>
        {sun && <SunArc sun={sun} now={measuredAt} label={(d) => time(d)} />}
      </div>
    </Card>
  );
}

/** Where the sun is in today's sky, between sunrise and sunset. */
function SunArc({ sun, now, label }: { sun: SunTimes; now: Date; label: (d: Date) => string }) {
  const span = sun.sunset.getTime() - sun.sunrise.getTime();
  const raw = (now.getTime() - sun.sunrise.getTime()) / span;
  const up = raw > 0 && raw < 1;
  const t = Math.min(1, Math.max(0, raw));
  // Half-ellipse from (10,26) to (110,26) peaking at y=4.
  const x = 10 + t * 100;
  const y = 26 - Math.sin(t * Math.PI) * 22;

  return (
    <span className="flex items-center gap-2.5">
      <span className="tabular">↑ {label(sun.sunrise)}</span>
      <svg viewBox="0 0 120 30" className="h-[26px] w-[104px] overflow-visible" aria-label={up ? "The sun is up" : "The sun has set"}>
        <path d="M10 26 A50 22 0 0 1 110 26" fill="none" stroke="var(--line-strong)" strokeWidth={1.2} strokeDasharray="2 3" />
        {up && <path d={`M10 26 A50 22 0 0 1 ${x} ${y}`} fill="none" stroke="var(--sun)" strokeWidth={1.6} strokeLinecap="round" />}
        <line x1="2" y1="26" x2="118" y2="26" stroke="var(--line)" strokeWidth={1} />
        <circle cx={x} cy={y} r={up ? 8 : 5} fill={up ? "var(--sun)" : "var(--ink-3)"} opacity={up ? 0.18 : 0} />
        <circle cx={x} cy={y} r={up ? 4 : 3} fill={up ? "var(--sun)" : "var(--ink-3)"} />
      </svg>
      <span className="tabular">{label(sun.sunset)} ↓</span>
    </span>
  );
}
