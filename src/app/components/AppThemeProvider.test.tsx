import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AppThemeProvider, useAppTheme } from "./AppThemeProvider";
import { APP_THEME_PREFERENCE_KEY } from "@/lib/app/appThemePreference";
import { APP_PALETTE_PREFERENCE_KEY } from "@/lib/app/appPalettePreference";

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

function ThemeProbe() {
  const { theme, palette, toggleTheme, setPalette } = useAppTheme();
  return (
    <div>
      <span data-testid="theme-value">{theme}</span>
      <span data-testid="palette-value">{palette}</span>
      <button type="button" data-testid="toggle-theme" onClick={toggleTheme}>
        Toggle
      </button>
      <button type="button" data-testid="set-graphite" onClick={() => setPalette("graphite")}>
        Graphite
      </button>
    </div>
  );
}

describe("AppThemeProvider", () => {
  beforeEach(() => {
    localStorageMock.clear();
    Object.defineProperty(window, "localStorage", { value: localStorageMock, configurable: true });
    document.documentElement.className = "";
    delete document.documentElement.dataset.palette;
  });

  it("applies persisted app theme to the document root", async () => {
    localStorageMock.setItem(APP_THEME_PREFERENCE_KEY, "light");
    render(
      <AppThemeProvider>
        <ThemeProbe />
      </AppThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("theme-value")).toHaveTextContent("light");
    });
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.dataset.palette).toBe("midnight");
  });

  it("persists palette changes from setPalette", async () => {
    render(
      <AppThemeProvider>
        <ThemeProbe />
      </AppThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("palette-value")).toHaveTextContent("midnight");
    });

    fireEvent.click(screen.getByTestId("set-graphite"));

    await waitFor(() => {
      expect(screen.getByTestId("palette-value")).toHaveTextContent("graphite");
    });
    expect(localStorageMock.getItem(APP_PALETTE_PREFERENCE_KEY)).toBe("graphite");
    expect(document.documentElement.dataset.palette).toBe("graphite");
  });

  it("persists theme changes from toggleTheme", async () => {
    render(
      <AppThemeProvider>
        <ThemeProbe />
      </AppThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("theme-value")).toHaveTextContent("dark");
    });

    fireEvent.click(screen.getByTestId("toggle-theme"));

    await waitFor(() => {
      expect(screen.getByTestId("theme-value")).toHaveTextContent("light");
    });
    expect(localStorageMock.getItem(APP_THEME_PREFERENCE_KEY)).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });
});
