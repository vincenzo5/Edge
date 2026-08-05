import { describe, expect, it, beforeEach } from "vitest";

import {
  clearLocalJournalSnapshot,
  patchLocalJournalTrade,
  readLocalJournalSnapshot,
  replaceLocalJournalTrades,
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

  it("derives planned risk when initialStop is patched", () => {
    replaceLocalJournalTrades([
      {
        id: "t1",
        status: "closed",
        direction: "long",
        symbol: "AAPL",
        secType: "STK",
        openedAt: "2026-07-01T13:30:00.000Z",
        closedAt: "2026-07-01T16:00:00.000Z",
        netQuantity: 10,
        avgEntry: 150,
        fillExecIds: [],
      },
    ]);

    const updated = patchLocalJournalTrade("t1", { initialStop: 145 });
    expect(updated?.initialStop).toBe(145);
    expect(updated?.plannedRiskMode).toBe("usd");
    expect(updated?.plannedRiskValue).toBe(50);
    expect(updated?.plannedRiskUsd).toBe(50);
  });
});
