import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TradeTicketModal from "./TradeTicketModal";

vi.mock("../AccountProvider", () => ({
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
  previewOrder: vi.fn().mockResolvedValue({
    preview: {
      symbol: "AAPL",
      side: "BUY",
      quantity: 1,
      orderType: "MKT",
      warnings: [],
      updatedAt: Date.now(),
    },
    intent: {
      intentId: "intent-1",
      idempotencyKey: "key",
      draft: {
        accountId: "DUP586813",
        symbol: "AAPL",
        side: "BUY",
        quantity: 1,
        orderType: "MKT",
        environment: "paper",
        outsideRth: false,
        tif: "DAY",
      },
      status: "previewed",
      orderRef: "edge-intent-intent-1",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  }),
  submitOrder: vi.fn(),
  TradingApiError: class TradingApiError extends Error {
    status = 409;
  },
}));

import { previewOrder } from "@/lib/trading/tradingClient";

describe("TradeTicketModal", () => {
  beforeEach(() => {
    vi.mocked(previewOrder).mockClear();
  });

  it("renders trade form when open", async () => {
    render(
      <TradeTicketModal open symbol="AAPL" onClose={vi.fn()} />,
    );
    expect(await screen.findByTestId("trade-ticket-modal")).toBeInTheDocument();
    expect(screen.getByText(/Trade AAPL/)).toBeInTheDocument();
    expect(screen.getByText("DUP586813")).toBeInTheDocument();
    expect(screen.queryByText("Paper")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preview" })).toBeInTheDocument();
  });

  it("advances to confirm step after preview", async () => {
    render(
      <TradeTicketModal open symbol="AAPL" onClose={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Confirm & submit" })).toBeInTheDocument();
    });
    expect(previewOrder).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Confirm & submit" })).toBeInTheDocument();
  });
});
