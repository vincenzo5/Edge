import { describe, expect, it, vi, beforeEach } from "vitest";

import * as brokerageService from "@/lib/brokerage/brokerageService";
import * as marketDataServer from "@/lib/marketData/service/server";
import { createMemoryIntentStore } from "@/lib/trading/intentStore";
import { createMemoryPlaybookInstanceStore } from "@/lib/trading/playbookInstanceStore";

describe("runPlaybookEvaluation binding filter", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(brokerageService, "getBrokerageService").mockReturnValue({
      getSnapshot: vi.fn(async () => ({
        orders: [
          {
            orderId: 99,
            account: "DUP586813",
            symbol: "AAPL",
            action: "SELL",
            orderType: "STP",
            totalQuantity: 10,
            status: "Submitted",
            updatedAt: Date.now(),
            contract: { symbol: "AAPL", secType: "STK" },
          },
        ],
        positions: [
          {
            account: "DUP586813",
            contract: { symbol: "AAPL", secType: "STK" },
            position: 10,
          },
        ],
      })),
    } as never);
    vi.spyOn(marketDataServer, "getServerMarketDataService").mockReturnValue({
      getQuotes: vi.fn(async () => ({
        data: [{ symbol: "AAPL", price: 105, updatedAt: Date.now() }],
        source: "tws",
        requestedAt: Date.now(),
        receivedAt: Date.now(),
        stale: false,
        warnings: [],
      })),
    } as never);
  });

  it("skips restingBroker rules during evaluation", async () => {
    const { runPlaybookEvaluation } = await import("./runPlaybookEvaluation");
    const playbookStore = createMemoryPlaybookInstanceStore();
    const intentStore = createMemoryIntentStore();

    const plan = {
      symbol: "AAPL",
      accountId: "DUP586813",
      side: "BUY" as const,
      entry: 100,
      initialStop: 95,
      qty: 10,
      rUnit: 5,
      environment: "paper" as const,
      lockedAt: new Date().toISOString(),
    };

    await playbookStore.create({
      id: "inst-binding",
      templateId: "mixed",
      templateSnapshot: {
        id: "mixed",
        name: "Mixed",
        description: "Mixed bindings",
        rules: [
          {
            id: "protect-broker",
            role: "protect",
            binding: "restingBroker",
            when: { kind: "protectiveFill" },
            then: { kind: "notify" },
            once: true,
          },
          {
            id: "manage-app",
            when: { kind: "multipleOfR", multiple: 1 },
            then: { kind: "modifyStop", breakEven: true },
            once: true,
            binding: "managedApp",
          },
        ],
      },
      positionPlan: plan,
      status: "armed",
      ruleRuntimes: [
        { ruleId: "protect-broker", status: "pending" },
        { ruleId: "manage-app", status: "pending" },
      ],
      stopOrderId: 99,
      filledQty: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const tradingService = {
      submitOrder: vi.fn(),
      modifyOrder: vi.fn(),
      cancelOrder: vi.fn(),
    };

    const result = await runPlaybookEvaluation({
      tradingService,
      playbookStore,
      intentStore,
      autoManage: {
        paperEnabled: true,
        liveEnabled: false,
        liveConsentAt: null,
        notifyAtManageLevels: false,
      },
    });

    expect(result.evaluated).toBe(1);
    const instance = await playbookStore.getById("inst-binding");
    const brokerRuntime = instance?.ruleRuntimes.find((item) => item.ruleId === "protect-broker");
    expect(brokerRuntime?.status).toBe("skipped");
    expect(brokerRuntime?.skippedReason).toBe("binding_not_managed_app");
    expect(instance?.protectState).toBe("resting");
  });
});
