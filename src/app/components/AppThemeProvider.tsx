"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_LAYOUT, type Theme } from "@/lib/chartConfig";
import {
  applyAppAppearance,
  migrateLegacyThemeIfNeeded,
  readAppThemePreference,
  subscribeAppThemePreference,
  toggleAppTheme,
  writeAppThemePreference,
} from "@/lib/app/appThemePreference";
import {
  DEFAULT_PALETTE,
  type PaletteId,
} from "@/lib/design-system/palettes";
import {
  migrateLegacyPaletteIfNeeded,
  readAppPalettePreference,
  subscribeAppPalettePreference,
  writeAppPalettePreference,
} from "@/lib/app/appPalettePreference";

type AppThemeContextValue = {
  theme: Theme;
  palette: PaletteId;
  setTheme: (theme: Theme) => void;
  setPalette: (palette: PaletteId) => void;
  toggleTheme: () => void;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  // SSR-stable defaults — never read localStorage in useState (hydration mismatch).
  const [theme, setThemeState] = useState<Theme>(DEFAULT_LAYOUT.theme);
  const [palette, setPaletteState] = useState<PaletteId>(DEFAULT_PALETTE);

  useEffect(() => {
    const resolvedTheme = migrateLegacyThemeIfNeeded();
    const resolvedPalette = migrateLegacyPaletteIfNeeded();
    setThemeState(resolvedTheme);
    setPaletteState(resolvedPalette);
    applyAppAppearance(resolvedTheme, resolvedPalette);
  }, []);

  useEffect(() => {
    return subscribeAppThemePreference((nextTheme) => {
      setThemeState(nextTheme);
      applyAppAppearance(nextTheme, readAppPalettePreference() ?? palette);
    });
  }, [palette]);

  useEffect(() => {
    return subscribeAppPalettePreference((nextPalette) => {
      setPaletteState(nextPalette);
      applyAppAppearance(readAppThemePreference() ?? theme, nextPalette);
    });
  }, [theme]);

  useEffect(() => {
    applyAppAppearance(theme, palette);
  }, [theme, palette]);

  const setTheme = useCallback((next: Theme) => {
    writeAppThemePreference(next);
    setThemeState(next);
  }, []);

  const setPalette = useCallback((next: PaletteId) => {
    writeAppPalettePreference(next);
    setPaletteState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(toggleAppTheme(readAppThemePreference() ?? theme));
  }, [setTheme, theme]);

  const value = useMemo(
    () => ({ theme, palette, setTheme, setPalette, toggleTheme }),
    [theme, palette, setTheme, setPalette, toggleTheme],
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme(): AppThemeContextValue {
  const ctx = useContext(AppThemeContext);
  if (!ctx) {
    throw new Error("useAppTheme must be used within AppThemeProvider");
  }
  return ctx;
}

export function useAppThemeOptional(): AppThemeContextValue | null {
  return useContext(AppThemeContext);
}
