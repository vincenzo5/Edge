import { describe, expect, it, beforeEach } from "vitest";
import {
  getTwsRecoveryContext,
  mergeTwsRecoveryRequest,
  resetTwsRecoveryContextForTests,
  setTwsRecoveryContext,
} from "./twsRecoveryContext";

describe("twsRecoveryContext", () => {
  beforeEach(() => {
    resetTwsRecoveryContextForTests();
  });

  it("merges caller symbols with stored warmup context", () => {
    setTwsRecoveryContext({
      symbols: ["AAPL", "MSFT"],
      candleRequests: [{ symbol: "AAPL", interval: "1d" }],
      optionsSymbol: "AAPL",
    });

    expect(
      mergeTwsRecoveryRequest({ source: "header", symbols: [], candleRequests: [] }),
    ).toEqual({
      source: "header",
      symbols: ["AAPL", "MSFT"],
      candleRequests: [{ symbol: "AAPL", interval: "1d" }],
      optionsSymbol: "AAPL",
    });
  });

  it("prefers explicit caller payload over stored context", () => {
    setTwsRecoveryContext({ symbols: ["AAPL"] });
    expect(
      mergeTwsRecoveryRequest({
        symbols: ["NVDA"],
        candleRequests: [{ symbol: "NVDA", interval: "5m" }],
      }).symbols,
    ).toEqual(["NVDA"]);
  });

  it("returns a copy from getTwsRecoveryContext", () => {
    setTwsRecoveryContext({ symbols: ["TSLA"] });
    const first = getTwsRecoveryContext();
    first.symbols.push("SPY");
    expect(getTwsRecoveryContext().symbols).toEqual(["TSLA"]);
  });
});
