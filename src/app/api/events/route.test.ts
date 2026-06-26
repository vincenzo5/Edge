import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

const getMarketEvents = vi.fn(async () => ({
  data: [
    {
      id: "1",
      canonicalId: "earnings",
      family: "corporate",
      title: "AAPL earnings",
      scheduledAt: "2026-01-30",
      status: "scheduled",
      importance: "high",
      symbol: "AAPL",
      source: "fmp",
    },
  ],
  source: "fmp",
  requestedAt: Date.now(),
  receivedAt: Date.now(),
  stale: false,
  warnings: [],
}));

vi.mock("@/lib/marketData/service/server", () => ({
  getServerMarketDataService: () => ({ getMarketEvents }),
}));

describe("GET /api/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns normalized events with legacy type and meta", async () => {
    const req = new Request("http://localhost/api/events?symbol=AAPL&families=corporate,filing");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      events: Array<{ type: string; canonicalId: string }>;
      meta: { source: string };
    };
    expect(json.events[0]?.type).toBe("earnings");
    expect(json.events[0]?.canonicalId).toBe("earnings");
    expect(json.meta.source).toBe("fmp");
    expect(getMarketEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        symbol: "AAPL",
        families: ["corporate", "filing"],
      }),
    );
  });

  it("validates query params", async () => {
    const req = new Request("http://localhost/api/events?importance=urgent");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});
