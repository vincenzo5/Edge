import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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
    mockUseAccount.mockReturnValue({
      connectionState: "connected",
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
        },
        updatedAt: Date.now(),
      },
      positions: [
        {
          contract: { symbol: "AAPL", conId: 1 },
          position: 10,
          avgCost: 150,
          marketPrice: 155,
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
    });

    renderPanel();
    expect(screen.getByText("DU123")).toBeInTheDocument();
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText(/Preview only/i)).toBeInTheDocument();
  });
});
