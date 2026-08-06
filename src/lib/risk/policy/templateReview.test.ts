import { describe, expect, it } from "vitest";

import { BREAK_EVEN_PRESET } from "@/lib/trading/playbook/presets";
import { playbookTemplateToRiskPolicyTemplateFull, policyTemplateFailureModeCopy } from "./templateReview";

describe("templateReview", () => {
  it("maps slot fields from playbook template", () => {
    const template = {
      ...BREAK_EVEN_PRESET,
      budget: { kind: "dollar" as const, value: 500 },
      geometry: { stops: [{ rMultiple: 1 }] },
    };
    const policy = playbookTemplateToRiskPolicyTemplateFull(template);
    expect(policy.budget).toEqual({ kind: "dollar", value: 500 });
    expect(policy.geometry).toEqual({ stops: [{ rMultiple: 1 }] });
  });

  it("returns manage-only failure copy when protect missing", () => {
    const policy = playbookTemplateToRiskPolicyTemplateFull(BREAK_EVEN_PRESET);
    expect(policyTemplateFailureModeCopy(policy)).toMatch(/Manage-only|Incomplete/i);
  });
});
