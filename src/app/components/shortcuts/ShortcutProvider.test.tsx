/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { useEffect } from "react";
import ShortcutProvider from "./ShortcutProvider";
import { ShortcutUIProvider, useShortcutUI } from "./ShortcutUIContext";
import { ActiveChartProvider } from "../ActiveChartContext";
import { AppActionsProvider, buildAppActions } from "../AppActionsContext";
import { DEFAULT_LAYOUT } from "@/lib/chartConfig";

describe("ShortcutProvider", () => {
  it("ignores shortcuts while typing in editable targets", () => {
    const open = vi.fn();

    function Harness() {
      const { registerQuickSearch } = useShortcutUI();

      useEffect(() => {
        registerQuickSearch({ open, close: vi.fn(), isOpen: () => false });
        return () => registerQuickSearch(null);
      }, [registerQuickSearch]);

      return <input data-testid="editable" defaultValue="" />;
    }

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
            <ShortcutProvider>
              <Harness />
            </ShortcutProvider>
          </ShortcutUIProvider>
        </ActiveChartProvider>
      </AppActionsProvider>,
    );

    const input = document.querySelector('[data-testid="editable"]') as HTMLInputElement;
    input.focus();
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
    );

    expect(open).not.toHaveBeenCalled();
  });
});
