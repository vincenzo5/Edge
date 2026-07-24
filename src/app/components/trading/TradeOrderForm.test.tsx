import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TradeOrderForm } from "./TradeOrderForm";
import { RiskSettingsProvider } from "../RiskSettingsProvider";

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
    summary: {
      tags: { NetLiquidation: { tag: "NetLiquidation", value: "100000" } },
      updatedAt: Date.now(),
    },
  }),
}));

vi.mock("../AccountAliasesProvider", () => ({
  useAccountAliasesOptional: () => ({
    displayNameFor: () => "DUP586813",
  }),
}));

function renderForm(
  planLevels: {
    direction: "long";
    side: "BUY";
    entry: number;
    stop: number;
    target: number;
    riskRewardRatio: number;
  } | null = null,
) {
  return render(
    <RiskSettingsProvider>
      <TradeOrderForm
        symbol="AAPL"
        planLevels={planLevels}
        lastPrice={100}
        boundActive
        testId="trade-order-form-test"
      />
    </RiskSettingsProvider>,
  );
}

describe("TradeOrderForm size for risk", () => {
  it("fills quantity from plan levels and risk budget", () => {
    renderForm({
      direction: "long",
      side: "BUY",
      entry: 100,
      stop: 95,
      target: 110,
      riskRewardRatio: 2,
    });

    const quantityInput = screen.getByDisplayValue("1");
    expect(quantityInput).toHaveValue(1);

    fireEvent.click(screen.getByTestId("trade-size-for-risk"));
    expect(quantityInput).toHaveValue(200);
  });

  it("does not render size for risk without plan levels", () => {
    renderForm(null);
    expect(screen.queryByTestId("trade-size-for-risk")).not.toBeInTheDocument();
  });

  it("includes outside RTH in draft when toggled", () => {
    renderForm(null);
    fireEvent.click(screen.getByTestId("trade-outside-rth"));
    expect(screen.getByTestId("trade-outside-rth")).toBeChecked();
  });

  it("shows Manage with preset picker when bracket attach is enabled", () => {
    renderForm({
      direction: "long",
      side: "BUY",
      entry: 100,
      stop: 95,
      target: 110,
      riskRewardRatio: 2,
    });

    expect(screen.getByTestId("trade-manage-preset")).toBeInTheDocument();
    fireEvent.change(screen.getByTestId("trade-manage-preset"), {
      target: { value: "break_even" },
    });
    expect(screen.getByTestId("trade-manage-preview")).toBeInTheDocument();
  });
});
