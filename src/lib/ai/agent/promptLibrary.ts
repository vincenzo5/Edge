export type CopilotWorkflowPromptId =
  | "prepare_analysis"
  | "compare_symbols"
  | "mark_invalidation"
  | "summarize_thesis";

export type CopilotWorkflowPrompt = {
  id: CopilotWorkflowPromptId;
  label: string;
  prompt: string;
};

export const COPILOT_WORKFLOW_PROMPTS: readonly CopilotWorkflowPrompt[] = [
  {
    id: "prepare_analysis",
    label: "Prepare chart for analysis",
    prompt:
      "Prepare the active symbol for analysis: load it on a 1Y daily chart with MA, MACD, RSI, and volume. Confirm before clearing any existing drawings.",
  },
  {
    id: "compare_symbols",
    label: "Compare symbols",
    prompt:
      "Compare two to four symbols in a multi-cell layout with the same range and interval. Use the active symbol plus relevant peers from my watchlist when possible.",
  },
  {
    id: "mark_invalidation",
    label: "Mark invalidation",
    prompt:
      "Propose an invalidation annotation on the active chart with a clear rationale. Use metadata.kind invalidation, source ai, and status proposed.",
  },
  {
    id: "summarize_thesis",
    label: "Summarize thesis",
    prompt:
      "Summarize the active chart thesis from annotations and price structure. Cite data source and freshness when available.",
  },
] as const;

export const COPILOT_HERO_DEFAULT_PLACEHOLDER = "What do you want to know?" as const;

export const COPILOT_IDLE_QUESTIONS: readonly string[] = COPILOT_WORKFLOW_PROMPTS.map(
  (entry) => `${entry.label}?`,
);

export function getCopilotWorkflowPrompt(
  id: CopilotWorkflowPromptId,
): CopilotWorkflowPrompt | undefined {
  return COPILOT_WORKFLOW_PROMPTS.find((entry) => entry.id === id);
}
