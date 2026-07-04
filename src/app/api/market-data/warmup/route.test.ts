import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

const primeMarketData = vi.hoisted(() =>
  vi.fn(async () => ({
    startedAt: Date.now(),
    totalMs: 1,
    phases: [],
    traceId: "trace-test",
  })),
);

vi.mock("@/lib/marketData/service/server", () => ({
  getServerMarketDataService: () => ({
    primeMarketData,
  }),
}));

vi.mock("@/lib/marketData/telemetry", () => ({
  createRoutePerfContext: () => ({ collector: { record: vi.fn(), toArray: () => [] } }),
  readMarketDataTraceFromRequest: () => ({ traceId: "trace-test", scenario: "test" }),
}));

vi.mock("@/lib/marketData/telemetry/isPerfEnabled", () => ({
  isMarketDataPerfEnabled: () => false,
}));

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/market-data/warmup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/market-data/warmup POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes activeCellIndex to primeMarketData", async () => {
    const res = await POST(
      makeRequest({
        symbols: ["AAPL"],
        candleRequests: [{ symbol: "AAPL", interval: "1d", range: "1mo" }],
        activeCellIndex: 1,
      }),
    );

    expect(res.status).toBe(200);
    expect(primeMarketData).toHaveBeenCalledWith(
      expect.objectContaining({
        activeCellIndex: 1,
      }),
    );
  });
});
