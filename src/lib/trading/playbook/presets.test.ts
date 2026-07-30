import { describe, expect, it } from "vitest";

import {
  PLAYBOOK_PRESET_RISK_POLICY,
  RISK_POLICY_COMPLETENESS_KEYS,
} from "./presetRiskPolicy";
import {
  getPlaybookPreset,
  PLAYBOOK_PRESET_IDS,
  PLAYBOOK_PRESET_LIST,
  PLAYBOOK_PRESETS,
} from "./presets";
import { PlaybookTemplateSchema } from "./types";

describe("PLAYBOOK_PRESETS", () => {
  it("ships five stable preset ids", () => {
    expect(PLAYBOOK_PRESET_IDS).toEqual([
      "break_even",
      "half_then_be",
      "half_plus_trail",
      "scale_3x",
      "daytrade_flatten",
    ]);
    expect(PLAYBOOK_PRESET_LIST).toHaveLength(5);
  });

  it("parses every preset through PlaybookTemplateSchema", () => {
    for (const preset of PLAYBOOK_PRESET_LIST) {
      const parsed = PlaybookTemplateSchema.safeParse(preset);
      expect(parsed.success, preset.id).toBe(true);
    }
  });

  it("resolves presets by id", () => {
    expect(getPlaybookPreset("break_even")?.name).toBe("Break-even");
    expect(getPlaybookPreset("unknown")).toBeNull();
  });

  it("uses distinct rule ids within each preset", () => {
    for (const preset of PLAYBOOK_PRESET_LIST) {
      const ids = preset.rules.map((rule) => rule.id);
      expect(new Set(ids).size, preset.id).toBe(ids.length);
    }
  });

  it("half_then_be requires scale before BE", () => {
    const preset = PLAYBOOK_PRESETS.half_then_be;
    const beRule = preset.rules.find((rule) => rule.id === "be-after-half");
    expect(beRule?.requires).toEqual(["scale-half-1r"]);
    expect(beRule?.when).toEqual({ kind: "scaleFill", ruleId: "scale-half-1r" });
  });

  it("documents RiskPolicy completeness for every shipped preset", () => {
    for (const id of PLAYBOOK_PRESET_IDS) {
      const checklist = PLAYBOOK_PRESET_RISK_POLICY[id];
      expect(checklist, id).toBeDefined();
      for (const key of RISK_POLICY_COMPLETENESS_KEYS) {
        expect(checklist[key]?.trim(), `${id}.${key}`).not.toBe("");
      }
    }
    expect(Object.keys(PLAYBOOK_PRESET_RISK_POLICY).sort()).toEqual(
      [...PLAYBOOK_PRESET_IDS].sort(),
    );
  });
});
