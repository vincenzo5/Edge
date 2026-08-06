import { beforeEach, describe, expect, it, vi } from "vitest";

import { clearLocalJournalSnapshot, replaceLocalJournalTrades, upsertLocalJournalFills } from "@/lib/journal/localJournalStore";
import type { JournalFill } from "@/lib/journal/types";

const persistenceFetch = vi.fn();
const localStores = vi.hoisted(() => ({
  addScreenshot: vi.fn(),
  listScreenshots: vi.fn(async () => []),
  patchScreenshot: vi.fn(),
  addChartSnapshot: vi.fn(),
}));

vi.mock("@/lib/persistence/client/persistenceFetch", () => ({
  persistenceFetch: (...args: unknown[]) => persistenceFetch(...args),
}));

vi.mock("@/lib/journal/localScreenshotStore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/journal/localScreenshotStore")>()),
  addLocalJournalTradeScreenshot: localStores.addScreenshot,
  listLocalJournalTradeScreenshots: localStores.listScreenshots,
  patchLocalJournalTradeScreenshot: localStores.patchScreenshot,
  migrateLocalJournalTradeScreenshots: vi.fn(async () => 0),
}));

vi.mock("@/lib/journal/localChartSnapshotStore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/journal/localChartSnapshotStore")>()),
  addLocalJournalTradeChartSnapshot: localStores.addChartSnapshot,
  migrateLocalJournalTradeChartSnapshots: vi.fn(async () => 0),
}));

import {
  createJournalTradeChartSnapshotRemote,
  fetchJournalTradeScreenshots,
  fetchJournalTrades,
  importJournalCsvRemote,
  patchJournalTradeRemote,
  patchJournalTradeScreenshotRemote,
  uploadJournalTradeScreenshot,
} from "@/lib/persistence/client/journalClient";

const historicalFill = (execId: string): JournalFill => ({
  execId,
  fillTime: "2026-06-01T13:30:00.000Z",
  side: "BOT",
  quantity: 100,
  price: 150,
  contract: { symbol: "AAPL", secType: "STK", conId: 265598 },
  source: "flex_csv",
});

const liveFill = (): JournalFill => ({
  execId: "live-1",
  fillTime: "2026-07-06T13:30:00.000Z",
  side: "BOT",
  quantity: 10,
  price: 200,
  contract: { symbol: "HOOD", secType: "STK", conId: 504546674 },
  source: "live",
});

