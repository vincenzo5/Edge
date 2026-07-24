import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROVIDER_CAPABILITIES,
  PROVIDER_CAPABILITY_REGISTRY,
  listActiveProviders,
  providerSupportsCapability,
} from "./capabilities";

describe("provider capabilities", () => {
  it("registers Massive options and universe capabilities", () => {
    expect(providerSupportsCapability("massive", "options_chain")).toBe(true);
    expect(providerSupportsCapability("massive", "options_expirations")).toBe(true);
    expect(providerSupportsCapability("massive", "equity_universe_daily")).toBe(true);
  });

  it("registers FMP screener and movers", () => {
    expect(providerSupportsCapability("fmp", "screener")).toBe(true);
    expect(providerSupportsCapability("fmp", "market_movers")).toBe(true);
  });

  it("contains only active production providers", () => {
    expect(PROVIDER_CAPABILITY_REGISTRY.every((row) => row.lifecycle === "active")).toBe(true);
    expect(PROVIDER_CAPABILITY_REGISTRY.map((row) => row.provider)).toEqual([
      "tws",
      "ibkr",
      "yahoo",
      "massive",
      "fmp",
      "fred",
      "sec",
    ]);
  });

  it("exports compatibility DEFAULT_PROVIDER_CAPABILITIES map", () => {
    expect(DEFAULT_PROVIDER_CAPABILITIES.tws).toContain("brokerage_truth");
    expect(DEFAULT_PROVIDER_CAPABILITIES.yahoo).toContain("instrument_search");
  });

  it("lists seven active production adapters excluding legacy/deferred", () => {
    expect(listActiveProviders().length).toBe(7);
  });
});
