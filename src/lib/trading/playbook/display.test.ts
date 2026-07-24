import { describe, expect, it } from "vitest";

import { createPlaybookInstance, lockPositionPlan } from "./types";
import { BREAK_EVEN_PRESET, HALF_PLUS_TRAIL_PRESET } from "./presets";
import {
  findActivePlaybookForPosition,
  formatNextManageDistance,
  formatPlaybookManageLabel,
  formatManageStepPreview,
} from "./display";
import { planPlaybookSteps } from "./planSteps";

describe("playbook display", () => {
  const positionPlan = lockPositionPlan({
    symbol: "AAPL",
    accountId: "DUP586813",
    side: "BUY",
    entry: 100,
    initialStop: 95,
    qty: 10,
    environment: "paper",
    lockedAt: "2026-07-24T12:00:00.000Z",
  });

  it("formats manage label with pending token", () => {
    const instance = createPlaybookInstance({
      id: "inst-1",
      template: BREAK_EVEN_PRESET,
      positionPlan,
      status: "pending_fill",
      createdAt: "2026-07-24T12:00:00.000Z",
    });
    expect(formatPlaybookManageLabel(instance)).toBe("Manage: Break-even · pending");
  });

  it("finds active playbook by symbol and account", () => {
    const instance = createPlaybookInstance({
      id: "inst-1",
      template: BREAK_EVEN_PRESET,
      positionPlan,
      status: "armed",
      createdAt: "2026-07-24T12:00:00.000Z",
    });
    const found = findActivePlaybookForPosition([instance], "AAPL", "DUP586813");
    expect(found?.id).toBe("inst-1");
  });

  it("formats step preview for break-even", () => {
    const steps = planPlaybookSteps(BREAK_EVEN_PRESET, positionPlan);
    expect(formatManageStepPreview(steps[0]!)).toContain("stop to entry");
  });

  it("formats next manage distance in R", () => {
    const instance = createPlaybookInstance({
      id: "inst-1",
      template: BREAK_EVEN_PRESET,
      positionPlan,
      status: "armed",
      createdAt: "2026-07-24T12:00:00.000Z",
    });
    expect(formatNextManageDistance(instance, 102)).toBe("+0.6R to BE");
  });

  it("formats scaleFill next step after prior scale", () => {
    const instance = createPlaybookInstance({
      id: "inst-trail",
      template: HALF_PLUS_TRAIL_PRESET,
      positionPlan,
      status: "armed",
      createdAt: "2026-07-24T12:00:00.000Z",
    });
    instance.ruleRuntimes = instance.ruleRuntimes.map((item) =>
      item.ruleId === "scale-half-1r"
        ? { ...item, status: "fired", firedAt: "2026-07-24T12:01:00.000Z" }
        : item,
    );
    expect(formatNextManageDistance(instance, 100)).toBe("trail");
  });
});
