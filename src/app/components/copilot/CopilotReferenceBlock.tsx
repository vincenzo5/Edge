"use client";

import { useState } from "react";
import type { ReferenceChatBlock } from "@/lib/copilot/chatBlocks";
import { referenceTargetHref } from "@/lib/copilot/chatBlockMapping";

const DEFAULT_VISIBLE_CHIPS = 4;

export type CopilotReferenceBlockProps = {
  block: ReferenceChatBlock;
  testId?: string;
  onOpen?: (href: string) => void;
  disabled?: boolean;
  visibleChipCount?: number;
};

export function CopilotReferenceBlock({
  block,
  testId,
  onOpen,
  disabled = false,
  visibleChipCount = DEFAULT_VISIBLE_CHIPS,
}: CopilotReferenceBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const overflowCount = Math.max(0, block.chips.length - visibleChipCount);
  const visibleChips =
    expanded || overflowCount === 0 ? block.chips : block.chips.slice(0, visibleChipCount);

  return (
    <div
      data-testid={testId ?? "copilot-reference-block"}
      className="flex w-full min-w-0 flex-wrap items-center gap-1.5"
    >
      {visibleChips.map((chip) => {
        const href = chip.target ? referenceTargetHref(chip.target) : null;
        const clickable = href != null && onOpen != null && !disabled;

        if (clickable) {
          return (
            <button
              key={chip.id}
              type="button"
              data-testid={`copilot-reference-chip-${chip.id}`}
              className="copilot-reference-chip edge-focus-ring max-w-full truncate rounded-full border border-[var(--edge-border)] bg-[var(--edge-surface-raised)] px-2.5 py-0.5 text-[12px] font-medium text-[var(--edge-text-secondary)] transition-colors hover:border-[var(--edge-text-tertiary)] hover:text-[var(--edge-text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={disabled}
              onClick={() => onOpen(href)}
            >
              {chip.label}
            </button>
          );
        }

        return (
          <span
            key={chip.id}
            data-testid={`copilot-reference-chip-${chip.id}`}
            className="max-w-full truncate rounded-full border border-[var(--edge-border)] bg-[var(--edge-surface-raised)] px-2.5 py-0.5 text-[12px] font-medium text-[var(--edge-text-tertiary)]"
          >
            {chip.label}
          </span>
        );
      })}
      {!expanded && overflowCount > 0 ? (
        <button
          type="button"
          data-testid="copilot-reference-overflow"
          className="copilot-reference-chip edge-focus-ring rounded-full border border-[var(--edge-border)] bg-transparent px-2 py-0.5 text-[12px] font-medium text-[var(--edge-text-tertiary)] transition-colors hover:text-[var(--edge-text-secondary)]"
          onClick={() => setExpanded(true)}
        >
          +{overflowCount}
        </button>
      ) : null}
    </div>
  );
}
