/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DrawingToolbar, { resolveGroupSelections } from "./DrawingToolbar";

describe("DrawingToolbar forecasting group", () => {
  const onGroupSelectionsChange = vi.fn();
  const onToolSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: "(pointer: coarse)",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  function renderToolbar(
    overrides: {
      activeTool?: string;
      groupSelections?: ReturnType<typeof resolveGroupSelections>;
    } = {},
  ) {
    return render(
      <DrawingToolbar
        theme="dark"
        railMode="full"
        disabled={false}
        activeTool={overrides.activeTool ?? "__cursor__"}
        magnet={false}
        keepDrawing={false}
        allLocked={false}
        allHidden={false}
        groupSelections={overrides.groupSelections ?? resolveGroupSelections()}
        onGroupSelectionsChange={onGroupSelectionsChange}
        onToolSelect={onToolSelect}
        onClear={vi.fn()}
        onToggleMagnet={vi.fn()}
        onToggleKeepDrawing={vi.fn()}
        onToggleLockAll={vi.fn()}
        onToggleHideAll={vi.fn()}
        onZoomIn={vi.fn()}
      />,
    );
  }

  it("opens forecasting flyout on click and selects short position", () => {
    renderToolbar();
    fireEvent.click(
      screen.getByRole("button", { name: "Forecasting — Long Position" }),
    );
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Short Position" }));

    expect(onGroupSelectionsChange).toHaveBeenCalledWith({
      ...resolveGroupSelections(),
      forecasting: "shortPosition",
    });
    expect(onToolSelect).toHaveBeenCalledWith("shortPosition");
  });

  it("opens forecasting flyout on hover and selects short position", () => {
    renderToolbar();
    const forecastingButton = screen.getByRole("button", {
      name: "Forecasting — Long Position",
    });
    fireEvent.mouseEnter(forecastingButton.closest(".relative")!);
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Short Position" }));

    expect(onGroupSelectionsChange).toHaveBeenCalledWith({
      ...resolveGroupSelections(),
      forecasting: "shortPosition",
    });
    expect(onToolSelect).toHaveBeenCalledWith("shortPosition");
  });

  it("shows short position in group button label when armed", () => {
    renderToolbar({
      activeTool: "shortPosition",
      groupSelections: {
        ...resolveGroupSelections(),
        forecasting: "shortPosition",
      },
    });

    expect(
      screen.getByRole("button", { name: "Forecasting — Short Position" }),
    ).toBeTruthy();
  });
});
