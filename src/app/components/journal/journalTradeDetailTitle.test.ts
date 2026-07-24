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
  it("builds slide-over title and humanized subtitle", () => {
    expect(journalTradeDetailTitleText(trade)).toBe("AAPL · STK · closed");
    expect(journalTradeDetailSubtitle(trade)).toContain("Opened");
    expect(journalTradeDetailSubtitle(trade)).toContain("Closed");
    expect(journalTradeDetailSubtitle(trade)).toContain("ET");
    expect(journalTradeDetailTitle(trade)).toEqual({
      title: "AAPL · STK · closed",
      subtitle: journalTradeDetailSubtitle(trade),
    });
  });

  it("builds aria label for slide-over", () => {
    expect(journalTradeDetailAriaLabel(trade)).toBe("AAPL STK closed trade");
  });
});
