/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useEffect } from "react";
import { OptionsPanel } from "./OptionsPanel";
import {
  ActiveChartProvider,
  useActiveChartBridge,
  type ActiveChartSnapshot,
} from "../../ActiveChartContext";
import { DEFAULT_CELL } from "@/lib/chartConfig";
import {
  makeDataWindowActionsMock,
  makeDrawingCommandsMock,
  makeUICommandsMock,
  toActiveChartRegistration,
} from "@/test/activeChartMocks";

function makeSnapshot(overrides?: Partial<ActiveChartSnapshot>): ActiveChartSnapshot {
  return {
    chartId: "cell-0",
    config: { ...DEFAULT_CELL, symbol: "AAPL", drawings: [] },
    theme: "dark",
    overlays: [],
    dataWindow: {
      dataIndex: 0,
      candles: [{ t: 1, o: 10, h: 12, l: 9, c: 150, v: 1000 }],
      indicators: [],
      symbol: "AAPL",
      interval: "1d",
      theme: "dark",
      chartSettings: DEFAULT_CELL.chartSettings,
      mainSeriesVisible: true,
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
    dataWindowActions: makeDataWindowActionsMock(),
    onConfigChange: vi.fn(),
    openIndicatorPicker: vi.fn(),
    headerCommands: {
      replayActive: false,
      canUndo: false,
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
      canUndo: false,
      canRedo: false,
    },
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
      canCaptureSnapshot: vi.fn(() => true),
      captureSnapshot: vi.fn(async () => new Blob([new Uint8Array(32)], { type: "image/png" })),
    },
    drawingCommands: makeDrawingCommandsMock(),
    uiCommands: makeUICommandsMock(),
    ...overrides,
  };
}

function SeedSnapshot({ snapshot }: { snapshot: ActiveChartSnapshot }) {
  const bridge = useActiveChartBridge();
  useEffect(() => {
    if (!bridge) return;
    bridge.register(snapshot.chartId, toActiveChartRegistration(snapshot));
    return () => bridge.unregister(snapshot.chartId);
  }, [bridge, snapshot]);
  return null;
}

describe("OptionsPanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows placeholder when no active chart", () => {
    render(
      <ActiveChartProvider>
        <OptionsPanel />
      </ActiveChartProvider>,
    );

    expect(screen.getByText("Focus a chart to view options.")).toBeInTheDocument();
  });

  it("shows compact launcher without chain table for active symbol", () => {
    const fetchSpy = vi.spyOn(global, "fetch");

    render(
      <ActiveChartProvider>
        <SeedSnapshot snapshot={makeSnapshot()} />
        <OptionsPanel onOpenFullChain={vi.fn()} />
      </ActiveChartProvider>,
    );

    expect(screen.getByTestId("options-panel")).toBeInTheDocument();
    expect(screen.getByText("AAPL options")).toBeInTheDocument();
    expect(screen.getByTestId("options-open-full-chain")).toHaveTextContent("Open options chain");
    expect(screen.queryByTestId("options-chain-table")).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("calls onOpenFullChain when launcher button is clicked", () => {
    const onOpenFullChain = vi.fn();

    render(
      <ActiveChartProvider>
        <SeedSnapshot snapshot={makeSnapshot()} />
        <OptionsPanel onOpenFullChain={onOpenFullChain} />
      </ActiveChartProvider>,
    );

    fireEvent.click(screen.getByTestId("options-open-full-chain"));
    expect(onOpenFullChain).toHaveBeenCalledTimes(1);
  });
});
