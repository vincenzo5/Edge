import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AccountSummary } from "@/lib/marketData/contracts/brokerage";
import { createMemoryIntentStore } from "./intentStore";
import { resetAuditLogForTests, listAudit } from "./auditLog";
import { TradingKillSwitchError, TradingReadinessBlockedError, TradingService } from "./tradingService";
import type { BrokerTradingPort } from "./ports";

let mockPort: BrokerTradingPort;

vi.mock("./adapters/ibTws", () => ({
  createIbTwsTradingAdapter: vi.fn(() => mockPort),
  resetIbTwsTradingAdapterForTests: vi.fn(),
}));

const summary: AccountSummary = {
  accountId: "DUP586813",
  tags: {
    NetLiquidation: { tag: "NetLiquidation", value: "100000", currency: "USD" },
  },
  updatedAt: Date.now(),
};

const mockGetQuotes = vi.fn(async () => ({
  data: [{ symbol: "F", price: 10, updatedAt: Date.now() }],
  source: "tws",
  requestedAt: Date.now(),
  receivedAt: Date.now(),
  stale: false,
  warnings: [],
}));

const mockGetPositions = vi.fn(async () => ({
  positions: [{ contract: { symbol: "F", secType: "STK" }, position: 10 }],
  updatedAt: Date.now(),
}));

function createMockPort(): BrokerTradingPort {
  return {
    listAccounts: vi.fn(async () => [
      {
        broker: "ib",
        connectionId: "ib-paper",
        accountId: "DUP586813",
        environment: "paper",
      },
    ]),
    preview: vi.fn(async () => ({
      symbol: "F",
      side: "BUY",
      quantity: 1,
      orderType: "MKT",
      warnings: [],
      updatedAt: Date.now(),
    })),
    place: vi.fn(async (draft) => ({
      order: { orderId: 9, permId: 123, status: "Submitted" },
      orderRef: draft.orderRef ?? "edge-intent-test",
    })),
    cancel: vi.fn(async () => ({
      order: { orderId: 10, status: "Cancelled" },
    })),
    modify: vi.fn(async () => ({
      order: { orderId: 10, lmtPrice: 12.5, status: "Submitted" },
    })),
    listOpenOrders: vi.fn(async () => [
      {
        orderId: 9,
        permId: 123,
        orderRef: "edge-intent-test",
        status: "Submitted",
      },
    ]),
  };
}

vi.mock("@/lib/brokerage/brokerageClient", () => ({
  getBrokerageClient: vi.fn(() => ({
    getStatus: vi.fn(async () => ({
      enabled: true,
      connected: true,
      managedAccounts: ["DUP586813"],
      timestamp: Date.now(),
    })),
    getSummary: vi.fn(async () => summary),
    getPositions: mockGetPositions,
    getConfig: () => ({ baseUrl: "http://127.0.0.1:8765", timeoutMs: 1000 }),
  })),
  probeSidecarLiveness: vi.fn(async () => true),
  BrokerageRequestError: class BrokerageRequestError extends Error {},
}));

vi.mock("@/lib/marketData/providers/tws/startup", () => ({
  awaitSidecarForBrokerage: vi.fn(async () => undefined),
}));

vi.mock("@/lib/marketData/service/server", () => ({
  getServerMarketDataService: vi.fn(() => ({
    getQuotes: mockGetQuotes,
  })),
}));

