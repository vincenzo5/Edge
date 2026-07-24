import { describe, expect, it } from "vitest";
import type { JournalTradeResponse } from "@/lib/persistence/schemas/journal";
import {
  collectFillExecIds,
  fillAccountIndexToMap,
  mergeJournalProviderTrades,
} from "./journalProviderLoad";

const baseTrade = (id: string, execIds: string[]): JournalTradeResponse => ({
  id,
  status: "closed",
  direction: "long",
  symbol: "AAPL",
  secType: "STK",
  openedAt: "2026-01-01T10:00:00Z",
  closedAt: "2026-01-01T11:00:00Z",
  fillExecIds: execIds,
  createdAt: "2026-01-01T10:00:00Z",
  updatedAt: "2026-01-01T11:00:00Z",
});

describe("journalProviderLoad", () => {
  it("merges open and closed trades without duplicate ids", () => {
    const open = [baseTrade("open-1", ["e1"]), baseTrade("shared", ["e2"])];
    const closed = [baseTrade("closed-1", ["e3"]), baseTrade("shared", ["e2-updated"])];

    const merged = mergeJournalProviderTrades(open, closed);
    expect(merged).toHaveLength(3);
    expect(merged.find((trade) => trade.id === "shared")?.fillExecIds).toEqual(["e2-updated"]);
  });

  it("collects unique fill exec ids from trades", () => {
    expect(
      collectFillExecIds([
        baseTrade("t1", ["a", "b"]),
        baseTrade("t2", ["b", "c"]),
      ]),
    ).toEqual(["a", "b", "c"]);
  });

  it("builds a compact account map from index entries", () => {
    const map = fillAccountIndexToMap([
      { execId: "e1", account: "DU123" },
      { execId: "e2", account: null },
    ]);
    expect(map.get("e1")).toBe("DU123");
    expect(map.get("e2")).toBeNull();
  });
});
