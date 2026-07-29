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
      {block.summaryRows && block.summaryRows.length > 0 ? (
        <dl
          data-testid={`copilot-action-summary-rows-${testIdSuffix}`}
          className="mt-2 space-y-1 text-[var(--edge-text-secondary)]"
        >
          {block.summaryRows.map((row) => (
            <div key={row.key} className="flex gap-2">
              <dt className="shrink-0 font-medium text-[var(--edge-text-primary)]">{row.key}</dt>
              <dd className="min-w-0 break-words">{row.value}</dd>
            </div>
          ))}
        </dl>
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
