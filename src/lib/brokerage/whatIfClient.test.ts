import { describe, expect, it, vi, afterEach } from "vitest";
import { fetchWhatIfPreview, WhatIfClientError } from "./whatIfClient";

describe("fetchWhatIfPreview", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts MKT what-if and returns parsed result", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          result: {
            symbol: "AAPL",
            action: "BUY",
            quantity: 100,
            orderType: "MKT",
            initMarginChange: 4200,
            maintMarginChange: 3500,
            updatedAt: 1,
          },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchWhatIfPreview({
      symbol: "AAPL",
      action: "BUY",
      quantity: 100,
      orderType: "MKT",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/brokerage/whatif?environment=paper",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          symbol: "AAPL",
          action: "BUY",
          quantity: 100,
          orderType: "MKT",
        }),
      }),
    );
    expect(result.initMarginChange).toBe(4200);
  });

  it("throws WhatIfClientError on HTTP failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Brokerage unavailable" }), { status: 503 }),
      ),
    );

    await expect(
      fetchWhatIfPreview({
        symbol: "AAPL",
        action: "BUY",
        quantity: 10,
        orderType: "MKT",
      }),
    ).rejects.toBeInstanceOf(WhatIfClientError);
  });
});
