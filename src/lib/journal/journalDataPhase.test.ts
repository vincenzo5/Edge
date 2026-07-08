import { describe, expect, it } from "vitest";
import { journalDataPhase } from "./journalDataPhase";

describe("journalDataPhase", () => {
  it("returns loading when fetching with no cached trades", () => {
    expect(journalDataPhase({ loading: true, tradeCount: 0 })).toBe("loading");
  });

  it("returns ready when loading with cached trades", () => {
    expect(journalDataPhase({ loading: true, tradeCount: 3 })).toBe("ready");
  });

  it("returns empty when not loading and no trades", () => {
    expect(journalDataPhase({ loading: false, tradeCount: 0 })).toBe("empty");
  });

  it("returns error when error is set and not loading with no cache", () => {
    expect(
      journalDataPhase({ loading: false, tradeCount: 0, error: "Failed to load trades." }),
    ).toBe("error");
  });

  it("returns ready when trades exist even if error is stale", () => {
    expect(
      journalDataPhase({ loading: false, tradeCount: 2, error: "Failed to load trades." }),
    ).toBe("ready");
  });

  it("returns ready when trades exist", () => {
    expect(journalDataPhase({ loading: false, tradeCount: 1 })).toBe("ready");
  });
});
