import { describe, it, expect, vi, beforeEach } from "vitest";
import { createIbkrProvider } from "./adapter";
import type { IbkrClient } from "./client";
import { clearSharedContractCacheForTests } from "./contractCache";

function createMockClient(overrides: Partial<IbkrClient> = {}): IbkrClient {
  const snapshotRows = [
    {
      conid: 265598,
      "31": "150",
      "82": "+1.5",
      "83": 1.0,
      "87_raw": 1000000,
    },
  ];
  return {
    config: {
      baseUrl: "https://localhost:5000/v1/api",
      sslVerify: false,
      readOnly: true,
    },
    getAuthStatus: vi.fn(async () => ({
      authenticated: true,
      connected: true,
      competing: false,
    })),
    tickle: vi.fn(async () => ({
      session: "test-session",
      iserver: { authStatus: { authenticated: true, connected: true } },
    })),
    initBrokerageSession: vi.fn(async () => ({
      authenticated: true,
      connected: true,
      competing: false,
    })),
    searchStockConid: vi.fn(async () => 265598),
    lookupStockConid: vi.fn(async () => 265598),
    getContractInfo: vi.fn(async () => ({
      exchange: "NASDAQ",
      companyName: "APPLE INC",
    })),
    getMarketSnapshot: vi.fn(async () => snapshotRows),
    getMarketSnapshots: vi.fn(async () => snapshotRows),
    ensureAccountsPreflight: vi.fn(async () => {}),
    getSessionId: vi.fn(() => "test-session"),
    getHistory: vi.fn(async () => ({
      symbol: "AAPL",
      data: [
        { o: 100, h: 101, l: 99, c: 100.5, v: 1000, t: 1_700_000_000_000 },
      ],
    })),
    getOptionMarketSnapshots: vi.fn(async () => []),
    searchSecdef: vi.fn(async () => [
      {
        conid: 265598,
        symbol: "AAPL",
        description: "NASDAQ",
        sections: [{ secType: "OPT", months: "JUN25;JUL25" }],
      },
    ]),
    extractOptionMonths: vi.fn(() => ["JUN25", "JUL25"]),
    getOptionStrikes: vi.fn(async () => ({ call: [150], put: [150] })),
    getOptionContractInfo: vi.fn(async () => []),
    ensureSessionForMarketData: vi.fn(async () => ({
      authenticated: true,
      connected: true,
    })),
    ...overrides,
  } as IbkrClient;
}

describe("createIbkrProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSharedContractCacheForTests();
  });

  it("maps quote snapshot fields to EquityQuote", async () => {
    const client = createMockClient();
    const provider = createIbkrProvider(client);
    const quote = await provider.getQuote("AAPL");
    expect(quote?.symbol).toBe("AAPL");
    expect(quote?.price).toBe(150);
    expect(quote?.change).toBe(1.5);
    expect(quote?.changePercent).toBe(1);
    expect(quote?.volume).toBe(1_000_000);
  });

  it("maps history bars to candle response", async () => {
    const client = createMockClient();
    const provider = createIbkrProvider(client);
    const response = await provider.getCandlesForRange("AAPL", "1d", "1mo");
    expect(response?.candles).toHaveLength(1);
    expect(response?.candles[0]?.c).toBe(100.5);
    expect(response?.interval).toBe("1d");
  });

  it("returns status probe with session info", async () => {
    const client = createMockClient();
    const provider = createIbkrProvider(client);
    const status = await provider.getStatusProbe();
    expect(status.configured).toBe(true);
    expect(status.authenticated).toBe(true);
    expect(status.session).toBe("test-session");
  });
});
