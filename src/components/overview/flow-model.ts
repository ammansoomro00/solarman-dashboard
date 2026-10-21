// Turns a reading into what the live power scene needs: one entry per part of the
// system (label, value, plain-English explanation, where its power goes) and one
// stream per wire into the inverter. Pure: no React, no three.js.

import { applianceEquivalent } from "@/lib/energy/appliances";
import type { FlowSnapshot, PowerReading } from "@/lib/energy/flow";
import { powerText } from "@/lib/format";

export type NodeId = "solar" | "home" | "battery" | "grid";
export type Tone = "sun" | "home" | "battery" | "grid" | "bad";

export const NODE_IDS: NodeId[] = ["solar", "home", "battery", "grid"];

export const TOKEN: Record<Tone, string> = { sun: "--sun", home: "--home", battery: "--battery", grid: "--grid", bad: "--bad" };

export interface FlowLine {
  label: string;
  watts: number;
  tone: Tone;
  direction: "in" | "out";
}

export interface FlowNode {
  id: NodeId;
  label: string;
  tone: Tone;
  watts: number;
  /** Shown instead of the wattage, e.g. "98%" for the battery or "Off" in a power cut. */
  valueOverride: string | null;
  caption: string;
  explain: string;
  active: boolean;
  lines: FlowLine[];
}

export interface FlowStream {
  id: NodeId;
  watts: number;
  /** true: power travels from this part toward the inverter */
  inbound: boolean;
  tone: Tone;
}

export interface FlowModel {
  nodes: Record<NodeId, FlowNode>;
  streams: Record<NodeId, FlowStream>;
  outage: boolean;
  /** Shares of the home's power right now. */
  mix: { sun: number; battery: number; grid: number };
}

export function buildFlowModel(reading: PowerReading, flow: FlowSnapshot): FlowModel {
  const f = flow.flows;
  const solarOut = f.solarToHome + f.solarToBattery + f.solarToGrid;
  const batteryNet = f.batteryToHome - (f.solarToBattery + f.gridToBattery);
  const gridNet = f.gridToHome + f.gridToBattery - f.solarToGrid;
  const homeIn = f.solarToHome + f.batteryToHome + f.gridToHome;
  const outage = flow.grid === "outage";

  // The home's stream takes the colour of whatever is mostly feeding it.
  const homeTone: Tone = f.solarToHome >= Math.max(f.batteryToHome, f.gridToHome) ? "sun" : f.batteryToHome >= f.gridToHome ? "battery" : "grid";

  const streams: Record<NodeId, FlowStream> = {
    solar: { id: "solar", watts: solarOut, inbound: true, tone: "sun" },
    battery: {
      id: "battery",
      watts: Math.abs(batteryNet),
      inbound: batteryNet > 0,
      tone: batteryNet > 0 ? "battery" : f.gridToBattery > f.solarToBattery ? "grid" : "sun",
    },
    grid: { id: "grid", watts: Math.abs(gridNet), inbound: gridNet > 0, tone: gridNet > 0 ? "grid" : "sun" },
    home: { id: "home", watts: homeIn, inbound: false, tone: homeTone },
  };

  const batteryWord =
    flow.battery === "charging"
      ? "charging"
      : flow.battery === "discharging"
        ? "powering home"
        : flow.battery === "full"
          ? "full"
          : flow.battery === "empty"
            ? "empty"
            : "standing by";
  const lowBattery = reading.batteryPct !== null && reading.batteryPct <= 20 && flow.battery !== "charging";
  const solarLike = applianceEquivalent(reading.solarW);
  const homeLike = applianceEquivalent(reading.homeW);

  const nodes: Record<NodeId, FlowNode> = {
    solar: {
      id: "solar",
      label: "Solar panels",
      tone: "sun",
      watts: reading.solarW,
      valueOverride: null,
      caption: reading.solarW >= 15 ? "making power" : "resting",
      active: reading.solarW >= 15,
      explain:
        reading.solarW >= 15
          ? `Your panels are turning sunlight into ${powerText(reading.solarW)}${solarLike ? `, enough to run ${solarLike}` : ""}.`
          : "Your panels aren't making power right now. They need daylight.",
      lines: [
        { label: "To your home", watts: f.solarToHome, tone: "home", direction: "out" },
        { label: "Into the battery", watts: f.solarToBattery, tone: "battery", direction: "out" },
        { label: "Sold to power company", watts: f.solarToGrid, tone: "grid", direction: "out" },
      ],
    },
    home: {
      id: "home",
      label: "Your home",
      tone: "home",
      watts: reading.homeW,
      valueOverride: null,
      caption: "using",
      active: reading.homeW >= 15,
      explain: `Everything switched on in your home is using ${powerText(reading.homeW)}${homeLike ? `, about the same as ${homeLike.replace("about ", "")}` : ""}.`,
      lines: [
        { label: "From the sun", watts: f.solarToHome, tone: "sun", direction: "in" },
        { label: "From the battery", watts: f.batteryToHome, tone: "battery", direction: "in" },
        { label: "From the power company", watts: f.gridToHome, tone: "grid", direction: "in" },
      ],
    },
    battery: {
      id: "battery",
      label: "Battery",
      tone: lowBattery ? "bad" : "battery",
      watts: Math.abs(batteryNet),
      valueOverride: reading.batteryPct !== null ? `${Math.round(reading.batteryPct)}%` : null,
      caption: Math.abs(batteryNet) > 0 ? `${batteryWord} · ${powerText(Math.abs(batteryNet))}` : batteryWord,
      active: Math.abs(batteryNet) > 0,
      explain:
        flow.battery === "charging"
          ? "Spare power is being stored in your battery for later."
          : flow.battery === "discharging"
            ? "Your battery is giving back power it stored earlier."
            : flow.battery === "full"
              ? "Your battery is full and ready for the evening or a power cut."
              : "Your battery isn't charging or being used right now.",
      lines: [
        { label: "Charging from the sun", watts: f.solarToBattery, tone: "sun", direction: "in" },
        { label: "Charging from power company", watts: f.gridToBattery, tone: "grid", direction: "in" },
        { label: "Powering your home", watts: f.batteryToHome, tone: "home", direction: "out" },
      ],
    },
    grid: {
      id: "grid",
      label: "Power company",
      tone: outage ? "bad" : "grid",
      watts: Math.abs(gridNet),
      valueOverride: outage ? "Off" : gridNet === 0 ? "—" : null,
      caption: outage ? "power cut" : gridNet > 0 ? "buying" : gridNet < 0 ? "selling back" : "not in use",
      active: outage || gridNet !== 0,
      explain: outage
        ? "The power company's supply is off (load-shedding or a fault). Your system is running the home on its own."
        : gridNet > 0
          ? "You're buying this electricity from the power company. It shows up on your bill."
          : gridNet < 0
            ? "You're selling spare solar power back to the power company."
            : "You aren't buying or selling electricity right now.",
      lines: [
        { label: "To your home", watts: f.gridToHome, tone: "home", direction: "out" },
        { label: "Into the battery", watts: f.gridToBattery, tone: "battery", direction: "out" },
        { label: "Bought from you", watts: f.solarToGrid, tone: "sun", direction: "in" },
      ],
    },
  };

  const mix = homeIn > 0 ? { sun: f.solarToHome / homeIn, battery: f.batteryToHome / homeIn, grid: f.gridToHome / homeIn } : { sun: 0, battery: 0, grid: 0 };

  return { nodes, streams, outage, mix };
}
