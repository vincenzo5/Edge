import { describe, expect, it } from "vitest";

import { BREAK_EVEN_PRESET } from "./presets";
import {
  createPlaybookRuleDraft,
  reorderPlaybookRules,
  validatePlaybookTemplateDraft,
} from "./editorDraft";

describe("playbook editorDraft", () => {
  it("validates a playbook template draft", () => {
    const result = validatePlaybookTemplateDraft({
      id: "user_test",
      name: "Custom",
      description: "Custom manage recipe",
      rules: [createPlaybookRuleDraft(1)],
    });
    expect(result.ok).toBe(true);
  });

  it("reorders rules and reassigns priority", () => {
    const first = createPlaybookRuleDraft(1);
    const second = { ...createPlaybookRuleDraft(2), id: "rule_second" };
    const reordered = reorderPlaybookRules([first, second], 1, 0);
    expect(reordered[0]?.id).toBe("rule_second");
    expect(reordered[0]?.priority).toBe(1);
    expect(reordered[1]?.priority).toBe(2);
  });

  it("rejects invalid template drafts", () => {
    const result = validatePlaybookTemplateDraft({
      ...BREAK_EVEN_PRESET,
      name: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.length).toBeGreaterThan(0);
    }
  });
});
