import { powerText } from "@/lib/format";
import type { FlowSnapshot, PowerReading } from "./flow";

export interface Story {
  /** Short status, e.g. "Running on sunshine" */
  headline: string;
  /** One or two sentences explaining what is happening, no jargon. */
  detail: string;
  tone: "sun" | "battery" | "grid" | "outage" | "night";
}

/** Turns the current readings into a plain-English explanation for someone who has never seen an inverter. */
export function describe(r: PowerReading, f: FlowSnapshot, isDaylight: boolean): Story {
  const solar = powerText(r.solarW);
  const home = powerText(r.homeW);
  const { flows } = f;

  if (f.grid === "outage") {
    if (flows.solarToHome > 0 && flows.batteryToHome > 0) {
      return {
        headline: "Power cut — you're covered",
        detail: `The power company's supply is off. Your panels (${solar}) and battery are keeping your home running.`,
        tone: "outage",
      };
    }
    if (flows.solarToHome > 0) {
      return {
        headline: "Power cut — running on sunshine",
        detail: `The power company's supply is off, but your panels are making ${solar}, enough for the ${home} your home needs.`,
        tone: "outage",
      };
    }
    return {
      headline: "Power cut — running on battery",
      detail: `The power company's supply is off. Your battery is supplying the ${home} your home needs.`,
      tone: "outage",
    };
  }

  if (f.surplus) {
    const extra =
      flows.solarToBattery > 0
        ? `The extra ${powerText(flows.solarToBattery)} is charging your battery.`
        : flows.solarToGrid > 0
          ? `The extra ${powerText(flows.solarToGrid)} is being sold back to the power company.`
          : f.battery === "full"
            ? "Your battery is already full."
            : "";
    return {
      headline: "Running on sunshine",
      detail: `Your panels are making ${solar}, more than the ${home} your home needs. ${extra}`.trim(),
      tone: "sun",
    };
  }

  if (flows.gridToHome > 0 && flows.solarToHome === 0 && flows.batteryToHome === 0) {
    return {
      headline: "Using the power company",
      detail: `${isDaylight ? "There's not enough sun right now, so your" : "It's dark, so your"} home is buying all of its ${home} from the power company.`,
      tone: "grid",
    };
  }

  if (flows.batteryToHome > 0 && flows.gridToHome === 0) {
    return {
      headline: flows.solarToHome > 0 ? "Sun and battery together" : "Running on your battery",
      detail:
        flows.solarToHome > 0
          ? `Your panels give ${solar} and your battery adds ${powerText(flows.batteryToHome)}, covering everything your home needs.`
          : `Your battery is supplying the ${home} your home needs. You aren't buying anything from the power company.`,
      tone: "battery",
    };
  }

  if (flows.gridToHome > 0) {
    const own = flows.solarToHome + flows.batteryToHome;
    return {
      headline: "Topping up from the power company",
      detail: `Your own system covers ${powerText(own)} of the ${home} your home needs; the other ${powerText(flows.gridToHome)} is bought from the power company.`,
      tone: "grid",
    };
  }

  if (r.homeW < 15) {
    return {
      headline: isDaylight ? "All quiet" : "Resting for the night",
      detail: "Your home is barely using any power right now.",
      tone: isDaylight ? "sun" : "night",
    };
  }

  return {
    headline: "Running on sunshine",
    detail: `Your panels are making ${solar}, covering the ${home} your home needs.`,
    tone: "sun",
  };
}
