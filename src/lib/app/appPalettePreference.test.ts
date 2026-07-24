import { beforeEach, describe, expect, it } from "vitest";
import {
  APP_PALETTE_PREFERENCE_KEY,
  migrateLegacyPaletteIfNeeded,
  readAppPalettePreference,
  resolveInitialAppPalette,
  writeAppPalettePreference,
} from "./appPalettePreference";

describe("appPalettePreference", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("reads and writes palette preference", () => {
    expect(readAppPalettePreference()).toBeNull();
    writeAppPalettePreference("graphite");
    expect(readAppPalettePreference()).toBe("graphite");
  });

  it("resolves stored palette", () => {
    writeAppPalettePreference("slate");
    expect(resolveInitialAppPalette()).toBe("slate");
  });

  it("defaults to midnight when unset", () => {
    expect(resolveInitialAppPalette()).toBe("midnight");
  });

  it("migrates legacy missing palette once", () => {
    expect(migrateLegacyPaletteIfNeeded()).toBe("midnight");
    expect(readAppPalettePreference()).toBe("midnight");
    expect(migrateLegacyPaletteIfNeeded()).toBe("midnight");
  });

  it("coerces invalid stored palette to midnight", () => {
    localStorage.setItem(APP_PALETTE_PREFERENCE_KEY, "invalid");
    expect(resolveInitialAppPalette()).toBe("midnight");
  });
});
