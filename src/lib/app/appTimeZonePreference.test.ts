import { describe, expect, it, beforeEach } from "vitest";
import {
  APP_TIMEZONE_PREFERENCE_KEY,
  detectBrowserTimeZone,
  migrateAppTimeZoneIfNeeded,
  readAppTimeZonePreference,
  resolveInitialAppTimeZone,
  writeAppTimeZonePreference,
} from "./appTimeZonePreference";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
  };
})();

describe("appTimeZonePreference", () => {
  beforeEach(() => {
    localStorageMock.clear();
    Object.defineProperty(window, "localStorage", { value: localStorageMock, configurable: true });
  });

  it("reads and writes the dedicated app timezone key", () => {
    expect(readAppTimeZonePreference()).toBeNull();
    writeAppTimeZonePreference("America/New_York");
    expect(readAppTimeZonePreference()).toBe("America/New_York");
    expect(localStorageMock.getItem(APP_TIMEZONE_PREFERENCE_KEY)).toBe("America/New_York");
  });

  it("normalizes invalid values on write", () => {
    writeAppTimeZonePreference("Bad/Zone");
    expect(readAppTimeZonePreference()).toBe("UTC");
  });

  it("resolves stored preference before browser detection", () => {
    writeAppTimeZonePreference("Europe/London");
    expect(resolveInitialAppTimeZone()).toBe("Europe/London");
  });

  it("falls back to browser timezone when unset", () => {
    const detected = detectBrowserTimeZone();
    expect(resolveInitialAppTimeZone()).toBe(detected);
  });

  it("migrates browser timezone into storage once", () => {
    const detected = detectBrowserTimeZone();
    expect(migrateAppTimeZoneIfNeeded()).toBe(detected);
    expect(readAppTimeZonePreference()).toBe(detected);
    expect(migrateAppTimeZoneIfNeeded()).toBe(detected);
  });
});
