import { describe, it, expect } from "vitest";
import {
  candlesRequestSchema,
  optionContractSnapshotSchema,
  optionsChainQuerySchema,
  parseMarketRequest,
  parseMarketQuery,
} from "../schemas";

describe("market data request schemas", () => {
  it("accepts valid candle requests", () => {
    const parsed = parseMarketRequest(
      { symbol: "aapl", range: "1y", interval: "1d" },
      candlesRequestSchema,
    );
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.symbol).toBe("AAPL");
    }
  });

  it("accepts extended sessionMode on candle requests", () => {
    const parsed = parseMarketRequest(
      { symbol: "AAPL", range: "1d", interval: "5m", sessionMode: "extended" },
      candlesRequestSchema,
    );
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.sessionMode).toBe("extended");
    }
  });

  it("rejects empty symbol", () => {
    const parsed = parseMarketRequest({ symbol: "", range: "1y" }, candlesRequestSchema);
    expect(parsed.ok).toBe(false);
  });

  it("rejects invalid interval", () => {
    const parsed = parseMarketRequest(
      { symbol: "AAPL", range: "1y", interval: "2x" },
      candlesRequestSchema,
    );
    expect(parsed.ok).toBe(false);
  });

  it("rejects simultaneous range and before pagination", () => {
    const parsed = parseMarketRequest(
      { symbol: "AAPL", range: "1y", interval: "1d", before: 123 },
      candlesRequestSchema,
    );
    expect(parsed.ok).toBe(false);
  });
});

describe("option contract schema", () => {
  it("accepts valid contracts", () => {
    const parsed = optionContractSnapshotSchema.safeParse({
      contractSymbol: "AAPL250620C00150000",
      underlying: "AAPL",
      type: "call",
      expiration: "2025-06-20",
      strike: 150,
      bid: 1,
      ask: 1.2,
      updatedAt: Date.now(),
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects bid above ask", () => {
    const parsed = optionContractSnapshotSchema.safeParse({
      contractSymbol: "AAPL250620C00150000",
      underlying: "AAPL",
      type: "call",
      expiration: "2025-06-20",
      strike: 150,
      bid: 2,
      ask: 1,
      updatedAt: Date.now(),
    });
    expect(parsed.success).toBe(false);
  });
});

describe("options chain query schema", () => {
  it("accepts YYYY-MM-DD expiration", () => {
    const parsed = parseMarketQuery(
      new URLSearchParams("underlying=AAPL&expiration=2025-06-20"),
      optionsChainQuerySchema,
    );
    expect(parsed.ok).toBe(true);
  });

  it("rejects non-ISO expiration", () => {
    const parsed = parseMarketQuery(
      new URLSearchParams("underlying=AAPL&expiration=06/20/2025"),
      optionsChainQuerySchema,
    );
    expect(parsed.ok).toBe(false);
  });
});
