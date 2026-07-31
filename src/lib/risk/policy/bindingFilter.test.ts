import { describe, expect, it } from "vitest";

import { isManagedAppExitRule, resolveExitRuleBinding } from "./bindingFilter";
import type { PlaybookRule } from "@/lib/trading/playbook/types";

function makeRule(binding?: PlaybookRule["binding"]): PlaybookRule {
  return {
    id: "rule-1",
    when: { kind: "multipleOfR", multiple: 1 },
    then: { kind: "modifyStop", breakEven: true },
    once: true,
    binding,
  };
}

describe("bindingFilter", () => {
  it("defaults unset binding to managedApp", () => {
    expect(resolveExitRuleBinding(makeRule())).toBe("managedApp");
    expect(isManagedAppExitRule(makeRule())).toBe(true);
  });

  it("skips restingBroker protect exits for evaluator", () => {
    expect(isManagedAppExitRule(makeRule("restingBroker"))).toBe(false);
    expect(isManagedAppExitRule(makeRule("notifyOnly"))).toBe(false);
  });
});
