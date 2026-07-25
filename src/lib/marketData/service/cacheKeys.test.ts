import { describe, it, expect } from "vitest";
import { quotesCacheKey } from "./cacheKeys";

describe("quotesCacheKey", () => {
  it("sorts symbols for canonical batch keys", () => {
    const a = quotesCacheKey("yahoo", ["MSFT", "AAPL"]);
    const b = quotesCacheKey("yahoo", ["AAPL", "MSFT"]);
    expect(a).toBe(b);
  });

  it("includes connection id in key", () => {
    const withConn = quotesCacheKey("tws", ["AAPL"], "paper-1");
    const withoutConn = quotesCacheKey("tws", ["AAPL"]);
    expect(withConn).not.toBe(withoutConn);
  });
});
