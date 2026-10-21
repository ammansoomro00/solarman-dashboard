import type { DeviceKind, DeviceStatus } from "@prisma/client";
import { BatteryMedium, CircleAlert, CircleCheck, Cpu, TriangleAlert, UtilityPole, Wifi } from "lucide-react";

export const KIND: Record<DeviceKind, { label: string; icon: typeof Cpu; explain: string }> = {
  INVERTER: { label: "Inverter", icon: Cpu, explain: "The box that turns solar power into electricity your home can use and decides where it goes." },
  BATTERY: { label: "Battery", icon: BatteryMedium, explain: "Stores spare power for the evening and for power cuts." },
  LOGGER: { label: "Wi-Fi data logger", icon: Wifi, explain: "The small stick that sends your system's readings over the internet." },
  METER: { label: "Electricity meter", icon: UtilityPole, explain: "Measures power going to and from the power company." },
  OTHER: { label: "Device", icon: Cpu, explain: "Part of your solar system." },
};

/** Each kind of device takes the colour of the part of the system it belongs to. */
export const KIND_TOKEN: Record<DeviceKind, string> = {
  INVERTER: "--sun",
  BATTERY: "--battery",
  LOGGER: "--grid",
  METER: "--grid",
  OTHER: "--ink-3",
};

export const KIND_TONE = Object.fromEntries(Object.entries(KIND_TOKEN).map(([k, t]) => [k, `var(${t})`])) as Record<DeviceKind, string>;

export const STATUS: Record<DeviceStatus, { label: string; icon: typeof CircleCheck; color: string; token: string }> = {
  ONLINE: { label: "Working normally", icon: CircleCheck, color: "var(--home)", token: "--home" },
  WARNING: { label: "Needs a look", icon: TriangleAlert, color: "var(--warn)", token: "--warn" },
  OFFLINE: { label: "Not reporting", icon: CircleAlert, color: "var(--bad)", token: "--bad" },
};

export type HealthTone = "good" | "warn" | "bad";

export const HEALTH_COLOR: Record<HealthTone, string> = { good: "var(--home)", warn: "var(--warn)", bad: "var(--bad)" };
export const HEALTH_TOKEN: Record<HealthTone, string> = { good: "--home", warn: "--warn", bad: "--bad" };
