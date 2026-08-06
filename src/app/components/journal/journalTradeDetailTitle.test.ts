import { describe, expect, it } from "vitest";
import {
  journalTradeDetailAriaLabel,
  journalTradeDetailSubtitle,
  journalTradeDetailTitle,
  journalTradeDetailTitleText,
} from "./journalTradeDetailTitle";
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
  it("builds slide-over title and date-only subtitle", () => {
    expect(journalTradeDetailTitleText(trade)).toBe("AAPL · WIN · $100.00");
    expect(journalTradeDetailSubtitle(trade)).toBe("Opened 07/01/2026 · Closed 07/01/2026");
    expect(journalTradeDetailSubtitle(trade)).not.toContain("ET");
    expect(journalTradeDetailTitle(trade)).toEqual({
      title: "AAPL · WIN · $100.00",
      subtitle: journalTradeDetailSubtitle(trade),
    });
  });

  it("builds aria label with outcome and pnl for closed trades", () => {
    expect(journalTradeDetailAriaLabel(trade)).toBe("AAPL WIN $100.00 long trade");
    expect(journalTradeDetailAriaLabel({ ...trade, direction: "short", netPnL: -50 })).toBe(
      "AAPL LOSS -$50.00 short trade",
    );
  });

  it("omits closed date when trade is still open", () => {
    expect(
      journalTradeDetailSubtitle({
        ...trade,
        status: "open",
        closedAt: null,
      }),
    ).toBe("Opened 07/01/2026");
  });
});
