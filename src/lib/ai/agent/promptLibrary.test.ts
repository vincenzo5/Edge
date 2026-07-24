import { describe, expect, it } from "vitest";
import {
  COPILOT_WORKFLOW_PROMPTS,
  getCopilotWorkflowPrompt,
} from "./promptLibrary";

describe("promptLibrary", () => {
  it("exports four stable workflow prompts", () => {
    expect(COPILOT_WORKFLOW_PROMPTS).toHaveLength(4);
    expect(COPILOT_WORKFLOW_PROMPTS.map((entry) => entry.id)).toEqual([
      "prepare_analysis",
      "compare_symbols",
      "mark_invalidation",
      "summarize_thesis",
    ]);
  });

  it("looks up prompts by id", () => {
    const prompt = getCopilotWorkflowPrompt("summarize_thesis");
    expect(prompt?.label).toBe("Summarize thesis");
    expect(prompt?.prompt).toContain("data source");
  });
});
