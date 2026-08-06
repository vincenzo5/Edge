import { describe, expect, it } from "vitest";

import { BREAK_EVEN_PRESET } from "./playbook/presets";
import {
  applyPlaybookTemplatePatch,
  finalizePlaybookTemplateForSave,
  userTemplateFromSource,
} from "./playbookTemplateMutations";
import type { PlaybookTemplate } from "./playbook/types";

describe("playbookTemplateMutations", () => {
  it("copies slot fields when cloning from preset", () => {
    const source: PlaybookTemplate = {
      ...BREAK_EVEN_PRESET,
      budget: { kind: "percentNetLiq", value: 1 },
      sizing: { method: "stopDistance", maxQty: 500 },
      geometry: { stops: [{ rMultiple: 1 }] },
      exits: BREAK_EVEN_PRESET.rules,
      gates: { minRiskReward: 2 },
      defaultEntrySchedule: { kind: "sessionEvent", event: "nextRthOpen" },
    };
    const cloned = userTemplateFromSource(source);
    expect(cloned.budget).toEqual(source.budget);
    expect(cloned.sizing).toEqual(source.sizing);
    expect(cloned.geometry).toEqual(source.geometry);
    expect(cloned.exits).toEqual(source.exits);
    expect(cloned.gates).toEqual(source.gates);
    expect(cloned.defaultEntrySchedule).toEqual(source.defaultEntrySchedule);
  });

  it("dual-writes rules from managedApp exits on patch", () => {
    const base = userTemplateFromSource(BREAK_EVEN_PRESET);
    const manageRule = {
      id: "manage-1r",
      label: "BE at 1R",
      when: { kind: "multipleOfR" as const, multiple: 1 },
      then: { kind: "modifyStop" as const, breakEven: true },
      once: true,
      role: "manage" as const,
      binding: "managedApp" as const,
    };
    const protectRule = {
      id: "protect-stop",
      label: "Initial stop",
      when: { kind: "protectiveFill" as const },
      then: { kind: "flatten" as const },
      once: true,
      role: "protect" as const,
      binding: "restingBroker" as const,
    };
    const patched = applyPlaybookTemplatePatch(base, {
      exits: [protectRule, manageRule],
    });
    expect(patched.exits).toEqual([protectRule, manageRule]);
    expect(patched.rules).toEqual([manageRule]);
  });

  it("finalizePlaybookTemplateForSave keeps exits and dual-writes rules", () => {
    const manageRule = {
      id: "manage-1r",
      when: { kind: "multipleOfR" as const, multiple: 1 },
      then: { kind: "modifyStop" as const, breakEven: true },
      once: true,
      role: "manage" as const,
      binding: "managedApp" as const,
    };
    const finalized = finalizePlaybookTemplateForSave({
      ...userTemplateFromSource(BREAK_EVEN_PRESET),
      exits: [manageRule],
      rules: BREAK_EVEN_PRESET.rules,
    });
    expect(finalized.exits).toEqual([manageRule]);
    expect(finalized.rules).toEqual([manageRule]);
  });
});
