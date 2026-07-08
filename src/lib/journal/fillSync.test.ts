import { describe, expect, it } from "vitest";

import { syncExecutionsIntoFills } from "@/lib/journal/fillSync";
import type { JournalFill } from "@/lib/journal/types";

describe("fillSync", () => {
  it("maps executions and skips duplicate execIds on merge", () => {
    const existing: JournalFill[] = [
      {
        execId: "e1",
        fillTime: "2026-06-01T13:30:00.000Z",
        side: "BOT",
        quantity: 1,
        price: 100,
        contract: { symbol: "AAPL", secType: "STK" },
        source: "live",
      },
    ];
    const result = syncExecutionsIntoFills(existing, [
      { execId: "e1", shares: 1, price: 100, side: "BOT", symbol: "AAPL", secType: "STK" },
      { execId: "e2", shares: 2, price: 200, side: "SLD", symbol: "MSFT", secType: "STK" },
    ]);
    expect(result.fills).toHaveLength(2);
    expect(result.added).toBe(1);
    expect(result.duplicates).toBe(1);
  });
});
