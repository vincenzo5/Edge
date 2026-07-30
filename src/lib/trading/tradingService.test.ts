import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AccountSummary } from "@/lib/marketData/contracts/brokerage";
import { createIbTwsTradingAdapter } from "./adapters/ibTws";
import { createMemoryIntentStore } from "./intentStore";
import { createMemoryPlaybookInstanceStore } from "./playbookInstanceStore";
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
        availability: "online",
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
    placeBracket: vi.fn(async (_plan, orderRef) => ({
      entryOrder: {
        orderId: 11,
        permId: 456,
        account: "DUP586813",
        action: "BUY",
        totalQuantity: 10,
        orderType: "MKT",
        status: "Submitted",
      },
      stopOrder: { orderId: 12, account: "DUP586813", status: "Submitted" },
      takeProfitOrder: { orderId: 13, account: "DUP586813", status: "Submitted" },
      orderRef: orderRef ?? "edge-bracket-test",
    })),
    placeProtectiveOco: vi.fn(async (_plan, orderRef) => ({
      stopOrder: { orderId: 20, account: "DUP586813", status: "Submitted" },
      takeProfitOrder: { orderId: 21, account: "DUP586813", status: "Submitted" },
      orderRef: orderRef ?? "edge-oco-test",
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

const mockCreateAlertDefinition = vi.fn(async (_userId: string, input: { bundleId?: string }) => ({
  id: "alert-test-id",
  bundleId: input.bundleId ?? null,
  status: "active",
}));

const mockExpireAlertsForBundleId = vi.fn(async () => 1);

vi.mock("@/lib/persistence/repositories/appUserRepository", () => ({
  ensureDevAppUser: vi.fn(async () => "user-test-id"),
}));

vi.mock("@/lib/persistence/repositories/alertRepository", () => ({
  createAlertDefinition: (...args: unknown[]) => mockCreateAlertDefinition(...args),
  expireAlertsForBundleId: (...args: unknown[]) => mockExpireAlertsForBundleId(...args),
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
    mockCreateAlertDefinition.mockClear();
    mockExpireAlertsForBundleId.mockClear();
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
    expect(mockGetQuotes).toHaveBeenCalledWith(["F"], {
      twsConnectionId: "ib-paper",
      respectProviderPreference: false,
      trustUsage: "trading_decision",
    });
  });

  it("requests pre-trade quotes from live connection for live orders", async () => {
    const service = new TradingService(createMemoryIntentStore());
    await service.submitOrder(
      {
        accountId: "U25026894",
        symbol: "F",
        side: "BUY",
        quantity: 1,
        orderType: "MKT",
        environment: "live",
      },
      "idem-live-quotes",
      undefined,
      "LIVE",
    );
    expect(mockGetQuotes).toHaveBeenCalledWith(["F"], {
      twsConnectionId: "ib-live",
      respectProviderPreference: false,
      trustUsage: "trading_decision",
    });
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

  it("lists paper and live accounts when both connections are up", async () => {
    vi.mocked(createIbTwsTradingAdapter).mockImplementation((connectionId) => {
      if (connectionId === "ib-live") {
        return {
          ...createMockPort(),
          listAccounts: vi.fn(async () => [
            {
              broker: "ib",
              connectionId: "ib-live",
              accountId: "U25026894",
              environment: "live",
              availability: "online",
            },
          ]),
        };
      }
      return createMockPort();
    });

    const service = new TradingService(createMemoryIntentStore());
    const accounts = await service.listAccounts();

    expect(accounts).toEqual([
      {
        broker: "ib",
        connectionId: "ib-paper",
        accountId: "DUP586813",
        environment: "paper",
        availability: "online",
      },
      {
        broker: "ib",
        connectionId: "ib-live",
        accountId: "U25026894",
        environment: "live",
        availability: "online",
      },
    ]);
  });

  it("omits live accounts when live discovery fails without fabricating ids", async () => {
    delete process.env.TWS_LIVE_ACCOUNT_ID;
    vi.mocked(createIbTwsTradingAdapter).mockImplementation((connectionId) => {
      if (connectionId === "ib-live") {
        return {
          ...createMockPort(),
          listAccounts: vi.fn(async () => {
            throw new Error("live gateway offline");
          }),
        };
      }
      return createMockPort();
    });

    const service = new TradingService(createMemoryIntentStore());
    const accounts = await service.listAccounts();

    expect(accounts).toEqual([
      {
        broker: "ib",
        connectionId: "ib-paper",
        accountId: "DUP586813",
        environment: "paper",
        availability: "online",
      },
    ]);
  });

  it("seeds offline live account when live discovery fails and TWS_LIVE_ACCOUNT_ID is set", async () => {
    process.env.TWS_LIVE_ACCOUNT_ID = "U25026894";
    vi.mocked(createIbTwsTradingAdapter).mockImplementation((connectionId) => {
      if (connectionId === "ib-live") {
        return {
          ...createMockPort(),
          listAccounts: vi.fn(async () => {
            throw new Error("live gateway offline");
          }),
        };
      }
      return createMockPort();
    });

    const service = new TradingService(createMemoryIntentStore());
    const accounts = await service.listAccounts();

    expect(accounts).toEqual([
      {
        broker: "ib",
        connectionId: "ib-paper",
        accountId: "DUP586813",
        environment: "paper",
        availability: "online",
      },
      {
        broker: "ib",
        connectionId: "ib-live",
        accountId: "U25026894",
        environment: "live",
        availability: "offline",
      },
    ]);
    delete process.env.TWS_LIVE_ACCOUNT_ID;
  });

  it("creates playbook instance after bracket submit without rolling back Protect", async () => {
    const store = createMemoryIntentStore();
    const playbookStore = createMemoryPlaybookInstanceStore();
    const service = new TradingService(store, playbookStore);
    const plan = {
      entry: {
        accountId: "DUP586813",
        symbol: "AAPL",
        side: "BUY" as const,
        quantity: 10,
        orderType: "MKT" as const,
        environment: "paper" as const,
      },
      stopLeg: { mode: "fixed" as const, stopPrice: 95 },
      takeProfitPrice: 110,
    };

    const result = await service.submitBracket(plan, "idem-bracket-playbook", undefined, undefined, {
      templateId: "break_even",
      entryPrice: 100,
      initialStop: 95,
    });

    expect(result.playbookInstance?.templateId).toBe("break_even");
    expect(result.playbookInstance?.status).toBe("pending_fill");
    expect(result.playbookInstance?.orderIntentId).toBe(result.intent.intentId);

    const listed = await service.listPlaybookInstances("DUP586813", { activeOnly: true });
    expect(listed).toHaveLength(1);
  });

  it("previewPlaybook returns planned steps without persisting instance", async () => {
    const playbookStore = createMemoryPlaybookInstanceStore();
    const service = new TradingService(createMemoryIntentStore(), playbookStore);

    const preview = await service.previewPlaybook({
      templateId: "break_even",
      accountId: "DUP586813",
      symbol: "AAPL",
      side: "BUY",
      entry: 100,
      initialStop: 95,
      qty: 10,
      environment: "paper",
    });

    expect(preview.template.id).toBe("break_even");
    expect(preview.steps).toHaveLength(1);
    expect(preview.steps[0]?.triggerPrice).toBe(105);
    expect(await service.listPlaybookInstances("DUP586813")).toHaveLength(0);
  });

  it("attachManagementPlaybook creates armed instance for open position", async () => {
    const playbookStore = createMemoryPlaybookInstanceStore();
    const service = new TradingService(createMemoryIntentStore(), playbookStore);

    const instance = await service.attachManagementPlaybook({
      templateId: "break_even",
      accountId: "DUP586813",
      symbol: "AAPL",
      side: "BUY",
      entryPrice: 100,
      initialStop: 95,
      qty: 10,
      environment: "paper",
      stopOrderId: 42,
      filledQty: 10,
    });

    expect(instance.status).toBe("armed");
    expect(instance.stopOrderId).toBe(42);
    expect(instance.filledQty).toBe(10);
    expect(await service.listPlaybookInstances("DUP586813", { activeOnly: true })).toHaveLength(1);
  });

  it("detachPlaybookInstance marks instance detached without broker cancel", async () => {
    const playbookStore = createMemoryPlaybookInstanceStore();
    const service = new TradingService(createMemoryIntentStore(), playbookStore);
    const plan = {
      entry: {
        accountId: "DUP586813",
        symbol: "AAPL",
        side: "BUY" as const,
        quantity: 10,
        orderType: "MKT" as const,
        environment: "paper" as const,
      },
      stopLeg: { mode: "fixed" as const, stopPrice: 95 },
      takeProfitPrice: 110,
    };

    const placed = await service.submitBracket(plan, "idem-detach", undefined, undefined, {
      templateId: "break_even",
      entryPrice: 100,
      initialStop: 95,
    });
    const instanceId = placed.playbookInstance?.id;
    expect(instanceId).toBeTruthy();

    const detached = await service.detachPlaybookInstance(instanceId!);
    expect(detached?.status).toBe("detached");
    expect(mockPort.cancel).not.toHaveBeenCalled();
  });

  it("pause, resume, and skip next rule on playbook instance", async () => {
    const playbookStore = createMemoryPlaybookInstanceStore();
    const service = new TradingService(createMemoryIntentStore(), playbookStore);
    const plan = {
      entry: {
        accountId: "DUP586813",
        symbol: "AAPL",
        side: "BUY" as const,
        quantity: 10,
        orderType: "MKT" as const,
        environment: "paper" as const,
      },
      stopLeg: { mode: "fixed" as const, stopPrice: 95 },
      takeProfitPrice: 110,
    };

    const placed = await service.submitBracket(plan, "idem-playbook-controls", undefined, undefined, {
      templateId: "break_even",
      entryPrice: 100,
      initialStop: 95,
    });
    const instanceId = placed.playbookInstance?.id;
    expect(instanceId).toBeTruthy();

    const paused = await service.pausePlaybookInstance(instanceId!);
    expect(paused?.status).toBe("paused");
    expect(mockPort.cancel).not.toHaveBeenCalled();

    const resumed = await service.resumePlaybookInstance(instanceId!);
    expect(resumed?.status).toBe("armed");

    const skipped = await service.skipNextPlaybookRule(instanceId!);
    expect(skipped?.ruleRuntimes[0]?.status).toBe("skipped");
    expect(skipped?.ruleRuntimes[0]?.skippedReason).toBe("user_skip");
  });

  it("creates armed playbook instance after protective OCO submit", async () => {
    const playbookStore = createMemoryPlaybookInstanceStore();
    const service = new TradingService(createMemoryIntentStore(), playbookStore);
    const plan = {
      accountId: "DUP586813",
      symbol: "AAPL",
      quantity: 10,
      side: "SELL" as const,
      stopLeg: { mode: "fixed" as const, stopPrice: 95 },
      takeProfitPrice: 110,
      environment: "paper" as const,
    };

    const result = await service.submitProtectiveOco(plan, "idem-oco-playbook", undefined, {
      templateId: "half_then_be",
      entryPrice: 100,
      initialStop: 95,
    });

    expect(result.playbookInstance?.templateId).toBe("half_then_be");
    expect(result.playbookInstance?.status).toBe("armed");
    expect(result.playbookInstance?.stopOrderId).toBe(20);
    expect(result.playbookInstance?.filledQty).toBe(10);
    expect(result.playbookInstance?.orderIntentId).toBeUndefined();
  });

  it("creates notify alert bundle when notifyAtManageLevels is enabled", async () => {
    const playbookStore = createMemoryPlaybookInstanceStore();
    const service = new TradingService(createMemoryIntentStore(), playbookStore);
    const plan = {
      entry: {
        accountId: "DUP586813",
        symbol: "AAPL",
        side: "BUY" as const,
        quantity: 10,
        orderType: "MKT" as const,
        environment: "paper" as const,
      },
      stopLeg: { mode: "fixed" as const, stopPrice: 95 },
      takeProfitPrice: 110,
    };

    const result = await service.submitBracket(plan, "idem-bracket-notify", undefined, undefined, {
      templateId: "break_even",
      entryPrice: 100,
      initialStop: 95,
      notifyAtManageLevels: true,
    });

    expect(result.playbookInstance?.alertBundleId).toBeTruthy();
    expect(mockCreateAlertDefinition).toHaveBeenCalledTimes(1);
    expect(mockCreateAlertDefinition.mock.calls[0]?.[1]).toMatchObject({
      symbol: "AAPL",
      operator: "cross_above",
      price: 105,
      bundleId: result.playbookInstance?.alertBundleId,
    });
  });

  it("expires notify alerts when detaching playbook with alertBundleId", async () => {
    const playbookStore = createMemoryPlaybookInstanceStore();
    const service = new TradingService(createMemoryIntentStore(), playbookStore);
    const plan = {
      entry: {
        accountId: "DUP586813",
        symbol: "AAPL",
        side: "BUY" as const,
        quantity: 10,
        orderType: "MKT" as const,
        environment: "paper" as const,
      },
      stopLeg: { mode: "fixed" as const, stopPrice: 95 },
      takeProfitPrice: 110,
    };

    const placed = await service.submitBracket(plan, "idem-detach-notify", undefined, undefined, {
      templateId: "break_even",
      entryPrice: 100,
      initialStop: 95,
      notifyAtManageLevels: true,
    });
    const bundleId = placed.playbookInstance?.alertBundleId;
    expect(bundleId).toBeTruthy();

    await service.detachPlaybookInstance(placed.playbookInstance!.id);
    expect(mockExpireAlertsForBundleId).toHaveBeenCalledWith("user-test-id", bundleId);
  });
});
