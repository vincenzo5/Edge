import { describe, expect, it } from "vitest";

import { buildTrailOrderDraft, resolveTrailAmountDollars } from "./attachTrail";
import { HALF_PLUS_TRAIL_PRESET } from "./presets";
import { createPlaybookInstance, lockPositionPlan } from "./types";

describe("attachTrail helpers", () => {
  const positionPlan = lockPositionPlan({
    symbol: "AAPL",
    accountId: "DUP586813",
    side: "BUY",
    entry: 100,
    initialStop: 95,
    qty: 100,
    environment: "paper",
  });

  it("builds TRAIL draft from stop leg", () => {
    const instance = createPlaybookInstance({
      id: "inst-1",
      template: HALF_PLUS_TRAIL_PRESET,
      positionPlan,
    });
    const rule = HALF_PLUS_TRAIL_PRESET.rules.find((r) => r.id === "trail-remainder")!;
    const draft = buildTrailOrderDraft({
      instance,
      stopLeg: rule.then.kind === "attachTrail" ? rule.then.stopLeg : { mode: "trail", trailAmount: 1 },
      quantity: 50,
    });
    expect(draft).toMatchObject({
      orderType: "TRAIL",
      side: "SELL",
      quantity: 50,
      stopPrice: 1,
    });
  });

  it("resolves trailRMultiple to dollars from locked R", () => {
    expect(resolveTrailAmountDollars({ mode: "trail", trailRMultiple: 0.5 }, 5)).toBe(2.5);
    const instance = createPlaybookInstance({
      id: "inst-r",
      template: HALF_PLUS_TRAIL_PRESET,
      positionPlan,
    });
    const draft = buildTrailOrderDraft({
      instance,
      stopLeg: { mode: "trail", trailRMultiple: 0.5 },
      quantity: 50,
    });
    // rUnit = |100 − 95| = 5 → 0.5R = $2.50
    expect(draft.stopPrice).toBe(2.5);
  });
});
