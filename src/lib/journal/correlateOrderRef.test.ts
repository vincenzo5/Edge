import { describe, expect, it } from "vitest";
import {
  collectOrderRefsForTrade,
  findFillsByOrderRef,
  findTradeForOrderRef,
  isEdgeIntentOrderRef,
  parseEdgeIntentId,
} from "./correlateOrderRef";
import type { JournalFill, JournalTrade } from "./types";

const fill = (overrides: Partial<JournalFill> = {}): JournalFill => ({
  execId: "exec-1",
  fillTime: "2026-07-08T12:00:00.000Z",
  side: "BOT",
  quantity: 1,
  price: 100,
  contract: { symbol: "AAPL", secType: "STK" },
  ...overrides,
});

const trade = (overrides: Partial<JournalTrade> = {}): JournalTrade => ({
  id: "trade-1",
  symbol: "AAPL",
  secType: "STK",
  status: "open",
  openedAt: "2026-07-08T12:00:00.000Z",
  fillExecIds: ["exec-1"],
  ...overrides,
});

describe("correlateOrderRef", () => {
  it("parses edge intent ids from orderRef", () => {
    expect(parseEdgeIntentId("edge-intent-abc-123")).toBe("abc-123");
    expect(parseEdgeIntentId("manual-ref")).toBeNull();
    expect(isEdgeIntentOrderRef("edge-intent-abc-123")).toBe(true);
  });

  it("finds fills and trades by orderRef", () => {
    const fills = [
      fill({ execId: "e1", orderRef: "edge-intent-a" }),
      fill({ execId: "e2", orderRef: "other" }),
    ];
    const trades = [
      trade({ id: "t1", fillExecIds: ["e1"] }),
      trade({ id: "t2", fillExecIds: ["e2"] }),
    ];

    expect(findFillsByOrderRef(fills, "edge-intent-a")).toHaveLength(1);
    expect(findTradeForOrderRef(fills, trades, "edge-intent-a")?.id).toBe("t1");
    expect(findTradeForOrderRef(fills, trades, "missing")).toBeNull();
  });

  it("collects order refs for a trade from fills", () => {
    const fills = [
      fill({ execId: "e1", orderRef: "edge-intent-a" }),
      fill({ execId: "e2", orderRef: "edge-intent-b" }),
    ];
    const refs = collectOrderRefsForTrade(fills, trade({ fillExecIds: ["e1", "e2"] }));
    expect(refs).toEqual(["edge-intent-a", "edge-intent-b"]);
  });
});
