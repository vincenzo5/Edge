import { describe, expect, it } from "vitest";

import { buildJournalExecutionMarkers } from "@/lib/journal/journalExecutionMarkers";
import type { JournalFill, JournalTrade } from "@/lib/journal/types";

const trade: JournalTrade = {
  id: "t1",
  status: "closed",
  direction: "long",
  symbol: "AAPL",
  secType: "STK",
  openedAt: "2026-06-01T13:30:00.000Z",
  closedAt: "2026-06-01T14:30:00.000Z",
  fillExecIds: ["e1", "e2"],
  fillLinks: [
    { execId: "e1", role: "open" },
    { execId: "e2", role: "close" },
  ],
};

const fills: JournalFill[] = [
  {
    execId: "e1",
    fillTime: "2026-06-01T13:30:00.000Z",
    side: "BOT",
    quantity: 10,
    price: 100,
    contract: { symbol: "AAPL", secType: "STK" },
    source: "flex_csv",
  },
  {
    execId: "e2",
    fillTime: "2026-06-01T14:30:00.000Z",
    side: "SLD",
    quantity: 10,
    price: 105,
    contract: { symbol: "AAPL", secType: "STK" },
    source: "flex_csv",
  },
];

describe("journalExecutionMarkers", () => {
  it("builds entry and exit markers from fill links", () => {
    const markers = buildJournalExecutionMarkers(trade, fills);
    expect(markers).toHaveLength(2);
    expect(markers[0]?.label).toContain("Entry");
    expect(markers[0]?.color).toBe("#22c55e");
    expect(markers[1]?.label).toContain("Exit");
    expect(markers[1]?.color).toBe("#ef4444");
  });

  it("infers roles when fill links are missing", () => {
    const markers = buildJournalExecutionMarkers(
      { ...trade, fillLinks: undefined },
      fills,
    );
    expect(markers[0]?.label).toContain("Entry");
    expect(markers[1]?.label).toContain("Exit");
  });
});
