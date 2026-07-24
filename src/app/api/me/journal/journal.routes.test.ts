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

const createJournalTradeChartSnapshot = vi.fn();

vi.mock("@/lib/persistence/repositories/journalChartSnapshotRepository", () => ({
  createJournalTradeChartSnapshot,
  listJournalTradeChartSnapshots: vi.fn(async () => []),
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

  it("POST /journal/trades/:id/chart-snapshots accepts the valid 2y CellConfig range", async () => {
    createJournalTradeChartSnapshot.mockResolvedValueOnce({
      id: "snapshot-1",
      tradeId: "trade-1",
    });
    const { POST } = await import(
      "@/app/api/me/journal/trades/[id]/chart-snapshots/route"
    );
    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cellConfig: {
            symbol: "BRUN",
            range: "2y",
            interval: "1d",
            chartType: "candle_solid",
            indicators: [],
            drawings: [],
          },
        }),
      }),
      { params: Promise.resolve({ id: "trade-1" }) },
    );

    expect(response.status).toBe(201);
  });

  it("lets chart snapshot database errors reach the persistence fallback boundary", async () => {
    createJournalTradeChartSnapshot.mockRejectedValueOnce(
      new Error("Failed query: insert chart snapshot"),
    );
    const { POST } = await import(
      "@/app/api/me/journal/trades/[id]/chart-snapshots/route"
    );

    await expect(
      POST(
        new Request("http://localhost", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cellConfig: {
              symbol: "BRUN",
              range: "2y",
              interval: "1d",
              chartType: "candle_solid",
              indicators: [],
              drawings: [],
            },
          }),
        }),
        { params: Promise.resolve({ id: "trade-1" }) },
      ),
    ).rejects.toThrow("Failed query");
  });
});
