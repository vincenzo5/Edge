import { describe, expect, it, beforeEach } from "vitest";

import {
  clearLocalJournalSnapshot,
  readLocalJournalSnapshot,
  upsertLocalJournalFills,
} from "@/lib/journal/localJournalStore";
import type { JournalFill } from "@/lib/journal/types";

const sampleFill = (execId: string): JournalFill => ({
  execId,
  fillTime: "2026-06-01T13:30:00.000Z",
  side: "BOT",
  quantity: 1,
  price: 100,
  contract: { symbol: "AAPL", secType: "STK", conId: 1 },
  source: "live",
});

describe("localJournalStore", () => {
  beforeEach(() => {
    clearLocalJournalSnapshot();
  });

  it("round-trips fills in localStorage", () => {
    upsertLocalJournalFills([sampleFill("e1")]);
    const snapshot = readLocalJournalSnapshot();
    expect(snapshot.fills).toHaveLength(1);
    expect(snapshot.fills[0].execId).toBe("e1");
  });

  it("dedupes fills by execId", () => {
    upsertLocalJournalFills([sampleFill("e1")]);
    upsertLocalJournalFills([{ ...sampleFill("e1"), price: 101 }]);
    const snapshot = readLocalJournalSnapshot();
    expect(snapshot.fills).toHaveLength(1);
    expect(snapshot.fills[0].price).toBe(101);
  });
});
