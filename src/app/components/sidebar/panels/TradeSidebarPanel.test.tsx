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
  openTradeFromDrawing: vi.fn(),
  openTradePanel: vi.fn(),
  updateBoundLevels: vi.fn(),
};

vi.mock("../../trading/TradeSetupBindingContext", () => ({
  useTradeSetupBinding: () => mockBinding,
}));

vi.mock("../../ActiveChartContext", () => ({
  useActiveChart: () => ({
    config: { symbol: "AAPL" },
  }),
}));

vi.mock("../../MarketDataProvider", () => ({
  useMarketDataQuotes: () => ({
    quotesBySymbol: new Map([
      [
        "AAPL",
        {
          symbol: "AAPL",
          regularMarketPrice: 150,
          regularMarketChange: null,
          regularMarketChangePercent: null,
          regularMarketVolume: null,
          updatedAt: Date.now(),
        },
      ],
    ]),
  }),
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

vi.mock("@/lib/trading/tradingClient", () => ({
  previewOrder: vi.fn(),
  submitOrder: vi.fn(),
  TradingApiError: class TradingApiError extends Error {
    status = 409;
  },
}));

describe("TradeSidebarPanel", () => {
  beforeEach(() => {
    mockBinding.bind = null;
    mockBinding.levels = null;
    mockBinding.symbol = null;
  });

  it("shows disconnected state when bound drawing is missing", async () => {
    mockBinding.bind = { cellId: "cell-0", drawingId: "draw-1" };
    mockBinding.symbol = "AAPL";
    mockBinding.levels = null;

    render(<TradeSidebarPanel />);
    expect(await screen.findByText(/No trade setup linked/i)).toBeInTheDocument();
  });

  it("shows plan levels when bound drawing is active", async () => {
    mockBinding.bind = { cellId: "cell-0", drawingId: "draw-1" };
    mockBinding.symbol = "AAPL";
    mockBinding.levels = {
      direction: "long",
      side: "BUY",
      entry: 100,
      stop: 95,
      target: 110,
      riskRewardRatio: 2,
    };

    render(<TradeSidebarPanel />);
    expect(await screen.findByText(/Plan \(from drawing\)/i)).toBeInTheDocument();
    expect(screen.getByText("100.00")).toBeInTheDocument();
    expect(screen.getByText("95.00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preview" })).toBeInTheDocument();
  });
});