describe("TradingService", () => {
  beforeEach(() => {
    mockPort = createMockPort();
    process.env.TWS_READONLY = "false";
    delete process.env.EDGE_TRADING_KILL_SWITCH;
    resetAuditLogForTests();
    mockGetQuotes.mockReset();
    mockGetPositions.mockReset();
    mockGetPositions.mockResolvedValue({
      positions: [{ contract: { symbol: "F", secType: "STK" }, position: 10 }],
      updatedAt: Date.now(),
    });
    mockGetQuotes.mockResolvedValue({
      data: [{ symbol: "F", price: 10, updatedAt: Date.now() }],
      source: "tws",
      requestedAt: Date.now(),
      receivedAt: Date.now(),
      stale: false,
      warnings: [],
    });
  });

  it("blocks submit when readiness fails", async () => {
    mockGetQuotes.mockResolvedValue({
      data: [{ symbol: "F", price: 10, updatedAt: Date.now() }],
      source: "yahoo",
      requestedAt: Date.now(),
      receivedAt: Date.now(),
      stale: false,
      warnings: [],
    });

    const port = createMockPort();
    const service = new TradingService(createMemoryIntentStore());

    await expect(
      service.submitOrder(
        {
          accountId: "DUP586813",
          symbol: "F",
          side: "BUY",
          quantity: 1,
          orderType: "MKT",
          environment: "paper",
        },
        "idem-1",
      ),
    ).rejects.toBeInstanceOf(TradingReadinessBlockedError);
  });

  it("submits order and stores intent", async () => {
    const port = createMockPort();
    const store = createMemoryIntentStore();
    const service = new TradingService(store);

    const result = await service.submitOrder(
      {
        accountId: "DUP586813",
        symbol: "F",
        side: "BUY",
        quantity: 1,
        orderType: "MKT",
        environment: "paper",
      },
      "idem-2",
    );

    expect(result.order.orderId).toBe(9);
    expect(result.intent.status).toBe("submitted");
    expect(mockPort.place).toHaveBeenCalledOnce();

    const retry = await service.submitOrder(
      {
        accountId: "DUP586813",
        symbol: "F",
        side: "BUY",
        quantity: 1,
        orderType: "MKT",
        environment: "paper",
      },
      "idem-2",
    );
    expect(retry.intent.intentId).toBe(result.intent.intentId);
    expect(mockPort.place).toHaveBeenCalledOnce();
  });

  it("recovers submit when broker accepted order but place timed out", async () => {
    const port = createMockPort();
    let capturedOrderRef = "";
    vi.mocked(mockPort.place).mockImplementation(async (draft) => {
      capturedOrderRef = draft.orderRef ?? "";
      throw new Error("The operation was aborted due to timeout");
    });
    vi.mocked(mockPort.listOpenOrders).mockImplementation(async () => [
      {
        orderId: 9,
        permId: 123,
        orderRef: capturedOrderRef,
        status: "Submitted",
      },
    ]);
    const store = createMemoryIntentStore();
    const service = new TradingService(store);

    const result = await service.submitOrder(
      {
        accountId: "DUP586813",
        symbol: "F",
        side: "BUY",
        quantity: 1,
        orderType: "MKT",
        environment: "paper",
      },
      "idem-timeout",
    );

    expect(result.intent.status).toBe("submitted");
    expect(result.order.orderId).toBe(9);
    expect(mockPort.listOpenOrders).toHaveBeenCalledWith("DUP586813");
    expect(mockPort.place).toHaveBeenCalledOnce();
  });

  it("modifies an open order", async () => {
    const port = createMockPort();
    const service = new TradingService(createMemoryIntentStore());

    const result = await service.modifyOrder("DUP586813", 10, {
      limitPrice: 12.5,
    });

    expect(result.order.lmtPrice).toBe(12.5);
    expect(mockPort.modify).toHaveBeenCalledWith("DUP586813", 10, {
      limitPrice: 12.5,
    });
  });

  it("blocks submit when kill switch is on", async () => {
    process.env.EDGE_TRADING_KILL_SWITCH = "true";
    const port = createMockPort();
    const service = new TradingService(createMemoryIntentStore());

    await expect(
      service.submitOrder(
        {
          accountId: "DUP586813",
          symbol: "F",
          side: "BUY",
          quantity: 1,
          orderType: "MKT",
          environment: "paper",
        },
        "idem-kill",
      ),
    ).rejects.toBeInstanceOf(TradingKillSwitchError);
    expect(listAudit().some((e) => e.outcome === "blocked")).toBe(true);
  });

  it("rejects expired preview intent on submit", async () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);

    const port = createMockPort();
    const store = createMemoryIntentStore();
    const service = new TradingService(store);
    const draft = {
      accountId: "DUP586813",
      symbol: "F",
      side: "BUY" as const,
      quantity: 1,
      orderType: "MKT" as const,
      environment: "paper" as const,
    };

    const preview = await service.previewOrder(draft);
    vi.setSystemTime(now + 60_000);

    await expect(
      service.submitOrder(draft, "idem-expired", preview.intent.intentId),
    ).rejects.toThrow(/Preview expired/);

    vi.useRealTimers();
  });

  it("submits with valid preview intent link", async () => {
    const port = createMockPort();
    const store = createMemoryIntentStore();
    const service = new TradingService(store);
    const draft = {
      accountId: "DUP586813",
      symbol: "F",
      side: "BUY" as const,
      quantity: 1,
      orderType: "MKT" as const,
      environment: "paper" as const,
    };

    const preview = await service.previewOrder(draft);
    const result = await service.submitOrder(
      draft,
      "idem-preview-link",
      preview.intent.intentId,
    );

    expect(result.order.orderId).toBe(9);
    expect(listAudit().filter((e) => e.action === "submit")).toHaveLength(1);
  });

  it("blocks uncovered short sell", async () => {
    mockGetPositions.mockResolvedValueOnce({
      positions: [],
      updatedAt: Date.now(),
    });

    const port = createMockPort();
    const service = new TradingService(createMemoryIntentStore());

    await expect(
      service.submitOrder(
        {
          accountId: "DUP586813",
          symbol: "F",
          side: "SELL",
          quantity: 1,
          orderType: "MKT",
          environment: "paper",
        },
        "idem-short",
      ),
    ).rejects.toThrow(/uncovered short/);
  });
});
