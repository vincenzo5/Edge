import { describe, expect, it, vi, beforeEach } from "vitest";

import { createMemoryPlaybookInstanceStore } from "./playbookInstanceStore";
import { createMemoryPlaybookAutoManageStore } from "./playbookAutoManageStore";
import { createMemoryIntentStore } from "./intentStore";
import { createPlaybookInstance, lockPositionPlan, type PlaybookTemplate } from "./playbook/types";
import { TradingService } from "./tradingService";
import type { BrokerTradingPort } from "./ports";

const STEP_TRAIL_TEMPLATE: PlaybookTemplate = {
  id: "step_trail_025",
  name: "Step trail 0.25R",
  description: "Ratchet stop every 0.25R",
  rules: [{ id: "step-be-025", when: { kind: "multipleOfR", multiple: 0.25 }, then: { kind: "modifyStop", breakEven: true } }],
};

let mockPort: BrokerTradingPort;

vi.mock("./adapters/ibTws", () => ({
  createIbTwsTradingAdapter: vi.fn(() => mockPort),
  resetIbTwsTradingAdapterForTests: vi.fn(),
}));

const mockGetBrokerageSnapshot = vi.hoisted(() =>
  vi.fn(async () => ({
    orders: [
      {
        orderId: 501,
        symbol: "AAPL",
        account: "DU1",
        orderType: "STP",
        action: "SELL",
        status: "Submitted",
        orderRef: "edge-ref-1-stop",
      },
    ],
    positions: [
      {
        contract: { symbol: "AAPL", secType: "STK" },
        account: "DU1",
        position: 10,
        avgCost: 100,
      },
    ],
  })),
);

vi.mock("@/lib/brokerage/brokerageService", () => ({
  getBrokerageService: () => ({
    getSnapshot: (...args: unknown[]) => mockGetBrokerageSnapshot(...args),
  }),
}));

vi.mock("@/lib/brokerage/brokerageClient", () => ({
  getBrokerageClient: () => ({
    getStatus: vi.fn(async () => ({ connected: true, summaryUpdatedAt: Date.now() })),
    getSummary: vi.fn(async () => ({
      accountId: "DU1",
      tags: { NetLiquidation: { tag: "NetLiquidation", value: "100000", currency: "USD" } },
      updatedAt: Date.now(),
    })),
    getPositions: vi.fn(async () => ({
      positions: [
        {
          contract: { symbol: "AAPL", secType: "STK" },
          account: "DU1",
          position: 10,
        },
      ],
      updatedAt: Date.now(),
    })),
    getPnL: vi.fn(async () => ({ dailyPnL: 0, unrealizedPnL: 0, updatedAt: Date.now() })),
  }),
  probeSidecarLiveness: vi.fn(async () => true),
  BrokerageRequestError: class extends Error {},
}));

vi.mock("@/lib/marketData/providers/tws/startup", () => ({
  awaitSidecarForBrokerage: vi.fn(async () => undefined),
}));

vi.mock("@/lib/risk/resolveServerRiskSettings", () => ({
  resolveServerRiskSettings: vi.fn(async () => ({
    dollarRisk: 1000,
    maxOpenPositions: 10,
    maxDailyLoss: null,
    pdtGuard: false,
  })),
}));

function createMockPort(): BrokerTradingPort {
  return {
    listAccounts: vi.fn(async () => []),
    preview: vi.fn(async () => ({
      symbol: "AAPL",
      side: "SELL",
      quantity: 10,
      orderType: "MKT",
      warnings: [],
      updatedAt: Date.now(),
    })),
    place: vi.fn(async (draft) => ({
      order: { orderId: 600, status: "Submitted" },
      orderRef: draft.orderRef ?? "edge-flat",
    })),
    cancel: vi.fn(async () => ({ order: { orderId: 501, status: "Cancelled" } })),
    modify: vi.fn(async () => ({ order: { orderId: 501, status: "Submitted" } })),
    placeBracket: vi.fn(),
    placeProtectiveOco: vi.fn(),
    listOpenOrders: vi.fn(async () => []),
  };
}

describe("exitAndCleanup", () => {
  beforeEach(() => {
    mockPort = createMockPort();
    delete process.env.EDGE_TRADING_KILL_SWITCH;
  });

  it("cancels correlated orders, flattens, and closes instance", async () => {
    const playbookStore = createMemoryPlaybookInstanceStore();
    const instance = createPlaybookInstance({
      id: "inst-exit-1",
      template: STEP_TRAIL_TEMPLATE,
      positionPlan: lockPositionPlan({
        symbol: "AAPL",
        accountId: "DU1",
        side: "BUY",
        entry: 100,
        initialStop: 95,
        qty: 10,
        environment: "paper",
      }),
      status: "armed",
      orderRef: "edge-ref-1",
      stopOrderId: 501,
    });
    await playbookStore.create(instance);

    const service = new TradingService(
      createMemoryIntentStore(),
      playbookStore,
      createMemoryPlaybookAutoManageStore(),
    );

    const result = await service.exitAndCleanup({ instanceId: instance.id });

    expect(result.cancelledOrderIds).toEqual([501]);
    expect(result.flattened).toBe(true);
    expect(result.instance.status).toBe("closed");
    expect(mockPort.cancel).toHaveBeenCalled();
    expect(mockPort.place).toHaveBeenCalled();
  });

  it("bypasses global kill switch for emergency exit", async () => {
    process.env.EDGE_TRADING_KILL_SWITCH = "true";
    const playbookStore = createMemoryPlaybookInstanceStore();
    const instance = createPlaybookInstance({
      id: "inst-exit-2",
      template: STEP_TRAIL_TEMPLATE,
      positionPlan: lockPositionPlan({
        symbol: "AAPL",
        accountId: "DU1",
        side: "BUY",
        entry: 100,
        initialStop: 95,
        qty: 10,
        environment: "paper",
      }),
      status: "armed",
      orderRef: "edge-ref-2",
    });
    await playbookStore.create(instance);

    mockGetBrokerageSnapshot.mockResolvedValueOnce({
      orders: [],
      positions: [],
    });

    const service = new TradingService(
      createMemoryIntentStore(),
      playbookStore,
      createMemoryPlaybookAutoManageStore(),
    );

    const result = await service.exitAndCleanup({ instanceId: instance.id });
    expect(result.instance.status).toBe("closed");
  });
});
