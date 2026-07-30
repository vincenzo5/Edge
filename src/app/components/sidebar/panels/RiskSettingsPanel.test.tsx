import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { RiskSettingsPanel } from "./RiskSettingsPanel";
import { RiskSettingsProvider } from "../../RiskSettingsProvider";
import { RiskPositionBindingProvider } from "../../risk/RiskPositionBindingContext";
import { RiskLiquidationOverlayProvider } from "../../risk/RiskLiquidationOverlayContext";
import { useRiskPositionBinding } from "../../risk/RiskPositionBindingContext";

const mockUseAccountOptional = vi.fn();
const mockOpenTradeFromDrawing = vi.fn();

vi.mock("../../trading/TradeSetupBindingContext", () => ({
  useTradeSetupBinding: () => ({
    openTradeFromDrawing: mockOpenTradeFromDrawing,
  }),
}));

vi.mock("../../AccountProvider", () => ({
  useAccountOptional: () => mockUseAccountOptional(),
}));

const mockUseRiskMarginContext = vi.fn();

vi.mock("../../risk/useRiskMarginContext", () => ({
  useRiskMarginContext: (...args: unknown[]) => mockUseRiskMarginContext(...args),
}));

vi.mock("../../ActiveChartContext", () => ({
  useActiveChart: vi.fn(() => ({
    config: { symbol: "AAPL" },
  })),
}));

vi.mock("@/lib/marketData/useQuotes", () => ({
  useQuote: vi.fn(() => ({
    regularMarketPrice: 150,
  })),
}));

vi.mock("../../trading/usePlaybookInstances", () => ({
  usePlaybookInstances: () => ({ instances: [], loading: false, refresh: vi.fn() }),
}));

vi.mock("../../MarketDataProvider", () => ({
  useMarketDataQuotes: vi.fn(() => ({
    quotesBySymbol: new Map([
      ["AAPL", { regularMarketPrice: 150 }],
    ]),
  })),
}));

function LinkedPositionHarness() {
  const { bindToDrawing, updateBoundLevels } = useRiskPositionBinding();
  return (
    <>
      <button
        type="button"
        data-testid="bind-long"
        onClick={() => {
          bindToDrawing("cell-1", "d1");
          updateBoundLevels({
            direction: "long",
            side: "BUY",
            entry: 120,
            stop: 115,
            target: 130,
            riskRewardRatio: 2,
          });
        }}
      >
        Bind
      </button>
      <RiskSettingsPanel />
    </>
  );
}

function renderPanel() {
  return render(
    <RiskPositionBindingProvider>
      <RiskLiquidationOverlayProvider>
        <RiskSettingsProvider>
          <RiskSettingsPanel />
        </RiskSettingsProvider>
      </RiskLiquidationOverlayProvider>
    </RiskPositionBindingProvider>,
  );
}

