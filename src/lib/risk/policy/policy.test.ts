import { describe, expect, it } from "vitest";

import { lockPositionPlan } from "@/lib/trading/playbook/types";
import {
  PLAYBOOK_PRESET_IDS,
  PLAYBOOK_PRESETS,
} from "@/lib/trading/playbook/presets";

import {
  allPresetRiskPolicyTemplates,
  assessTemplateCompleteness,
  isIncompleteManageOnlyTemplate,
  presetToRiskPolicyTemplate,
} from "./completeness";
import {
  playbookRuleToExitRule,
  playbookTemplateToRiskPolicyTemplate,
} from "./fromPlaybook";
import {
  derivePolicyIntegrity,
  manualOffPreservesProtect,
  pauseAffectsProtectOrders,
} from "./integrity";
import {
  EntryScheduleSchema,
  ExitRuleSchema,
  RiskPolicyInstanceSchema,
  RiskPolicyTemplateSchema,
} from "./types";

describe("risk policy types", () => {
  it("parses EntrySchedule kinds", () => {
    expect(EntryScheduleSchema.parse({ kind: "immediate" })).toEqual({
      kind: "immediate",
    });
    expect(
      EntryScheduleSchema.parse({ kind: "sessionEvent", event: "nextRthOpen" }),
    ).toEqual({ kind: "sessionEvent", event: "nextRthOpen" });
    expect(
      EntryScheduleSchema.parse({
        kind: "clock",
        at: "2026-07-31T13:35:00.000Z",
        timeZone: "America/New_York",
      }).kind,
    ).toBe("clock");
  });

  it("parses a complete RiskPolicyTemplate fixture", () => {
    const template = RiskPolicyTemplateSchema.parse({
      id: "classic-protect",
      name: "Classic Protect",
      schemaVersion: 1,
      scope: "trade",
      budget: { kind: "percentNetLiq", value: 1 },
      sizing: { method: "stopDistance" },
      geometry: { stops: [{ rMultiple: 1 }] },
      exits: [
        {
          id: "protect-stop",
          role: "protect",
          binding: "restingBroker",
          qtyScope: "full",
          when: { kind: "protectiveFill" },
          then: { kind: "notify", message: "protect" },
        },
        {
          id: "be-at-1r",
          when: { kind: "multipleOfR", multiple: 1 },
          then: { kind: "modifyStop", breakEven: true },
        },
      ],
      adds: [],
    });

    expect(template.exits).toHaveLength(2);
    expect(template.budget).toEqual({ kind: "percentNetLiq", value: 1 });
  });

  it("parses RiskPolicyInstance happy path", () => {
    const template = presetToRiskPolicyTemplate("break_even");
    const positionPlan = lockPositionPlan({
      symbol: "AAPL",
      accountId: "DU123",
      side: "BUY",
      entry: 100,
      initialStop: 95,
      qty: 100,
      environment: "paper",
    });
    const now = "2026-07-31T13:00:00.000Z";

    const instance = RiskPolicyInstanceSchema.parse({
      id: "inst-1",
      templateId: template.id,
      policySnapshot: template,
      bindingRef: { kind: "drawing", id: "draw-1" },
      environment: "paper",
      accountId: "DU123",
      symbol: "AAPL",
      side: "BUY",
      positionPlan,
      entrySchedule: { kind: "immediate" },
      entryOrder: { type: "LMT", limitPrice: 100 },
      status: "planned",
      controlMode: "automated",
      exitRuntimes: [{ ruleId: "be-at-1r", status: "pending" }],
      protect: [],
      protectState: "unknown",
      createdAt: now,
      updatedAt: now,
    });

    expect(instance.status).toBe("planned");
    expect(instance.policySnapshot.id).toBe("break_even");
  });
});

describe("fromPlaybook adapter", () => {
  it("maps playbook rules to ExitRule with managedApp defaults", () => {
    const rule = PLAYBOOK_PRESETS.break_even.rules[0]!;
    const exit = playbookRuleToExitRule(rule);
    const parsed = ExitRuleSchema.parse(exit);

    expect(parsed.role).toBe("manage");
    expect(parsed.binding).toBe("managedApp");
    expect(parsed.when).toEqual(rule.when);
  });

  it("maps every preset to incomplete Manage-only templates", () => {
    for (const id of PLAYBOOK_PRESET_IDS) {
      const template = playbookTemplateToRiskPolicyTemplate(PLAYBOOK_PRESETS[id]);
      expect(template.exits.length).toBeGreaterThanOrEqual(1);
      expect(template.exits.every((exit) => exit.binding === "managedApp")).toBe(true);
      expect(isIncompleteManageOnlyTemplate(template)).toBe(true);
    }
  });

  it("allPresetRiskPolicyTemplates covers shipped presets", () => {
    const map = allPresetRiskPolicyTemplates();
    expect(Object.keys(map).sort()).toEqual([...PLAYBOOK_PRESET_IDS].sort());
  });
});

describe("completeness helpers", () => {
  it("flags Manage-only templates as incomplete for trade scope", () => {
    const template = presetToRiskPolicyTemplate("half_then_be");
    const report = assessTemplateCompleteness(template);

    expect(report.isTradeComplete).toBe(false);
    expect(report.missingForTradeScope).toEqual(["budget", "geometry", "protectExit"]);
    expect(report.slots.budget).toBe("inherits");
    expect(report.slots.exits).toBe("present");
  });
});

describe("integrity helpers", () => {
  it("returns incomplete_template for Manage-only presets", () => {
    const template = presetToRiskPolicyTemplate("break_even");
    expect(derivePolicyIntegrity({ template })).toBe("incomplete_template");
  });

  it("returns protect_missing when complete template lacks resting protect observation", () => {
    const template = RiskPolicyTemplateSchema.parse({
      id: "complete-no-obs",
      name: "Complete",
      budget: { kind: "dollar", value: 500 },
      sizing: { method: "stopDistance" },
      geometry: { stops: [{ rMultiple: 1 }] },
      exits: [
        {
          id: "protect-stop",
          role: "protect",
          binding: "restingBroker",
          when: { kind: "protectiveFill" },
          then: { kind: "notify" },
        },
      ],
      adds: [],
    });

    expect(derivePolicyIntegrity({ template, protectState: "missing" })).toBe(
      "protect_missing",
    );
  });

  it("returns ok when template complete and protect resting", () => {
    const template = RiskPolicyTemplateSchema.parse({
      id: "complete",
      name: "Complete",
      budget: { kind: "dollar", value: 500 },
      sizing: { method: "stopDistance" },
      geometry: { stops: [{ rMultiple: 1 }] },
      exits: [
        {
          id: "protect-stop",
          role: "protect",
          binding: "restingBroker",
          when: { kind: "protectiveFill" },
          then: { kind: "notify" },
        },
      ],
      adds: [],
    });

    expect(derivePolicyIntegrity({ template, protectState: "resting" })).toBe("ok");
  });

  it("preserves manual-off Protect invariants", () => {
    expect(pauseAffectsProtectOrders()).toBe(false);
    expect(manualOffPreservesProtect()).toBe(true);
  });
});
