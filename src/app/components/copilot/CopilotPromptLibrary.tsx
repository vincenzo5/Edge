"use client";

import { COPILOT_WORKFLOW_PROMPTS } from "@/lib/ai/agent/promptLibrary";
import { EdgeButton } from "../design-system";

type Props = {
  onPromptSelect: (prompt: string) => void;
  disabled?: boolean;
};

export function CopilotPromptLibrary({ onPromptSelect, disabled = false }: Props) {
  return (
    <div
      data-testid="copilot-prompt-library"
      className="flex max-w-full flex-wrap justify-center gap-2"
    >
      {COPILOT_WORKFLOW_PROMPTS.map((entry) => (
        <EdgeButton
          key={entry.id}
          type="button"
          variant="secondary"
          data-testid={`copilot-prompt-${entry.id}`}
          disabled={disabled}
          onClick={() => onPromptSelect(entry.prompt)}
        >
          {entry.label}
        </EdgeButton>
      ))}
    </div>
  );
}
