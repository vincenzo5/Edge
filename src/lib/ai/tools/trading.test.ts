import { describe, expect, it, vi } from "vitest";
import { executeTool } from "../adapters/execute";
import { tradingTools } from "./trading";
import { createToolRegistry } from "../registry";
import type { ToolContext } from "../context";
import type { TradingPort } from "../tradingPort";

const registry = createToolRegistry(tradingTools);

function mockTradingPort(): TradingPort {
  return {
    listAccounts: vi.fn().mockResolvedValue({
      accounts: [
        {
          broker: "ib",
          connectionId: "tws",
          accountId: "DUP586813",
          environment: "paper",
        },
      ],
      defaultAccountId: "DUP586813",
    }),
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
    submitOrder: vi.fn().mockResolvedValue({
      order: { orderId: 9, status: "Submitted", symbol: "AAPL" },
      orderRef: "edge-intent-intent-1",
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
        status: "submitted",
        orderRef: "edge-intent-intent-1",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    }),
    cancelOrder: vi.fn(),
    previewPlaybook: vi.fn().mockResolvedValue({
      template: {
        id: "break_even",
        name: "Break-even",
        description: "Move stop to entry at +1R.",
        ruleCount: 1,
      },
      positionPlan: {
        symbol: "AAPL",
        accountId: "DUP586813",
        side: "BUY",
        entry: 100,
        initialStop: 95,
        qty: 10,
        rUnit: 5,
        environment: "paper",
        lockedAt: new Date().toISOString(),
      },
      steps: [
        {
          ruleId: "be-at-1r",
          label: "Break-even at +1R",
          when: { kind: "multipleOfR", multiple: 1 },
          then: { kind: "modifyStop", breakEven: true },
          triggerPrice: 105,
          stopPrice: 100,
        },
      ],
    }),
    attachPlaybook: vi.fn().mockResolvedValue({
      id: "inst-playbook-1",
      templateId: "break_even",
      status: "armed",
      orderRef: "edge-playbook-1",
      orderIntentId: null,
    }),
  };
}

function mockContext(trading: TradingPort, risk?: ToolContext["risk"]): ToolContext {
  return {
    clientSession: false,
    app: null,
    chart: null,
    watchlist: null,
    screener: null,
    risk: risk ?? null,
    account: null,
    options: null,
    trading,
    journal: null,
    alerts: null,
    research: null,
    marketData: {
      searchSymbols: vi.fn(),
      getCandles: vi.fn(),
      getQuotes: vi.fn(),
      getFundamentals: vi.fn(),
      getOptionExpirations: vi.fn(),
      getOptionsChain: vi.fn(),
    },
  };
}

const draft = {
  accountId: "DUP586813",
  symbol: "AAPL",
  side: "BUY" as const,
  quantity: 1,
  orderType: "MKT" as const,
  environment: "paper" as const,
  outsideRth: false,
  tif: "DAY" as const,
};

