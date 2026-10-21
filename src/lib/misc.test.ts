import { describe, expect, it } from "vitest";
import { periodBounds, periodLabel, previousLabel, shiftPeriod } from "./data/period";
import { parseTrendsParams } from "./data/params";
import { DEMO_STATION, simulateDay } from "./demo/model";
import { applianceEquivalent } from "./energy/appliances";
import { change, insightsFor } from "./energy/insights";
import { sunTimes } from "./energy/sun";
import { durationText, formatPower, moneyText, unitsText } from "./format";
import { normalizeCards } from "./preferences";
import { localDateKey, startOfLocalDay } from "./time";

describe("insights", () => {
  const tariff = { pricePerUnit: 60, sellPricePerUnit: 20, co2KgPerUnit: 0.45 };

  it("counts savings as own units × price plus sales", () => {
    const i = insightsFor({ solarKwh: 30, homeKwh: 40, boughtKwh: 15, soldKwh: 5, chargedKwh: 8, dischargedKwh: 6 }, tariff);
    expect(i.ownUnits).toBe(25);
    expect(i.saved).toBe(25 * 60 + 5 * 20);
    expect(i.spent).toBe(15 * 60);
    expect(i.selfPowered).toBeCloseTo(0.625);
    expect(i.co2Kg).toBeCloseTo(13.5);
  });

  it("returns no change when there is nothing to compare with", () => {
    expect(change(5, 0)).toBeNull();
    expect(change(15, 10)).toBeCloseTo(0.5);
  });
});

describe("periods", () => {
  it("uses Monday–Sunday weeks", () => {
    expect(periodBounds("week", "2026-10-21")).toEqual({ start: "2026-10-19", end: "2026-10-25", prevStart: "2026-10-12", prevEnd: "2026-10-18" });
  });

  it("handles month ends and year rollovers", () => {
    expect(periodBounds("month", "2026-02-14")).toMatchObject({ start: "2026-02-01", end: "2026-02-28", prevStart: "2026-01-01", prevEnd: "2026-01-31" });
    expect(shiftPeriod("month", "2026-01-20", -1)).toBe("2025-12-01");
    expect(shiftPeriod("year", "2026-06-01", 1)).toBe("2027-01-01");
  });

  it("labels periods in plain words", () => {
    expect(periodLabel("day", "2026-10-21", "2026-10-21", "2026-10-21")).toBe("Today");
    expect(periodLabel("week", "2026-10-12", "2026-10-18", "2026-10-21")).toBe("Last week");
    expect(periodLabel("month", "2026-03-01", "2026-03-31", "2026-10-21")).toBe("March 2026");
    expect(previousLabel("week", true)).toBe("the same days last week");
  });

  it("falls back to safe defaults for bad URL params, and never goes past today", () => {
    expect(parseTrendsParams({ range: "decade", date: "nope", view: "x" }, "2026-10-21")).toEqual({ range: "week", date: "2026-10-21", view: "sun" });
    expect(parseTrendsParams({ range: "day", date: "2030-01-01" }, "2026-10-21").date).toBe("2026-10-21");
  });
});

describe("plain-language formatting", () => {
  it("formats power, units, money and durations", () => {
    expect(formatPower(184)).toEqual({ value: "184", unit: "W" });
    expect(formatPower(1530)).toEqual({ value: "1.53", unit: "kW" });
    expect(unitsText(1)).toBe("1 unit");
    expect(unitsText(4.25)).toBe("4.3 units");
    expect(moneyText(1548.4, "PKR")).toBe("Rs 1,548");
    expect(moneyText(12, "USD")).toBe("$12");
    expect(durationText(0.5)).toBe("30 min");
    expect(durationText(6.4)).toBe("6 h 24 min");
  });

  it("compares watts to everyday appliances", () => {
    expect(applianceEquivalent(188)).toBe("about 2 ceiling fans");
    expect(applianceEquivalent(3200)).toBe("about 2 air conditioners");
    expect(applianceEquivalent(5)).toBeNull();
  });
});

describe("time zones", () => {
  it("finds local midnight in Pakistan (UTC+5)", () => {
    expect(startOfLocalDay("2026-10-21", "Asia/Karachi").toISOString()).toBe("2026-10-20T19:00:00.000Z");
    expect(localDateKey(new Date("2026-10-20T19:30:00Z"), "Asia/Karachi")).toBe("2026-10-21");
  });

  it("computes sensible sunrise/sunset for Hyderabad", () => {
    const { sunrise, sunset } = sunTimes(new Date("2026-10-21T06:00:00Z"), 25.39, 68.34);
    expect(localDateKey(sunrise, "Asia/Karachi")).toBe("2026-10-21");
    const hours = (sunset.getTime() - sunrise.getTime()) / 3_600_000;
    expect(hours).toBeGreaterThan(11);
    expect(hours).toBeLessThan(12);
  });
});

describe("demo model", () => {
  it("is deterministic for the same date", () => {
    expect(simulateDay("2026-05-10", 0.5).totals).toEqual(simulateDay("2026-05-10", 0.5).totals);
  });

  it("keeps energy balanced and the battery within bounds", () => {
    const day = simulateDay("2026-06-15", 0.5);
    expect(day.samples).toHaveLength(288);
    for (const s of day.samples) {
      expect(s.batteryPct).toBeGreaterThanOrEqual(0);
      expect(s.batteryPct).toBeLessThanOrEqual(100);
      // solar + battery + grid = home (within rounding)
      expect(Math.abs(s.solarW + s.batteryW + s.gridW - s.homeW)).toBeLessThanOrEqual(3);
      if (!s.gridAvailable) expect(s.gridW).toBe(0);
    }
    expect(day.totals.solarKwh).toBeGreaterThan(DEMO_STATION.capacityKw * 2);
  });
});

describe("preferences", () => {
  it("drops unknown card ids from saved layouts", () => {
    expect(normalizeCards(["flow", "old-card", "week"])).toEqual(["flow", "week"]);
  });
});
