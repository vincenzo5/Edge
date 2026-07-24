import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DATA_PROVIDER_PREFERENCE_EVENT,
  DATA_PROVIDER_PREFERENCE_KEY,
  normalizeDataProviderPreference,
  readDataProviderPreference,
  writeDataProviderPreference,
} from "./dataProviderPreference";
import { createDefaultDataProviderPreference } from "./providerWaterfall";

vi.mock("@/lib/chartDataFeed/chartClientCache", () => ({
  clearChartClientCache: vi.fn(),
}));

vi.mock("@/lib/userPreferences/userPreferencesSync", () => ({
  notifyUserPreferencesChanged: vi.fn(),
}));

describe("dataProviderPreference", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("returns defaults when storage is empty", () => {
    expect(readDataProviderPreference()).toEqual(createDefaultDataProviderPreference());
  });

  it("round-trips preference through localStorage", () => {
    const next = {
      orderedProviders: ["yahoo", "tws", "ibkr", "massive"] as const,
      disabledProviders: ["tws"] as const,
    };
    writeDataProviderPreference({
      orderedProviders: [...next.orderedProviders],
      disabledProviders: [...next.disabledProviders],
    });
    expect(JSON.parse(localStorage.getItem(DATA_PROVIDER_PREFERENCE_KEY)!)).toMatchObject({
      orderedProviders: ["yahoo", "tws", "ibkr", "massive"],
      disabledProviders: ["tws"],
    });
    expect(readDataProviderPreference().disabledProviders).toContain("tws");
  });

  it("dispatches change event on write", () => {
    const handler = vi.fn();
    window.addEventListener(DATA_PROVIDER_PREFERENCE_EVENT, handler);
    writeDataProviderPreference(createDefaultDataProviderPreference());
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("normalizes unknown provider ids out of preference payloads", () => {
    expect(
      normalizeDataProviderPreference({
        orderedProviders: ["yahoo", "tws", "invalid" as never],
        disabledProviders: ["tws"],
      }).orderedProviders,
    ).toEqual(["tws", "ibkr", "massive", "yahoo"]);
  });
});
