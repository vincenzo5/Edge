import { describe, it, expect } from "vitest";
import { normalizeFmpCorporateEvent, normalizeFmpEconomicCalendarEvent, normalizeFmpSecFiling } from "./normalizers/fmp";
import { normalizeSecFiling } from "./normalizers/sec";
import { normalizeFredRelease } from "./normalizers/fred";

describe("event normalizers", () => {
  it("normalizes FMP corporate earnings", () => {
    const event = normalizeFmpCorporateEvent({
      id: "fmp-earnings-AAPL-2026-01-30",
      type: "earnings",
      symbol: "AAPL",
      title: "AAPL earnings",
      scheduledAt: "2026-01-30",
      source: "fmp",
      details: { eps: 1.2 },
    });
    expect(event.canonicalId).toBe("earnings");
    expect(event.family).toBe("corporate");
    expect(event.coverageLevel).toBe("full");
  });

  it("normalizes SEC filings to canonical ids", () => {
    const event = normalizeSecFiling({
      symbol: "AAPL",
      cik: "0000320193",
      form: "8-K",
      filedAt: "2026-02-01",
      accessionNumber: "0000320193-26-000001",
      url: "https://sec.gov/example",
    });
    expect(event.canonicalId).toBe("sec_8k");
    expect(event.family).toBe("filing");
    expect(event.source).toBe("sec");
  });

  it("normalizes FMP SEC filings", () => {
    const event = normalizeFmpSecFiling({
      symbol: "AAPL",
      formType: "10-Q",
      filingDate: "2026-05-01",
    });
    expect(event.canonicalId).toBe("sec_10q");
    expect(event.source).toBe("fmp");
  });

  it("normalizes recognized FRED releases as partial macro events", () => {
    const event = normalizeFredRelease({
      releaseId: "10",
      name: "Consumer Price Index for All Urban Consumers",
      date: "2026-06-12",
      source: "fred",
    });
    expect(event?.canonicalId).toBe("cpi");
    expect(event?.family).toBe("macro");
    expect(event?.coverageLevel).toBe("partial");
  });

  it("ignores unrecognized FRED releases", () => {
    const event = normalizeFredRelease({
      releaseId: "999",
      name: "Obscure Regional Survey",
      date: "2026-06-12",
      source: "fred",
    });
    expect(event).toBeNull();
  });

  it("normalizes FMP economic calendar rows as full macro events", () => {
    const event = normalizeFmpEconomicCalendarEvent({
      date: "2026-07-11 12:30:00",
      country: "US",
      event: "Nonfarm Payrolls",
      currency: "USD",
      previous: 150000,
      estimate: 180000,
      actual: null,
      change: null,
      changePercentage: null,
      impact: "High",
    });
    expect(event?.canonicalId).toBe("nonfarm_payrolls");
    expect(event?.family).toBe("macro");
    expect(event?.source).toBe("fmp");
    expect(event?.coverageLevel).toBe("full");
    expect(event?.forecast).toBe(180000);
  });

  it("ignores unrecognized FMP economic calendar rows", () => {
    const event = normalizeFmpEconomicCalendarEvent({
      date: "2026-07-11 12:30:00",
      country: "US",
      event: "3-Month Bill Auction",
      currency: "USD",
      previous: null,
      estimate: null,
      actual: null,
      change: null,
      changePercentage: null,
      impact: "Low",
    });
    expect(event).toBeNull();
  });
});
