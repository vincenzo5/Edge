import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

vi.mock("@/lib/trading/tradingClient", () => ({
  previewOrder: vi.fn().mockResolvedValue({
    preview: {
      symbol: "AAPL",
      side: "BUY",
      quantity: 1,
      orderType: "MKT",
      warnings: [],
      commission: 0,
      initMarginChange: 0,
      maintMarginChange: 0,
      equityWithLoanChange: 0,
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
  submitBracket: vi.fn(),
  promotePlannedInstance: vi.fn(),
  armPlannedSchedule: vi.fn(),
  TradingApiError: class TradingApiError extends Error {
    status = 409;
  },
}));

import { previewOrder } from "@/lib/trading/tradingClient";

function renderForm(
  planLevels: {
    direction: "long";
    side: "BUY";
    entry: number;
    stop: number;
    target: number;
    riskRewardRatio: number;
  } | null = null,
  options?: { seedQuantity?: number | null; onSeedQuantityApplied?: () => void },
) {
  return render(
    <RiskSettingsProvider>
      <TradeOrderForm
        symbol="AAPL"
        planLevels={planLevels}
        lastPrice={100}
        boundActive
        seedQuantity={options?.seedQuantity ?? null}
        onSeedQuantityApplied={options?.onSeedQuantityApplied}
        testId="trade-order-form-test"
      />
    </RiskSettingsProvider>,
  );
}

function openAdvanced() {
  fireEvent.click(screen.getByTestId("trade-advanced-toggle"));
}

describe("TradeOrderForm size for risk", () => {
  beforeEach(() => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 0;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ templates: [] }),
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it("seeds quantity from Risk Use in Trade handoff", () => {
    const onSeedQuantityApplied = vi.fn();
    renderForm(
      {
        direction: "long",
        side: "BUY",
        entry: 100,
        stop: 95,
        target: 110,
        riskRewardRatio: 2,
      },
      { seedQuantity: 150, onSeedQuantityApplied },
    );

    expect(screen.getByDisplayValue("150")).toHaveValue(150);
    expect(onSeedQuantityApplied).toHaveBeenCalled();
  });

  it("does not render size for risk without plan levels", () => {
    renderForm(null);
    expect(screen.queryByTestId("trade-size-for-risk")).not.toBeInTheDocument();
  });

  it("uses order type dropdown instead of market/limit tabs", () => {
    renderForm(null);
    expect(screen.getByTestId("trade-order-type")).toHaveTextContent("Market");
    expect(screen.queryByRole("tab", { name: "Limit" })).not.toBeInTheDocument();
  });

  it("places side, quantity, and type on one primary row", () => {
    renderForm(null);
    expect(screen.getByTestId("trade-side")).toBeInTheDocument();
    expect(screen.getByTestId("trade-quantity")).toBeInTheDocument();
    expect(screen.getByTestId("trade-order-type")).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Buy" })).not.toBeInTheDocument();
  });

  it("shows read-only entry for market orders", () => {
    renderForm({
      direction: "long",
      side: "BUY",
      entry: 100,
      stop: 95,
      target: 110,
      riskRewardRatio: 2,
    });
    expect(screen.getByTestId("trade-entry-display")).toHaveTextContent("~100.00");
  });

  it("defaults market entry to last price without plan levels", () => {
    renderForm(null);
    expect(screen.getByTestId("trade-entry-display")).toHaveTextContent("~100.00");
    expect(screen.getByTestId("trade-compose-status")).toHaveTextContent("~100.00");
  });

  it("auto-fills limit entry with last price when switching to Limit", () => {
    renderForm(null);
    fireEvent.click(screen.getByTestId("trade-order-type"));
    fireEvent.click(screen.getByTestId("trade-order-type-option-LMT"));
    expect(screen.getByTestId("trade-limit-price")).toHaveValue(100);
  });

  it("shows bracket toggle on compose without opening Advanced", () => {
    renderForm({
      direction: "long",
      side: "BUY",
      entry: 100,
      stop: 95,
      target: 110,
      riskRewardRatio: 2,
    });
    expect(screen.getByTestId("trade-bracket-surface")).toBeInTheDocument();
    expect(screen.getByTestId("trade-attach-bracket")).toBeChecked();
    expect(screen.getByTestId("trade-bracket-risk-line")).toHaveTextContent("Stop 95.00");
    expect(screen.getByTestId("trade-bracket-risk-line")).toHaveTextContent("risk");
  });

  it("includes risk in compose status when bracket is on", () => {
    renderForm({
      direction: "long",
      side: "BUY",
      entry: 100,
      stop: 95,
      target: 110,
      riskRewardRatio: 2,
    });
    expect(screen.getByTestId("trade-compose-status")).toHaveTextContent("Stop 95.00");
    expect(screen.getByTestId("trade-compose-status")).toHaveTextContent("risk");
    expect(screen.getByTestId("trade-compose-status")).toHaveTextContent("R:R 2.0");
  });

  it("shows Bracket off in compose status when bracket is unchecked", () => {
    renderForm({
      direction: "long",
      side: "BUY",
      entry: 100,
      stop: 95,
      target: 110,
      riskRewardRatio: 2,
    });
    fireEvent.click(screen.getByTestId("trade-attach-bracket"));
    expect(screen.getByTestId("trade-compose-status")).toHaveTextContent("Bracket off");
  });

  it("uses Buy symbol CTA and advances to confirm on click", async () => {
    renderForm(null);
    expect(screen.getByTestId("trade-primary-cta")).toHaveTextContent("Buy AAPL");
    fireEvent.click(screen.getByTestId("trade-primary-cta"));
    await waitFor(() => {
      expect(screen.getByTestId("trade-confirm-submit")).toBeInTheDocument();
    });
    expect(previewOrder).toHaveBeenCalled();
    expect(screen.getByTestId("trade-confirm-headline")).toHaveTextContent(
      "BUY 1 AAPL @ MKT · MKT · DAY",
    );
  });

  it("shows Cancel and Confirm buy on confirm step; Cancel returns to form", async () => {
    renderForm(null);
    fireEvent.click(screen.getByTestId("trade-primary-cta"));
    await waitFor(() => {
      expect(screen.getByTestId("trade-confirm-submit")).toHaveTextContent("Confirm buy");
    });
    fireEvent.click(screen.getByTestId("trade-confirm-cancel"));
    expect(screen.getByTestId("trade-primary-cta")).toBeInTheDocument();
  });

  it("updates CTA label when side changes to Sell", () => {
    renderForm(null);
    fireEvent.click(screen.getByTestId("trade-side"));
    fireEvent.click(screen.getByTestId("trade-side-option-SELL"));
    expect(screen.getByTestId("trade-primary-cta")).toHaveTextContent("Sell AAPL");
  });

  it("shows compose status with Day while Advanced is collapsed", () => {
    renderForm(null);
    expect(screen.getByTestId("trade-compose-status")).toHaveTextContent("DAY");
    expect(screen.queryByTestId("trade-outside-rth")).not.toBeInTheDocument();
  });

  it("includes outside RTH in draft when toggled in Advanced", () => {
    renderForm(null);
    openAdvanced();
    fireEvent.click(screen.getByTestId("trade-outside-rth"));
    expect(screen.getByTestId("trade-outside-rth")).toBeChecked();
    expect(screen.getByTestId("trade-compose-status")).toHaveTextContent("Outside RTH");
  });

  it("carries GTC from Advanced TIF select to compose status", () => {
    renderForm(null);
    openAdvanced();
    fireEvent.click(screen.getByTestId("trade-tif"));
    fireEvent.click(screen.getByTestId("trade-tif-option-GTC"));
    expect(screen.getByTestId("trade-compose-status")).toHaveTextContent("GTC");
  });

  it("shows Manage with preset picker when bracket attach is enabled in Advanced", () => {
    renderForm({
      direction: "long",
      side: "BUY",
      entry: 100,
      stop: 95,
      target: 110,
      riskRewardRatio: 2,
    });

    openAdvanced();
    expect(screen.getByTestId("trade-manage-preset")).toBeInTheDocument();
    fireEvent.change(screen.getByTestId("trade-manage-preset"), {
      target: { value: "break_even" },
    });
    expect(screen.getByTestId("trade-manage-preview")).toBeInTheDocument();
  });

  it("shows Risk plan summary on compose with Budget, Bracket, and Manage", () => {
    renderForm({
      direction: "long",
      side: "BUY",
      entry: 100,
      stop: 95,
      target: 110,
      riskRewardRatio: 2,
    });

    expect(screen.getByTestId("submit-risk-plan-summary")).toBeInTheDocument();
    expect(screen.getByTestId("submit-risk-plan-protect")).toHaveTextContent("STP 95.00");
    openAdvanced();
    fireEvent.change(screen.getByTestId("trade-manage-preset"), {
      target: { value: "break_even" },
    });
    expect(screen.getByTestId("submit-risk-plan-manage")).toHaveTextContent("Break-even");
    expect(screen.getByTestId("submit-risk-plan-failure-mode")).toHaveTextContent(
      "Broker stop stays live if Edge is down",
    );
  });
});
