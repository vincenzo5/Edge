import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ProtectiveOcoForm } from "./ProtectiveOcoForm";

vi.mock("@/lib/trading/tradingClient", () => ({
  submitProtectiveOco: vi.fn(async () => ({
    stopOrder: { orderId: 20 },
    takeProfitOrder: { orderId: 21 },
    orderRef: "edge-oco-test",
    playbookInstance: { templateId: "break_even" },
  })),
  TradingApiError: class TradingApiError extends Error {
    status = 400;
  },
}));

describe("ProtectiveOcoForm", () => {
  it("shows Manage with preset picker", () => {
    render(
      <ProtectiveOcoForm
        position={{
          contract: { symbol: "AAPL", secType: "STK" },
          position: 10,
          avgCost: 100,
        }}
        account={{
          broker: "ib",
          connectionId: "ib-paper",
          accountId: "DUP586813",
          environment: "paper",
          availability: "online",
        }}
        onClose={() => {}}
      />,
    );

    expect(screen.getByTestId("protective-oco-manage-preset")).toBeInTheDocument();
    fireEvent.change(screen.getByTestId("protective-oco-manage-preset"), {
      target: { value: "break_even" },
    });
    expect(screen.getByTestId("trade-manage-preview")).toBeInTheDocument();
  });
});
