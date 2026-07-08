/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useEffect } from "react";
import { OptionsPanel } from "./OptionsPanel";
import { OptionsSessionProvider } from "../../options/OptionsSessionProvider";
import { PanelPresentationProvider } from "../PanelPresentationContext";
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

vi.mock("../../MarketDataProvider", () => ({
  useMarketDataQuotesForSymbols: () => ({ quotes: [] }),
}));

vi.mock("../../data-health", () => ({
  useRegisterOptionsHealthMeta: vi.fn(),
}));

vi.mock("../../RiskSettingsProvider", () => ({
  useRiskSettings: () => ({
    dollarRisk: 1000,
    basisStale: false,
  }),
  useRiskSettingsOptional: () => ({
    riskAccount: { capital: 100_000, riskPercent: 1 },
  }),
}));

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
    vi.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/options/expirations")) {
        return new Response(
          JSON.stringify({
            expirations: [{ underlying: "AAPL", expiration: "2026-07-11" }],
            meta: { source: "massive" },
          }),
          { status: 200 },
        );
      }
      if (url.includes("/api/options/chain")) {
        return new Response(
          JSON.stringify({
            chain: {
              underlying: "AAPL",
              expiration: "2026-07-11",
              contracts: [
                {
                  contractSymbol: "AAPL260711C00150000",
                  underlying: "AAPL",
                  type: "call",
                  expiration: "2026-07-11",
                  strike: 150,
                  bid: 1,
                  ask: 1.2,
                  last: 1.15,
                  delta: 0.52,
                  volume: 100,
                  updatedAt: Date.now(),
                },
                {
                  contractSymbol: "AAPL260711P00150000",
                  underlying: "AAPL",
                  type: "put",
                  expiration: "2026-07-11",
                  strike: 150,
                  bid: 0.9,
                  ask: 1.0,
                  last: 0.95,
                  delta: -0.48,
                  volume: 80,
                  updatedAt: Date.now(),
                },
              ],
            },
            meta: { source: "massive" },
          }),
          { status: 200 },
        );
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
  });

  it("shows placeholder when no active chart", () => {
    render(
      <ActiveChartProvider>
        <OptionsSessionProvider>
          <OptionsPanel />
        </OptionsSessionProvider>
      </ActiveChartProvider>,
    );

    expect(screen.getByText("Focus a chart to view options.")).toBeInTheDocument();
  });

  it("shows compact sidebar view for active symbol", async () => {
    render(
      <ActiveChartProvider>
        <OptionsSessionProvider>
        <SeedSnapshot snapshot={makeSnapshot()} />
        <PanelPresentationProvider
          value={{
            presentation: "docked",
            popOut: vi.fn(),
            dock: vi.fn(),
            canPopOut: true,
            canDock: false,
          }}
        >
          <OptionsPanel />
        </PanelPresentationProvider>
        </OptionsSessionProvider>
      </ActiveChartProvider>,
    );

    expect(screen.getByTestId("options-panel")).toBeInTheDocument();
    expect(screen.getByText("AAPL options")).toBeInTheDocument();
    expect(screen.getByTestId("panel-pop-out")).toHaveAttribute("aria-label", "Pop out");
    expect(await screen.findByTestId("options-exp-2026-07-11")).toHaveTextContent("Jul 11");
    expect(await screen.findByTestId("options-chain-table")).toBeInTheDocument();
    expect(screen.getByTestId("options-chain-strike-150")).toBeInTheDocument();
    expect(screen.getAllByText("1.15").length).toBeGreaterThan(0);
    expect(screen.getAllByText("0.95").length).toBeGreaterThan(0);
  });

  it("calls popOut when Pop out button is clicked", () => {
    const popOut = vi.fn();

    render(
      <ActiveChartProvider>
        <OptionsSessionProvider>
        <SeedSnapshot snapshot={makeSnapshot()} />
        <PanelPresentationProvider
          value={{
            presentation: "docked",
            popOut,
            dock: vi.fn(),
            canPopOut: true,
            canDock: false,
          }}
        >
          <OptionsPanel />
        </PanelPresentationProvider>
        </OptionsSessionProvider>
      </ActiveChartProvider>,
    );

    fireEvent.click(screen.getByTestId("panel-pop-out"));
    expect(popOut).toHaveBeenCalledTimes(1);
  });
});
