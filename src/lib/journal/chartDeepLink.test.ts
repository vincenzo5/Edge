import { describe, expect, it } from "vitest";

import {
  buildChartDeepLink,
  parseChartDeepLinkParams,
  resolveChartInterval,
} from "@/lib/journal/chartDeepLink";
import type { JournalTrade } from "@/lib/journal/types";

describe("chartDeepLink", () => {
  const shortTrade: JournalTrade = {
    id: "1",
    status: "closed",
    direction: "long",
    symbol: "AAPL",
    secType: "STK",
    openedAt: "2026-06-01T13:30:00.000Z",
    closedAt: "2026-06-01T14:30:00.000Z",
    fillExecIds: ["e1"],
  };

  const longTrade: JournalTrade = {
    ...shortTrade,
    closedAt: "2026-06-10T14:30:00.000Z",
  };

  it("builds chart url with trade id and goto for short trades", () => {
    const url = buildChartDeepLink(shortTrade);
    expect(url).toContain("symbol=AAPL");
    expect(url).toContain("interval=5m");
    expect(url).toContain("journalTrade=1");
    expect(url).toContain(`goto=${Date.parse(shortTrade.openedAt)}`);
  });

  it("uses daily interval for multi-day trades", () => {
    expect(resolveChartInterval(longTrade)).toBe("1d");
  });

  it("parses deep link params", () => {
    const params = parseChartDeepLinkParams(
      new URLSearchParams("symbol=aapl&interval=5m&journalTrade=abc&goto=1000"),
    );
    expect(params).toEqual({
      symbol: "AAPL",
      interval: "5m",
      journalTrade: "abc",
      goto: 1000,
    });
  });
});
