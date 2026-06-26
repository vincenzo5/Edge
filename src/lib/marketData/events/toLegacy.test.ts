import { describe, it, expect } from "vitest";
import { marketEventToChartKind, marketEventToLegacyType, parseEventTimestamp } from "./toLegacy";
import type { MarketEvent } from "../contracts/events";

const sample: MarketEvent = {
  id: "1",
  canonicalId: "sec_10k",
  family: "filing",
  title: "AAPL 10-K",
  scheduledAt: "2026-03-01",
  status: "released",
  importance: "high",
  symbol: "AAPL",
  source: "sec",
};

describe("chart event mapping", () => {
  it("maps canonical ids to chart kinds", () => {
    expect(marketEventToChartKind({ ...sample, canonicalId: "earnings", family: "corporate" })).toBe("earnings");
    expect(marketEventToChartKind(sample)).toBe("filing");
    expect(
      marketEventToChartKind({ ...sample, canonicalId: "cpi", family: "macro" }),
    ).toBe("macro");
  });

  it("maps to legacy API types", () => {
    expect(marketEventToLegacyType(sample)).toBe("filing");
    expect(
      marketEventToLegacyType({ ...sample, canonicalId: "cpi", family: "macro" }),
    ).toBe("economic");
  });

  it("parses scheduled timestamps", () => {
    expect(parseEventTimestamp("2026-03-01")).toBeGreaterThan(0);
  });
});
