import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AccountPanel } from "./AccountPanel";
import { ChartActionsProvider } from "../../ChartActionsContext";

vi.mock("../../AccountProvider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../AccountProvider")>();
  return {
    ...actual,
    useAccount: vi.fn(),
  };
});

import { useAccount } from "../../AccountProvider";

const mockUseAccount = vi.mocked(useAccount);

function renderPanel() {
  return render(
    <ChartActionsProvider activeCellSymbol="AAPL" loadSymbolIntoActiveChart={vi.fn()}>
      <AccountPanel />
    </ChartActionsProvider>,
  );
}

function connectedAccount(overrides: Partial<ReturnType<typeof useAccount>> = {}) {
  return {
    connectionState: "connected" as const,
    status: {
      enabled: true,
      connected: true,
      accountId: "DU123",
      managedAccounts: ["DU123"],
      timestamp: Date.now(),
    },
    summary: {
      tags: {
        NetLiquidation: { tag: "NetLiquidation", value: "100000" },
        BuyingPower: { tag: "BuyingPower", value: "50000" },
        AvailableFunds: { tag: "AvailableFunds", value: "40000" },
        ExcessLiquidity: { tag: "ExcessLiquidity", value: "30000" },
        InitMarginReq: { tag: "InitMarginReq", value: "50000" },
        MaintMarginReq: { tag: "MaintMarginReq", value: "45000" },
        DayTradesRemaining: { tag: "DayTradesRemaining", value: "3" },
      },
      updatedAt: Date.now(),
    },
    positions: [
      {
        contract: { symbol: "AAPL", conId: 1 },
        position: 10,
        avgCost: 150,
        marketPrice: 155,
        marketValue: 1550,
        unrealizedPNL: 50,
      },
    ],
    pnl: { dailyPnL: 120 },
    orders: [],
    executions: [],
    error: null,
    disabled: false,
    refresh: vi.fn(),
    positionForSymbol: () => null,
    ...overrides,
  };
}

describe("AccountPanel", () => {
  beforeEach(() => {
    mockUseAccount.mockReset();
  });

  it("shows unavailable state when account data cannot load", () => {
    mockUseAccount.mockReturnValue({
      connectionState: "disabled",
      status: null,
      summary: null,
      positions: [],
      pnl: null,
      orders: [],
      executions: [],
      error: null,
      disabled: true,
      refresh: vi.fn(),
      positionForSymbol: () => null,
    });

    renderPanel();
    expect(screen.getByText(/Account tracking is unavailable/i)).toBeInTheDocument();
  });

  it("renders summary and positions when connected", () => {
    mockUseAccount.mockReturnValue(connectedAccount());

    renderPanel();
    expect(screen.getByText("DU123")).toBeInTheDocument();
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.queryByText(/Preview only/i)).not.toBeInTheDocument();
  });

  it("renders refresh icon button with accessible label", () => {
    mockUseAccount.mockReturnValue(connectedAccount());
    renderPanel();
    expect(screen.getByRole("button", { name: "Refresh account" })).toBeInTheDocument();
  });

  it("renders help icons for metric tiles", () => {
    mockUseAccount.mockReturnValue(connectedAccount());
    renderPanel();
    const helpIcons = screen.getAllByLabelText("Help");
    expect(helpIcons.length).toBeGreaterThanOrEqual(6);
  });

  it("shows day trades in net liquidation card", () => {
    mockUseAccount.mockReturnValue(connectedAccount());
    renderPanel();
    expect(screen.getByText("Day trades")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("computes leverage from init margin and net liquidation", () => {
    mockUseAccount.mockReturnValue(connectedAccount());
    renderPanel();
    expect(screen.getByText("0.50")).toBeInTheDocument();
  });

  it("color-codes positive position PnL", () => {
    mockUseAccount.mockReturnValue(connectedAccount());
    renderPanel();
    const pnlCell = screen.getByText("$50.00");
    expect(pnlCell.className).toContain("--edge-positive");
  });

  it("color-codes negative position PnL", () => {
    mockUseAccount.mockReturnValue(
      connectedAccount({
        positions: [
          {
            contract: { symbol: "TSLA", conId: 2 },
            position: -5,
            avgCost: 200,
            marketPrice: 210,
            marketValue: -1050,
            unrealizedPNL: -50,
          },
        ],
      }),
    );
    renderPanel();
    const pnlCell = screen.getByText("-$50.00");
    expect(pnlCell.className).toContain("--edge-negative");
  });

  it("leaves flat position PnL uncolored", () => {
    mockUseAccount.mockReturnValue(
      connectedAccount({
        positions: [
          {
            contract: { symbol: "MSFT", conId: 3 },
            position: 1,
            avgCost: 100,
            marketPrice: 100,
            marketValue: 100,
            unrealizedPNL: 0,
          },
        ],
      }),
    );
    renderPanel();
    const pnlCell = screen.getByText("$0.00");
    expect(pnlCell.className).not.toContain("--edge-positive");
    expect(pnlCell.className).not.toContain("--edge-negative");
  });

  it("renders option fill labels with strike and right", () => {
    mockUseAccount.mockReturnValue(
      connectedAccount({
        executions: [
          {
            execId: "e2",
            side: "SLD",
            shares: 1,
            price: 2.5,
            time: "10:00:00",
            contract: {
              symbol: "AAPL",
              secType: "OPT",
              localSymbol: "AAPL  260718C00200000",
              strike: 200,
              right: "C",
              lastTradeDateOrContractMonth: "20260718",
            },
          },
        ],
      }),
    );
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Today's fills" }));
    expect(screen.getByText(/200C 20260718 · SLD 1 @ 2\.5/)).toBeInTheDocument();
  });

  it("switches between open orders and today's fills tabs", () => {
    mockUseAccount.mockReturnValue(
      connectedAccount({
        orders: [
          {
            orderId: 1,
            symbol: "AAPL",
            action: "BUY",
            totalQuantity: 10,
            orderType: "LMT",
            status: "Submitted",
            filled: 0,
          },
        ],
        executions: [
          {
            execId: "e1",
            symbol: "AAPL",
            side: "BOT",
            shares: 5,
            price: 150,
            time: "09:30:00",
          },
        ],
      }),
    );
    renderPanel();

    expect(screen.getByText(/AAPL · BUY 10 · LMT/)).toBeInTheDocument();
    expect(screen.queryByText(/AAPL · BOT 5 @ 150/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Today's fills" }));
    expect(screen.getByText(/AAPL · BOT 5 @ 150/)).toBeInTheDocument();
    expect(screen.queryByText(/AAPL · BUY 10 · LMT/)).not.toBeInTheDocument();
  });

  it("does not render sort dropdown for positions", () => {
    mockUseAccount.mockReturnValue(connectedAccount());
    renderPanel();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
});
