export const APP_SETTINGS_TAB_PREFERENCE_KEY = "edge:app:settings-tab:v1";

export const APP_SETTINGS_TABS = [
  "general",
  "connections",
  "market-data",
  "costs",
  "risk-policies",
] as const;

export type AppSettingsTabId = (typeof APP_SETTINGS_TABS)[number];

export const DEFAULT_APP_SETTINGS_TAB: AppSettingsTabId = "general";

function isAppSettingsTabId(value: string): value is AppSettingsTabId {
  return (APP_SETTINGS_TABS as readonly string[]).includes(value);
}

export function readAppSettingsTabPreference(): AppSettingsTabId {
  if (typeof window === "undefined") return DEFAULT_APP_SETTINGS_TAB;
  try {
    const raw = window.sessionStorage.getItem(APP_SETTINGS_TAB_PREFERENCE_KEY);
    return raw && isAppSettingsTabId(raw) ? raw : DEFAULT_APP_SETTINGS_TAB;
  } catch {
    return DEFAULT_APP_SETTINGS_TAB;
  }
}

export function writeAppSettingsTabPreference(tab: AppSettingsTabId): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(APP_SETTINGS_TAB_PREFERENCE_KEY, tab);
  } catch {
    // Ignore quota / privacy mode failures.
  }
}
