import { describe, expect, it, vi } from "vitest";
import { buildShortcutCommands } from "./buildShortcutCommands";
import { DEFAULT_LAYOUT } from "@/lib/chartConfig";
import type { ActiveChartSnapshot } from "@/app/components/ActiveChartContext";
import { makeDrawingCommandsMock, makeDataWindowActionsMock, makeUICommandsMock } from "@/test/activeChartMocks";

function makeAppActions() {
  const layout = { ...DEFAULT_LAYOUT, sidebar: { activePanel: null as const } };
  return {
    getLayout: () => layout,
    isHydrated: () => true,
    applyCellUpdate: vi.fn(),
    patchActiveCell: vi.fn(),
    setActiveCellIndex: vi.fn(),
    setGridMode: vi.fn(),
    setLayoutSync: vi.fn(),
    setTheme: vi.fn(),
    setSidebarPanel: vi.fn(),
  };
}

function makeActiveChart(
  overrides?: Partial<ActiveChartSnapshot>,
): ActiveChartSnapshot {
  return {
    chartId: "cell-0",
    config: DEFAULT_LAYOUT.cells[0],
    theme: "dark",
    overlays: [],
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
    headerCommands: {
      replayActive: false,
      canUndo: true,
      canRedo: false,
      openSettings: vi.fn(),
      openStudyTemplate: vi.fn(),
      openChartTemplate: vi.fn(),
      toggleReplay: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
      addFavoriteIndicator: vi.fn(),
    },
    headerState: {
      replayActive: false,
      canUndo: true,
      canRedo: false,
    },
    chartCommands: {
      undo: vi.fn(() => true),
      redo: vi.fn(() => false),
      canUndo: vi.fn(() => true),
      canRedo: vi.fn(() => false),
      goTo: vi.fn(async () => ({ ok: true as const })),
      zoomIn: vi.fn(),
      resetChartView: vi.fn(),
      getCandles: vi.fn(() => []),
      selectDrawing: vi.fn(),
      getSelectedDrawingId: vi.fn(() => "draw-1"),
      updateDrawingStyles: vi.fn(),
      restoreDrawings: vi.fn(),
      canCaptureSnapshot: vi.fn(() => true),
      captureSnapshot: vi.fn(async () => new Blob()),
    },
    drawingCommands: makeDrawingCommandsMock({
      hasSelection: vi.fn(() => true),
      canPaste: vi.fn(() => true),
    }),
    uiCommands: makeUICommandsMock(),
    dataWindowActions: makeDataWindowActionsMock(),
    ...overrides,
  };
}

describe("buildShortcutCommands", () => {
  it("wires quick search to UI handlers", () => {
    const open = vi.fn();
    const commands = buildShortcutCommands({
      appActions: null,
      activeChart: null,
      quickSearch: { open, close: vi.fn(), isOpen: () => false },
    });

    const quickSearch = commands.find((command) => command.id === "quickSearch");
    quickSearch?.run();
    expect(open).toHaveBeenCalledOnce();
  });

  it("routes undo through active chart header commands", () => {
    const activeChart = makeActiveChart();
    const commands = buildShortcutCommands({
      appActions: makeAppActions(),
      activeChart,
      quickSearch: null,
    });

    commands.find((command) => command.id === "undo")?.run();
    expect(activeChart.headerCommands.undo).toHaveBeenCalledOnce();
  });

  it("routes drawing delete through drawing commands", () => {
    const activeChart = makeActiveChart();
    const commands = buildShortcutCommands({
      appActions: makeAppActions(),
      activeChart,
      quickSearch: null,
    });

    commands.find((command) => command.id === "deleteDrawing")?.run();
    expect(activeChart.drawingCommands.deleteSelected).toHaveBeenCalledOnce();
  });

  it("toggles sidebar panels from app actions", () => {
    const appActions = makeAppActions();
    const commands = buildShortcutCommands({
      appActions,
      activeChart: makeActiveChart(),
      quickSearch: null,
    });

    commands.find((command) => command.id === "toggleWatchlist")?.run();
    expect(appActions.setSidebarPanel).toHaveBeenCalledWith("watchlist");
  });
});
