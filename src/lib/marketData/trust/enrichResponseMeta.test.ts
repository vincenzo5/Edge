import { describe, expect, it } from "vitest";
import { createDataResult } from "../contracts/result";
import { enrichResponseMetaWithTrust } from "./enrichResponseMeta";

describe("enrichResponseMetaWithTrust", () => {
  it("attaches display usage and readiness for chart candles", () => {
    const result = createDataResult({ candles: [] }, "tws", {
      receivedAt: Date.now(),
      stale: false,
    });
    const meta = enrichResponseMetaWithTrust(result, "chart_candles", "display");
    expect(meta.usage).toBe("display");
    expect(meta.readiness?.status).toBe("ok");
    expect(meta.readiness?.allowedForTradingDecision).toBe(false);
    expect(meta.source).toBe("tws");
  });

  it("blocks yahoo watchlist quotes for trading decision readiness", () => {
    const result = createDataResult([], "yahoo", {
      receivedAt: Date.now(),
      stale: false,
    });
    const meta = enrichResponseMetaWithTrust(result, "watchlist_quotes", "display");
    expect(meta.readiness?.allowedForTradingDecision).toBe(false);
  });
});