describe("journalClient sync", () => {
  beforeEach(() => {
    clearLocalJournalSnapshot();
    persistenceFetch.mockReset();
    localStores.addScreenshot.mockReset();
    localStores.listScreenshots.mockReset();
    localStores.listScreenshots.mockResolvedValue([]);
    localStores.patchScreenshot.mockReset();
    localStores.addChartSnapshot.mockReset();
  });

  it("merges remote live fills with local CSV history and returns server trade ids", async () => {
    upsertLocalJournalFills([
      historicalFill("hist-1"),
      {
        ...historicalFill("hist-2"),
        side: "SLD",
        fillTime: "2026-06-02T13:30:00.000Z",
        price: 155,
        realizedPNL: 500,
      },
    ]);

    persistenceFetch.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/api/me/journal/fills" && init?.method !== "POST") {
        return new Response(JSON.stringify({ fills: [liveFill()] }), { status: 200 });
      }
      if (path.startsWith("/api/me/journal/trades")) {
        return new Response(
          JSON.stringify({
            trades: [
              {
                id: "server-aapl",
                status: "closed",
                direction: "long",
                symbol: "AAPL",
                secType: "STK",
                openedAt: "2026-06-01T13:30:00.000Z",
                closedAt: "2026-06-02T13:30:00.000Z",
                fillExecIds: ["hist-1", "hist-2"],
                tags: [],
                setup: null,
                reviewNote: null,
                createdAt: "2026-06-01T13:30:00.000Z",
                updatedAt: "2026-06-02T13:30:00.000Z",
              },
              {
                id: "server-hood",
                status: "open",
                direction: "long",
                symbol: "HOOD",
                secType: "STK",
                openedAt: "2026-07-06T13:30:00.000Z",
                closedAt: null,
                fillExecIds: ["live-1"],
                tags: [],
                setup: null,
                reviewNote: null,
                createdAt: "2026-07-06T13:30:00.000Z",
                updatedAt: "2026-07-06T13:30:00.000Z",
              },
            ],
          }),
          { status: 200 },
        );
      }
      return new Response(null, { status: 503 });
    });

    const trades = await fetchJournalTrades();
    expect(trades.some((trade) => trade.symbol === "AAPL" && trade.id === "server-aapl")).toBe(
      true,
    );
    expect(trades.some((trade) => trade.symbol === "HOOD" && trade.id === "server-hood")).toBe(
      true,
    );
  });

  it("falls back to local rebuilt trades when persistence returns 503", async () => {
    upsertLocalJournalFills([
      historicalFill("hist-1"),
      {
        ...historicalFill("hist-2"),
        side: "SLD",
        fillTime: "2026-06-02T13:30:00.000Z",
        price: 155,
        realizedPNL: 500,
      },
    ]);

    persistenceFetch.mockResolvedValue(new Response(null, { status: 503 }));

    const trades = await fetchJournalTrades();
    expect(trades.some((trade) => trade.symbol === "AAPL")).toBe(true);
    expect(trades.every((trade) => trade.id !== "server-aapl")).toBe(true);
  });

  it("mirrors CSV import locally even when import API succeeds", async () => {
    const csv = [
      '"IBExecID","Symbol","Buy/Sell","Quantity","TradePrice","DateTime","AssetClass","Conid"',
      '"csv-1","AAPL","BUY","100","150","20260601;093000","STK","265598"',
      '"csv-2","AAPL","SELL","100","155","20260602;153000","STK","265598"',
    ].join("\n");

    persistenceFetch.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/api/me/journal/import" && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            fills: [],
            imported: 2,
            duplicates: 0,
            skipped: 0,
            tradesRebuilt: 1,
            errors: [],
          }),
          { status: 200 },
        );
      }
      if (path === "/api/me/journal/fills") {
        return new Response(JSON.stringify({ fills: [] }), { status: 200 });
      }
      if (path.startsWith("/api/me/journal/trades")) {
        return new Response(
          JSON.stringify({
            trades: [
              {
                id: "server-aapl",
                status: "closed",
                direction: "long",
                symbol: "AAPL",
                secType: "STK",
                openedAt: "2026-06-01T13:30:00.000Z",
                closedAt: "2026-06-02T13:30:00.000Z",
                fillExecIds: ["csv-1", "csv-2"],
                tags: [],
                setup: null,
                reviewNote: null,
                createdAt: "2026-06-01T13:30:00.000Z",
                updatedAt: "2026-06-02T13:30:00.000Z",
              },
            ],
          }),
          { status: 200 },
        );
      }
      if (path === "/api/me/journal/fills" && init?.method === "POST") {
        return new Response(
          JSON.stringify({ imported: 2, duplicates: 0, skipped: 0, tradesRebuilt: 1, fills: [] }),
          { status: 200 },
        );
      }
      return new Response(null, { status: 503 });
    });

    const result = await importJournalCsvRemote(csv);
    expect(result?.imported).toBe(2);

    const trades = await fetchJournalTrades();
    expect(trades.some((trade) => trade.symbol === "AAPL" && trade.status === "closed")).toBe(true);
  });

  it("surfaces API validation details for chart snapshot creation", async () => {
    persistenceFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: "Invalid request body",
          code: "validation",
          details: {
            fieldErrors: {
              cellConfig: ["Invalid range"],
            },
          },
        }),
        { status: 400 },
      ),
    );

    await expect(
      createJournalTradeChartSnapshotRemote("trade-1", {
        cellConfig: {
          symbol: "BRUN",
          range: "2y",
          interval: "1d",
          chartType: "candle_solid",
          indicators: [],
          drawings: [],
        },
      }),
    ).rejects.toThrow("Invalid request body: cellConfig: Invalid range");
  });

  it("uses local stores when screenshot and chart snapshot APIs return 503", async () => {
    const screenshot = { id: "local-shot" };
    const snapshot = { id: "local-snapshot" };
    localStores.addScreenshot.mockResolvedValueOnce(screenshot);
    localStores.addChartSnapshot.mockResolvedValueOnce(snapshot);
    persistenceFetch
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 503 }));

    await expect(
      uploadJournalTradeScreenshot(
        "trade-1",
        new Blob([Uint8Array.from([1])], { type: "image/png" }),
      ),
    ).resolves.toBe(screenshot);
    await expect(
      createJournalTradeChartSnapshotRemote("trade-1", {
        cellConfig: {
          symbol: "BRUN",
          range: "2y",
          interval: "1d",
          chartType: "candle_solid",
          indicators: [],
          drawings: [],
        },
      }),
    ).resolves.toBe(snapshot);
  });

  it("merges local screenshots when the server GET succeeds with an empty gallery", async () => {
    const localScreenshot = {
      id: "local-shot",
      tradeId: "trade-1",
      sortIndex: 0,
      caption: null,
      mimeType: "image/png",
      byteSize: 1,
      width: null,
      height: null,
      source: "chart_capture",
      createdAt: "2026-08-05T12:00:00.000Z",
      updatedAt: "2026-08-05T12:00:00.000Z",
      blob: new Blob([Uint8Array.from([1])], { type: "image/png" }),
    };
    localStores.listScreenshots.mockResolvedValueOnce([localScreenshot]);
    persistenceFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ screenshots: [] }), { status: 200 }),
    );

    await expect(fetchJournalTradeScreenshots("trade-1")).resolves.toEqual([
      expect.objectContaining({ id: "local-shot", tradeId: "trade-1" }),
    ]);
  });

  it("uses local stores when screenshot and chart snapshot APIs return 404 for a mirrored trade", async () => {
    replaceLocalJournalTrades([
      {
        id: "local-trade-1",
        status: "open",
        direction: "long",
        symbol: "F",
        secType: "STK",
        openedAt: "2026-07-01T13:30:00.000Z",
        closedAt: null,
        fillExecIds: ["exec-1"],
        tags: [],
        setup: null,
        reviewNote: null,
        legs: [],
        createdAt: "2026-07-01T13:30:00.000Z",
        updatedAt: "2026-07-01T13:30:00.000Z",
      },
    ]);

    const screenshot = { id: "local-shot" };
    const snapshot = { id: "local-snapshot" };
    localStores.addScreenshot.mockResolvedValueOnce(screenshot);
    localStores.addChartSnapshot.mockResolvedValueOnce(snapshot);
    persistenceFetch
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }));

    await expect(
      uploadJournalTradeScreenshot(
        "local-trade-1",
        new Blob([Uint8Array.from([1])], { type: "image/png" }),
      ),
    ).resolves.toBe(screenshot);
    await expect(
      createJournalTradeChartSnapshotRemote("local-trade-1", {
        cellConfig: {
          symbol: "F",
          range: "2y",
          interval: "1d",
          chartType: "candle_solid",
          indicators: [],
          drawings: [],
        },
      }),
    ).resolves.toBe(snapshot);
  });

  it("patches a local screenshot when persistence returns 404 for a mirrored trade", async () => {
    replaceLocalJournalTrades([
      {
        id: "local-trade-1",
        status: "open",
        direction: "long",
        symbol: "F",
        secType: "STK",
        openedAt: "2026-07-01T13:30:00.000Z",
        closedAt: null,
        fillExecIds: ["exec-1"],
        tags: [],
        setup: null,
        reviewNote: null,
        legs: [],
        createdAt: "2026-07-01T13:30:00.000Z",
        updatedAt: "2026-07-01T13:30:00.000Z",
      },
    ]);
    const screenshot = { id: "local-shot", caption: "Exit at resistance" };
    localStores.patchScreenshot.mockResolvedValueOnce(screenshot);
    persistenceFetch.mockResolvedValueOnce(new Response(null, { status: 404 }));

    await expect(
      patchJournalTradeScreenshotRemote("local-trade-1", "local-shot", {
        caption: "Exit at resistance",
      }),
    ).resolves.toBe(screenshot);
    expect(localStores.patchScreenshot).toHaveBeenCalledWith("local-trade-1", "local-shot", {
      caption: "Exit at resistance",
    });
  });

  it("patches a local trade when persistence returns 503", async () => {
    replaceLocalJournalTrades([
      {
        id: "local-trade-1",
        status: "closed",
        direction: "long",
        symbol: "AAPL",
        secType: "STK",
        openedAt: "2026-07-01T13:30:00.000Z",
        closedAt: "2026-07-01T16:00:00.000Z",
        netQuantity: 100,
        avgEntry: 150,
        fillExecIds: ["exec-1"],
        tags: [],
        setup: null,
        reviewNote: null,
        legs: [],
        createdAt: "2026-07-01T13:30:00.000Z",
        updatedAt: "2026-07-01T16:00:00.000Z",
      },
    ]);
    persistenceFetch.mockResolvedValueOnce(new Response(null, { status: 503 }));

    const updated = await patchJournalTradeRemote("local-trade-1", {
      rating: 4,
      ignored: true,
    });
    expect(updated?.rating).toBe(4);
    expect(updated?.ignored).toBe(true);
  });

  it("patches a local trade when persistence returns 400 database error for a mirrored trade", async () => {
    replaceLocalJournalTrades([
      {
        id: "local-trade-1",
        status: "closed",
        direction: "long",
        symbol: "AAPL",
        secType: "STK",
        openedAt: "2026-07-01T13:30:00.000Z",
        closedAt: "2026-07-01T16:00:00.000Z",
        netQuantity: 100,
        avgEntry: 150,
        fillExecIds: ["exec-1"],
        tags: [],
        setup: null,
        reviewNote: null,
        legs: [],
        createdAt: "2026-07-01T13:30:00.000Z",
        updatedAt: "2026-07-01T16:00:00.000Z",
      },
    ]);
    persistenceFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          code: "validation",
          error: "Failed query: update journal_trades",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      ),
    );

    const updated = await patchJournalTradeRemote("local-trade-1", {
      reviewNote: "Offline save",
    });
    expect(updated?.reviewNote).toBe("Offline save");
  });

  it("does not patch locally on validation 400 when no local trade exists", async () => {
    persistenceFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ code: "validation", error: "Invalid request body" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      ),
    );

    await expect(
      patchJournalTradeRemote("missing-trade", { rating: 3 }),
    ).rejects.toThrow("Invalid request body");
  });

  it("throws server validation message when stop risk cannot be computed", async () => {
    persistenceFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          code: "validation",
          error: "Quantity is required to compute risk from stop.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      ),
    );

    await expect(
      patchJournalTradeRemote("remote-only-trade", { initialStop: 80 }),
    ).rejects.toThrow("Quantity is required to compute risk from stop.");
  });
});
