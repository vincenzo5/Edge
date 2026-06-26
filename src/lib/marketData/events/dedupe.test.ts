import { describe, it, expect } from "vitest";
import type { MarketEvent } from "../contracts/events";
import { dedupeMarketEvents, eventIdentityKey, sourceRank } from "./dedupe";

function event(partial: Partial<MarketEvent> & Pick<MarketEvent, "id" | "canonicalId" | "scheduledAt">): MarketEvent {
  return {
    family: "corporate",
    title: partial.canonicalId,
    status: "scheduled",
    importance: "high",
    source: "fmp",
    ...partial,
  };
}

describe("dedupeMarketEvents", () => {
  it("prefers SEC over FMP for the same filing identity", () => {
    const sec = event({
      id: "sec-1",
      canonicalId: "sec_8k",
      scheduledAt: "2026-01-15",
      symbol: "AAPL",
      source: "sec",
      family: "filing",
    });
    const fmp = event({
      id: "fmp-1",
      canonicalId: "sec_8k",
      scheduledAt: "2026-01-15",
      symbol: "AAPL",
      source: "fmp",
      family: "filing",
    });
    const result = dedupeMarketEvents([fmp, sec]);
    expect(result).toHaveLength(1);
    expect(result[0]?.source).toBe("sec");
    expect(sourceRank("sec")).toBeGreaterThan(sourceRank("fmp"));
  });

  it("merges non-conflicting fields from lower-ranked source", () => {
    const primary = event({
      id: "sec-1",
      canonicalId: "sec_10k",
      scheduledAt: "2026-03-01",
      symbol: "MSFT",
      source: "sec",
      family: "filing",
      details: { url: "https://sec.gov/1" },
    });
    const secondary = event({
      id: "fmp-1",
      canonicalId: "sec_10k",
      scheduledAt: "2026-03-01",
      symbol: "MSFT",
      source: "fmp",
      family: "filing",
      forecast: "1.2",
      details: { acceptedDate: "2026-03-01T12:00:00Z" },
    });
    const result = dedupeMarketEvents([primary, secondary]);
    expect(result[0]?.forecast).toBe("1.2");
    expect(result[0]?.details?.url).toBe("https://sec.gov/1");
  });

  it("builds stable identity keys", () => {
    const key = eventIdentityKey(
      event({
        id: "1",
        canonicalId: "cpi",
        scheduledAt: "2026-06-12T08:30:00Z",
        country: "US",
      }),
    );
    expect(key).toBe("cpi|2026-06-12|US|");
  });
});
