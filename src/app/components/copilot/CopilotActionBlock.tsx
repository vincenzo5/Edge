"use client";

import type { ActionChatBlock } from "@/lib/copilot/chatBlocks";
import { EdgeButton } from "../design-system";

export type CopilotActionBlockProps = {
  block: ActionChatBlock;
  onPrimary: () => void;
  onSecondary: () => void;
  disabled?: boolean;
};

function actionTestIdSuffix(block: ActionChatBlock): string {
  return block.callId ?? block.name ?? "action";
}

export function CopilotActionBlock({
  block,
  onPrimary,
  onSecondary,
  disabled = false,
}: CopilotActionBlockProps) {
  const testIdSuffix = actionTestIdSuffix(block);

  return (
    <div
      data-testid={`copilot-action-block-${testIdSuffix}`}
      data-action-name={block.name}
      className="max-w-full rounded border border-[var(--edge-warning)] px-3 py-2 text-xs text-[var(--edge-warning)]"
    >
      <p className="font-medium text-[var(--edge-text-primary)]">{block.title}</p>
      {block.summary ? (
        <p className="mt-1 text-[var(--edge-text-secondary)]">{block.summary}</p>
      ) : null}
      <div className="mt-2 flex gap-2">
        <EdgeButton
          type="button"
          variant="primary"
          data-testid={`copilot-confirm-accept-${testIdSuffix}`}
          disabled={disabled}
          onClick={onPrimary}
        >
          {block.primaryLabel}
        </EdgeButton>
        <EdgeButton
          type="button"
          variant="secondary"
          data-testid={`copilot-confirm-reject-${testIdSuffix}`}
          disabled={disabled}
          onClick={onSecondary}
        >
          {block.secondaryLabel}
        </EdgeButton>
      </div>
    </div>
  );
}
