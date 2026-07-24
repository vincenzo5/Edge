import { describe, expect, it } from "vitest";
import type { DataProviderPreference } from "@/lib/connections/types";
import {
  canDisableProvider,
  createDefaultDataProviderPreference,
  isPreferenceIgnoredForUsage,
  mergeProviderOrder,
  moveProviderInOrder,
  resolveWaterfallOrder,
  shouldSkipHotCacheSource,
  toggleProviderDisabled,
} from "./providerWaterfall";

describe("providerWaterfall", () => {
  const configured = new Set(["tws", "ibkr", "yahoo"] as const);

  it("defaults to tws → ibkr → yahoo for equity candles", () => {
    expect(
      resolveWaterfallOrder({
        preference: createDefaultDataProviderPreference(),
        configured,
        capability: "equity_candles",
        respectPreference: true,
        usage: "display",
      }),
    ).toEqual(["tws", "ibkr", "yahoo"]);
  });

  it("honors user order for display candles", () => {
    const preference: DataProviderPreference = {
      orderedProviders: ["yahoo", "tws", "ibkr", "massive"],
      disabledProviders: [],
    };
    expect(
      resolveWaterfallOrder({
        preference,
        configured,
        capability: "equity_candles",
        respectPreference: true,
        usage: "display",
      }),
    ).toEqual(["yahoo", "tws", "ibkr"]);
  });

  it("skips disabled providers for display", () => {
    const preference: DataProviderPreference = {
      orderedProviders: ["tws", "ibkr", "yahoo"],
      disabledProviders: ["tws"],
    };
    expect(
      resolveWaterfallOrder({
        preference,
        configured,
        capability: "equity_candles",
        respectPreference: true,
        usage: "display",
      }),
    ).toEqual(["ibkr", "yahoo"]);
  });

  it("ignores broker disable for trading_decision usage", () => {
    const preference: DataProviderPreference = {
      orderedProviders: ["yahoo", "tws", "ibkr"],
      disabledProviders: ["tws", "ibkr"],
    };
    expect(
      resolveWaterfallOrder({
        preference,
        configured,
        capability: "equity_quotes",
        respectPreference: true,
        usage: "trading_decision",
      }),
    ).toEqual(["tws", "ibkr", "yahoo"]);
  });

  it("blocks disabling the last configured alternate", () => {
    const preference: DataProviderPreference = {
      orderedProviders: ["tws", "yahoo"],
      disabledProviders: ["yahoo"],
    };
    expect(
      canDisableProvider({
        providerId: "tws",
        preference,
        configured: new Set(["tws", "yahoo"]),
        capability: "equity_candles",
      }),
    ).toBe(false);
  });

  it("allows disabling when another provider remains", () => {
    const preference = createDefaultDataProviderPreference();
    expect(
      canDisableProvider({
        providerId: "tws",
        preference,
        configured,
        capability: "equity_candles",
      }),
    ).toBe(true);
  });

  it("skips stale yahoo hot cache when tws is preferred", () => {
    expect(
      shouldSkipHotCacheSource({
        hotSource: "yahoo",
        preference: {
          orderedProviders: ["tws", "ibkr", "yahoo"],
          disabledProviders: [],
        },
        configured,
        capability: "equity_candles",
        respectPreference: true,
      }),
    ).toBe(true);
  });

  it("serves yahoo hot cache when yahoo is preferred", () => {
    expect(
      shouldSkipHotCacheSource({
        hotSource: "yahoo",
        preference: {
          orderedProviders: ["yahoo", "tws", "ibkr"],
          disabledProviders: [],
        },
        configured,
        capability: "equity_candles",
        respectPreference: true,
      }),
    ).toBe(false);
  });

  it("moveProviderInOrder swaps adjacent entries", () => {
    expect(moveProviderInOrder(["tws", "ibkr", "yahoo"], "ibkr", "up")).toEqual([
      "ibkr",
      "tws",
      "yahoo",
    ]);
  });

  it("toggleProviderDisabled adds and removes ids", () => {
    const base = createDefaultDataProviderPreference();
    const disabled = toggleProviderDisabled(base, "tws", true);
    expect(disabled.disabledProviders).toContain("tws");
    expect(toggleProviderDisabled(disabled, "tws", false).disabledProviders).not.toContain("tws");
  });

  it("mergeProviderOrder keeps capability defaults after custom order", () => {
    expect(mergeProviderOrder(["yahoo"], "equity_candles")).toEqual(["yahoo", "tws", "ibkr"]);
  });

  it("isPreferenceIgnoredForUsage is true for trading and brokerage paths", () => {
    expect(isPreferenceIgnoredForUsage("trading_decision")).toBe(true);
    expect(isPreferenceIgnoredForUsage("brokerage_truth")).toBe(true);
    expect(isPreferenceIgnoredForUsage("display")).toBe(false);
  });
});
