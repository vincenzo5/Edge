import { describe, expect, it, beforeEach } from "vitest";
import {
  writeExplicitDataConnectionPreference,
  applyDefaultDataConnectionPreferenceIfNeeded,
  hasExplicitDataConnectionPreference,
  resolveDefaultDataConnectionPreference,
  readEffectiveDataConnectionPreference,
  readDataConnectionPreference,
  DATA_CONNECTION_PREFERENCE_EXPLICIT_KEY,
  DATA_CONNECTION_PREFERENCE_KEY,
} from "./dataConnectionPreference";
import { IB_LIVE_CONNECTION_ID, IB_PAPER_CONNECTION_ID } from "@/lib/trading/connectionRegistry";

describe("dataConnectionPreference", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("always resolves to live", () => {
    expect(readDataConnectionPreference()).toBe(IB_LIVE_CONNECTION_ID);
    expect(readEffectiveDataConnectionPreference({ liveConnected: false })).toBe(
      IB_LIVE_CONNECTION_ID,
    );
    expect(resolveDefaultDataConnectionPreference({ liveConnected: false })).toBe(
      IB_LIVE_CONNECTION_ID,
    );
    expect(applyDefaultDataConnectionPreferenceIfNeeded({ liveConnected: false })).toBe(
      IB_LIVE_CONNECTION_ID,
    );
  });

  it("migrates stale paper preference to live on read", () => {
    window.localStorage.setItem(DATA_CONNECTION_PREFERENCE_KEY, IB_PAPER_CONNECTION_ID);
    window.localStorage.setItem(DATA_CONNECTION_PREFERENCE_EXPLICIT_KEY, "1");

    expect(readDataConnectionPreference()).toBe(IB_LIVE_CONNECTION_ID);
    expect(window.localStorage.getItem(DATA_CONNECTION_PREFERENCE_KEY)).toBe(IB_LIVE_CONNECTION_ID);
    expect(window.localStorage.getItem(DATA_CONNECTION_PREFERENCE_EXPLICIT_KEY)).toBeNull();
    expect(hasExplicitDataConnectionPreference()).toBe(false);
  });

  it("write paths force live and clear explicit flag", () => {
    writeExplicitDataConnectionPreference(IB_PAPER_CONNECTION_ID);
    expect(readDataConnectionPreference()).toBe(IB_LIVE_CONNECTION_ID);
    expect(window.localStorage.getItem(DATA_CONNECTION_PREFERENCE_KEY)).toBe(IB_LIVE_CONNECTION_ID);
    expect(window.localStorage.getItem(DATA_CONNECTION_PREFERENCE_EXPLICIT_KEY)).toBeNull();
    expect(hasExplicitDataConnectionPreference()).toBe(false);
  });
});
