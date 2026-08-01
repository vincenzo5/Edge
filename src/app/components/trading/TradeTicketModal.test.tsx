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
      availability: "online",
    },
    activeTradingAccountId: "DUP586813",
    tradingEnvironment: "paper",
    connectionState: "connected",
    disabled: false,
    refresh: vi.fn(),
    summary: {
      tags: {
        NetLiquidation: { tag: "NetLiquidation", value: "100000" },
        AvailableFunds: { tag: "AvailableFunds", value: "50000" },
      },
      updatedAt: Date.now(),
    },
  }),
}));

vi.mock("@/lib/brokerage/whatIfClient", () => ({
  fetchWhatIfPreview: vi.fn().mockResolvedValue({
    initMarginChange: 50,
    maintMarginChange: 25,
    warningText: null,
  }),
  WhatIfClientError: class WhatIfClientError extends Error {},
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
    expect(screen.getByTestId("trade-account-chip")).toHaveTextContent("DUP586813");
    expect(screen.getByTestId("trade-account-chip")).toHaveTextContent("Paper");
    expect(screen.getByRole("button", { name: "Review buy" })).toBeInTheDocument();
  });

  it("advances to confirm step after preview", async () => {
    render(
      <TradeTicketModal open symbol="AAPL" onClose={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Review buy" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Confirm buy" })).toBeInTheDocument();
    });
    expect(previewOrder).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Confirm buy" })).toBeInTheDocument();
  });
});
