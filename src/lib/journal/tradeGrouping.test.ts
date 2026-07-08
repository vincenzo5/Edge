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
