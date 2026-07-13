import { describe, expect, it, beforeEach } from "vitest";
import {
  writeExplicitDataConnectionPreference,
  applyDefaultDataConnectionPreferenceIfNeeded,
  hasExplicitDataConnectionPreference,
  resolveDefaultDataConnectionPreference,
  readEffectiveDataConnectionPreference,
  readDataConnectionPreference,
} from "./dataConnectionPreference";
import { IB_LIVE_CONNECTION_ID, IB_PAPER_CONNECTION_ID } from "@/lib/trading/connectionRegistry";

describe("dataConnectionPreference", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns null when unset", () => {
    expect(readDataConnectionPreference()).toBeNull();
    expect(hasExplicitDataConnectionPreference()).toBe(false);
  });

  it("persists valid connection ids", () => {
    writeExplicitDataConnectionPreference(IB_LIVE_CONNECTION_ID);
    expect(readDataConnectionPreference()).toBe(IB_LIVE_CONNECTION_ID);
    expect(hasExplicitDataConnectionPreference()).toBe(true);
  });

  it("applies default without marking explicit", () => {
    const resolved = applyDefaultDataConnectionPreferenceIfNeeded({ liveConnected: true });
    expect(resolved).toBe(IB_LIVE_CONNECTION_ID);
    expect(readDataConnectionPreference()).toBe(IB_LIVE_CONNECTION_ID);
    expect(hasExplicitDataConnectionPreference()).toBe(false);
  });

  it("defaults to live when live gateway is connected", () => {
    expect(resolveDefaultDataConnectionPreference({ liveConnected: true })).toBe(
      IB_LIVE_CONNECTION_ID,
    );
    expect(resolveDefaultDataConnectionPreference({ liveConnected: false })).toBe(
      IB_PAPER_CONNECTION_ID,
    );
  });

  it("uses stored preference over default", () => {
    writeExplicitDataConnectionPreference(IB_PAPER_CONNECTION_ID);
    expect(
      readEffectiveDataConnectionPreference({ liveConnected: true }),
    ).toBe(IB_PAPER_CONNECTION_ID);
  });
});
