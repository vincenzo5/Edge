"use client";

import type { FollowupsChatBlock } from "@/lib/copilot/chatBlocks";

export type CopilotFollowupsBlockProps = {
  block: FollowupsChatBlock;
  testId?: string;
  onSelect?: (prompt: string) => void;
  disabled?: boolean;
};

export function CopilotFollowupsBlock({
  block,
  testId,
  onSelect,
  disabled = false,
}: CopilotFollowupsBlockProps) {
  return (
    <div
      data-testid={testId ?? "copilot-followups-block"}
      className="flex w-full min-w-0 flex-wrap items-center gap-1.5"
    >
      {block.chips.map((chip) => {
        const label = chip.label?.trim() || chip.prompt;

        if (onSelect != null) {
          return (
            <button
              key={chip.id}
              type="button"
              data-testid={`copilot-followup-chip-${chip.id}`}
              className="copilot-followup-chip copilot-reference-chip edge-focus-ring max-w-full truncate rounded-full border border-[var(--edge-border)] bg-[var(--edge-surface-raised)] px-2.5 py-0.5 text-[12px] font-medium text-[var(--edge-text-secondary)] transition-colors hover:border-[var(--edge-text-tertiary)] hover:text-[var(--edge-text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={disabled}
              onClick={() => onSelect(chip.prompt)}
            >
              {label}
            </button>
          );
        }

        return (
          <span
            key={chip.id}
            data-testid={`copilot-followup-chip-${chip.id}`}
            className="max-w-full truncate rounded-full border border-[var(--edge-border)] bg-[var(--edge-surface-raised)] px-2.5 py-0.5 text-[12px] font-medium text-[var(--edge-text-tertiary)]"
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}
