/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { CommandPalette } from "./CommandPalette";
import { ShortcutUIProvider, useShortcutUI } from "./ShortcutUIContext";
import { AppActionsProvider, buildAppActions } from "../AppActionsContext";
import { ActiveChartProvider } from "../ActiveChartContext";
import { DEFAULT_LAYOUT } from "@/lib/chartConfig";
import { clearRecentCommandsForTests, pushRecentCommand } from "@/lib/shortcuts/recentCommands";

function ShortcutHarness({ children }: { children: React.ReactNode }) {
  const {
    registerCommandPalette,
    registerSymbolSearch,
    registerThemeToggle,
  } = useShortcutUI();

  useEffect(() => {
    registerCommandPalette({
      open: vi.fn(),
      close: vi.fn(),
      isOpen: () => false,
    });
    registerSymbolSearch({
      open: vi.fn(),
      close: vi.fn(),
      isOpen: () => false,
    });
    registerThemeToggle(vi.fn());
    return () => {
      registerCommandPalette(null);
      registerSymbolSearch(null);
      registerThemeToggle(null);
    };
  }, [registerCommandPalette, registerSymbolSearch, registerThemeToggle]);

  return <>{children}</>;
}

function renderPalette(open = true) {
  const onClose = vi.fn();
  render(
    <AppActionsProvider
      value={buildAppActions({
        layout: DEFAULT_LAYOUT,
        hydrated: true,
        applyCellUpdate: vi.fn(),
        patchActiveCell: vi.fn(),
        setActiveCellIndex: vi.fn(),
        setGridMode: vi.fn(),
        setLayoutSync: vi.fn(),
        setTheme: vi.fn(),
        setSidebarPanel: vi.fn(),
      })}
    >
      <ActiveChartProvider>
        <ShortcutUIProvider>
          <ShortcutHarness>
            <CommandPalette open={open} onClose={onClose} />
          </ShortcutHarness>
        </ShortcutUIProvider>
      </ActiveChartProvider>
    </AppActionsProvider>,
  );
  return { onClose };
}

describe("CommandPalette", () => {
  beforeEach(() => {
    clearRecentCommandsForTests();
  });

  afterEach(() => {
    clearRecentCommandsForTests();
  });

  it("shows quick guide groups when query is empty", async () => {
    renderPalette();
    await waitFor(() => {
      expect(screen.getByText("Navigation")).toBeTruthy();
    });
    expect(screen.getByTestId("command-palette-item-changeSymbol")).toBeTruthy();
    expect(screen.getByText("Panels")).toBeTruthy();
  });

  it("filters commands when typing", async () => {
    renderPalette();
    const input = screen.getByTestId("command-palette-input");
    fireEvent.change(input, { target: { value: "watchlist" } });
    await waitFor(() => {
      expect(screen.getByTestId("command-palette-item-toggleWatchlist")).toBeTruthy();
    });
    expect(screen.queryByTestId("command-palette-item-undo")).toBeNull();
  });

  it("shows recent commands above quick guide", () => {
    pushRecentCommand("toggleWatchlist");
    renderPalette();
    expect(screen.getByText("Recent")).toBeTruthy();
    expect(screen.getByTestId("command-palette-item-toggleWatchlist")).toBeTruthy();
  });
});
