import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/persistence/server/routeHelpers", () => ({
  withPersistenceAuth: (handler: (userId: string) => Promise<Response>) =>
    handler("user-1"),
}));

const mocks = vi.hoisted(() => ({
  createJournalTradeChartSnapshot: vi.fn(),
  patchJournalTrade: vi.fn(),
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
  patchJournalTrade: mocks.patchJournalTrade,
}));

vi.mock("@/lib/persistence/repositories/journalChartSnapshotRepository", () => ({
  createJournalTradeChartSnapshot: mocks.createJournalTradeChartSnapshot,
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
    mocks.createJournalTradeChartSnapshot.mockResolvedValueOnce({
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
    mocks.createJournalTradeChartSnapshot.mockRejectedValueOnce(
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

  it("PATCH /journal/trades/:id maps database errors to 503", async () => {
    mocks.patchJournalTrade.mockRejectedValueOnce(new Error("Failed query: update journal_trades"));
    const { PATCH } = await import("@/app/api/me/journal/trades/[id]/route");
    const response = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: 4 }),
      }),
      { params: Promise.resolve({ id: "trade-1" }) },
    );

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.code).toBe("database_unavailable");
  });

  it("PATCH /journal/trades/:id keeps validation errors as 400", async () => {
    mocks.patchJournalTrade.mockRejectedValueOnce(
      new Error("For short trades, stop must be above entry."),
    );
    const { PATCH } = await import("@/app/api/me/journal/trades/[id]/route");
    const response = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initialStop: 100 }),
      }),
      { params: Promise.resolve({ id: "trade-1" }) },
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe("validation");
  });
});
