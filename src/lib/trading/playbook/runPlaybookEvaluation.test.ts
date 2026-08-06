import { describe, expect, it, vi, beforeEach } from "vitest";

import * as brokerageService from "@/lib/brokerage/brokerageService";
import * as marketDataServer from "@/lib/marketData/service/server";
import { IB_LIVE_CONNECTION_ID } from "@/lib/trading/connectionRegistry";
import { createMemoryIntentStore } from "@/lib/trading/intentStore";
import { createMemoryPlaybookInstanceStore } from "@/lib/trading/playbookInstanceStore";
import { createPlaybookInstance } from "./types";

async function createPendingFillInstance(
  playbookStore: ReturnType<typeof createMemoryPlaybookInstanceStore>,
  id: string,
) {
  await playbookStore.create(
    createPlaybookInstance({
      id,
      template: {
        id: "step-trail-test",
        name: "Step trail test",
        description: "Evaluation price fallback test",
        rules: [
          {
            id: "manage-app",
            binding: "managedApp",
            when: { kind: "multipleOfR", multiple: 1 },
            then: { kind: "modifyStop", breakEven: true },
            once: true,
          },
        ],
      },
      positionPlan: {
        symbol: "F",
        accountId: "DUP586813",
        side: "BUY",
        entry: 15,
        initialStop: 12,
        qty: 5,
        rUnit: 3,
        environment: "paper",
        lockedAt: new Date().toISOString(),
      },
      manageState: {
        kind: "stepTrailR",
        stepR: 0.25,
      },
    }),
  );
}

function mockPositionPrices(args: {
  marketPrice?: number | null;
  avgCost?: number | null;
}) {
  vi.mocked(brokerageService.getBrokerageService).mockReturnValue({
    getSnapshot: vi.fn(async () => ({
      orders: [],
      positions: [
        {
          account: "DUP586813",
          contract: { symbol: "F", secType: "STK" },
          position: 5,
          marketPrice: args.marketPrice,
          avgCost: args.avgCost,
        },
      ],
    })),
  } as never);
}

function mockQuotePrice(price: number | null) {
  const getQuotes = vi.fn(async (_symbols: string[], options?: { twsConnectionId?: string }) => {
    expect(options?.twsConnectionId).toBe(IB_LIVE_CONNECTION_ID);
    return {
      data: [{ symbol: "F", price, updatedAt: Date.now() }],
      source: "tws",
      requestedAt: Date.now(),
      receivedAt: Date.now(),
      stale: false,
      warnings: [],
    };
  });
  vi.mocked(marketDataServer.getServerMarketDataService).mockReturnValue({
    getQuotes,
  } as never);
  return getQuotes;
}

