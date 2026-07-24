import { describe, expect, it, vi, beforeEach } from "vitest";

import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  isDatabaseConfigured: vi.fn(() => true),
  getCurrentUser: vi.fn(async () => ({
    id: "user-1",
    email: "dev@localhost",
    displayName: "Dev User",
  })),
  listTradingAuditEvents: vi.fn(async () => [
    {
      id: "evt-1",
      at: 1_700_000_000_000,
      action: "submit",
      outcome: "success",
      intentId: "intent-1",
      orderRef: "edge-intent-intent-1",
      requestId: "req-1",
      detail: "bracket",
    },
  ]),
  purgeTradingAuditRetentionNow: vi.fn(async () => 0),
}));

vi.mock("@/db", () => ({
  isDatabaseConfigured: mocks.isDatabaseConfigured,
}));

vi.mock("@/lib/persistence/auth/getCurrentUser", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/persistence/repositories/tradingAuditRepository", () => ({
  listTradingAuditEvents: mocks.listTradingAuditEvents,
  normalizeTradingAuditListLimit: (limit?: number) => {
    if (limit == null || !Number.isFinite(limit)) return 50;
    return Math.min(200, Math.max(1, Math.floor(limit)));
  },
}));

vi.mock("@/lib/trading/tradingAuditPersist", () => ({
  purgeTradingAuditRetentionNow: mocks.purgeTradingAuditRetentionNow,
}));

describe("/api/me/trading-audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isDatabaseConfigured.mockReturnValue(true);
  });

  it("returns 503 when persistence is unavailable", async () => {
    mocks.isDatabaseConfigured.mockReturnValue(false);
    const res = await GET(new Request("http://localhost/api/me/trading-audit"));
    expect(res.status).toBe(503);
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);
    const res = await GET(new Request("http://localhost/api/me/trading-audit"));
    expect(res.status).toBe(401);
  });

  it("lists audit events for the authenticated user", async () => {
    const res = await GET(
      new Request("http://localhost/api/me/trading-audit?limit=10"),
    );
    expect(res.status).toBe(200);
    expect(mocks.purgeTradingAuditRetentionNow).toHaveBeenCalledTimes(1);
    expect(mocks.listTradingAuditEvents).toHaveBeenCalledWith("user-1", { limit: 10 });
    const json = await res.json();
    expect(json.events).toHaveLength(1);
    expect(json.events[0]).not.toHaveProperty("accountId");
  });
});
