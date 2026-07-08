import { afterEach, describe, expect, it, vi } from "vitest";
import type { OptionContractSnapshot } from "@/lib/marketData/contracts/options";
import {
  chainLegHeaderClass,
  daysToExpiration,
  formatChainLegGreeksPanel,
  formatChainRowGreeksPanel,
  formatExpirationAriaLabel,
  formatExpirationDteLabel,
  formatExpirationTabLabel,
  formatOptionLast,
  isAtmStrike,
  isLastOutsideSpread,
} from "./chainDisplay";

function makeContract(
  overrides: Partial<OptionContractSnapshot> & Pick<OptionContractSnapshot, "type" | "strike">,
): OptionContractSnapshot {
  return {
    contractSymbol: "TEST",
    underlying: "TEST",
    expiration: "2026-07-10",
    type: overrides.type,
    strike: overrides.strike,
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe("chainDisplay", () => {
  it("formats expiration tab labels as short month/day", () => {
    expect(formatExpirationTabLabel("2026-07-10")).toBe("Jul 10");
    expect(formatExpirationTabLabel("2026-01-05")).toBe("Jan 5");
    expect(formatExpirationTabLabel("invalid")).toBe("invalid");
  });

  it("computes days to expiration from calendar-day diff", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 5, 12, 0, 0));

    expect(daysToExpiration("2026-07-10")).toBe(5);
    expect(formatExpirationDteLabel("2026-07-10")).toBe("5d");
    expect(formatExpirationAriaLabel("2026-07-10")).toBe("Expiration Jul 10, 5 days");
    expect(daysToExpiration("2026-07-05")).toBe(0);
    expect(formatExpirationDteLabel("2026-07-05")).toBe("0d");
    expect(formatExpirationAriaLabel("2026-07-05")).toBe("Expiration Jul 5, 0 days");
    expect(daysToExpiration("2026-07-06")).toBe(1);
    expect(formatExpirationAriaLabel("2026-07-06")).toBe("Expiration Jul 6, 1 day");

    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("detects ATM strikes within 0.5% of spot", () => {
    expect(isAtmStrike(100, 100)).toBe(true);
    expect(isAtmStrike(100.4, 100)).toBe(true);
    expect(isAtmStrike(101, 100)).toBe(false);
    expect(isAtmStrike(100, null)).toBe(false);
  });

  it("formats last price like option price", () => {
    expect(formatOptionLast(1.234)).toBe("1.23");
    expect(formatOptionLast(null)).toBe("—");
  });

  it("detects last outside bid-ask spread", () => {
    expect(
      isLastOutsideSpread(
        makeContract({ type: "call", strike: 50, bid: 1, ask: 1.2, last: 1.5 }),
      ),
    ).toBe(true);
    expect(
      isLastOutsideSpread(
        makeContract({ type: "call", strike: 50, bid: 1, ask: 1.2, last: 1.1 }),
      ),
    ).toBe(false);
  });

  it("formats single-leg greeks panel for call and put sides", () => {
    const call = makeContract({
      type: "call",
      strike: 53,
      bid: 0.64,
      ask: 0.65,
      last: 0.64,
      impliedVolatility: 0.252,
      delta: 0.951,
      gamma: 0.061,
      theta: -0.019,
      vega: 0.006,
      volume: 36,
      openInterest: 1500,
    });
    const put = makeContract({
      type: "put",
      strike: 53,
      bid: 0.42,
      ask: 0.44,
      last: 0.43,
      impliedVolatility: 0.248,
      delta: -0.049,
      gamma: 0.058,
      theta: -0.015,
      vega: 0.005,
      volume: 12,
      openInterest: 800,
    });

    const callPanel = formatChainLegGreeksPanel("call", 53, "2026-07-10", call);
    expect(callPanel.header).toBe("CALL 53C · Jul 10");
    expect(callPanel.bid).toBe("0.64");
    expect(callPanel.ask).toBe("0.65");
    expect(callPanel.last).toBe("0.64");
    expect(callPanel.side).toBe("call");
    expect(callPanel.leg.delta).toBe("0.951");
    expect(callPanel.leg.volume).toBe("36");
    expect(callPanel.leg.openInterest).toBe("1.5K");
    expect(callPanel.leg.iv).toBe("25.2%");

    const putPanel = formatChainLegGreeksPanel("put", 53, "2026-07-10", put);
    expect(putPanel.header).toBe("PUT 53P · Jul 10");
    expect(putPanel.last).toBe("0.43");
    expect(putPanel.side).toBe("put");
    expect(putPanel.leg.delta).toBe("-0.049");
  });

  it("formats greeks panel for call and put legs", () => {
    const call = makeContract({
      type: "call",
      strike: 55.5,
      impliedVolatility: 0.451,
      delta: 0.521,
      gamma: 0.018,
      theta: -0.042,
      vega: 0.115,
      volume: 12,
      openInterest: 1200,
    });
    const put = makeContract({
      type: "put",
      strike: 55.5,
      impliedVolatility: 0.443,
      delta: -0.478,
      gamma: 0.019,
      theta: -0.038,
      vega: 0.112,
      volume: 8,
      openInterest: 890,
    });

    const panel = formatChainRowGreeksPanel(55.5, "2026-07-10", call, put);
    expect(panel.header).toBe("55.5 strike · Jul 10");
    expect(panel.call.label).toBe("CALL 55.5C");
    expect(panel.call.delta).toBe("0.521");
    expect(panel.call.volume).toBe("12");
    expect(panel.call.openInterest).toBe("1.2K");
    expect(panel.put.label).toBe("PUT 55.5P");
    expect(panel.put.delta).toBe("-0.478");
  });

  it("falls back when greeks are missing", () => {
    const call = makeContract({ type: "call", strike: 50 });
    const panel = formatChainRowGreeksPanel(50, "2026-07-10", call, undefined);
    expect(panel.call.greeksUnavailable).toBe(true);
    expect(panel.call.iv).toBe("Greeks unavailable");
    expect(panel.put.missing).toBe(true);
    expect(panel.put.label).toBe("PUT 50P");
    expect(panel.put.iv).toBe("—");
  });

  it("matches popover header class to row side coloring", () => {
    expect(chainLegHeaderClass(100, 100, "call")).toContain("edge-accent-blue");
    expect(chainLegHeaderClass(90, 100, "call")).toContain("edge-positive");
    expect(chainLegHeaderClass(110, 100, "call")).toContain("edge-negative");
    expect(chainLegHeaderClass(110, 100, "put")).toContain("edge-positive");
    expect(chainLegHeaderClass(90, 100, "put")).toContain("edge-negative");
  });
});
