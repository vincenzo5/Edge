import { describe, expect, it } from "vitest";
import {
  isUsMarketClosed,
  latestCompletedTradingDate,
  recentTradingDays,
} from "./marketCalendar";

describe("marketCalendar", () => {
  it("returns Friday when Sunday 9:43 PM EDT (Monday 01:43 UTC)", () => {
    // Bug scenario: UTC rolled to Monday but US market has not closed.
    expect(latestCompletedTradingDate(new Date("2026-06-29T01:43:00.000Z"))).toBe(
      "2026-06-26",
    );
  });

  it("returns previous weekday before US market close on a weekday", () => {
    expect(latestCompletedTradingDate(new Date("2026-06-26T19:00:00.000Z"))).toBe(
      "2026-06-25",
    );
  });

  it("returns today after US market close on a weekday", () => {
    expect(latestCompletedTradingDate(new Date("2026-06-26T21:00:00.000Z"))).toBe(
      "2026-06-26",
    );
  });

  it("returns Friday on Saturday", () => {
    expect(latestCompletedTradingDate(new Date("2026-06-27T15:00:00.000Z"))).toBe(
      "2026-06-26",
    );
  });

  it("isUsMarketClosed is false on weekends", () => {
    expect(isUsMarketClosed(new Date("2026-06-27T21:00:00.000Z"))).toBe(false);
  });

  it("isUsMarketClosed is true after 20:00 UTC on weekdays", () => {
    expect(isUsMarketClosed(new Date("2026-06-26T21:00:00.000Z"))).toBe(true);
  });

  it("recentTradingDays returns count weekdays ending at latest completed", () => {
    expect(recentTradingDays(3, new Date("2026-06-29T01:43:00.000Z"))).toEqual([
      "2026-06-26",
      "2026-06-25",
      "2026-06-24",
    ]);
  });
});
