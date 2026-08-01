import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
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
