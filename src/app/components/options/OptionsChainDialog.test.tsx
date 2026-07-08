/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { OptionsChainDialog } from "./OptionsChainDialog";
import { OptionsSessionProvider } from "./OptionsSessionProvider";
import {
  ActiveChartProvider,
  useActiveChartBridge,
  type ActiveChartSnapshot,
} from "../ActiveChartContext";
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

vi.mock("../RiskSettingsProvider", () => ({
  useRiskSettings: () => ({
    settings: {
      sizingMode: "percent",
      riskPercent: 1,
      absoluteRisk: 1000,
      accountBasis: "NetLiquidation",
      manualCapital: 50_000,
    },
    dollarRisk: 1000,
    lastDollarRisk: 1000,
    accountBasisValue: 100_000,
    basisStale: false,
    riskAccount: { capital: 100_000, riskPercent: 1 },
    updateSettings: vi.fn(),
    resetSettings: vi.fn(),
  }),
  useRiskSettingsOptional: () => ({
    settings: {
      sizingMode: "percent",
      riskPercent: 1,
      absoluteRisk: 1000,
      accountBasis: "NetLiquidation",
      manualCapital: 50_000,
    },
    dollarRisk: 1000,
    lastDollarRisk: 1000,
    accountBasisValue: 100_000,
    basisStale: false,
    riskAccount: { capital: 100_000, riskPercent: 1 },
    updateSettings: vi.fn(),
    resetSettings: vi.fn(),
  }),
}));

