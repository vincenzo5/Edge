import {
  applyAppearanceToRoot,
  coerceTheme,
  DEFAULT_LAYOUT,
  type Theme,
} from "@/lib/chartConfig";
import { DEFAULT_PALETTE, type PaletteId } from "@/lib/design-system/palettes";
import { readActiveTabThemeFromStorage } from "@/lib/app/workspaceTabsStorage";
import {
  migrateLegacyPaletteIfNeeded,
  readAppPalettePreference,
  resolveInitialAppPalette,
  writeAppPalettePreference,
} from "@/lib/app/appPalettePreference";

export const APP_THEME_PREFERENCE_KEY = "edge:app:theme:v1";

const APP_THEME_EVENT = "edge:appTheme";

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

export function readAppThemePreference(): Theme | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(APP_THEME_PREFERENCE_KEY);
    return isTheme(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function writeAppThemePreference(theme: Theme): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(APP_THEME_PREFERENCE_KEY, theme);
    window.dispatchEvent(new CustomEvent<Theme>(APP_THEME_EVENT, { detail: theme }));
    void import("@/lib/userPreferences/userPreferencesSync").then(({ notifyUserPreferencesChanged }) =>
      notifyUserPreferencesChanged(),
    );
  } catch {
    // Ignore quota / privacy mode failures.
  }
}

export function subscribeAppThemePreference(
  listener: (theme: Theme) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<Theme>).detail;
    if (detail) listener(detail);
  };
  window.addEventListener(APP_THEME_EVENT, handler);
  return () => window.removeEventListener(APP_THEME_EVENT, handler);
}

/** Resolve theme for SSR inline script and first paint (no DOM writes). */
export function resolveInitialAppTheme(): Theme {
  const stored = readAppThemePreference();
  if (stored) return stored;

  const legacyTabTheme = readActiveTabThemeFromStorage();
  if (legacyTabTheme) return legacyTabTheme;

  return DEFAULT_LAYOUT.theme;
}

export function migrateLegacyThemeIfNeeded(): Theme {
  const stored = readAppThemePreference();
  if (stored) return stored;

  const legacy = readActiveTabThemeFromStorage() ?? DEFAULT_LAYOUT.theme;
  writeAppThemePreference(coerceTheme(legacy));
  return coerceTheme(legacy);
}

export function applyAppTheme(theme: Theme, palette: PaletteId = resolveInitialAppPalette()): void {
  applyAppearanceToRoot(theme, palette);
}

export function applyAppAppearance(theme: Theme, palette: PaletteId): void {
  applyAppearanceToRoot(theme, palette);
}

export function toggleAppTheme(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark";
}