describe("RiskSettingsPanel", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockOpenTradeFromDrawing.mockReset();
    mockUseAccountOptional.mockReturnValue({
      connectionState: "connected",
      summary: {
        tags: { NetLiquidation: { tag: "NetLiquidation", value: "100000" } },
        updatedAt: Date.now(),
      },
      status: null,
      positions: [],
      pnl: null,
      orders: [],
      executions: [],
      error: null,
      disabled: false,
      refresh: vi.fn(),
      positionForSymbol: () => null,
    });
    mockUseRiskMarginContext.mockReturnValue({
      accountConnected: true,
      current: {
        netLiquidation: 100000,
        initMarginReq: 62000,
        maintMarginReq: 50000,
        availableFunds: 41000,
        excessLiquidity: 38000,
        utilization: 0.62,
      },
      impact: null,
      impactStatus: null,
      currentStatus: "tight",
      loading: false,
      error: null,
    });
  });

  it("renders risk calculator with absolute budget readout by default", () => {
    renderPanel();
    expect(screen.getByTestId("risk-settings-panel")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Risk calculator" })).toBeInTheDocument();
    expect(screen.getByTestId("risk-settings-readout")).toHaveTextContent("Fixed risk $1,000");
  });

  it("updates risk percent via input in percent mode", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("risk-settings-mode-toggle"));
    fireEvent.change(screen.getByTestId("risk-settings-percent"), {
      target: { value: "2" },
    });
    expect(screen.getByTestId("risk-settings-readout")).toHaveTextContent("$2,000");
  });

  it("allows clearing risk percent while typing a new value", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("risk-settings-mode-toggle"));
    const input = screen.getByTestId("risk-settings-percent");
    fireEvent.change(input, { target: { value: "" } });
    expect(input).toHaveValue(null);
    fireEvent.change(input, { target: { value: "3" } });
    expect(input).toHaveValue(3);
    expect(screen.getByTestId("risk-settings-readout")).toHaveTextContent("$3,000");
  });

  it("toggles between percent and absolute via inline mode button", () => {
    renderPanel();
    expect(screen.getByTestId("risk-settings-absolute")).toBeInTheDocument();
    expect(screen.queryByTestId("risk-settings-basis")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("risk-settings-mode-toggle"));
    expect(screen.getByTestId("risk-settings-percent")).toBeInTheDocument();
    expect(screen.queryByTestId("risk-settings-basis")).not.toBeInTheDocument();
    expect(screen.getByTestId("risk-settings-readout")).toHaveTextContent("Net liquidation");

    fireEvent.click(screen.getByTestId("risk-settings-mode-toggle"));
    expect(screen.getByTestId("risk-settings-absolute")).toBeInTheDocument();
    expect(screen.queryByTestId("risk-settings-basis")).not.toBeInTheDocument();
  });

  it("resets to defaults", () => {
    renderPanel();
    fireEvent.change(screen.getByTestId("risk-settings-absolute"), {
      target: { value: "5000" },
    });
    fireEvent.click(screen.getByTestId("risk-settings-reset"));
    expect(screen.getByTestId("risk-settings-absolute")).toHaveValue(1000);
    expect(screen.getByTestId("risk-settings-readout")).toHaveTextContent("Fixed risk $1,000");
  });

  it("shows stop distance to the penny", () => {
    renderPanel();
    fireEvent.change(screen.getByTestId("risk-position-size-entry"), {
      target: { value: "24.42" },
    });
    fireEvent.change(screen.getByTestId("risk-position-size-stop"), {
      target: { value: "21.84" },
    });
    expect(screen.getByTestId("risk-stop-distance")).toHaveTextContent("Stop dist $2.58");
  });

  it("calculates share size from entry, stop, and risk budget", () => {
    renderPanel();
    fireEvent.change(screen.getByTestId("risk-position-size-entry"), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByTestId("risk-position-size-stop"), {
      target: { value: "95" },
    });
    expect(screen.getByTestId("risk-position-size-shares")).toHaveTextContent("200");
    expect(screen.getByTestId("risk-position-size-result")).toHaveTextContent("$1,000");
    expect(screen.getByTestId("risk-position-size-result")).toHaveTextContent("Cost");
  });

  it("fills entry from active chart last price via refresh icon", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("risk-position-size-use-last"));
    expect(screen.getByTestId("risk-position-size-entry")).toHaveValue(150);
  });

  it("shows zero-shares error when stop is too wide", () => {
    renderPanel();
    fireEvent.change(screen.getByTestId("risk-position-size-entry"), {
      target: { value: "2001" },
    });
    fireEvent.change(screen.getByTestId("risk-position-size-stop"), {
      target: { value: "1000" },
    });
    expect(screen.getByTestId("risk-position-size-error")).toHaveTextContent("0 shares");
  });

  it("syncs formatted entry and stop when linked to a position drawing", async () => {
    render(
      <RiskPositionBindingProvider>
        <RiskLiquidationOverlayProvider>
          <RiskSettingsProvider>
            <LinkedPositionHarness />
          </RiskSettingsProvider>
        </RiskLiquidationOverlayProvider>
      </RiskPositionBindingProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("bind-long"));
    });

    expect(screen.getByTestId("risk-position-size-linked")).toHaveTextContent("Linked to Long");
    expect(screen.getByTestId("risk-position-size-entry")).toHaveValue(120);
    expect(screen.getByTestId("risk-position-size-stop")).toHaveValue(115);
    expect(screen.getByTestId("risk-calculator-status")).toHaveTextContent("linked to chart");
  });

  it("manual entry edit soft-unlinks but keeps chart sync available", async () => {
    render(
      <RiskPositionBindingProvider>
        <RiskLiquidationOverlayProvider>
          <RiskSettingsProvider>
            <LinkedPositionHarness />
          </RiskSettingsProvider>
        </RiskLiquidationOverlayProvider>
      </RiskPositionBindingProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("bind-long"));
    });

    fireEvent.change(screen.getByTestId("risk-position-size-entry"), {
      target: { value: "125" },
    });

    expect(screen.queryByTestId("risk-position-size-linked")).not.toBeInTheDocument();
    expect(screen.getByTestId("risk-position-size-entry")).toHaveValue(125);
    expect(screen.getByTestId("risk-position-size-sync-chart")).toBeInTheDocument();
    expect(screen.getByTestId("risk-calculator-status")).not.toHaveTextContent("linked to chart");
  });

  it("chart sync refresh restores linked entry and stop after manual edit", async () => {
    render(
      <RiskPositionBindingProvider>
        <RiskLiquidationOverlayProvider>
          <RiskSettingsProvider>
            <LinkedPositionHarness />
          </RiskSettingsProvider>
        </RiskLiquidationOverlayProvider>
      </RiskPositionBindingProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("bind-long"));
    });

    fireEvent.change(screen.getByTestId("risk-position-size-entry"), {
      target: { value: "125" },
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("risk-position-size-sync-chart"));
    });

    expect(screen.getByTestId("risk-position-size-linked")).toHaveTextContent("Linked to Long");
    expect(screen.getByTestId("risk-position-size-entry")).toHaveValue(120);
    expect(screen.getByTestId("risk-position-size-stop")).toHaveValue(115);
    expect(screen.getByTestId("risk-calculator-status")).toHaveTextContent("linked to chart");
  });

  it("shows current margin context when account is connected", () => {
    renderPanel();
    expect(screen.getByTestId("risk-margin-card")).toBeInTheDocument();
    expect(screen.getByTestId("risk-margin-util-label")).toHaveTextContent("62% now");
    expect(screen.queryByTestId("risk-margin-projected-util-bar")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("risk-margin-details"));
    expect(screen.getByTestId("risk-margin-current-init")).toHaveTextContent("$62,000");
  });

  it("shows disconnected margin message when account is not connected", () => {
    mockUseRiskMarginContext.mockReturnValue({
      accountConnected: false,
      current: null,
      impact: null,
      impactStatus: null,
      currentStatus: null,
      loading: false,
      error: null,
    });
    renderPanel();
    expect(screen.getByTestId("risk-margin-disconnected")).toHaveTextContent(
      "Connect account to see margin.",
    );
  });

  it("shows margin impact when shares are sized", async () => {
    mockUseRiskMarginContext.mockImplementation((input) => ({
      accountConnected: true,
      current: {
        netLiquidation: 100000,
        initMarginReq: 62000,
        maintMarginReq: 50000,
        availableFunds: 41000,
        excessLiquidity: 38000,
        utilization: 0.62,
      },
      impact: input.enabled
        ? {
            initMarginChange: 4200,
            maintMarginChange: 3500,
            projectedUtilization: 0.662,
            headroomAfter: 34500,
            warningText: null,
            estimated: false,
          }
        : null,
      impactStatus: input.enabled ? "ok" : null,
      currentStatus: "ok",
      loading: false,
      error: null,
    }));

    renderPanel();
    fireEvent.change(screen.getByTestId("risk-position-size-entry"), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByTestId("risk-position-size-stop"), {
      target: { value: "95" },
    });

    await waitFor(() => {
      expect(screen.getByTestId("risk-margin-util-label")).toHaveTextContent("62% now → 66% after");
      expect(screen.getByTestId("risk-margin-bar-existing")).toBeInTheDocument();
      expect(screen.getByTestId("risk-margin-bar-trade")).toBeInTheDocument();
      expect(screen.queryByTestId("risk-margin-projected-util-bar")).not.toBeInTheDocument();
      expect(screen.getByTestId("risk-margin-summary")).toHaveTextContent("$34,500 left");
      expect(screen.getByTestId("risk-margin-summary")).toHaveTextContent("Plenty of room");
    });

    fireEvent.click(screen.getByTestId("risk-margin-details"));
    expect(screen.getByTestId("risk-margin-impact-init-delta")).toHaveTextContent("+$4,200");
    expect(screen.getByTestId("risk-margin-impact-projected-util")).toHaveTextContent("66% used");
    expect(screen.getByTestId("risk-margin-status")).toHaveTextContent("Plenty of room");
    expect(screen.getByTestId("risk-hold-to-stop")).toBeInTheDocument();
    expect(screen.getByTestId("risk-hold-verdict")).toHaveTextContent("Liq");
    expect(screen.getByTestId("risk-hold-verdict")).toHaveTextContent("Stop reachable");
  });

  it("shows plan slot strip with budget sizing and geometry when linked", async () => {
    render(
      <RiskPositionBindingProvider>
        <RiskLiquidationOverlayProvider>
          <RiskSettingsProvider>
            <LinkedPositionHarness />
          </RiskSettingsProvider>
        </RiskLiquidationOverlayProvider>
      </RiskPositionBindingProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("bind-long"));
    });

    expect(screen.getByTestId("risk-plan-slot-strip")).toBeInTheDocument();
    expect(screen.getByTestId("risk-plan-slot-budget")).toHaveTextContent("$1,000");
    expect(screen.getByTestId("risk-plan-slot-sizing")).toHaveTextContent("200 sh");
    expect(screen.getByTestId("risk-plan-slot-geometry")).toHaveTextContent("Long");
    expect(screen.getByTestId("risk-plan-bind-label")).toHaveTextContent("Long");
  });

  it("shows unlinked gap after manual entry edit", async () => {
    render(
      <RiskPositionBindingProvider>
        <RiskLiquidationOverlayProvider>
          <RiskSettingsProvider>
            <LinkedPositionHarness />
          </RiskSettingsProvider>
        </RiskLiquidationOverlayProvider>
      </RiskPositionBindingProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("bind-long"));
    });

    fireEvent.change(screen.getByTestId("risk-position-size-entry"), {
      target: { value: "125" },
    });

    expect(screen.getByTestId("risk-plan-slot-gaps")).toHaveTextContent(/relink/i);
  });

  it("Use in Trade opens ticket with bound drawing and sized qty", async () => {
    render(
      <RiskPositionBindingProvider>
        <RiskLiquidationOverlayProvider>
          <RiskSettingsProvider>
            <LinkedPositionHarness />
          </RiskSettingsProvider>
        </RiskLiquidationOverlayProvider>
      </RiskPositionBindingProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("bind-long"));
    });

    fireEvent.click(screen.getByTestId("risk-use-in-trade"));

    expect(mockOpenTradeFromDrawing).toHaveBeenCalledWith("cell-1", "d1", "AAPL", {
      seedQuantity: 200,
    });
  });

  it("disables Use in Trade when budget cannot size", () => {
    renderPanel();
    expect(screen.getByTestId("risk-use-in-trade")).toBeDisabled();
  });

  it("renders account gate cap inputs and measurement strip", () => {
    renderPanel();
    expect(screen.getByTestId("risk-account-gates-section")).toBeInTheDocument();
    fireEvent.change(screen.getByTestId("risk-settings-day-loss-cap"), {
      target: { value: "3" },
    });
    fireEvent.blur(screen.getByTestId("risk-settings-day-loss-cap"));
    expect(screen.getByTestId("risk-settings-day-loss-cap")).toHaveValue(3);
    expect(screen.getByTestId("account-risk-gate-day-loss")).toHaveTextContent("Day P&L");
  });
});
