import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  recoverTwsSidecar,
  finalizeTwsRecoveryIfNeeded,
} = vi.hoisted(() => ({
  recoverTwsSidecar: vi.fn(async () => ({
    ok: true,
    commandState: "confirmed" as const,
    action: "reconnected" as const,
    message: "TWS reconnected to IB Gateway.",
    status: {
      configured: true,
      sidecarReachable: true,
      gatewayConnected: true,
      warnings: [],
    },
  })),
  finalizeTwsRecoveryIfNeeded: vi.fn(async () => ({
    finalized: true,
    alreadyFinalized: false,
    warmup: {
      startedAt: Date.now(),
      totalMs: 42,
      phases: [{ name: "quotes", key: "AAPL", ms: 42, ok: true, source: "tws" }],
    },
  })),
}));

vi.mock("@/lib/marketData/providers/tws/recover", () => ({
  recoverTwsSidecar,
}));

vi.mock("@/lib/marketData/providers/tws/finalizeTwsRecovery", () => ({
  finalizeTwsRecoveryIfNeeded,
}));

vi.mock("@/lib/marketData/providers/tws/recoverySession", () => ({
  startTwsRecoverySession: vi.fn(),
}));

vi.mock("@/lib/marketData/providers/tws/client", () => ({
  isTwsConfigured: vi.fn(() => true),
}));

vi.mock("@/lib/marketData/service/server", () => ({
  getServerMarketDataService: () => ({}),
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

  it("recovers sidecar, finalizes recovery, and returns warmup", async () => {
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
      commandState?: string;
      action: string;
      message: string;
      status: { gatewayConnected: boolean };
      warmup: { totalMs: number; phases: unknown[] };
    };
    expect(json.ok).toBe(true);
    expect(json.commandState).toBe("confirmed");
    expect(json.action).toBe("reconnected");
    expect(json.status.gatewayConnected).toBe(true);
    expect(json.warmup.totalMs).toBe(42);
    expect(recoverTwsSidecar).toHaveBeenCalledWith(["AAPL", "SPY"]);
    expect(finalizeTwsRecoveryIfNeeded).toHaveBeenCalledWith(expect.anything(), {
      symbols: ["AAPL", "SPY"],
      candleRequests: [{ symbol: "AAPL", interval: "1d", range: "1mo" }],
      optionsSymbol: "AAPL",
    });
  });

  it("returns degraded result when gateway is still down without finalizing", async () => {
    recoverTwsSidecar.mockResolvedValueOnce({
      ok: false,
      commandState: "failed" as const,
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
    expect(finalizeTwsRecoveryIfNeeded).not.toHaveBeenCalled();
  });
});
