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
  };
}

function mockContext(trading: TradingPort): ToolContext {
  return {
    clientSession: false,
    app: null,
    chart: null,
    watchlist: null,
    screener: null,
    risk: null,
    account: null,
    options: null,
    trading,
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

  it("submits order when confirmed in full mode", async () => {
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
    expect(result.ok).toBe(true);
    expect(trading.submitOrder).toHaveBeenCalled();
  });
});
