/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import {
  ActiveChartProvider,
  useActiveChartBridge,
  type ActiveChartSnapshot,
} from "../ActiveChartContext";
import { OptionsSessionProvider, useOptionsSession } from "./OptionsSessionProvider";
import { useOptionsWorkspaceModel } from "./useOptionsWorkspaceModel";
import { DEFAULT_CELL } from "@/lib/chartConfig";
import {
  makeDataWindowActionsMock,
  makeDrawingCommandsMock,
  makeUICommandsMock,
  toActiveChartRegistration,
} from "@/test/activeChartMocks";

vi.mock("../MarketDataProvider", () => ({
  useMarketDataQuotesForSymbols: () => ({ quotes: [] }),
}));

vi.mock("../data-health", () => ({
  useRegisterOptionsHealthMeta: vi.fn(),
}));

function makeSnapshot(symbol = "AAPL"): ActiveChartSnapshot {
  return {
    chartId: "cell-0",
    config: { ...DEFAULT_CELL, symbol, drawings: [] },
    theme: "dark",
    overlays: [],
    dataWindow: {
      dataIndex: 0,
      candles: [{ t: 1, o: 10, h: 12, l: 9, c: 150, v: 1000 }],
      indicators: [],
      symbol,
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

function SessionProbe() {
  const session = useOptionsSession();
  const workspace = useOptionsWorkspaceModel();

  return (
    <div>
      <span data-testid="session-mode">{session.state.mode}</span>
      <span data-testid="session-legs">{session.state.calculator.legs.length}</span>
      <span data-testid="session-pending-seed">
        {session.state.pendingSeedLeg ? "yes" : "no"}
      </span>
      <span data-testid="workspace-symbol">{workspace.symbol ?? "none"}</span>
      <button
        type="button"
        data-testid="set-calculator"
        onClick={() => session.setMode("calculator")}
      >
        Calculator
      </button>
      <button
        type="button"
        data-testid="add-leg"
        onClick={() =>
          session.setLegs((legs) => [
            ...legs,
            {
              id: "leg-1",
              action: "buy",
              type: "call",
              expiration: "2026-07-11",
              strike: 150,
              quantity: 1,
            },
          ])
        }
      >
        Add leg
      </button>
      <button
        type="button"
        data-testid="analyze"
        onClick={() =>
          session.seedFromAnalyze(
            {
              contractSymbol: "AAPL260711C00150000",
              underlying: "AAPL",
              type: "call",
              expiration: "2026-07-11",
              strike: 150,
              bid: 1,
              ask: 1.2,
              updatedAt: Date.now(),
            },
            "buy",
            1,
          )
        }
      >
        Analyze
      </button>
    </div>
  );
}

describe("OptionsSessionProvider", () => {
  it("resets session when symbol changes", async () => {
    const first = makeSnapshot("AAPL");
    const second = makeSnapshot("MSFT");

    const { rerender } = render(
      <ActiveChartProvider>
        <OptionsSessionProvider>
          <SeedSnapshot snapshot={first} />
          <SessionProbe />
        </OptionsSessionProvider>
      </ActiveChartProvider>,
    );

    fireEvent.click(screen.getByTestId("set-calculator"));
    fireEvent.click(screen.getByTestId("add-leg"));
    expect(screen.getByTestId("session-mode")).toHaveTextContent("calculator");
    expect(screen.getByTestId("session-legs")).toHaveTextContent("1");

    rerender(
      <ActiveChartProvider>
        <OptionsSessionProvider>
          <SeedSnapshot snapshot={second} />
          <SessionProbe />
        </OptionsSessionProvider>
      </ActiveChartProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("session-mode")).toHaveTextContent("chain");
    });
    expect(screen.getByTestId("session-legs")).toHaveTextContent("0");
    expect(screen.getByTestId("workspace-symbol")).toHaveTextContent("MSFT");
  });

  it("switches to calculator on analyze handoff", () => {
    render(
      <ActiveChartProvider>
        <OptionsSessionProvider>
          <SeedSnapshot snapshot={makeSnapshot()} />
          <SessionProbe />
        </OptionsSessionProvider>
      </ActiveChartProvider>,
    );

    fireEvent.click(screen.getByTestId("analyze"));
    expect(screen.getByTestId("session-mode")).toHaveTextContent("calculator");
    expect(screen.getByTestId("session-pending-seed")).toHaveTextContent("yes");
  });
});
