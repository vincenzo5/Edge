import { describe, expect, it } from "vitest";
import { journalTradeDetailTitle } from "./journalTradeDetailTitle";
import type { JournalTradeResponse } from "@/lib/persistence/schemas/journal";

const trade: JournalTradeResponse = {
  id: "t1",
  status: "closed",
  direction: "long",
  symbol: "AAPL",
  secType: "STK",
  openedAt: "2026-07-01T13:30:00.000Z",
  closedAt: "2026-07-01T16:00:00.000Z",
  netPnL: 100,
  fillExecIds: ["e1"],
  tags: [],
  setup: null,
  reviewNote: null,
  createdAt: "2026-07-01T13:30:00.000Z",
  updatedAt: "2026-07-01T16:00:00.000Z",
};

describe("journalTradeDetailTitle", () => {
  it("builds slide-over title and subtitle", () => {
    expect(journalTradeDetailTitle(trade)).toEqual({
      title: "AAPL · STK · closed",
      subtitle: "Opened 2026-07-01T13:30:00 · Closed 2026-07-01T16:00:00",
    });
  });
});
