import { describe, expect, it, vi, beforeEach } from "vitest";

import { GET, POST } from "./route";

const mocks = vi.hoisted(() => ({
  isDatabaseConfigured: vi.fn(() => true),
  getCurrentUser: vi.fn(async () => ({
    id: "user-1",
    email: "dev@localhost",
    displayName: "Dev User",
  })),
  persistProductionError: vi.fn(async () => undefined),
  listProductionErrorEvents: vi.fn(async () => [
    {
      id: "evt-1",
      at: 1_700_000_000_000,
      source: "window",
      message: "Unhandled rejection",
      requestId: "req-1",
    },
  ]),
  purgeProductionErrorRetentionNow: vi.fn(async () => 0),
}));

vi.mock("@/db", () => ({
  isDatabaseConfigured: mocks.isDatabaseConfigured,
}));

vi.mock("@/lib/persistence/auth/getCurrentUser", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/observability/productionErrorPersist", () => ({
  persistProductionError: mocks.persistProductionError,
  purgeProductionErrorRetentionNow: mocks.purgeProductionErrorRetentionNow,
}));

vi.mock("@/lib/persistence/repositories/productionErrorRepository", () => ({
  listProductionErrorEvents: mocks.listProductionErrorEvents,
  normalizeProductionErrorListLimit: (limit?: number) => {
    if (limit == null || !Number.isFinite(limit)) return 50;
    return Math.min(200, Math.max(1, Math.floor(limit)));
  },
}));

describe("/api/me/production-errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isDatabaseConfigured.mockReturnValue(true);
  });

  it("returns 503 when persistence is unavailable", async () => {
    mocks.isDatabaseConfigured.mockReturnValue(false);
    const res = await GET(new Request("http://localhost/api/me/production-errors"));
    expect(res.status).toBe(503);
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);
    const res = await GET(new Request("http://localhost/api/me/production-errors"));
    expect(res.status).toBe(401);
  });

  it("lists production errors for the authenticated user", async () => {
    const res = await GET(
      new Request("http://localhost/api/me/production-errors?limit=10"),
    );
    expect(res.status).toBe(200);
    expect(mocks.purgeProductionErrorRetentionNow).toHaveBeenCalledTimes(1);
    expect(mocks.listProductionErrorEvents).toHaveBeenCalledWith("user-1", { limit: 10 });
    const json = await res.json();
    expect(json.events).toHaveLength(1);
    expect(json.events[0]?.source).toBe("window");
  });

  it("POST ingests client errors for the authenticated user", async () => {
    const res = await POST(
      new Request("http://localhost/api/me/production-errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "chart",
          message: "Render failed",
        }),
      }),
    );
    expect(res.status).toBe(200);
    expect(mocks.persistProductionError).toHaveBeenCalledWith(
      { source: "chart", message: "Render failed" },
      { userId: "user-1" },
    );
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("POST returns 400 for invalid body", async () => {
    const res = await POST(
      new Request("http://localhost/api/me/production-errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "", message: "" }),
      }),
    );
    expect(res.status).toBe(400);
  });
});
