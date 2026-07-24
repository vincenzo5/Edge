import { DEFAULT_PALETTE, coercePaletteId, type PaletteId } from "@/lib/design-system/palettes";

export const APP_PALETTE_PREFERENCE_KEY = "edge:app:palette:v1";

const APP_PALETTE_EVENT = "edge:appPalette";

export function readAppPalettePreference(): PaletteId | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(APP_PALETTE_PREFERENCE_KEY);
    return raw ? coercePaletteId(raw, DEFAULT_PALETTE) : null;
  } catch {
    return null;
  }
}

export function writeAppPalettePreference(palette: PaletteId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(APP_PALETTE_PREFERENCE_KEY, palette);
    window.dispatchEvent(new CustomEvent<PaletteId>(APP_PALETTE_EVENT, { detail: palette }));
    void import("@/lib/userPreferences/userPreferencesSync").then(({ notifyUserPreferencesChanged }) =>
      notifyUserPreferencesChanged(),
    );
  } catch {
    // Ignore quota / privacy mode failures.
  }
}

export function subscribeAppPalettePreference(
  listener: (palette: PaletteId) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<PaletteId>).detail;
    if (detail) listener(detail);
  };
  window.addEventListener(APP_PALETTE_EVENT, handler);
  return () => window.removeEventListener(APP_PALETTE_EVENT, handler);
}

export function resolveInitialAppPalette(): PaletteId {
  return readAppPalettePreference() ?? DEFAULT_PALETTE;
}

export function migrateLegacyPaletteIfNeeded(): PaletteId {
  const stored = readAppPalettePreference();
  if (stored) return stored;
  writeAppPalettePreference(DEFAULT_PALETTE);
  return DEFAULT_PALETTE;
}
