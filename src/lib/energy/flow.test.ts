import { describe, expect, it } from "vitest";
import { batteryEta, computeFlows, type PowerReading } from "./flow";
import { describe as tell } from "./story";

const reading = (r: Partial<PowerReading>): PowerReading => ({
  solarW: 0,
  homeW: 0,
  batteryW: 0,
  gridW: 0,
  batteryPct: 50,
  gridAvailable: true,
  ...r,
});

describe("computeFlows", () => {
  it("sends surplus solar to the battery first, then sells the rest", () => {
    const f = computeFlows(reading({ solarW: 3000, homeW: 800, batteryW: -1500, gridW: -700 }));
    expect(f.flows).toMatchObject({ solarToHome: 800, solarToBattery: 1500, solarToGrid: 700, gridToHome: 0, batteryToHome: 0 });
    expect(f.surplus).toBe(true);
    expect(f.battery).toBe("charging");
    expect(f.grid).toBe("selling");
    expect(f.selfPowered).toBe(1);
  });

  it("covers a shortfall from the battery before buying", () => {
    const f = computeFlows(reading({ solarW: 200, homeW: 1200, batteryW: 600, gridW: 400 }));
    expect(f.flows).toMatchObject({ solarToHome: 200, batteryToHome: 600, gridToHome: 400 });
    expect(f.selfPowered).toBeCloseTo(800 / 1200);
    expect(f.grid).toBe("buying");
  });

  it("charges the battery from the grid at night when the inverter does that", () => {
    const f = computeFlows(reading({ solarW: 0, homeW: 300, batteryW: -1000, gridW: 1300 }));
    expect(f.flows.gridToHome).toBe(300);
    expect(f.flows.gridToBattery).toBe(1000);
  });

  it("treats a power cut as no grid flow, whatever the meter says", () => {
    const f = computeFlows(reading({ solarW: 190, homeW: 160, gridW: 40, gridAvailable: false }));
    expect(f.grid).toBe("outage");
    expect(f.flows.gridToHome).toBe(0);
  });

  it("ignores sensor noise below 15 W", () => {
    const f = computeFlows(reading({ solarW: 184, homeW: 160, batteryW: 4, batteryPct: 99 }));
    expect(f.flows.batteryToHome).toBe(0);
    expect(f.battery).toBe("full");
  });
});

describe("batteryEta", () => {
  it("estimates time left while discharging, keeping a 10% reserve", () => {
    const eta = batteryEta({ batteryW: 500, batteryPct: 60 }, 10);
    expect(eta).toEqual({ kind: "untilEmpty", hours: 10 }); // 50% of 10 kWh = 5 kWh / 0.5 kW
  });

  it("estimates time to full while charging", () => {
    expect(batteryEta({ batteryW: -2000, batteryPct: 80 }, 10)).toEqual({ kind: "untilFull", hours: 1 });
  });

  it("returns null without a capacity", () => {
    expect(batteryEta({ batteryW: 500, batteryPct: 60 }, null)).toBeNull();
  });
});

describe("story", () => {
  it("explains a power cut covered by solar in plain words", () => {
    const r = reading({ solarW: 188, homeW: 161, gridAvailable: false, batteryPct: 99 });
    const s = tell(r, computeFlows(r), true);
    expect(s.headline).toBe("Power cut — running on sunshine");
    expect(s.detail).toContain("188 W");
    expect(s.detail).not.toMatch(/\b(PV|SOC|grid power)\b/i);
  });

  it("says when everything is bought at night", () => {
    const r = reading({ solarW: 0, homeW: 420, gridW: 420, batteryPct: 15 });
    expect(tell(r, computeFlows(r), false).detail).toMatch(/^It's dark/);
  });

  it("mentions selling when there is spare solar and the battery is full", () => {
    const r = reading({ solarW: 2500, homeW: 500, gridW: -2000, batteryPct: 100 });
    expect(tell(r, computeFlows(r), true).detail).toContain("sold back");
  });
});
