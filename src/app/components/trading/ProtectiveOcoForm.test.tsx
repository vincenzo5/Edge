import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ProtectiveOcoForm } from "./ProtectiveOcoForm";
import { RiskSettingsProvider } from "../RiskSettingsProvider";

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
      <RiskSettingsProvider>
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
        />
      </RiskSettingsProvider>,
    );

    expect(screen.getByTestId("protective-oco-manage-preset")).toBeInTheDocument();
    fireEvent.change(screen.getByTestId("protective-oco-manage-preset"), {
      target: { value: "break_even" },
    });
    expect(screen.getByTestId("trade-manage-preview")).toBeInTheDocument();
  });

  it("shows Risk plan summary with Protect and failure mode", () => {
    render(
      <RiskSettingsProvider>
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
        />
      </RiskSettingsProvider>,
    );

    expect(screen.getByTestId("submit-risk-plan-summary")).toBeInTheDocument();
    expect(screen.getByTestId("submit-risk-plan-size")).toHaveTextContent("10 sh");
    expect(screen.getByTestId("submit-risk-plan-protect")).toHaveTextContent("TP");
    expect(screen.getByTestId("submit-risk-plan-failure-mode")).toHaveTextContent(
      "Broker stop stays live if Edge is down",
    );
  });
});
