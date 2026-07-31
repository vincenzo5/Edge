"use client";

import { useState } from "react";
import type { ReferenceChatBlock } from "@/lib/copilot/chatBlocks";
import { referenceTargetHref } from "@/lib/copilot/chatBlockMapping";
import { ChevronDownIcon } from "../chart-chrome/ChartHeaderIcons";

const DEFAULT_VISIBLE_CHIPS = 4;
const DEFAULT_COLLAPSE_THRESHOLD = 3;

export type CopilotReferenceBlockProps = {
  block: ReferenceChatBlock;
  testId?: string;
  onOpen?: (href: string) => void;
  disabled?: boolean;
  visibleChipCount?: number;
  /** Render a Sources section label and optional collapsible header. */
  labeled?: boolean;
  collapseThreshold?: number;
};

function ReferenceChipList({
  visibleChips,
  expanded,
  overflowCount,
  onExpand,
  onOpen,
  disabled,
}: {
  visibleChips: ReferenceChatBlock["chips"];
  expanded: boolean;
  overflowCount: number;
  onExpand: () => void;
  onOpen?: (href: string) => void;
  disabled: boolean;
}) {
  return (
    <>
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
          onClick={onExpand}
        >
          +{overflowCount}
        </button>
      ) : null}
    </>
  );
}

export function CopilotReferenceBlock({
  block,
  testId,
  onOpen,
  disabled = false,
  visibleChipCount = DEFAULT_VISIBLE_CHIPS,
  labeled = false,
  collapseThreshold = DEFAULT_COLLAPSE_THRESHOLD,
}: CopilotReferenceBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const overflowCount = Math.max(0, block.chips.length - visibleChipCount);
  const visibleChips =
    expanded || overflowCount === 0 ? block.chips : block.chips.slice(0, visibleChipCount);

  const chipList = (
    <ReferenceChipList
      visibleChips={visibleChips}
      expanded={expanded}
      overflowCount={overflowCount}
      onExpand={() => setExpanded(true)}
      onOpen={onOpen}
      disabled={disabled}
    />
  );

  if (!labeled) {
    return (
      <div
        data-testid={testId ?? "copilot-reference-block"}
        className="flex w-full min-w-0 flex-wrap items-center gap-1.5"
      >
        {chipList}
      </div>
    );
  }

  if (block.chips.length > collapseThreshold) {
    return (
      <div
        data-testid={testId ?? "copilot-reference-block"}
        className="copilot-compose-section w-full min-w-0"
      >
        <details
          data-testid="copilot-sources-disclosure"
          open={sourcesOpen}
          onToggle={(event) => setSourcesOpen(event.currentTarget.open)}
          className="copilot-sources-disclosure w-full min-w-0"
        >
          <summary className="copilot-compose-section-label flex w-full min-w-0 cursor-pointer list-none items-center gap-1 marker:content-none [&::-webkit-details-marker]:hidden">
            <span>{block.chips.length} sources</span>
            <span
              className={`inline-flex shrink-0 opacity-70 transition-transform ${sourcesOpen ? "rotate-180" : ""}`}
              aria-hidden
            >
              <ChevronDownIcon size={12} />
            </span>
          </summary>
          <div className="mt-1.5 flex w-full min-w-0 flex-wrap items-center gap-1.5">
            {chipList}
          </div>
        </details>
      </div>
    );
  }

  return (
    <div
      data-testid={testId ?? "copilot-reference-block"}
      className="copilot-compose-section w-full min-w-0"
    >
      <p className="copilot-compose-section-label">Sources</p>
      <div className="mt-1 flex w-full min-w-0 flex-wrap items-center gap-1.5">{chipList}</div>
    </div>
  );
}
