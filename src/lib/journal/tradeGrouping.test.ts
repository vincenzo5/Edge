import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { groupFillsIntoTrades } from "@/lib/journal/tradeGrouping";
import type { JournalFill } from "@/lib/journal/types";

function fill(partial: Partial<JournalFill> & Pick<JournalFill, "execId" | "side" | "quantity" | "price">): JournalFill {
  return {
    fillTime: partial.fillTime ?? "2026-06-01T13:30:00.000Z",
    contract: partial.contract ?? { symbol: "AAPL", secType: "STK", conId: 1 },
    source: partial.source ?? "live",
    ...partial,
  };
}

describe("tradeGrouping", () => {
  it("groups stock buy then sell into one closed trade", () => {
    const trades = groupFillsIntoTrades([
      fill({ execId: "1", side: "BOT", quantity: 100, price: 150, fillTime: "2026-06-01T13:30:00.000Z" }),
      fill({ execId: "2", side: "SLD", quantity: 100, price: 155, fillTime: "2026-06-02T19:45:00.000Z", realizedPNL: 500 }),
    ]);
    expect(trades).toHaveLength(1);
    expect(trades[0].status).toBe("closed");
    expect(trades[0].symbol).toBe("AAPL");
    expect(trades[0].fillExecIds).toEqual(["1", "2"]);
    expect(trades[0].netQuantity).toBe(100);
  });

  it("keeps open size on closed LQDA-shaped partial exits", () => {
    const trades = groupFillsIntoTrades([
      fill({ execId: "o1", side: "BOT", quantity: 100, price: 83.57, fillTime: "2026-08-03T13:30:00.000Z" }),
      fill({ execId: "o2", side: "BOT", quantity: 100, price: 83.57, fillTime: "2026-08-03T13:31:00.000Z" }),
      fill({ execId: "o3", side: "BOT", quantity: 100, price: 83.57, fillTime: "2026-08-03T13:32:00.000Z" }),
      fill({ execId: "o4", side: "BOT", quantity: 100, price: 83.57, fillTime: "2026-08-03T13:33:00.000Z" }),
      fill({ execId: "c1", side: "SLD", quantity: 198, price: 89.59, fillTime: "2026-08-05T18:35:00.000Z", realizedPNL: 1189 }),
      fill({ execId: "c2", side: "SLD", quantity: 122, price: 89.58, fillTime: "2026-08-05T18:35:01.000Z", realizedPNL: 731 }),
      fill({ execId: "c3", side: "SLD", quantity: 80, price: 89.59, fillTime: "2026-08-05T18:35:02.000Z", realizedPNL: 480 }),
    ]);
    expect(trades).toHaveLength(1);
    expect(trades[0].status).toBe("closed");
    expect(trades[0].netQuantity).toBe(400);
  });

  it("aggregates partial stock fills", () => {
    const trades = groupFillsIntoTrades([
      fill({ execId: "1", side: "BOT", quantity: 50, price: 150 }),
      fill({ execId: "2", side: "BOT", quantity: 50, price: 151 }),
      fill({ execId: "3", side: "SLD", quantity: 100, price: 155, realizedPNL: 450 }),
    ]);
    expect(trades).toHaveLength(1);
    expect(trades[0].status).toBe("closed");
  });

  it("groups single-leg options by conId", () => {
    const trades = groupFillsIntoTrades([
      fill({
        execId: "o1",
        side: "BOT",
        quantity: 2,
        price: 1.5,
        contract: { symbol: "AAPL", secType: "OPT", conId: 99, strike: 200, right: "C" },
      }),
      fill({
        execId: "o2",
        side: "SLD",
        quantity: 2,
        price: 2.0,
        contract: { symbol: "AAPL", secType: "OPT", conId: 99, strike: 200, right: "C" },
        realizedPNL: 100,
      }),
    ]);
    expect(trades).toHaveLength(1);
    expect(trades[0].secType).toBe("OPT");
  });

  it("groups multi-leg spread opens by orderId", () => {
    const at = "2026-06-03T14:00:00.000Z";
    const trades = groupFillsIntoTrades([
      fill({ execId: "l1", side: "BOT", quantity: 1, price: 2.5, orderId: 2001, orderRef: "IC-OPEN", fillTime: at, contract: { symbol: "SPY", secType: "OPT", conId: 1 } }),
      fill({ execId: "l2", side: "SLD", quantity: 1, price: 2.1, orderId: 2001, orderRef: "IC-OPEN", fillTime: at, contract: { symbol: "SPY", secType: "OPT", conId: 2 } }),
      fill({ execId: "l3", side: "SLD", quantity: 1, price: 1.8, orderId: 2001, orderRef: "IC-OPEN", fillTime: at, contract: { symbol: "SPY", secType: "OPT", conId: 3 } }),
      fill({ execId: "l4", side: "BOT", quantity: 1, price: 1.2, orderId: 2001, orderRef: "IC-OPEN", fillTime: at, contract: { symbol: "SPY", secType: "OPT", conId: 4 } }),
    ]);
    const spread = trades.find((trade) => trade.secType === "spread");
    expect(spread).toBeDefined();
    expect(spread?.legs?.length).toBe(4);
    expect(spread?.status).toBe("open");
  });

  it("does not treat same-order partial stock fills as spreads", () => {
    const at = "2026-06-25T13:41:55.000Z";
    const trades = groupFillsIntoTrades([
      fill({
        execId: "1",
        side: "BOT",
        quantity: 100,
        price: 279.925,
        orderId: 5352490580,
        fillTime: at,
        contract: { symbol: "AAPL", secType: "STK", conId: 265598 },
      }),
      fill({
        execId: "2",
        side: "BOT",
        quantity: 100,
        price: 279.925,
        orderId: 5352490580,
        fillTime: at,
        contract: { symbol: "AAPL", secType: "STK", conId: 265598 },
      }),
    ]);
    expect(trades.filter((trade) => trade.secType === "spread")).toHaveLength(0);
    expect(trades[0].status).toBe("open");
    expect(trades[0].netQuantity).toBe(200);
  });

  it("includes commission and realized pnl totals", () => {
    const trades = groupFillsIntoTrades([
      fill({ execId: "1", side: "BOT", quantity: 10, price: 10, commission: 1 }),
      fill({ execId: "2", side: "SLD", quantity: 10, price: 12, commission: 1, realizedPNL: 20 }),
    ]);
    expect(trades[0].totalCommission).toBe(2);
    expect(trades[0].netPnL).toBe(18);
  });

  it("treats Flex negative commissions as cost (not fake wins)", () => {
    const trades = groupFillsIntoTrades([
      fill({ execId: "1", side: "BOT", quantity: 10, price: 10, commission: -1 }),
      fill({
        execId: "2",
        side: "SLD",
        quantity: 10,
        price: 12,
        commission: -1,
        realizedPNL: 20,
      }),
    ]);
    expect(trades[0].totalCommission).toBe(2);
    expect(trades[0].grossPnL).toBe(20);
    expect(trades[0].netPnL).toBe(18);
  });

  it("derives gross P&L from entry/exit prices when realizedPNL is missing", () => {
    const trades = groupFillsIntoTrades([
      fill({
        execId: "1",
        side: "BOT",
        quantity: 100,
        price: 10,
        commission: -1,
        fillTime: "2026-06-01T13:30:00.000Z",
      }),
      fill({
        execId: "2",
        side: "SLD",
        quantity: 100,
        price: 12,
        commission: -1,
        fillTime: "2026-06-02T13:30:00.000Z",
      }),
    ]);
    expect(trades[0].status).toBe("closed");
    expect(trades[0].grossPnL).toBe(200);
    expect(trades[0].totalCommission).toBe(2);
    expect(trades[0].netPnL).toBe(198);
    expect(trades[0].openedAt.startsWith("2026-06-01")).toBe(true);
  });

  it("merges Flex STK buys (no conId) with live sells (same symbol conId) into one closed trade", () => {
    const trades = groupFillsIntoTrades([
      fill({
        execId: "flex-1",
        side: "BOT",
        quantity: 100,
        price: 24.9,
        source: "flex_csv",
        fillTime: "2026-07-20T13:31:00.000Z",
        contract: { symbol: "BRUN", secType: "STK", conId: null },
      }),
      fill({
        execId: "flex-2",
        side: "BOT",
        quantity: 1300,
        price: 24.95,
        source: "flex_csv",
        fillTime: "2026-07-20T13:33:00.000Z",
        contract: { symbol: "BRUN", secType: "STK" },
      }),
      fill({
        execId: "live-1",
        side: "SLD",
        quantity: 400,
        price: 24.05,
        source: "live",
        fillTime: "2026-07-22T19:46:32.000Z",
        realizedPNL: -340,
        contract: { symbol: "BRUN", secType: "STK", conId: 881547637 },
      }),
      fill({
        execId: "live-2",
        side: "SLD",
        quantity: 1000,
        price: 24.05,
        source: "live",
        fillTime: "2026-07-22T19:46:32.000Z",
        realizedPNL: -850,
        contract: { symbol: "BRUN", secType: "STK", conId: 881547637 },
      }),
    ]);
    const brun = trades.filter((trade) => trade.symbol === "BRUN");
    expect(brun).toHaveLength(1);
    expect(brun[0].status).toBe("closed");
    expect(brun[0].direction).toBe("long");
    expect(brun[0].fillExecIds).toEqual(["flex-1", "flex-2", "live-1", "live-2"]);
    expect(brun[0].grossPnL).toBe(-1190);
  });

  it("does not alias STK fills when the same symbol has multiple conIds", () => {
    const trades = groupFillsIntoTrades([
      fill({
        execId: "a",
        side: "BOT",
        quantity: 10,
        price: 1,
        contract: { symbol: "XYZ", secType: "STK", conId: 1 },
      }),
      fill({
        execId: "b",
        side: "BOT",
        quantity: 10,
        price: 1,
        contract: { symbol: "XYZ", secType: "STK", conId: 2 },
      }),
      fill({
        execId: "c",
        side: "SLD",
        quantity: 10,
        price: 2,
        contract: { symbol: "XYZ", secType: "STK" },
      }),
    ]);
    // Symbol-only sell must not merge into either conId bucket when ambiguous.
    expect(trades.filter((trade) => trade.symbol === "XYZ")).toHaveLength(3);
  });
});

describe("parseFlexCsv fixtures", () => {
  it("parses stock fixture", async () => {
    const { parseFlexCsv } = await import("@/lib/journal/flexImport/parseFlexCsv");
    const csv = readFileSync(
      join(process.cwd(), "src/lib/journal/flexImport/fixtures/flex-trades-stk.csv"),
      "utf8",
    );
    const parsed = parseFlexCsv(csv);
    expect(parsed.errors).toEqual([]);
    expect(parsed.fills).toHaveLength(2);
    expect(parsed.fills[0].contract.symbol).toBe("AAPL");
  });
});