describe("runPlaybookEvaluation", () => {
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
      getQuotes: vi.fn(async (_symbols: string[], options?: { twsConnectionId?: string }) => {
        expect(options?.twsConnectionId).toBe(IB_LIVE_CONNECTION_ID);
        return {
          data: [{ symbol: "AAPL", price: 105, updatedAt: Date.now() }],
          source: "tws",
          requestedAt: Date.now(),
          receivedAt: Date.now(),
          stale: false,
          warnings: [],
        };
      }),
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

  it("arms pending fills from position prices when the quote price is null", async () => {
    mockPositionPrices({ marketPrice: 14.23, avgCost: 13.75 });
    mockQuotePrice(null);
    const { runPlaybookEvaluation } = await import("./runPlaybookEvaluation");
    const playbookStore = createMemoryPlaybookInstanceStore();
    const intentStore = createMemoryIntentStore();
    await createPendingFillInstance(playbookStore, "inst-position-fallback");

    const result = await runPlaybookEvaluation({
      tradingService: {
        submitOrder: vi.fn(),
        modifyOrder: vi.fn(),
        cancelOrder: vi.fn(),
      },
      playbookStore,
      intentStore,
      autoManage: {
        paperEnabled: true,
        liveEnabled: false,
        liveConsentAt: null,
        notifyAtManageLevels: false,
      },
    });

    expect(result.errors).toEqual([]);
    const instance = await playbookStore.getById("inst-position-fallback");
    expect(instance?.status).toBe("armed");
    expect(instance?.positionPlan.entry).toBe(13.75);
    expect(instance?.manageState?.entryFillPrice).toBe(13.75);
  });

  it("returns a no-quote error when no usable position price exists", async () => {
    mockPositionPrices({ marketPrice: null, avgCost: 0 });
    mockQuotePrice(null);
    const { runPlaybookEvaluation } = await import("./runPlaybookEvaluation");
    const playbookStore = createMemoryPlaybookInstanceStore();
    const intentStore = createMemoryIntentStore();
    await createPendingFillInstance(playbookStore, "inst-no-price");

    const result = await runPlaybookEvaluation({
      tradingService: {
        submitOrder: vi.fn(),
        modifyOrder: vi.fn(),
        cancelOrder: vi.fn(),
      },
      playbookStore,
      intentStore,
      autoManage: {
        paperEnabled: true,
        liveEnabled: false,
        liveConsentAt: null,
        notifyAtManageLevels: false,
      },
    });

    expect(result.errors).toEqual(["No quote for F (inst-no-price)"]);
    expect((await playbookStore.getById("inst-no-price"))?.status).toBe("pending_fill");
  });

  it("prefers a usable quote over the position market price", async () => {
    mockPositionPrices({ marketPrice: 20 });
    mockQuotePrice(14);
    const { runPlaybookEvaluation } = await import("./runPlaybookEvaluation");
    const playbookStore = createMemoryPlaybookInstanceStore();
    const intentStore = createMemoryIntentStore();
    await createPendingFillInstance(playbookStore, "inst-quote-preferred");

    const result = await runPlaybookEvaluation({
      tradingService: {
        submitOrder: vi.fn(),
        modifyOrder: vi.fn(),
        cancelOrder: vi.fn(),
      },
      playbookStore,
      intentStore,
      autoManage: {
        paperEnabled: true,
        liveEnabled: false,
        liveConsentAt: null,
        notifyAtManageLevels: false,
      },
    });

    expect(result.errors).toEqual([]);
    const instance = await playbookStore.getById("inst-quote-preferred");
    expect(instance?.status).toBe("armed");
    expect(instance?.positionPlan.entry).toBe(14);
    expect(instance?.manageState?.entryFillPrice).toBe(14);
  });

  it("ratchets a paper armed instance from live quotes and modifies on paper", async () => {
    const getQuotes = vi.fn(async (_symbols: string[], options?: { twsConnectionId?: string }) => {
      expect(options?.twsConnectionId).toBe(IB_LIVE_CONNECTION_ID);
      return {
        data: [{ symbol: "F", price: 16.25, updatedAt: Date.now() }],
        source: "tws",
        requestedAt: Date.now(),
        receivedAt: Date.now(),
        stale: false,
        warnings: [],
      };
    });
    vi.mocked(marketDataServer.getServerMarketDataService).mockReturnValue({
      getQuotes,
    } as never);
    vi.mocked(brokerageService.getBrokerageService).mockReturnValue({
      getSnapshot: vi.fn(async () => ({
        orders: [
          {
            orderId: 42,
            account: "DUP586813",
            symbol: "F",
            action: "SELL",
            orderType: "STP",
            totalQuantity: 1,
            auxPrice: 12,
            status: "PreSubmitted",
            updatedAt: Date.now(),
            contract: { symbol: "F", secType: "STK" },
          },
        ],
        positions: [
          {
            account: "DUP586813",
            contract: { symbol: "F", secType: "STK" },
            position: 1,
            marketPrice: null,
            avgCost: 15,
          },
        ],
      })),
    } as never);

    const { runPlaybookEvaluation } = await import("./runPlaybookEvaluation");
    const playbookStore = createMemoryPlaybookInstanceStore();
    const intentStore = createMemoryIntentStore();

    await playbookStore.create(
      createPlaybookInstance({
        id: "inst-paper-ratchet",
        template: {
          id: "step-trail-test",
          name: "Step trail test",
          description: "Paper ratchet from live quote",
          rules: [
            {
              id: "step-be-025",
              when: { kind: "multipleOfR", multiple: 0.25 },
              then: { kind: "modifyStop", breakEven: true },
              once: true,
            },
          ],
        },
        positionPlan: {
          symbol: "F",
          accountId: "DUP586813",
          side: "BUY",
          entry: 15,
          initialStop: 12,
          qty: 1,
          rUnit: 3,
          environment: "paper",
          lockedAt: new Date().toISOString(),
        },
        status: "armed",
        stopOrderId: 42,
        filledQty: 1,
        manageState: {
          kind: "stepTrailR",
          stepR: 0.25,
          highestMilestoneR: 0,
          entryFillPrice: 15,
        },
      }),
    );

    const modifyOrder = vi.fn(async () => undefined);
    const result = await runPlaybookEvaluation({
      tradingService: {
        submitOrder: vi.fn(),
        modifyOrder,
        cancelOrder: vi.fn(),
      },
      playbookStore,
      intentStore,
      autoManage: {
        paperEnabled: true,
        liveEnabled: false,
        liveConsentAt: null,
        notifyAtManageLevels: false,
      },
    });

    expect(result.errors).toEqual([]);
    expect(result.fired).toBe(1);
    expect(modifyOrder).toHaveBeenCalledWith(
      "DUP586813",
      42,
      { stopPrice: 15 },
      undefined,
      "paper",
      undefined,
    );
    const instance = await playbookStore.getById("inst-paper-ratchet");
    expect(instance?.manageState?.highestMilestoneR).toBe(0.25);
    expect(instance?.manageState?.lastAppliedStopPrice).toBe(15);
  });

  it("returns a no-quote error for armed paper when live quote and position price are null", async () => {
    mockPositionPrices({ marketPrice: null, avgCost: 15 });
    mockQuotePrice(null);
    const { runPlaybookEvaluation } = await import("./runPlaybookEvaluation");
    const playbookStore = createMemoryPlaybookInstanceStore();
    const intentStore = createMemoryIntentStore();

    await playbookStore.create(
      createPlaybookInstance({
        id: "inst-armed-no-price",
        template: {
          id: "step-trail-test",
          name: "Step trail test",
          description: "Armed no price",
          rules: [
            {
              id: "step-be-025",
              when: { kind: "multipleOfR", multiple: 0.25 },
              then: { kind: "modifyStop", breakEven: true },
              once: true,
            },
          ],
        },
        positionPlan: {
          symbol: "F",
          accountId: "DUP586813",
          side: "BUY",
          entry: 15,
          initialStop: 12,
          qty: 1,
          rUnit: 3,
          environment: "paper",
          lockedAt: new Date().toISOString(),
        },
        status: "armed",
        stopOrderId: 42,
        filledQty: 1,
        manageState: {
          kind: "stepTrailR",
          stepR: 0.25,
          highestMilestoneR: 0,
          entryFillPrice: 15,
        },
      }),
    );

    const result = await runPlaybookEvaluation({
      tradingService: {
        submitOrder: vi.fn(),
        modifyOrder: vi.fn(),
        cancelOrder: vi.fn(),
      },
      playbookStore,
      intentStore,
      autoManage: {
        paperEnabled: true,
        liveEnabled: false,
        liveConsentAt: null,
        notifyAtManageLevels: false,
      },
    });

    expect(result.errors).toEqual(["No quote for F (inst-armed-no-price)"]);
    expect((await playbookStore.getById("inst-armed-no-price"))?.status).toBe("armed");
  });
});
