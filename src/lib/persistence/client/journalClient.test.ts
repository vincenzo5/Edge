import { beforeEach, describe, expect, it, vi } from "vitest";

import { clearLocalJournalSnapshot, upsertLocalJournalFills } from "@/lib/journal/localJournalStore";
import type { JournalFill } from "@/lib/journal/types";

const persistenceFetch = vi.fn();

vi.mock("@/lib/persistence/client/persistenceFetch", () => ({
  persistenceFetch: (...args: unknown[]) => persistenceFetch(...args),
}));

import { fetchJournalTrades, importJournalCsvRemote } from "@/lib/persistence/client/journalClient";

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
  });

  it("merges remote live fills with local CSV history instead of replacing it", async () => {
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
      if (path === "/api/me/journal/trades") {
        return new Response(JSON.stringify({ trades: [{ id: "remote-only", symbol: "HOOD" }] }), {
          status: 200,
        });
      }
      return new Response(null, { status: 503 });
    });

    const trades = await fetchJournalTrades();
    expect(trades.some((trade) => trade.symbol === "AAPL")).toBe(true);
    expect(trades.some((trade) => trade.symbol === "HOOD")).toBe(true);
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
});
