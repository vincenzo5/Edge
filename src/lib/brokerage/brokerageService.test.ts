import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const mockAwaitSidecarForBrokerage = vi.fn(async () => {});
const mockProbeSidecarLiveness = vi.fn(async () => true);
const mockShouldTryBrokerage = vi.fn(() => true);
const mockGetStatus = vi.fn(async () => ({ enabled: true, connected: true, timestamp: 1 }));
const mockGetSummary = vi.fn(async () => ({ tags: {}, updatedAt: 1 }));
const mockGetPositions = vi.fn(async () => ({ positions: [], updatedAt: 1 }));
const mockGetPnL = vi.fn(async () => null);
const mockGetOrders = vi.fn(async () => ({ orders: [], updatedAt: 1 }));
const mockGetTrades = vi.fn(async () => ({ executions: [], updatedAt: 1 }));

vi.mock("@/lib/marketData/providers/tws/startup", () => ({
  awaitSidecarForBrokerage: (...args: unknown[]) => mockAwaitSidecarForBrokerage(...args),
}));

vi.mock("./brokerageHealthGate", () => ({
  shouldTryBrokerage: (...args: unknown[]) => mockShouldTryBrokerage(...args),
}));

vi.mock("./brokerageClient", () => ({
  BrokerageRequestError: class BrokerageRequestError extends Error {
    category: string;
    constructor(category: string, message: string) {
      super(message);
      this.category = category;
      this.name = "BrokerageRequestError";
    }
  },
  isBrokerageConfigured: vi.fn(() => true),
  probeSidecarLiveness: (...args: unknown[]) => mockProbeSidecarLiveness(...args),
  getBrokerageClient: vi.fn(() => ({
    getConfig: () => ({ baseUrl: "http://127.0.0.1:8765" }),
    getStatus: mockGetStatus,
    getSummary: mockGetSummary,
    getPositions: mockGetPositions,
    getPnL: mockGetPnL,
    getOrders: mockGetOrders,
    getTrades: mockGetTrades,
  })),
}));

describe("BrokerageService", () => {
  beforeEach(() => {
    mockAwaitSidecarForBrokerage.mockClear();
    mockShouldTryBrokerage.mockReturnValue(true);
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("getSnapshot awaits sidecar startup before liveness probe", async () => {
    const { getBrokerageService } = await import("./brokerageService");
    await getBrokerageService().getSnapshot();
    expect(mockAwaitSidecarForBrokerage).toHaveBeenCalledOnce();
    expect(mockProbeSidecarLiveness).toHaveBeenCalled();
  });

  it("getSnapshot skips liveness probe when brokerage health gate is open", async () => {
    mockShouldTryBrokerage.mockReturnValue(false);
    const { getBrokerageService } = await import("./brokerageService");
    await expect(getBrokerageService().getSnapshot()).rejects.toThrow(
      "Brokerage requests temporarily skipped",
    );
    expect(mockProbeSidecarLiveness).not.toHaveBeenCalled();
  });

  it("getSnapshot falls back to summary pnl when pnl endpoint is empty", async () => {
    mockGetPnL.mockResolvedValueOnce(null);
    mockGetSummary.mockResolvedValueOnce({
      tags: {},
      pnl: { dailyPnL: 42.5, updatedAt: 2 },
      updatedAt: 2,
    });
    const { getBrokerageService } = await import("./brokerageService");
    const snapshot = await getBrokerageService().getSnapshot("live");
    expect(snapshot.pnl).toEqual({ dailyPnL: 42.5, updatedAt: 2 });
  });
});
