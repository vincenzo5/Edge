import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  probeTwsRecoveryStatus,
  finalizeTwsRecoveryIfNeeded,
  getTwsRecoverySession,
} = vi.hoisted(() => ({
  probeTwsRecoveryStatus: vi.fn(async () => ({
    configured: true,
    sidecarReachable: true,
    gatewayConnected: true,
    warnings: [],
  })),
  finalizeTwsRecoveryIfNeeded: vi.fn(async () => ({
    finalized: true,
    alreadyFinalized: false,
    warmup: { startedAt: Date.now(), totalMs: 10, phases: [] },
  })),
  getTwsRecoverySession: vi.fn(() => ({
    id: "tws-recover-1",
    startedAt: Date.now(),
    symbols: ["AAPL"],
    candleRequests: [],
    finalized: false,
  })),
}));

vi.mock("@/lib/marketData/providers/tws/recover", () => ({
  probeTwsRecoveryStatus,
  formatTwsRecoveryPhaseMessage: () => "Gateway connected.",
}));

vi.mock("@/lib/marketData/providers/tws/finalizeTwsRecovery", () => ({
  finalizeTwsRecoveryIfNeeded,
}));

vi.mock("@/lib/marketData/providers/tws/recoverySession", () => ({
  getTwsRecoverySession,
  updateTwsRecoveryPhase: vi.fn(),
}));

vi.mock("@/lib/marketData/providers/tws/client", () => ({
  isTwsConfigured: vi.fn(() => true),
}));

vi.mock("@/lib/marketData/service/server", () => ({
  getServerMarketDataService: () => ({}),
}));

import { GET } from "./route";

describe("/api/market-data/tws/recover/status GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("finalizes recovery when gateway connects during an active session", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; finalized: boolean; warmup: unknown };
    expect(json.ok).toBe(true);
    expect(json.finalized).toBe(true);
    expect(finalizeTwsRecoveryIfNeeded).toHaveBeenCalledOnce();
  });
});
