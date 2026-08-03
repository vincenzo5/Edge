import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  formatLimitPriceInput,
  handleOrderTypeTabChange,
  seedLimitPriceFromLast,
  TradeOrderForm,
} from "./TradeOrderForm";
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
    disabled: false,
    summary: {
      tags: {
        NetLiquidation: { tag: "NetLiquidation", value: "100000" },
        AvailableFunds: { tag: "AvailableFunds", value: "50000" },
        ExcessLiquidity: { tag: "ExcessLiquidity", value: "50000" },
        InitMarginReq: { tag: "InitMarginReq", value: "10000" },
      },
      updatedAt: Date.now(),
    },
  }),
}));

vi.mock("../AccountAliasesProvider", () => ({
  useAccountAliasesOptional: () => ({
    displayNameFor: () => "DUP586813",
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

import { previewOrder, submitBracket } from "@/lib/trading/tradingClient";
import { HALF_THEN_BE_PRESET } from "@/lib/trading/playbook/presets";

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

    const quantityInput = screen.getByTestId("trade-quantity");
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

    expect(screen.getByTestId("trade-quantity")).toHaveValue(150);
    expect(onSeedQuantityApplied).toHaveBeenCalled();
  });

  it("does not render size for risk without entry and stop", () => {
    render(
      <RiskSettingsProvider>
        <TradeOrderForm symbol="AAPL" lastPrice={null} boundActive testId="trade-order-form-test" />
      </RiskSettingsProvider>,
    );
    expect(screen.queryByTestId("trade-size-for-risk")).not.toBeInTheDocument();
  });

  it("uses buy/sell toggle and order type tabs", () => {
    renderForm(null);
    expect(screen.getByTestId("trade-buy-sell-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("trade-side-buy")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("trade-order-type-tabs")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Market" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Limit" })).toBeInTheDocument();
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
    expect(screen.getByTestId("trade-order-impact-notional")).toHaveTextContent("100.00");
  });

  it("auto-fills limit entry with last price when switching to Limit", () => {
    renderForm(null);
    fireEvent.click(screen.getByRole("tab", { name: "Limit" }));
    expect(screen.getByTestId("trade-limit-price")).toHaveValue(100);
  });

  it("seeds stop price when switching to Stop tab", () => {
    renderForm({
      direction: "long",
      side: "BUY",
      entry: 100,
      stop: 95,
      target: 110,
      riskRewardRatio: 2,
    });
    fireEvent.click(screen.getByRole("tab", { name: "Stop" }));
    expect(screen.getByTestId("trade-stop-price")).toHaveValue(95);
  });

  it("rounds seeded limit prices to 2 decimal places", () => {
    expect(formatLimitPriceInput(556.7100219726562)).toBe("556.71");
    expect(
      seedLimitPriceFromLast({
        currentLimitPrice: "",
        planEntry: null,
        lastPrice: 556.7100219726562,
      }),
    ).toBe("556.71");
    expect(
      handleOrderTypeTabChange({
        nextType: "STP",
        planEntry: 100,
        planStop: 95,
        lastPrice: 100,
        currentLimitPrice: "",
        currentStopPrice: "",
      }).stopPrice,
    ).toBe("95.00");
  });

  it("always shows linked Take Profit and Stop Loss on compose", () => {
    renderForm(null);
    expect(screen.getByTestId("trade-linked-protect")).toBeInTheDocument();
    expect(screen.getByTestId("trade-linked-protect-take-profit-enabled")).toBeChecked();
    expect(screen.getByTestId("trade-linked-protect-stop-loss-enabled")).toBeChecked();
    expect(screen.getByTestId("trade-linked-protect-stop-loss-price")).toHaveValue(98);
    expect(screen.getByTestId("trade-linked-protect-take-profit-price")).toHaveValue(104);
  });

  it("seeds linked TP/SL from drawing on compose", () => {
    renderForm({
      direction: "long",
      side: "BUY",
      entry: 100,
      stop: 95,
      target: 110,
      riskRewardRatio: 2,
    });
    expect(screen.getByTestId("trade-linked-protect")).toBeInTheDocument();
    expect(screen.getByTestId("trade-linked-protect-stop-loss-price")).toHaveValue(95);
    expect(screen.getByTestId("trade-linked-protect-take-profit-price")).toHaveValue(110);
    expect(screen.getByTestId("trade-linked-protect-stop-loss-enabled")).toBeChecked();
    expect(screen.getByTestId("trade-linked-protect-take-profit-enabled")).toBeChecked();
  });

  it("shows Review panel risk, reward, and R:R when bracket is on", () => {
    renderForm({
      direction: "long",
      side: "BUY",
      entry: 100,
      stop: 95,
      target: 110,
      riskRewardRatio: 2,
    });
    expect(screen.getByTestId("trade-order-impact")).toHaveTextContent("Review");
    expect(screen.getByTestId("trade-order-impact-notional")).toHaveTextContent("100.00");
    expect(screen.getByTestId("trade-order-impact-risk")).toHaveTextContent("5.00");
    expect(screen.getByTestId("trade-order-impact-reward")).toHaveTextContent("10.00");
    expect(screen.getByTestId("trade-order-impact-rr")).toHaveTextContent("1:2.0");
  });

  it("shows Add stop in Review when protect is unchecked and restores on click", () => {
    renderForm({
      direction: "long",
      side: "BUY",
      entry: 100,
      stop: 95,
      target: 110,
      riskRewardRatio: 2,
    });
    fireEvent.click(screen.getByTestId("trade-linked-protect-stop-loss-enabled"));
    fireEvent.click(screen.getByTestId("trade-linked-protect-take-profit-enabled"));
    expect(screen.getByTestId("trade-order-impact-add-stop")).toHaveTextContent("Add stop");
    expect(screen.queryByTestId("trade-order-impact-reward")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("trade-order-impact-add-stop"));
    expect(screen.getByTestId("trade-linked-protect-stop-loss-enabled")).toBeChecked();
    expect(screen.getByTestId("trade-linked-protect-take-profit-enabled")).toBeChecked();
    expect(screen.getByTestId("trade-order-impact-risk")).toHaveTextContent("5.00");
  });

  it("uses summarizing CTA and advances to confirm on click", async () => {
    renderForm(null);
    expect(screen.getByTestId("trade-primary-cta")).toHaveTextContent("BUY 1 AAPL @ MKT MKT");
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
    fireEvent.click(screen.getByTestId("trade-side-sell"));
    expect(screen.getByTestId("trade-side-sell")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("trade-primary-cta")).toHaveTextContent("SELL 1 AAPL @ MKT MKT");
  });

  it("shows Time in Force and Extended hours on the session row", () => {
    renderForm(null);
    expect(screen.getByTestId("trade-session-row")).toBeInTheDocument();
    expect(screen.getByTestId("trade-tif")).toBeInTheDocument();
    expect(screen.getByTestId("trade-outside-rth")).toHaveAttribute("aria-checked", "false");
    expect(screen.getByTestId("trade-order-impact-risk")).toHaveTextContent("2.00");
    expect(screen.getByTestId("trade-advanced-toggle")).toBeInTheDocument();
  });

  it("includes extended hours in draft when toggled on compose", async () => {
    renderForm(null);
    fireEvent.click(screen.getByTestId("trade-outside-rth"));
    expect(screen.getByTestId("trade-outside-rth")).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByTestId("trade-primary-cta"));
    await waitFor(() => {
      expect(previewOrder).toHaveBeenCalled();
    });
    expect(vi.mocked(previewOrder).mock.calls.at(-1)?.[0]).toMatchObject({
      outsideRth: true,
    });
  });

  it("carries GTC from Time in Force select into preview draft", async () => {
    renderForm(null);
    fireEvent.click(screen.getByTestId("trade-tif"));
    fireEvent.click(screen.getByTestId("trade-tif-option-GTC"));
    fireEvent.click(screen.getByTestId("trade-primary-cta"));
    await waitFor(() => {
      expect(previewOrder).toHaveBeenCalled();
    });
    expect(vi.mocked(previewOrder).mock.calls.at(-1)?.[0]).toMatchObject({
      tif: "GTC",
    });
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

  it("folds Risk plan into Review disclosure with Budget, Bracket, and Manage", () => {
    renderForm({
      direction: "long",
      side: "BUY",
      entry: 100,
      stop: 95,
      target: 110,
      riskRewardRatio: 2,
    });

    expect(screen.getByTestId("trade-risk-plan-toggle")).toBeInTheDocument();
    expect(screen.queryByTestId("submit-risk-plan-summary")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("trade-risk-plan-toggle"));
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

  it("shows Risk plan teaser when bracket defaults are seeded", () => {
    renderForm(null);
    expect(screen.getByTestId("trade-risk-plan-toggle")).toBeInTheDocument();
  });

  it("hides Risk plan teaser when protect is disabled", () => {
    renderForm(null);
    fireEvent.click(screen.getByTestId("trade-linked-protect-stop-loss-enabled"));
    fireEvent.click(screen.getByTestId("trade-linked-protect-take-profit-enabled"));
    expect(screen.queryByTestId("trade-risk-plan-toggle")).not.toBeInTheDocument();
  });

  it("places Review directly above the primary CTA", () => {
    renderForm(null);
    const review = screen.getByTestId("trade-order-impact");
    const cta = screen.getByTestId("trade-primary-cta");
    expect(review.compareDocumentPosition(cta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

const userLongPolicy = {
  ...HALF_THEN_BE_PRESET,
  id: "user_long",
  name: "Long half → BE → 0.5R trail",
  geometry: {
    stops: [{ rMultiple: 1 }],
    targets: [{ rMultiple: 1 }],
  },
};

describe("TradeOrderForm policy picker", () => {
  beforeEach(() => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 0;
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ templates: [] }),
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows policy picker when enabled on unbound ticket", () => {
    render(
      <RiskSettingsProvider>
        <TradeOrderForm
          symbol="META"
          lastPrice={100}
          boundActive
          policyPickerEnabled
          policyTemplates={[userLongPolicy]}
          onPolicyChange={vi.fn()}
          testId="trade-order-form-test"
        />
      </RiskSettingsProvider>,
    );
    expect(screen.getByTestId("trade-policy-picker")).toBeInTheDocument();
  });

  it("applies draft patch with half TP and full stop qty", () => {
    const onConsumed = vi.fn();
    const { rerender } = render(
      <RiskSettingsProvider>
        <TradeOrderForm
          symbol="META"
          lastPrice={100}
          boundActive
          selectedPolicyId="user_long"
          policyTemplates={[userLongPolicy]}
          onPolicyDraftConsumed={onConsumed}
          testId="trade-order-form-test"
        />
      </RiskSettingsProvider>,
    );
    fireEvent.change(screen.getByTestId("trade-quantity"), { target: { value: "200" } });
    rerender(
      <RiskSettingsProvider>
        <TradeOrderForm
          symbol="META"
          lastPrice={100}
          boundActive
          selectedPolicyId="user_long"
          policyTemplates={[userLongPolicy]}
          policyDraftPatch={{
            takeProfitQuantity: 100,
            stopQuantity: 200,
            takeProfitPrice: 105,
            stopLossPrice: 95,
            manageTemplateId: "user_long",
            takeProfitEnabled: true,
            stopLossEnabled: true,
            partialGeometry: false,
          }}
          onPolicyDraftConsumed={onConsumed}
          testId="trade-order-form-test"
        />
      </RiskSettingsProvider>,
    );
    expect(screen.getByTestId("trade-linked-protect-take-profit-qty")).toHaveValue(100);
    expect(screen.getByTestId("trade-linked-protect-stop-loss-qty")).toHaveValue(200);
    expect(onConsumed).toHaveBeenCalled();
  });

  it("shows runner strip when draft policy is selected", () => {
    render(
      <RiskSettingsProvider>
        <TradeOrderForm
          symbol="META"
          lastPrice={100}
          boundActive
          selectedPolicyId="user_long"
          policyTemplates={[userLongPolicy]}
          policyPickerEnabled
          onPolicyChange={vi.fn()}
          policyDraftPatch={{
            takeProfitQuantity: 100,
            stopQuantity: 200,
            takeProfitPrice: 105,
            stopLossPrice: 95,
            manageTemplateId: "user_long",
            takeProfitEnabled: true,
            stopLossEnabled: true,
            partialGeometry: false,
          }}
          testId="trade-order-form-test"
        />
      </RiskSettingsProvider>,
    );
    fireEvent.change(screen.getByTestId("trade-quantity"), { target: { value: "200" } });
    expect(screen.getByTestId("trade-exit-plan")).toHaveTextContent("Runner · 100 sh");
  });

  it("submits split bracket with playbook template on unbound draft policy", async () => {
    vi.mocked(submitBracket).mockResolvedValue({
      orderRef: "parent-1",
      entryOrder: { orderId: "entry-1" },
      stopOrder: { orderId: "stop-1" },
      takeProfitOrder: { orderId: "tp-1" },
      intent: { intentId: "intent-bracket" },
    } as never);

    render(
      <RiskSettingsProvider>
        <TradeOrderForm
          symbol="META"
          lastPrice={100}
          boundActive
          selectedPolicyId="user_long"
          policyTemplates={[userLongPolicy]}
          policyPickerEnabled
          onPolicyChange={vi.fn()}
          policyDraftPatch={{
            takeProfitQuantity: 100,
            stopQuantity: 200,
            takeProfitPrice: 105,
            stopLossPrice: 95,
            manageTemplateId: "user_long",
            takeProfitEnabled: true,
            stopLossEnabled: true,
            partialGeometry: false,
          }}
          testId="trade-order-form-test"
        />
      </RiskSettingsProvider>,
    );

    fireEvent.change(screen.getByTestId("trade-quantity"), { target: { value: "200" } });
    fireEvent.click(screen.getByTestId("trade-primary-cta"));
    await waitFor(() => expect(previewOrder).toHaveBeenCalled());
    fireEvent.click(screen.getByTestId("trade-confirm-submit"));
    await waitFor(() => expect(submitBracket).toHaveBeenCalled());
    expect(vi.mocked(submitBracket).mock.calls.at(-1)?.[0]).toMatchObject({
      plan: expect.objectContaining({
        takeProfitQuantity: 100,
        stopQuantity: 200,
      }),
      playbookTemplateId: "user_long",
    });
  });
});
