import { describe, expect, it } from "vitest";
import { clampYahooChartPeriod, yahooMaxHistoryMs } from "./yahooFinance";

describe("yahooMaxHistoryMs", () => {
  it("caps 1m at 7 days and sub-hour bars at 60 days", () => {
    expect(yahooMaxHistoryMs("1m")).toBe(7 * 86_400_000);
    expect(yahooMaxHistoryMs("5m")).toBe(60 * 86_400_000);
    expect(yahooMaxHistoryMs("15m")).toBe(60 * 86_400_000);
    expect(yahooMaxHistoryMs("30m")).toBe(60 * 86_400_000);
    expect(yahooMaxHistoryMs("1h")).toBe(730 * 86_400_000);
  });

  it("does not cap daily-or-longer intervals", () => {
    expect(yahooMaxHistoryMs("1d")).toBeNull();
    expect(yahooMaxHistoryMs("1wk")).toBeNull();
    expect(yahooMaxHistoryMs("1mo")).toBeNull();
  });
});

describe("clampYahooChartPeriod", () => {
  const now = Date.UTC(2026, 6, 22, 20, 0, 0);

  it("clamps a 1y 5m window into the last 60 days", () => {
    const period2 = new Date(now);
    const period1 = new Date(now - 365 * 86_400_000);
    const clamped = clampYahooChartPeriod(period1, period2, "5m", now);
    expect(clamped).not.toBeNull();
    expect(clamped!.period2.getTime()).toBe(now);
    expect(clamped!.period1.getTime()).toBe(now - 60 * 86_400_000);
  });

  it("returns null when the whole window is older than Yahoo retention", () => {
    const period2 = new Date(now - 90 * 86_400_000);
    const period1 = new Date(now - 120 * 86_400_000);
    expect(clampYahooChartPeriod(period1, period2, "5m", now)).toBeNull();
  });

  it("leaves daily windows unchanged", () => {
    const period2 = new Date(now);
    const period1 = new Date(now - 365 * 86_400_000);
    const clamped = clampYahooChartPeriod(period1, period2, "1d", now);
    expect(clamped!.period1.getTime()).toBe(period1.getTime());
    expect(clamped!.period2.getTime()).toBe(period2.getTime());
  });
});
