import { describe, expect, it } from "vitest";

import { rebuildTrades } from "@/lib/journal/rebuildTrades";
import type { JournalFill, JournalTrade } from "@/lib/journal/types";

const baseFill = (partial: Partial<JournalFill> & Pick<JournalFill, "execId">): JournalFill => ({
  fillTime: "2026-06-01T13:30:00.000Z",
  side: "BOT",
  quantity: 1,
  price: 100,
  contract: { symbol: "AAPL", secType: "STK", conId: 1 },
  source: "live",
  ...partial,
});

describe("rebuildTrades", () => {
  it("is idempotent for the same fill set", () => {
    const fills = [
      baseFill({ execId: "1", side: "BOT", quantity: 10, price: 10 }),
      baseFill({ execId: "2", side: "SLD", quantity: 10, price: 12, realizedPNL: 20 }),
    ];
    const first = rebuildTrades(fills);
    const second = rebuildTrades(fills, first.trades);
    expect(second.trades).toHaveLength(first.trades.length);
    expect(second.trades[0].fillExecIds).toEqual(first.trades[0].fillExecIds);
  });

  it("preserves tags from previous trades", () => {
    const fills = [
      baseFill({ execId: "1", side: "BOT", quantity: 10, price: 10 }),
      baseFill({ execId: "2", side: "SLD", quantity: 10, price: 12 }),
    ];
    const previous: JournalTrade[] = [
      {
        id: "old",
        status: "closed",
        direction: "long",
        symbol: "AAPL",
        secType: "STK",
        openedAt: fills[0].fillTime,
        closedAt: fills[1].fillTime,
        fillExecIds: ["1", "2"],
        tags: ["breakout"],
      },
    ];
    const { trades } = rebuildTrades(fills, previous);
    expect(trades[0].tags).toEqual(["breakout"]);
    expect(trades[0].id).toBe("old");
  });
});
