import { describe, expect, it } from "vitest";

import {
  diffAddedSymbols,
  formatAddedSymbolsBody,
  isScreenerAlertInCooldown,
  normalizeSymbolSet,
} from "@/lib/screener/screenerAlertDiff";
import { computeNextRunAt } from "@/lib/persistence/repositories/screenerAlertRepository";

describe("screenerAlertDiff", () => {
  it("normalizes and sorts symbol sets", () => {
    expect(normalizeSymbolSet([" msft ", "AAPL", "aapl", ""])).toEqual(["AAPL", "MSFT"]);
  });

  it("diffs added symbols only", () => {
    expect(diffAddedSymbols(["AAPL", "MSFT"], ["AAPL", "MSFT", "NVDA"])).toEqual(["NVDA"]);
    expect(diffAddedSymbols([], ["AAPL"])).toEqual(["AAPL"]);
  });

  it("formats added symbol body", () => {
    expect(formatAddedSymbolsBody(["AAPL", "MSFT"])).toBe("+AAPL, +MSFT");
    expect(formatAddedSymbolsBody(Array.from({ length: 10 }, (_, i) => `S${i}`))).toContain("+2 more");
  });

  it("respects cooldown window", () => {
    const now = Date.parse("2026-07-21T12:00:00.000Z");
    expect(
      isScreenerAlertInCooldown("2026-07-21T11:59:00.000Z", 120_000, now),
    ).toBe(true);
    expect(
      isScreenerAlertInCooldown("2026-07-21T11:57:00.000Z", 120_000, now),
    ).toBe(false);
  });
});

describe("computeNextRunAt", () => {
  it("advances by interval minutes", () => {
    const from = new Date("2026-07-21T12:00:00.000Z");
    expect(computeNextRunAt(15, from).toISOString()).toBe("2026-07-21T12:15:00.000Z");
    expect(computeNextRunAt(60, from).toISOString()).toBe("2026-07-21T13:00:00.000Z");
  });
});