function makeSnapshot(): ActiveChartSnapshot {
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

describe("OptionsChainDialog", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/options/expirations")) {
        return new Response(
          JSON.stringify({
            expirations: [{ underlying: "AAPL", expiration: "2026-07-11" }],
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
                  impliedVolatility: 0.35,
                  delta: 0.52,
                  volume: 100,
                  openInterest: 500,
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
  });

  it("does not render when closed", () => {
    render(
      <ActiveChartProvider>
        <OptionsSessionProvider>
        <SeedSnapshot snapshot={makeSnapshot()} />
        <OptionsChainDialog open={false} onClose={vi.fn()} />
        </OptionsSessionProvider>
      </ActiveChartProvider>,
    );
    expect(screen.queryByTestId("options-chain-dialog")).toBeNull();
  });

  it("renders dialog with chain table when open", async () => {
    render(
      <ActiveChartProvider>
        <OptionsSessionProvider>
        <SeedSnapshot snapshot={makeSnapshot()} />
        <OptionsChainDialog open onClose={vi.fn()} />
        </OptionsSessionProvider>
      </ActiveChartProvider>,
    );

    expect(screen.getByTestId("options-chain-dialog")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: /AAPL — Options Chain/i })).toBeInTheDocument();
    expect(await screen.findByTestId("options-chain-table")).toBeInTheDocument();
  });

  it("calls onClose when close button clicked", () => {
    const onClose = vi.fn();
    render(
      <ActiveChartProvider>
        <OptionsSessionProvider>
        <SeedSnapshot snapshot={makeSnapshot()} />
        <OptionsChainDialog open onClose={onClose} />
        </OptionsSessionProvider>
      </ActiveChartProvider>,
    );

    fireEvent.click(screen.getByTestId("options-chain-dialog-close"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose on Escape", () => {
    const onClose = vi.fn();
    render(
      <ActiveChartProvider>
        <OptionsSessionProvider>
        <SeedSnapshot snapshot={makeSnapshot()} />
        <OptionsChainDialog open onClose={onClose} />
        </OptionsSessionProvider>
      </ActiveChartProvider>,
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("does not fetch options when closed", () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async () => {
      throw new Error("fetch should not run when dialog is closed");
    });

    render(
      <ActiveChartProvider>
        <OptionsSessionProvider>
        <SeedSnapshot snapshot={makeSnapshot()} />
        <OptionsChainDialog open={false} onClose={vi.fn()} />
        </OptionsSessionProvider>
      </ActiveChartProvider>,
    );

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("loads chain for a different expiration when expiration tab is selected", async () => {
    const chainRequests: string[] = [];
    vi.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/options/expirations")) {
        return new Response(
          JSON.stringify({
            expirations: [
              { underlying: "AAPL", expiration: "2025-06-20" },
              { underlying: "AAPL", expiration: "2025-07-18" },
            ],
            meta: { source: "ibkr" },
          }),
          { status: 200 },
        );
      }
      if (url.includes("/api/options/chain")) {
        chainRequests.push(url);
        const expiration = new URL(url, "http://localhost").searchParams.get("expiration");
        const strike = expiration === "2025-07-18" ? 160 : 150;
        return new Response(
          JSON.stringify({
            chain: {
              underlying: "AAPL",
              expiration: expiration ?? "2025-06-20",
              contracts: [
                {
                  contractSymbol: `AAPL${expiration?.replace(/-/g, "").slice(2)}C00${strike}000`,
                  underlying: "AAPL",
                  type: "call",
                  expiration: expiration ?? "2025-06-20",
                  strike,
                  bid: 1,
                  ask: 1.2,
                  volume: 100,
                  openInterest: 500,
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
        <OptionsSessionProvider>
        <SeedSnapshot snapshot={makeSnapshot()} />
        <OptionsChainDialog open onClose={vi.fn()} />
        </OptionsSessionProvider>
      </ActiveChartProvider>,
    );

    expect(await screen.findByTestId("options-chain-row-150")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("options-exp-2025-07-18"));

    await waitFor(() => {
      expect(screen.getByTestId("options-chain-row-160")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("options-chain-row-150")).toBeNull();
    expect(chainRequests.some((url) => url.includes("expiration=2025-07-18"))).toBe(true);
  });

  it("shows prominent loading state while chain fetch is in flight", async () => {
    let resolveChain: ((value: Response) => void) | undefined;
    vi.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/options/expirations")) {
        return new Response(
          JSON.stringify({
            expirations: [{ underlying: "AAPL", expiration: "2026-07-11" }],
            meta: { source: "ibkr" },
          }),
          { status: 200 },
        );
      }
      if (url.includes("/api/options/chain")) {
        return new Promise<Response>((resolve) => {
          resolveChain = resolve;
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(
      <ActiveChartProvider>
        <OptionsSessionProvider>
        <SeedSnapshot snapshot={makeSnapshot()} />
        <OptionsChainDialog open onClose={vi.fn()} />
        </OptionsSessionProvider>
      </ActiveChartProvider>,
    );

    const loading = await screen.findByTestId("options-chain-loading");
    expect(loading).toHaveAttribute("role", "status");
    expect(loading).toHaveAttribute("aria-busy", "true");
    expect(screen.getByTestId("options-chain-loading-spinner")).toBeInTheDocument();
    expect(loading).toHaveTextContent(/Loading AAPL 2026-07-11 options chain/i);

    resolveChain?.(
      new Response(
        JSON.stringify({
          chain: {
            underlying: "AAPL",
            expiration: "2025-06-20",
            contracts: [
              {
                contractSymbol: "AAPL250620C00150000",
                underlying: "AAPL",
                type: "call",
                expiration: "2026-07-11",
                strike: 150,
                bid: 1,
                ask: 1.2,
                volume: 100,
                openInterest: 500,
                updatedAt: Date.now(),
              },
            ],
          },
          meta: { source: "ibkr" },
        }),
        { status: 200 },
      ),
    );

    expect(await screen.findByTestId("options-chain-table")).toBeInTheDocument();
  });

  it("shows analyze buttons and switches to risk calculator", async () => {
    render(
      <ActiveChartProvider>
        <OptionsSessionProvider>
        <SeedSnapshot snapshot={makeSnapshot()} />
        <OptionsChainDialog open onClose={vi.fn()} />
        </OptionsSessionProvider>
      </ActiveChartProvider>,
    );

    const row = await screen.findByTestId("options-chain-row-150");
    const callBidCell = row.querySelectorAll("td")[0];
    fireEvent.mouseEnter(callBidCell!);

    const analyzeCall = await screen.findByTestId(
      "options-analyze-call-150",
      {},
      { timeout: 500 },
    );
    fireEvent.click(analyzeCall);
    expect(screen.getByTestId("options-risk-calculator")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("options-calc-payoff-grid")).toBeInTheDocument();
    });
  });

  it("renders Last column headers in unified chain table", async () => {
    render(
      <ActiveChartProvider>
        <OptionsSessionProvider>
        <SeedSnapshot snapshot={makeSnapshot()} />
        <OptionsChainDialog open onClose={vi.fn()} />
        </OptionsSessionProvider>
      </ActiveChartProvider>,
    );

    await screen.findByTestId("options-chain-table");
    const headers = screen.getAllByRole("columnheader");
    expect(headers.filter((el) => el.textContent === "Last")).toHaveLength(2);
    expect(screen.getByTestId("options-chain-strike-header")).toBeInTheDocument();
  });

  it("updates position when header is dragged", () => {
    render(
      <div style={{ position: "relative", width: 1200, height: 800 }}>
        <ActiveChartProvider>
          <OptionsSessionProvider>
          <SeedSnapshot snapshot={makeSnapshot()} />
          <OptionsChainDialog open onClose={vi.fn()} />
          </OptionsSessionProvider>
        </ActiveChartProvider>
      </div>,
    );

    const dialog = screen.getByTestId("options-chain-dialog");
    const header = screen.getByTestId("options-chain-dialog-header");
    const initialLeft = dialog.style.left;

    fireEvent.pointerDown(header, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(header, { clientX: 160, clientY: 130, pointerId: 1 });
    fireEvent.pointerUp(header, { pointerId: 1 });

    expect(dialog.style.left).not.toBe(initialLeft);
  });
});