describe("trading AI tools", () => {
  it("previews risk policy with slot-complete summary", async () => {
    const trading = mockTradingPort();
    const result = await executeTool(
      registry,
      "preview_risk_policy",
      {
        environment: "paper",
        side: "BUY",
        quantity: 100,
        dollarRisk: 1000,
        entry: 100,
        initialStop: 95,
        takeProfitPrice: 110,
        attachProtect: true,
        managePresetId: "half_then_be",
      },
      mockContext(trading),
      { permissionMode: "read" },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toMatchObject({
        geometry: {
          direction: "long",
          entry: 100,
          initialStop: 95,
          takeProfitPrice: 110,
        },
        protect: { attached: true },
        manage: { label: "Half then BE" },
      });
    }
    expect(trading.previewOrder).not.toHaveBeenCalled();
  });

  it("fills dollarRisk from get_risk_settings when omitted", async () => {
    const trading = mockTradingPort();
    const result = await executeTool(
      registry,
      "preview_risk_policy",
      {
        side: "BUY",
        quantity: 50,
        entry: 200,
        initialStop: 195,
        attachProtect: false,
        managePresetId: "off",
      },
      mockContext(trading, {
        getRiskSettings: () => ({
          settings: { mode: "usd", value: 500, basisAccountId: null },
          dollarRisk: 500,
          basisStale: false,
        }),
      }),
      { permissionMode: "read" },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect((result.data as { budget: { label: string } }).budget.label).toBe("$500");
    }
  });

  it("previews orders via trading port", async () => {
    const trading = mockTradingPort();
    const result = await executeTool(
      registry,
      "preview_order",
      draft,
      mockContext(trading),
      { permissionMode: "write" },
    );
    expect(result.ok).toBe(true);
    expect(trading.previewOrder).toHaveBeenCalled();
  });

  it("requires confirmation for place_order", async () => {
    const trading = mockTradingPort();
    const result = await executeTool(
      registry,
      "place_order",
      {
        draft,
        idempotencyKey: "key-1",
        previewIntentId: "intent-1",
      },
      mockContext(trading),
      { permissionMode: "full", confirmed: false },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("confirmation_required");
  });

  it("denies place_order in write permission mode", async () => {
    const trading = mockTradingPort();
    const result = await executeTool(
      registry,
      "place_order",
      {
        draft,
        idempotencyKey: "key-1",
        previewIntentId: "intent-1",
      },
      mockContext(trading),
      { permissionMode: "write", confirmed: true },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("permission_denied");
  });

  it("submits order when confirmation is validated server-side in full mode", async () => {
    const trading = mockTradingPort();
    const result = await executeTool(
      registry,
      "place_order",
      {
        draft,
        idempotencyKey: "key-1",
        previewIntentId: "intent-1",
      },
      mockContext(trading),
      { permissionMode: "full", confirmationValidatedByServer: true },
    );
    expect(result.ok).toBe(true);
    expect(trading.submitOrder).toHaveBeenCalled();
  });

  it("rejects bare confirmed without token", async () => {
    const trading = mockTradingPort();
    const result = await executeTool(
      registry,
      "place_order",
      {
        draft,
        idempotencyKey: "key-1",
        previewIntentId: "intent-1",
      },
      mockContext(trading),
      { permissionMode: "full", confirmed: true },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("confirmation_required");
  });

  it("previews playbook via trading port", async () => {
    const trading = mockTradingPort();
    const result = await executeTool(
      registry,
      "preview_playbook",
      {
        templateId: "break_even",
        symbol: "AAPL",
        side: "BUY",
        entry: 100,
        initialStop: 95,
        qty: 10,
        environment: "paper",
      },
      mockContext(trading),
      { permissionMode: "write" },
    );
    expect(result.ok).toBe(true);
    expect(trading.previewPlaybook).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: "break_even",
        accountId: "DUP586813",
        entry: 100,
      }),
    );
  });

  it("requires confirmation for attach_playbook", async () => {
    const trading = mockTradingPort();
    const result = await executeTool(
      registry,
      "attach_playbook",
      {
        templateId: "break_even",
        symbol: "AAPL",
        side: "BUY",
        entryPrice: 100,
        initialStop: 95,
        qty: 10,
        environment: "paper",
        stopOrderId: 42,
        filledQty: 10,
      },
      mockContext(trading),
      { permissionMode: "full", confirmed: false },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("confirmation_required");
  });

  it("denies attach_playbook in write permission mode", async () => {
    const trading = mockTradingPort();
    const result = await executeTool(
      registry,
      "attach_playbook",
      {
        templateId: "break_even",
        symbol: "AAPL",
        side: "BUY",
        entryPrice: 100,
        initialStop: 95,
        qty: 10,
        environment: "paper",
      },
      mockContext(trading),
      { permissionMode: "write", confirmed: true },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("permission_denied");
  });

  it("attaches playbook when confirmation is validated server-side in full mode", async () => {
    const trading = mockTradingPort();
    const result = await executeTool(
      registry,
      "attach_playbook",
      {
        templateId: "break_even",
        symbol: "AAPL",
        side: "BUY",
        entryPrice: 100,
        initialStop: 95,
        qty: 10,
        environment: "paper",
        stopOrderId: 42,
        filledQty: 10,
      },
      mockContext(trading),
      { permissionMode: "full", confirmationValidatedByServer: true },
    );
    expect(result.ok).toBe(true);
    expect(trading.attachPlaybook).toHaveBeenCalled();
  });
});
