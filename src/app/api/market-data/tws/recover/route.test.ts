import { describe, it, expect, vi, beforeEach } from "vitest";

const { recoverTwsSidecar } = vi.hoisted(() => ({
  recoverTwsSidecar: vi.fn(async () => ({
    ok: true,
    action: "reconnected" as const,
    message: "TWS reconnected to IB Gateway.",
    status: {
      configured: true,
      sidecarReachable: true,
      gatewayConnected: true,
      warnings: [],
    },
  })),
}));

const resetTwsRecoveryState = vi.fn();
const primeMarketData = vi.fn(async () => ({
  startedAt: Date.now(),
  totalMs: 42,
  phases: [{ name: "quotes", key: "AAPL", ms: 42, ok: true, source: "tws" }],
}));

vi.mock("@/lib/marketData/providers/tws/recover", () => ({
  recoverTwsSidecar,
}));

vi.mock("@/lib/marketData/providers/tws/client", () => ({
  isTwsConfigured: vi.fn(() => true),
}));

vi.mock("@/lib/marketData/service/server", () => ({
  getServerMarketDataService: () => ({
    resetTwsRecoveryState,
    primeMarketData,
  }),
}));

import { POST } from "./route";
import { isTwsConfigured } from "@/lib/marketData/providers/tws/client";

describe("/api/market-data/tws/recover POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isTwsConfigured).mockReturnValue(true);
  });

  it("returns forbidden when TWS is not configured", async () => {
    vi.mocked(isTwsConfigured).mockReturnValue(false);
    const res = await POST(
      new Request("http://localhost/api/market-data/tws/recover", {
        method: "POST",
        body: JSON.stringify({ symbols: ["AAPL"] }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it("recovers sidecar, resets service state, primes market data, and returns warmup", async () => {
    const res = await POST(
      new Request("http://localhost/api/market-data/tws/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbols: ["AAPL", "SPY"],
          candleRequests: [{ symbol: "AAPL", interval: "1d", range: "1mo" }],
          optionsSymbol: "AAPL",
        }),
      }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      ok: boolean;
      action: string;
      message: string;
      status: { gatewayConnected: boolean };
      warmup: { totalMs: number; phases: unknown[] };
    };
    expect(json.ok).toBe(true);
    expect(json.action).toBe("reconnected");
    expect(json.status.gatewayConnected).toBe(true);
    expect(json.warmup.totalMs).toBe(42);
    expect(recoverTwsSidecar).toHaveBeenCalledWith(["AAPL", "SPY"]);
    expect(resetTwsRecoveryState).toHaveBeenCalledWith({
      symbols: ["AAPL", "SPY"],
      candleRequests: [{ symbol: "AAPL", interval: "1d", range: "1mo" }],
    });
    expect(primeMarketData).toHaveBeenCalledWith({
      symbols: ["AAPL", "SPY"],
      candleRequests: [{ symbol: "AAPL", interval: "1d", range: "1mo" }],
      optionsSymbol: "AAPL",
    });
  });

  it("returns degraded result when gateway is still down without priming", async () => {
    recoverTwsSidecar.mockResolvedValueOnce({
      ok: false,
      action: "reconnected",
      message: "IB Gateway still disconnected. Log in to IB Gateway, then retry.",
      status: {
        configured: true,
        sidecarReachable: true,
        gatewayConnected: false,
        warnings: [],
      },
    });

    const res = await POST(
      new Request("http://localhost/api/market-data/tws/recover", {
        method: "POST",
        body: JSON.stringify({ symbols: [] }),
      }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; message: string; warmup: null };
    expect(json.ok).toBe(false);
    expect(json.message).toMatch(/Gateway still disconnected/i);
    expect(json.warmup).toBeNull();
    expect(resetTwsRecoveryState).not.toHaveBeenCalled();
    expect(primeMarketData).not.toHaveBeenCalled();
  });
});
