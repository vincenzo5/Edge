import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getSnapshot } from "@/app/api/brokerage/snapshot/route";
import { POST as postWhatIf } from "@/app/api/brokerage/whatif/route";

const mockGetSnapshot = vi.fn();
const mockPreviewOrder = vi.fn();

vi.mock("@/lib/brokerage/brokerageService", () => ({
  isBrokerageConfigured: vi.fn(() => true),
  getBrokerageService: vi.fn(() => ({
    getSnapshot: mockGetSnapshot,
    previewOrder: mockPreviewOrder,
  })),
}));

describe("/api/brokerage routes", () => {
  beforeEach(() => {
    mockGetSnapshot.mockReset();
    mockPreviewOrder.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("GET /snapshot returns aggregated account data", async () => {
    mockGetSnapshot.mockResolvedValue({
      status: { enabled: true, connected: true, managedAccounts: ["DU123"], timestamp: 1 },
      summary: { tags: {}, updatedAt: 1 },
      positions: [],
      pnl: null,
      orders: [],
      executions: [],
      updatedAt: 1,
    });

    const res = await getSnapshot();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status.accountId).toBeUndefined();
    expect(body.positions).toEqual([]);
  });

  it("POST /whatif validates body and returns preview", async () => {
    mockPreviewOrder.mockResolvedValue({
      symbol: "AAPL",
      action: "BUY",
      quantity: 10,
      orderType: "LMT",
      limitPrice: 150,
      initMarginChange: 1500,
      updatedAt: 1,
    });

    const req = new NextRequest("http://localhost/api/brokerage/whatif", {
      method: "POST",
      body: JSON.stringify({
        symbol: "AAPL",
        action: "BUY",
        quantity: 10,
        orderType: "LMT",
        limitPrice: 150,
      }),
    });
    const res = await postWhatIf(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result.initMarginChange).toBe(1500);
  });

  it("POST /whatif rejects LMT without limitPrice", async () => {
    const req = new NextRequest("http://localhost/api/brokerage/whatif", {
      method: "POST",
      body: JSON.stringify({
        symbol: "AAPL",
        action: "BUY",
        quantity: 10,
        orderType: "LMT",
      }),
    });
    const res = await postWhatIf(req);
    expect(res.status).toBe(400);
  });
});
