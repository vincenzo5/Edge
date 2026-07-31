import { describe, expect, it } from "vitest";

import { resolveAutoApplyTemplateId } from "./resolveAutoApplyTemplateId";
import { CLASSIC_PROTECT_TEMPLATE_ID } from "./classicProtectTemplate";
import { evaluateSubmitProtectGate } from "./submitProtectGate";
import { getClassicProtectTemplate } from "./classicProtectTemplate";
import { presetToRiskPolicyTemplate } from "./completeness";

describe("resolveAutoApplyTemplateId", () => {
  it("falls back to classic protect when no last-used pref", () => {
    expect(resolveAutoApplyTemplateId("BUY")).toBe(CLASSIC_PROTECT_TEMPLATE_ID);
  });
});

describe("evaluateSubmitProtectGate", () => {
  it("hard blocks live when protect missing", () => {
    const template = presetToRiskPolicyTemplate("break_even");
    const gate = evaluateSubmitProtectGate({
      environment: "live",
      template,
    });
    expect(gate.kind).toBe("hard_block_live");
  });

  it("allows live unprotected escape when confirmed", () => {
    const template = presetToRiskPolicyTemplate("break_even");
    const gate = evaluateSubmitProtectGate({
      environment: "live",
      template,
      unprotectedConfirm: true,
    });
    expect(gate.kind).toBe("allow");
  });

  it("soft warns on paper when protect missing", () => {
    const template = presetToRiskPolicyTemplate("break_even");
    const gate = evaluateSubmitProtectGate({
      environment: "paper",
      template,
    });
    expect(gate.kind).toBe("soft_warn_paper");
  });

  it("allows when classic protect template has resting broker exit", () => {
    const template = getClassicProtectTemplate();
    const gate = evaluateSubmitProtectGate({
      environment: "live",
      template,
    });
    expect(gate.kind).toBe("allow");
  });
});
