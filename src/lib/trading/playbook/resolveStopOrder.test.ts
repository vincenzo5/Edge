import { describe, expect, it } from "vitest";

import { resolveProtectiveStopOrderId } from "./resolveStopOrder";
import { createPlaybookInstance, lockPositionPlan } from "./types";
import { BREAK_EVEN_PRESET } from "./presets";

describe("resolveProtectiveStopOrderId", () => {
  const positionPlan = lockPositionPlan({
    symbol: "AAPL",
    accountId: "DUP586813",
    side: "BUY",
    entry: 100,
    initialStop: 95,
    qty: 10,
    environment: "paper",
  });

  const instance = createPlaybookInstance({
    id: "inst-1",
    template: BREAK_EVEN_PRESET,
    positionPlan,
    orderRef: "edge-bracket-1",
  });

  it("prefers cached stopOrderId on instance", () => {
    expect(
      resolveProtectiveStopOrderId({
        instance: { ...instance, stopOrderId: 42 },
        orders: [],
      }),
    ).toBe(42);
  });

  it("matches stop child by parentId", () => {
    expect(
      resolveProtectiveStopOrderId({
        instance,
        orders: [
          { orderId: 10, symbol: "AAPL", account: "DUP586813", orderRef: "edge-bracket-1" },
          {
            orderId: 11,
            parentId: 10,
            symbol: "AAPL",
            account: "DUP586813",
            orderType: "STP",
          },
        ],
        entryOrderId: 10,
      }),
    ).toBe(11);
  });
});
