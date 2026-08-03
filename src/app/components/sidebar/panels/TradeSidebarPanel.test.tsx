import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TradeSidebarPanel } from "./TradeSidebarPanel";

const mockBinding = {
  bind: null as { cellId: string; drawingId: string } | null,
  levels: null as {
    direction: "long";
    side: "BUY";
    entry: number;
    stop: number;
    target: number;
    riskRewardRatio: number;
  } | null,
  symbol: null as string | null,
  seedQuantity: null as number | null,
  openTradeFromDrawing: vi.fn(),
  openTradePanel: vi.fn(),
  clearSeedQuantity: vi.fn(),
  updateBoundLevels: vi.fn(),
};

const mockActiveChart = {
  config: { symbol: "AAPL" },
  dataWindow: {
    candles: [{ t: 1, o: 1, h: 1, l: 1, c: 148.5, v: 1 }],
  },
  chartCommands: {
    getCandles: () => [{ t: 1, o: 1, h: 1, l: 1, c: 148.5, v: 1 }],
  },
};

let mockQuote: { regularMarketPrice: number | null } | null = {
  regularMarketPrice: 150,
};

vi.mock("../../trading/TradeSetupBindingContext", () => ({
  useTradeSetupBinding: () => mockBinding,
}));

vi.mock("../../ActiveChartContext", () => ({
  useActiveChart: () => mockActiveChart,
}));

vi.mock("@/lib/marketData/useQuotes", () => ({
  useQuote: () => mockQuote,
}));

vi.mock("../../AccountProvider", () => ({
  useAccountOptional: () => ({
    activeTradingAccount: {
      broker: "ib",
      connectionId: "ib-paper",
      accountId: "DUP586813",
      environment: "paper",
    },
    activeTradingAccountId: "DUP586813",
    tradingEnvironment: "paper",
    refresh: vi.fn(),
  }),
}));

vi.mock("../../AccountAliasesProvider", () => ({
  useAccountAliasesOptional: () => ({
    displayNameFor: () => "DUP586813",
  }),
}));

vi.mock("../../RiskSettingsProvider", () => ({
  useRiskSettingsOptional: () => ({
    dollarRisk: 1000,
    settings: null,
  }),
}));

vi.mock("../../trading/usePlaybookInstances", () => ({
  usePlaybookInstances: () => ({ instances: [], refresh: vi.fn() }),
}));

vi.mock("../../trading/usePlaybookInstances", () => ({
  usePlaybookInstances: () => ({ instances: [], refresh: vi.fn() }),
}));

vi.mock("@/lib/trading/tradingClient", () => ({
  previewOrder: vi.fn(),
  submitOrder: vi.fn(),
  TradingApiError: class TradingApiError extends Error {
    status = 409;
  },
}));

vi.mock("../PanelChromeActions", () => ({
  PanelPopOutButton: () => null,
}));

describe("TradeSidebarPanel", () => {
  beforeEach(() => {
    mockBinding.bind = null;
    mockBinding.levels = null;
    mockBinding.symbol = null;
    mockBinding.seedQuantity = null;
    mockQuote = { regularMarketPrice: 150 };
  });

  it("shows disconnected state when bound drawing is missing", async () => {
    mockBinding.bind = { cellId: "cell-0", drawingId: "draw-1" };
    mockBinding.symbol = "AAPL";
    mockBinding.levels = null;

    render(<TradeSidebarPanel />);
    expect(await screen.findByText(/No trade setup linked/i)).toBeInTheDocument();
  });

  it("defaults market entry to quote last price", async () => {
    mockBinding.symbol = "AAPL";
    render(<TradeSidebarPanel />);
    expect(await screen.findByTestId("trade-entry-display")).toHaveTextContent("~150.00");
  });

  it("falls back to chart last candle close when quote is missing", async () => {
    mockQuote = null;
    mockBinding.symbol = "AAPL";
    render(<TradeSidebarPanel />);
    expect(await screen.findByTestId("trade-entry-display")).toHaveTextContent("~148.50");
  });

  it("shows policy picker on unbound chart trade ticket", async () => {
    mockBinding.symbol = "AAPL";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          presets: [],
          userTemplates: [
            {
              id: "user_long",
              name: "Long half → BE → 0.5R trail",
              description: "Half at +1R",
              rules: [],
            },
          ],
        }),
      }),
    );
    render(<TradeSidebarPanel />);
    expect(await screen.findByTestId("trade-policy-picker")).toBeInTheDocument();
  });
});
