import { describe, expect, it } from "vitest";

import { BREAK_EVEN_PRESET } from "@/lib/trading/playbook/presets";
import { playbookTemplateToRiskPolicyTemplate } from "./fromPlaybook";
import { dualWriteTemplateRules, managedAppRulesFromExits } from "./templatePersistence";

describe("templatePersistence", () => {
  it("dual-writes managedApp exits into rules", () => {
    const policy = playbookTemplateToRiskPolicyTemplate(BREAK_EVEN_PRESET);
    const template = {
      ...BREAK_EVEN_PRESET,
      exits: policy.exits,
    };
    const rules = dualWriteTemplateRules(template);
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.every((rule) => (rule.binding ?? "managedApp") === "managedApp")).toBe(true);
  });

  it("managedAppRulesFromExits filters resting broker protects", () => {
    const policy = playbookTemplateToRiskPolicyTemplate(BREAK_EVEN_PRESET);
    const managed = managedAppRulesFromExits([
      ...policy.exits,
      {
        id: "protect-stop",
        role: "protect",
        binding: "restingBroker",
        when: { kind: "protectiveFill" },
        then: { kind: "notify" },
      },
    ]);
    expect(managed.some((rule) => rule.id === "protect-stop")).toBe(false);
  });
});
