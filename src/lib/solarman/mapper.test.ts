import { describe, expect, it } from "vitest";
import { deviceKind, deviceStatus, frameToSample, historyDayKey, historyToEnergy, pointMap, summarizeInverter } from "./mapper";

describe("frameToSample", () => {
  // Rows captured from a real Deye hybrid via Solarman.
  it("keeps Solarman's sign conventions: battery + = discharging, purchase + = buying", () => {
    const discharging = frameToSample({ dateTime: 1792540800, generationPower: 0, usePower: 243, batteryPower: 261, purchasePower: 0, batterySoc: 96 });
    expect(discharging).toMatchObject({ solarW: 0, homeW: 243, batteryW: 261, gridW: 0, batteryPct: 96 });

    const charging = frameToSample({ dateTime: 1792527600, generationPower: 0, usePower: 208, batteryPower: -1495, purchasePower: 1829, batterySoc: 93 });
    expect(charging).toMatchObject({ batteryW: -1495, gridW: 1829 });
    // 01:20 in Pakistan (UTC+5)
    expect(charging?.measuredAt.toISOString()).toBe("2026-10-20T20:20:00.000Z");
  });

  it("derives battery power from charge/discharge when batteryPower is missing", () => {
    expect(frameToSample({ dateTime: 1, chargePower: 800, dischargePower: 0 })?.batteryW).toBe(-800);
  });

  it("drops rows without a timestamp", () => {
    expect(frameToSample({ generationPower: 100 })).toBeNull();
  });
});

describe("history rows", () => {
  it("maps daily totals to plain fields", () => {
    const row = { year: 2026, month: 10, day: 19, generationValue: 4.2, useValue: 11.2, buyValue: 7.9, gridValue: 0, chargeValue: 3, dischargeValue: 2.1 };
    expect(historyDayKey(row)).toBe("2026-10-19");
    expect(historyToEnergy(row)).toEqual({ solarKwh: 4.2, homeKwh: 11.2, boughtKwh: 7.9, soldKwh: 0, chargedKwh: 3, dischargedKwh: 2.1 });
  });
});

describe("summarizeInverter", () => {
  const base = [
    { key: "Etdy_ge1", name: "Daily Production (Active)", value: "0.70", unit: "kWh" },
    { key: "Etdy_pu1", name: "Daily Energy Purchased", value: "2.40", unit: "kWh" },
    { key: "AC_T", name: "AC Temperature", value: "45.90", unit: "℃" },
    { key: "T_DC", name: "DC Temperature", value: "45.00", unit: "℃" },
  ];

  it("detects a power cut from near-zero grid voltage", () => {
    const s = summarizeInverter(
      pointMap([
        ...base,
        { key: "G_V_LN", name: "Grid Voltage", value: "1.10", unit: "V" },
        { key: "PG_F1", name: "Grid Frequency", value: "0.00", unit: "Hz" },
      ]),
    );
    expect(s.gridAvailable).toBe(false);
    expect(s.todaySolarKwh).toBe(0.7);
    expect(s.todayBoughtKwh).toBe(2.4);
    expect(s.inverterTempC).toBe(45.9);
  });

  it("detects the grid being on", () => {
    expect(summarizeInverter(pointMap([{ key: "G_V_LN", name: "Grid Voltage", value: "231.5", unit: "V" }])).gridAvailable).toBe(true);
  });

  it("falls back to the relay status, and to null when nothing is reported", () => {
    expect(summarizeInverter(pointMap([{ key: "GRID_RELAY_ST1", name: "Grid Relay Status", value: "Break" }])).gridAvailable).toBe(false);
    expect(summarizeInverter(pointMap([])).gridAvailable).toBeNull();
  });
});

describe("devices", () => {
  it("maps Solarman device types and statuses", () => {
    expect(deviceKind("COLLECTOR")).toBe("LOGGER");
    expect(deviceKind("MICRO_INVERTER")).toBe("INVERTER");
    expect(deviceStatus(1)).toBe("ONLINE");
    expect(deviceStatus(2)).toBe("WARNING");
    expect(deviceStatus(0)).toBe("OFFLINE");
    expect(deviceStatus(null)).toBe("OFFLINE");
  });
});
