import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  APP_THEME_PREFERENCE_KEY,
  migrateLegacyThemeIfNeeded,
  readAppThemePreference,
  resolveInitialAppTheme,
  toggleAppTheme,
  writeAppThemePreference,
} from "./appThemePreference";
import { WORKSPACE_TABS_STORAGE_KEY } from "./workspaceTabsStorage";
import { createDefaultWorkspaceTabs } from "./workspaceTabs";

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

describe("appThemePreference", () => {
  beforeEach(() => {
    localStorageMock.clear();
    Object.defineProperty(window, "localStorage", { value: localStorageMock, configurable: true });
    document.documentElement.className = "";
  });

  it("reads and writes the dedicated app theme key", () => {
    expect(readAppThemePreference()).toBeNull();
    writeAppThemePreference("light");
    expect(readAppThemePreference()).toBe("light");
    expect(localStorageMock.getItem(APP_THEME_PREFERENCE_KEY)).toBe("light");
  });

  it("resolves app theme before legacy workspace tab theme", () => {
    writeAppThemePreference("dark");
    const tabs = createDefaultWorkspaceTabs();
    tabs.tabs[0]!.layout.theme = "light";
    localStorageMock.setItem(WORKSPACE_TABS_STORAGE_KEY, JSON.stringify(tabs));
    expect(resolveInitialAppTheme()).toBe("dark");
  });

  it("falls back to legacy active tab theme when app key is missing", () => {
    const tabs = createDefaultWorkspaceTabs();
    tabs.tabs[0]!.layout.theme = "light";
    localStorageMock.setItem(WORKSPACE_TABS_STORAGE_KEY, JSON.stringify(tabs));
    expect(resolveInitialAppTheme()).toBe("light");
  });

  it("migrates legacy theme into the app key once", () => {
    const tabs = createDefaultWorkspaceTabs();
    tabs.tabs[0]!.layout.theme = "light";
    localStorageMock.setItem(WORKSPACE_TABS_STORAGE_KEY, JSON.stringify(tabs));

    expect(migrateLegacyThemeIfNeeded()).toBe("light");
    expect(readAppThemePreference()).toBe("light");
    expect(migrateLegacyThemeIfNeeded()).toBe("light");
  });

  it("toggles between light and dark", () => {
    expect(toggleAppTheme("dark")).toBe("light");
    expect(toggleAppTheme("light")).toBe("dark");
  });
});
