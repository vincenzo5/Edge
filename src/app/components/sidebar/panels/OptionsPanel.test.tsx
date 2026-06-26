import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
import type { Candle } from "@/lib/chart/contracts";
import { OPTION_SETUP_TYPES } from "@edge/chart-core";

const candles: Candle[] = [
  { t: 1, o: 10, h: 12, l: 9, c: 150, v: 1000 },
];

function makeSpreadChainContracts() {
  const strikes = [140, 145, 150, 155, 160];
  const contracts = [];
  for (const strike of strikes) {
    const callBid = strike === 150 ? 1.0 : strike === 155 ? 0.7 : 0.25;
    const callAsk = strike === 150 ? 1.2 : strike === 155 ? 0.8 : 0.3;
    const putBid = strike === 150 ? 1.0 : strike === 145 ? 0.8 : 0.3;
    const putAsk = strike === 150 ? 1.1 : strike === 145 ? 0.9 : 0.35;
    contracts.push(
      {
        contractSymbol: `AAPL250620C${String(strike).padStart(8, "0")}`,
        underlying: "AAPL",
        type: "call",
        expiration: "2025-06-20",
        strike,
        bid: callBid,
        ask: callAsk,
        updatedAt: Date.now(),
      },
      {
        contractSymbol: `AAPL250620P${String(strike).padStart(8, "0")}`,
        underlying: "AAPL",
        type: "put",
        expiration: "2025-06-20",
        strike,
        bid: putBid,
        ask: putAsk,
        updatedAt: Date.now(),
      },
    );
  }
  return contracts;
}

function mockOptionsFetch(contracts: unknown[] = []) {
  return vi.spyOn(global, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes("/api/options/expirations")) {
      return new Response(
        JSON.stringify({
          expirations: [{ underlying: "AAPL", expiration: "2025-06-20" }],
          meta: { source: "ibkr" },
        }),
        { status: 200 },
      );
    }
    if (url.includes("/api/options/chain")) {
      return new Response(
        JSON.stringify({
          chain: {
            underlying: "AAPL",
            expiration: "2025-06-20",
            contracts,
          },
          meta: { source: "ibkr" },
        }),
        { status: 200 },
      );
    }
    throw new Error(`Unexpected fetch: ${url}`);
  });
}

