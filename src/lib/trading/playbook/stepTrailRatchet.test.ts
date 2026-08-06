import { describe, expect, it } from "vitest";

import {
  computeStepTrailRatchet,
  currentRFromPrice,
  initialManageStateForTemplate,
  lockPositionPlanOnFill,
  resolveStepTrailRFromTemplate,
  shouldTightenStop,
} from "./stepTrailRatchet";
import type { PlaybookTemplate } from "./types";
import { lockPositionPlan } from "./types";

const STEP_TRAIL_TEMPLATE: PlaybookTemplate = {
  id: "step_trail_025",
  name: "Step trail 0.25R",
  description: "Ratchet stop every 0.25R",
  rules: [{ id: "step-be-025", when: { kind: "multipleOfR", multiple: 0.25 }, then: { kind: "modifyStop", breakEven: true } }],
};

describe("stepTrailRatchet", () => {
  it("detects 0.25R step from template name", () => {
    expect(resolveStepTrailRFromTemplate(STEP_TRAIL_TEMPLATE)).toBe(0.25);
    expect(initialManageStateForTemplate(STEP_TRAIL_TEMPLATE)).toEqual({
      kind: "stepTrailR",
      stepR: 0.25,
      highestMilestoneR: 0,
    });
  });

  it("locks R from fill and ratchets stop at milestones", () => {
    const plan = lockPositionPlanOnFill(
      lockPositionPlan({
        symbol: "AAPL",
        accountId: "DU1",
        side: "BUY",
        entry: 100,
        initialStop: 95,
        qty: 10,
        environment: "paper",
      }),
      100,
    );
    expect(plan.rUnit).toBe(5);
    expect(currentRFromPrice(plan, 101.25)).toBeCloseTo(0.25);

    const ratchet = computeStepTrailRatchet({
      plan,
      manageState: { kind: "stepTrailR", stepR: 0.25, highestMilestoneR: 0 },
      lastPrice: 101.25,
    });
    expect(ratchet?.nextStopPrice).toBe(100);
    expect(shouldTightenStop(plan, 95, ratchet!.nextStopPrice)).toBe(true);
    expect(shouldTightenStop(plan, 100, ratchet!.nextStopPrice)).toBe(false);
  });
});
