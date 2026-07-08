import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/persistence/server/routeHelpers", () => ({
  withPersistenceAuth: (handler: (userId: string) => Promise<Response>) =>
    handler("user-1"),
}));

vi.mock("@/lib/persistence/repositories/journalRepository", () => ({
  listJournalTrades: vi.fn(async () => []),
  importJournalFillsAndRebuild: vi.fn(async () => ({
    fills: [],
    imported: 1,
    duplicates: 0,
    skipped: 0,
    tradesRebuilt: 1,
  })),
}));

import { GET as getTrades } from "@/app/api/me/journal/trades/route";
import { POST as postFills } from "@/app/api/me/journal/fills/route";

describe("journal API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /journal/trades returns trades payload", async () => {
    const response = await getTrades(new Request("http://localhost/api/me/journal/trades"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.trades).toEqual([]);
  });

  it("POST /journal/fills validates body", async () => {
    const response = await postFills(
      new Request("http://localhost/api/me/journal/fills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fills: [] }),
      }),
    );
    expect(response.status).toBe(200);
  });
});