function makeSnapshot(overrides?: Partial<ActiveChartSnapshot>): ActiveChartSnapshot {
  return {
    chartId: "cell-0",
    config: { ...DEFAULT_CELL, symbol: "AAPL", drawings: [] },
    theme: "dark",
    overlays: [],
    dataWindow: {
      dataIndex: 0,
      candles,
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
      getCandles: vi.fn(() => candles),
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
    return () => {
      bridge.unregister(snapshot.chartId);
    };
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

  it("loads expirations and chain for active symbol", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/options/expirations")) {
        return new Response(
          JSON.stringify({
            expirations: [{ underlying: "AAPL", expiration: "2025-06-20" }],
            meta: { source: "ibkr" },
          }),
          { status: 200 },
        );
      }
      if (url.includes("/api/options/chain")) {
        return new Response(
          JSON.stringify({
            chain: {
              underlying: "AAPL",
              expiration: "2025-06-20",
              contracts: [
                {
                  contractSymbol: "AAPL250620C00150000",
                  underlying: "AAPL",
                  type: "call",
                  expiration: "2025-06-20",
                  strike: 150,
                  bid: 1,
                  ask: 1.2,
                  delta: 0.5,
                  updatedAt: Date.now(),
                },
              ],
            },
            meta: { source: "ibkr" },
          }),
          { status: 200 },
        );
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(
      <ActiveChartProvider>
        <SeedSnapshot snapshot={makeSnapshot()} />
        <OptionsPanel />
      </ActiveChartProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("options-chain-table")).toBeInTheDocument();
    });
    expect(screen.getByTestId("options-source-badge")).toHaveTextContent("ibkr");
    expect(screen.getByText("150")).toBeInTheDocument();
  });

  it("pins expiration via chart commands", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/options/expirations")) {
        return new Response(
          JSON.stringify({
            expirations: [{ underlying: "AAPL", expiration: "2025-06-20" }],
            meta: { source: "ibkr" },
          }),
          { status: 200 },
        );
      }
      if (url.includes("/api/options/chain")) {
        return new Response(
          JSON.stringify({
            chain: { underlying: "AAPL", expiration: "2025-06-20", contracts: [] },
            meta: { source: "ibkr" },
          }),
          { status: 200 },
        );
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const onConfigChange = vi.fn();
    const restoreDrawings = vi.fn();
    const snapshot = makeSnapshot({
      onConfigChange,
      chartCommands: {
        ...makeSnapshot().chartCommands,
        restoreDrawings,
      },
    });

    render(
      <ActiveChartProvider>
        <SeedSnapshot snapshot={snapshot} />
        <OptionsPanel />
      </ActiveChartProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("options-pin-primary")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("options-pin-primary"));
    expect(onConfigChange).toHaveBeenCalled();
    expect(restoreDrawings).toHaveBeenCalled();
    const nextDrawings = onConfigChange.mock.calls[0][0].drawings;
    expect(nextDrawings).toHaveLength(1);
    expect(nextDrawings[0].name).toBe("vertical_line");
  });

  it("shows quick risk ruler presets when spot price is available", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/options/expirations")) {
        return new Response(
          JSON.stringify({
            expirations: [{ underlying: "AAPL", expiration: "2025-06-20" }],
            meta: { source: "ibkr" },
          }),
          { status: 200 },
        );
      }
      if (url.includes("/api/options/chain")) {
        return new Response(
          JSON.stringify({
            chain: { underlying: "AAPL", expiration: "2025-06-20", contracts: [] },
            meta: { source: "ibkr" },
          }),
          { status: 200 },
        );
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(
      <ActiveChartProvider>
        <SeedSnapshot snapshot={makeSnapshot()} />
        <OptionsPanel />
      </ActiveChartProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("options-risk-ruler-presets")).toBeInTheDocument();
    });
    expect(screen.getByTestId("options-risk-preset-long_call")).toHaveTextContent("Long Call");
    expect(screen.getByTestId("options-risk-preset-iron_condor")).toHaveTextContent("Iron Condor");
  });

  it("adds risk ruler drawing when a preset is clicked", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/options/expirations")) {
        return new Response(
          JSON.stringify({
            expirations: [{ underlying: "AAPL", expiration: "2025-06-20" }],
            meta: { source: "ibkr" },
          }),
          { status: 200 },
        );
      }
      if (url.includes("/api/options/chain")) {
        return new Response(
          JSON.stringify({
            chain: { underlying: "AAPL", expiration: "2025-06-20", contracts: [] },
            meta: { source: "ibkr" },
          }),
          { status: 200 },
        );
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const onConfigChange = vi.fn();
    const restoreDrawings = vi.fn();
    const snapshot = makeSnapshot({
      onConfigChange,
      chartCommands: {
        ...makeSnapshot().chartCommands,
        restoreDrawings,
      },
    });

    render(
      <ActiveChartProvider>
        <SeedSnapshot snapshot={snapshot} />
        <OptionsPanel />
      </ActiveChartProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("options-risk-preset-bull_call_debit_spread")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("options-risk-preset-bull_call_debit_spread"));
    expect(onConfigChange).toHaveBeenCalled();
    expect(restoreDrawings).toHaveBeenCalled();
    const nextDrawings = onConfigChange.mock.calls[0][0].drawings;
    expect(nextDrawings).toHaveLength(1);
    expect(nextDrawings[0].name).toBe("risk_ruler");
    const riskSetup = nextDrawings[0].metadata?.fields?.riskSetup as {
      setupType?: string;
      instrument?: string;
    };
    expect(riskSetup.setupType).toBe("bull_call_debit_spread");
    expect(riskSetup.instrument).toBe("option");
  });

  it("replaces existing preset drawing when the same setup is clicked again", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/options/expirations")) {
        return new Response(
          JSON.stringify({
            expirations: [{ underlying: "AAPL", expiration: "2025-06-20" }],
            meta: { source: "ibkr" },
          }),
          { status: 200 },
        );
      }
      if (url.includes("/api/options/chain")) {
        return new Response(
          JSON.stringify({
            chain: { underlying: "AAPL", expiration: "2025-06-20", contracts: [] },
            meta: { source: "ibkr" },
          }),
          { status: 200 },
        );
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const onConfigChange = vi.fn();
    const restoreDrawings = vi.fn();
    const snapshot = makeSnapshot({
      onConfigChange,
      chartCommands: {
        ...makeSnapshot().chartCommands,
        restoreDrawings,
      },
    });

    render(
      <ActiveChartProvider>
        <SeedSnapshot snapshot={snapshot} />
        <OptionsPanel />
      </ActiveChartProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("options-risk-preset-long_call")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("options-risk-preset-long_call"));
    fireEvent.click(screen.getByTestId("options-risk-preset-long_call"));

    const secondCallDrawings = onConfigChange.mock.calls[1][0].drawings;
    expect(secondCallDrawings).toHaveLength(1);
    expect(secondCallDrawings[0].id).toBe("risk-ruler-AAPL-long_call");
  });

  it("shows spot fallback copy when chain is empty", async () => {
    mockOptionsFetch([]);

    render(
      <ActiveChartProvider>
        <SeedSnapshot snapshot={makeSnapshot()} />
        <OptionsPanel />
      </ActiveChartProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("options-risk-preset-fallback-long_call")).toBeInTheDocument();
    });
    expect(screen.getByTestId("options-risk-preset-fallback-long_call")).toHaveTextContent(
      "Spot estimate until chain loads",
    );
  });

  it("shows chain-derived leg preview when contracts are loaded", async () => {
    mockOptionsFetch(makeSpreadChainContracts());

    render(
      <ActiveChartProvider>
        <SeedSnapshot snapshot={makeSnapshot()} />
        <OptionsPanel />
      </ActiveChartProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("options-risk-preset-preview-long_call")).toBeInTheDocument();
    });
    expect(screen.getByTestId("options-risk-preset-preview-long_call")).toHaveTextContent(
      "Buy 150C @ 1.20",
    );
    expect(screen.getByTestId("options-risk-preset-preview-bull_call_debit_spread")).toHaveTextContent(
      "Buy 150C @ 1.20",
    );
  });

  it("creates chain-derived risk ruler metadata when chain contracts are available", async () => {
    mockOptionsFetch(makeSpreadChainContracts());

    const onConfigChange = vi.fn();
    const restoreDrawings = vi.fn();
    const snapshot = makeSnapshot({
      onConfigChange,
      chartCommands: {
        ...makeSnapshot().chartCommands,
        restoreDrawings,
      },
    });

    render(
      <ActiveChartProvider>
        <SeedSnapshot snapshot={snapshot} />
        <OptionsPanel />
      </ActiveChartProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("options-risk-preset-preview-long_call")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("options-risk-preset-long_call"));
    const nextDrawings = onConfigChange.mock.calls[0][0].drawings;
    expect(nextDrawings[0].metadata?.computed?.chainDerived).toBe(true);
    const riskSetup = nextDrawings[0].metadata?.fields?.riskSetup as {
      maxLoss?: number;
      legs?: Array<{ premium?: number; strike?: number }>;
    };
    expect(riskSetup.maxLoss).toBe(1.2);
    expect(riskSetup.legs?.[0]?.strike).toBe(150);
    expect(riskSetup.legs?.[0]?.premium).toBe(1.2);
  });

  it("creates chain-derived risk rulers for all quick preset buttons", async () => {
    mockOptionsFetch(makeSpreadChainContracts());

    const onConfigChange = vi.fn();
    const restoreDrawings = vi.fn();
    const snapshot = makeSnapshot({
      onConfigChange,
      chartCommands: {
        ...makeSnapshot().chartCommands,
        restoreDrawings,
      },
    });

    render(
      <ActiveChartProvider>
        <SeedSnapshot snapshot={snapshot} />
        <OptionsPanel />
      </ActiveChartProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("options-risk-preset-preview-iron_condor")).toBeInTheDocument();
    });

    for (const setupType of OPTION_SETUP_TYPES) {
      expect(screen.getByTestId(`options-risk-preset-preview-${setupType}`)).toBeInTheDocument();
      expect(screen.getByTestId(`options-risk-preset-${setupType}`)).not.toBeDisabled();
    }

    for (const setupType of OPTION_SETUP_TYPES) {
      fireEvent.click(screen.getByTestId(`options-risk-preset-${setupType}`));
    }

    expect(onConfigChange).toHaveBeenCalledTimes(OPTION_SETUP_TYPES.length);
    expect(restoreDrawings).toHaveBeenCalledTimes(OPTION_SETUP_TYPES.length);

    OPTION_SETUP_TYPES.forEach((setupType, index) => {
      const nextDrawings = onConfigChange.mock.calls[index][0].drawings as Array<{
        id: string;
        name: string;
        metadata?: { computed?: { chainDerived?: boolean; setupType?: string } };
      }>;
      expect(nextDrawings).toHaveLength(1);
      expect(nextDrawings[0]?.id).toBe(`risk-ruler-AAPL-${setupType}`);
      expect(nextDrawings[0]?.name).toBe("risk_ruler");
      expect(nextDrawings[0]?.metadata?.computed?.chainDerived).toBe(true);
      expect(nextDrawings[0]?.metadata?.computed?.setupType).toBe(setupType);
    });
  });
});
