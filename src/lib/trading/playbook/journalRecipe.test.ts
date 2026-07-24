import { describe, expect, it } from "vitest";

import { BREAK_EVEN_PRESET } from "./presets";
import { buildManagePlaybookJournal } from "./journalRecipe";
import { createPlaybookInstance, lockPositionPlan } from "./types";

describe("buildManagePlaybookJournal", () => {
  it("builds adherence counts and timeline from instance", () => {
    const plan = lockPositionPlan({
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
      positionPlan: plan,
      status: "armed",
    });
    instance.ruleRuntimes = instance.ruleRuntimes.map((item) =>
      item.ruleId === "be-at-1r"
        ? { ...item, status: "fired", firedAt: "2026-07-24T12:00:00.000Z" }
        : item,
    );

    const recipe = buildManagePlaybookJournal(instance);
    expect(recipe.templateName).toBe("Break-even");
    expect(recipe.plannedRuleCount).toBe(1);
    expect(recipe.firedRuleCount).toBe(1);
    expect(recipe.ruleTimeline[0]?.status).toBe("fired");
  });
});
