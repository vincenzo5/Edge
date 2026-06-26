import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

const getNews = vi.fn(async () => ({
  data: [],
  source: "fmp",
  requestedAt: Date.now(),
  receivedAt: Date.now(),
  stale: false,
  warnings: ["FMP endpoint restricted (402): subscription required"],
}));

vi.mock("@/lib/marketData/service/server", () => ({
  getServerMarketDataService: () => ({
    getNews,
  }),
}));

describe("/api/news GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty news with warnings instead of 500 on restricted plan", async () => {
    const res = await GET(new Request("http://localhost/api/news?symbol=AAPL&limit=3"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.news).toEqual([]);
    expect(json.meta.warnings[0]).toContain("402");
  });
});
