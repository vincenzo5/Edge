import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import OpenRiskPositionsMenu from "./OpenRiskPositionsMenu";
import { AppChromeActionsProvider } from "./AppChromeActionsProvider";
import type { AccountPosition } from "@/lib/marketData/contracts/brokerage";

const handleOpenAccount = vi.fn();
const handleLoadSymbol = vi.fn();
const refresh = vi.fn();

const mockUseAccount = vi.fn();

vi.mock("../AccountProvider", () => ({
  useAccount: () => mockUseAccount(),
}));

vi.mock("./OpenRiskWorkspaceBridge", () => ({
  useOpenRiskNavigation: () => ({
    handleOpenAccount,
    handleLoadSymbol,
  }),
}));

vi.mock("../sidebar/panels/ClosePositionConfirmModal", () => ({
  ClosePositionConfirmModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="close-position-modal" /> : null,
}));

function position(symbol: string, qty: number, unrealizedPNL: number): AccountPosition {
  return {
    contract: { symbol },
    position: qty,
    unrealizedPNL,
    marketValue: Math.abs(qty) * 100,
    updatedAt: Date.now(),
  };
}

function renderMenu(open = false, onOpenChange = vi.fn()) {
  return render(
    <AppChromeActionsProvider>
      <OpenRiskPositionsMenu open={open} onOpenChange={onOpenChange} />
    </AppChromeActionsProvider>,
  );
}

vi.mock("../trading/usePlaybookInstances", () => ({
  usePlaybookInstances: () => ({ instances: [], refresh: vi.fn() }),
}));

describe("OpenRiskPositionsMenu", () => {
  beforeEach(() => {
    handleOpenAccount.mockReset();
    handleLoadSymbol.mockReset();
    refresh.mockReset();
    mockUseAccount.mockReturnValue({
      activeTradingAccount: {
        broker: "ib",
        connectionId: "ib-paper",
        accountId: "DUP586813",
        environment: "paper",
        availability: "online",
      },
      activeTradingAccountId: "DUP586813",
      tradingEnvironment: "paper",
      connectionState: "connected",
      positions: [position("AAPL", 10, 125.5), position("BBD", 1, -0.04)],
      ordersForActiveAccount: [],
      pnl: { unrealizedPnL: 125.46, dailyPnL: 0, realizedPnL: 0, updatedAt: Date.now() },
      refresh,
    });
  });

  it("hides chip when flat", () => {
    mockUseAccount.mockReturnValue({
      activeTradingAccount: null,
      activeTradingAccountId: null,
      tradingEnvironment: "paper",
      connectionState: "connected",
      positions: [],
      pnl: null,
      refresh,
    });
    renderMenu();
    expect(screen.queryByTestId("app-header-open-risk")).toBeNull();
  });

  it("shows flat chip with open count, unrealized, and positive tone", () => {
    renderMenu();
    const chip = screen.getByTestId("app-header-open-risk");
    expect(chip).toHaveTextContent("2 open");
    expect(chip).toHaveTextContent("$125.46");
    expect(chip).toHaveAttribute("data-pnl-tone", "positive");
    expect(chip.className).toContain("--edge-positive");
    expect(screen.queryByText("Risk")).toBeNull();
  });

  it("tones chip negative when unrealized is down", () => {
    mockUseAccount.mockReturnValue({
      activeTradingAccount: {
        broker: "ib",
        connectionId: "ib-paper",
        accountId: "DUP586813",
        environment: "paper",
        availability: "online",
      },
      activeTradingAccountId: "DUP586813",
      tradingEnvironment: "paper",
      connectionState: "connected",
      positions: [position("F", 4, -3.2)],
      pnl: { unrealizedPnL: -3.2, dailyPnL: 0, realizedPnL: 0, updatedAt: Date.now() },
      refresh,
    });
    renderMenu();
    const chip = screen.getByTestId("app-header-open-risk");
    expect(chip).toHaveAttribute("data-pnl-tone", "negative");
    expect(chip.className).toContain("--edge-negative");
  });

  it("opens popover and lists positions", () => {
    renderMenu(true);
    expect(screen.getByTestId("open-risk-positions-popover")).toBeInTheDocument();
    expect(screen.getByTestId("open-risk-row-AAPL")).toBeInTheDocument();
    expect(screen.getByTestId("open-risk-row-BBD")).toBeInTheDocument();
  });

  it("routes footer actions", () => {
    renderMenu(true);
    fireEvent.click(screen.getByTestId("open-risk-open-account"));
    expect(handleOpenAccount).toHaveBeenCalled();
    expect(screen.getByTestId("open-risk-journal-opens")).toHaveAttribute(
      "href",
      "/workspace?surface=journal&journalView=open",
    );
  });

  it("loads symbol from row click", () => {
    renderMenu(true);
    fireEvent.click(screen.getByText("AAPL"));
    expect(handleLoadSymbol).toHaveBeenCalledWith("AAPL");
  });

  it("shows unprotected callout on bare position", () => {
    renderMenu(true);
    expect(screen.getByTestId("open-position-unprotected-AAPL")).toBeInTheDocument();
    expect(screen.getByTestId("open-position-protect-AAPL")).toHaveTextContent("Protect: Unprotected");
  });

  it("shows protect label when stop order present", () => {
    mockUseAccount.mockReturnValue({
      activeTradingAccount: {
        broker: "ib",
        connectionId: "ib-paper",
        accountId: "DUP586813",
        environment: "paper",
        availability: "online",
      },
      activeTradingAccountId: "DUP586813",
      tradingEnvironment: "paper",
      connectionState: "connected",
      positions: [position("AAPL", 10, 125.5)],
      ordersForActiveAccount: [
        {
          orderId: 1,
          symbol: "AAPL",
          account: "DUP586813",
          action: "SELL",
          orderType: "STP",
          auxPrice: 180,
          status: "Submitted",
        },
      ],
      pnl: { unrealizedPnL: 125.5, dailyPnL: 0, realizedPnL: 0, updatedAt: Date.now() },
      refresh,
    });
    renderMenu(true);
    expect(screen.getByTestId("open-position-protect-AAPL")).toHaveTextContent("Protect: STP 180.00");
    expect(screen.queryByTestId("open-position-unprotected-AAPL")).toBeNull();
  });

  it("routes protect action to open account", () => {
    renderMenu(true);
    fireEvent.click(screen.getByTestId("open-position-protect-action-AAPL"));
    expect(handleOpenAccount).toHaveBeenCalled();
  });

  it("opens close modal from row action", () => {
    renderMenu(true);
    fireEvent.click(screen.getByTestId("open-risk-close-AAPL"));
    expect(screen.getByTestId("close-position-modal")).toBeInTheDocument();
  });
});
