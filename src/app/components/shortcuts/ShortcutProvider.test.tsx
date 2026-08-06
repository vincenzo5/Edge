/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { render, act } from "@testing-library/react";
import { useEffect } from "react";
import ShortcutProvider from "./ShortcutProvider";
import { ShortcutUIProvider, useShortcutUI } from "./ShortcutUIContext";
import {
  ActiveChartProvider,
  useActiveChartBridge,
  type ActiveChartSnapshot,
} from "../ActiveChartContext";
import { AppActionsProvider, buildAppActions } from "../AppActionsContext";
import { DEFAULT_CELL, DEFAULT_LAYOUT } from "@/lib/chartConfig";
import {
  makeDrawingCommandsMock,
  makeDrawingToolbarActionsMock,
  makeDrawingToolbarStateMock,
  makeDataWindowActionsMock,
  makeHeaderActionsMock,
  makeUICommandsMock,
  toActiveChartRegistration,
} from "@/test/activeChartMocks";

function makeSnapshot(
  chartId: string,
  overrides?: Partial<ActiveChartSnapshot>,
): ActiveChartSnapshot {
  const headerCommands = makeHeaderActionsMock();
  return {
    chartId,
    config: DEFAULT_CELL,
    theme: "dark",
    overlays: [],
    headerState: {
      replayActive: headerCommands.replayActive,
      canUndo: headerCommands.canUndo,
      canRedo: headerCommands.canRedo,
    },
    dataWindow: {
      dataIndex: null,
      candles: [],
      indicators: [],
      symbol: "AAPL",
      interval: "1d",
      theme: "dark",
    },
    overlayActions: {
      remove: vi.fn(),
      setVisible: vi.fn(),
      setLocked: vi.fn(),
      rename: vi.fn(),
      bringForward: vi.fn(),
      sendBackward: vi.fn(),
      duplicate: vi.fn(),
      subscribe: () => () => {},
    },
    onConfigChange: vi.fn(),
    openIndicatorPicker: vi.fn(),
    headerCommands,
    chartCommands: {
      undo: vi.fn(() => false),
      redo: vi.fn(() => false),
      canUndo: vi.fn(() => false),
      canRedo: vi.fn(() => false),
      goTo: vi.fn(async () => ({ ok: true as const })),
      zoomIn: vi.fn(),
      resetChartView: vi.fn(),
      getCandles: vi.fn(() => []),
      selectDrawing: vi.fn(),
      getSelectedDrawingId: vi.fn(() => null),
      updateDrawingStyles: vi.fn(),
      restoreDrawings: vi.fn(),
      reshapePositionDrawing: vi.fn(() => false),
      canCaptureSnapshot: vi.fn(() => true),
      captureSnapshot: vi.fn(async () => new Blob()),
    },
    drawingCommands: makeDrawingCommandsMock(),
    drawingToolbarState: makeDrawingToolbarStateMock(),
    drawingToolbarActions: makeDrawingToolbarActionsMock(),
    uiCommands: makeUICommandsMock(),
    dataWindowActions: makeDataWindowActionsMock(),
    ...overrides,
  };
}

describe("ShortcutProvider", () => {
  it("allows command palette toggle while typing in editable targets", async () => {
    const open = vi.fn();

    function Harness() {
      const { registerCommandPalette } = useShortcutUI();

      useEffect(() => {
        registerCommandPalette({ open, close: vi.fn(), isOpen: () => false });
        return () => registerCommandPalette(null);
      }, [registerCommandPalette]);

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
    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
      );
    });

    expect(open).toHaveBeenCalledOnce();
  });

  it("runs chart undo on Cmd+Z when the active chart can undo", async () => {
    const undo = vi.fn();
    const canUndo = vi.fn(() => true);
    const base = makeSnapshot("cell-0");

    function RegisterChart() {
      const bridge = useActiveChartBridge();
      useEffect(() => {
        if (!bridge) return;
        const registration = toActiveChartRegistration(
          makeSnapshot("cell-0", {
            headerCommands: {
              ...makeHeaderActionsMock(),
              canUndo: true,
              undo,
            },
            headerState: { replayActive: false, canUndo: true, canRedo: false },
            chartCommands: {
              ...base.chartCommands,
              canUndo,
              undo: () => true,
            },
          }),
        );
        bridge.register("cell-0", registration);
        return () => bridge.unregister("cell-0");
      }, [bridge]);
      return null;
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
              <RegisterChart />
            </ShortcutProvider>
          </ShortcutUIProvider>
        </ActiveChartProvider>
      </AppActionsProvider>,
    );

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "z", metaKey: true, bubbles: true }),
      );
    });

    expect(canUndo).toHaveBeenCalled();
    expect(undo).toHaveBeenCalledOnce();
  });

  it("blocks other shortcuts while typing in editable targets", () => {
    const toggleTheme = vi.fn();

    function Harness() {
      const { registerThemeToggle } = useShortcutUI();

      useEffect(() => {
        registerThemeToggle(toggleTheme);
        return () => registerThemeToggle(null);
      }, [registerThemeToggle]);

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
      new KeyboardEvent("keydown", {
        key: "t",
        altKey: true,
        shiftKey: true,
        bubbles: true,
      }),
    );

    expect(toggleTheme).not.toHaveBeenCalled();
  });
});
