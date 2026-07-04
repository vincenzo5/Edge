import { describe, expect, it } from "vitest";
import {
  createOptionsSessionState,
  DEFAULT_OPTIONS_SESSION,
  shouldResetOptionsSession,
  scopeKey,
} from "./optionsSession";

describe("optionsSession", () => {
  it("creates default session state", () => {
    expect(createOptionsSessionState()).toEqual(DEFAULT_OPTIONS_SESSION);
  });

  it("merges calculator overrides", () => {
    const state = createOptionsSessionState({
      mode: "calculator",
      calculator: { entryPriceMode: "ask" },
    });
    expect(state.mode).toBe("calculator");
    expect(state.calculator.entryPriceMode).toBe("ask");
    expect(state.calculator.exitPriceMode).toBe("bid");
  });

  it("resets when symbol changes", () => {
    expect(
      shouldResetOptionsSession(
        { symbol: "AAPL", expiration: "2026-07-11" },
        { symbol: "MSFT", expiration: "2026-07-11" },
      ),
    ).toBe(true);
  });

  it("resets when expiration changes for same symbol", () => {
    expect(
      shouldResetOptionsSession(
        { symbol: "AAPL", expiration: "2026-07-11" },
        { symbol: "AAPL", expiration: "2026-07-18" },
      ),
    ).toBe(true);
  });

  it("does not reset when expiration stays null on first load", () => {
    expect(
      shouldResetOptionsSession(
        { symbol: "AAPL", expiration: null },
        { symbol: "AAPL", expiration: "2026-07-11" },
      ),
    ).toBe(false);
  });

  it("builds scope keys", () => {
    expect(scopeKey("AAPL", "2026-07-11")).toBe("AAPL:2026-07-11");
    expect(scopeKey(null, null)).toBe(":");
  });
});
