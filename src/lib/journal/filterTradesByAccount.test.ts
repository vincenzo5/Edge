import { describe, expect, it } from "vitest";
import type { JournalFillResponse, JournalTradeResponse } from "@/lib/persistence/schemas/journal";
import { filterTradesByAccount } from "./filterTradesByAccount";

const baseTrade = (overrides: Partial<JournalTradeResponse> = {}): JournalTradeResponse => ({
  id: "trade-1",
  status: "closed",
  direction: "long",
  symbol: "AAPL",
  secType: "STK",
  openedAt: "2026-01-01T10:00:00Z",
  closedAt: "2026-01-01T11:00:00Z",
  fillExecIds: ["exec-1"],
  createdAt: "2026-01-01T10:00:00Z",
  updatedAt: "2026-01-01T11:00:00Z",
  ...overrides,
});

const baseFill = (overrides: Partial<JournalFillResponse> = {}): JournalFillResponse => ({
  id: "fill-1",
  execId: "exec-1",
  fillTime: "2026-01-01T10:00:00Z",
  side: "BOT",
  quantity: 1,
  price: 100,
  contract: { symbol: "AAPL", secType: "STK" },
  source: "live",
  createdAt: "2026-01-01T10:00:00Z",
  account: "DU123",
  ...overrides,
});

describe("filterTradesByAccount", () => {
  it("returns all trades when no account is selected", () => {
    const trades = [baseTrade()];
    const fills = [baseFill()];
    expect(filterTradesByAccount(trades, fills, null)).toEqual(trades);
  });

  it("keeps trades with fills on the selected account", () => {
    const trades = [
      baseTrade({ id: "trade-1", fillExecIds: ["exec-1"] }),
      baseTrade({ id: "trade-2", fillExecIds: ["exec-2"] }),
    ];
    const fills = [
      baseFill({ execId: "exec-1", account: "DU123" }),
      baseFill({ execId: "exec-2", account: "DU456" }),
    ];

    expect(filterTradesByAccount(trades, fills, "DU123")).toEqual([trades[0]]);
  });

  it("excludes trades without matching account fills", () => {
    const trades = [baseTrade({ fillExecIds: ["exec-1"] })];
    const fills = [baseFill({ execId: "exec-1", account: "DU456" })];
    expect(filterTradesByAccount(trades, fills, "DU123")).toEqual([]);
  });

  it("excludes trades with empty fillExecIds when scoped", () => {
    const trades = [baseTrade({ fillExecIds: [] })];
    const fills = [baseFill()];
    expect(filterTradesByAccount(trades, fills, "DU123")).toEqual([]);
  });

  it("excludes trades when linked fill has null account", () => {
    const trades = [baseTrade({ fillExecIds: ["exec-1"] })];
    const fills = [baseFill({ execId: "exec-1", account: null })];
    expect(filterTradesByAccount(trades, fills, "DU123")).toEqual([]);
  });

  it("keeps trades when any linked fill matches the selected account", () => {
    const trades = [baseTrade({ fillExecIds: ["exec-1", "exec-2"] })];
    const fills = [
      baseFill({ execId: "exec-1", account: "DU456" }),
      baseFill({ execId: "exec-2", account: "DU123" }),
    ];
    expect(filterTradesByAccount(trades, fills, "DU123")).toEqual(trades);
  });
});
