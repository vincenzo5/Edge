import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const mockAwaitSidecarForBrokerage = vi.fn(async () => {});
const mockProbeSidecarLiveness = vi.fn(async () => true);
const mockGetStatus = vi.fn(async () => ({ enabled: true, connected: true, timestamp: 1 }));
const mockGetSummary = vi.fn(async () => ({ tags: {}, updatedAt: 1 }));
const mockGetPositions = vi.fn(async () => ({ positions: [], updatedAt: 1 }));
const mockGetPnL = vi.fn(async () => null);
const mockGetOrders = vi.fn(async () => ({ orders: [], updatedAt: 1 }));
const mockGetTrades = vi.fn(async () => ({ executions: [], updatedAt: 1 }));

vi.mock("@/lib/marketData/providers/tws/startup", () => ({
  awaitSidecarForBrokerage: (...args: unknown[]) => mockAwaitSidecarForBrokerage(...args),
}));

vi.mock("./brokerageClient", () => ({
  BrokerageRequestError: class extends Error {},
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
});
