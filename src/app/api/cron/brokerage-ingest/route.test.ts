import { describe, expect, it, vi, beforeEach } from "vitest";

const runBrokerageIngestAll = vi.fn(async () => [
  {
    connectionId: "ib-paper",
    environment: "paper",
    skipped: false,
    added: 1,
    duplicates: 0,
    flexBackfilled: false,
    snapshotsCaptured: false,
    error: null,
  },
]);

vi.mock("@/lib/brokerage/ingest/runBrokerageIngest", () => ({
  runBrokerageIngestAll: () => runBrokerageIngestAll(),
}));

const isDatabaseConfigured = vi.fn(() => true);

vi.mock("@/db", () => ({
  isDatabaseConfigured: () => isDatabaseConfigured(),
}));

vi.mock("@/lib/persistence/auth/getCurrentUser", () => ({
  getCurrentUser: vi.fn(async () => ({ id: "user-1", email: "dev@localhost", displayName: "Dev" })),
}));

vi.mock("@/lib/persistence/repositories/appUserRepository", () => ({
  ensureDevAppUser: vi.fn(async () => "dev-user"),
}));

describe("brokerage-ingest cron route", () => {
  beforeEach(() => {
    runBrokerageIngestAll.mockClear();
    isDatabaseConfigured.mockReturnValue(true);
    delete process.env.EDGE_CRON_SECRET;
  });

  it("returns 503 database_unavailable when DATABASE_URL unset", async () => {
    isDatabaseConfigured.mockReturnValue(false);
    const { POST } = await import("@/app/api/cron/brokerage-ingest/route");
    const response = await POST(new Request("http://localhost/api/cron/brokerage-ingest", { method: "POST" }));
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error).toBe("database_unavailable");
    expect(body.results).toEqual([]);
    expect(runBrokerageIngestAll).not.toHaveBeenCalled();
  });

  it("runs ingest for authenticated session user", async () => {
    const { POST } = await import("@/app/api/cron/brokerage-ingest/route");
    const response = await POST(new Request("http://localhost/api/cron/brokerage-ingest", { method: "POST" }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.results).toHaveLength(1);
    expect(runBrokerageIngestAll).toHaveBeenCalled();
  });

  it("accepts cron secret header", async () => {
    process.env.EDGE_CRON_SECRET = "secret-1";
    const { POST } = await import("@/app/api/cron/brokerage-ingest/route");
    const response = await POST(
      new Request("http://localhost/api/cron/brokerage-ingest", {
        method: "POST",
        headers: { "x-edge-cron-secret": "secret-1" },
      }),
    );
    expect(response.status).toBe(200);
    expect(runBrokerageIngestAll).toHaveBeenCalled();
  });
});
