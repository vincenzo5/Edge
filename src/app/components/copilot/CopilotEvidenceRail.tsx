"use client";

import { useState } from "react";
import { importEvidenceCardsToBoard } from "@/lib/research/boardSessionStore";
import { EdgeEmptyState } from "../design-system";
import { ResearchEvidenceCardRow } from "./CopilotArtifactCard";
import { useResearchEvidence } from "../research/useResearchEvidence";

type Props = {
  onOpenHref: (href: string) => void;
};

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d={collapsed ? "M10 4L6 8l4 4" : "M6 4l4 4-4 4"}
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CopilotEvidenceRail({ onOpenHref }: Props) {
  const { cards, unpin, moveUp, moveDown } = useResearchEvidence();
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <aside
        data-testid="copilot-evidence-rail"
        data-collapsed="true"
        className="copilot-evidence-rail flex w-10 shrink-0 flex-col border-l border-[var(--edge-border)] bg-[var(--copilot-canvas-bg)]"
      >
        <button
          type="button"
          data-testid="copilot-evidence-expand"
          className="mx-auto mt-[var(--edge-space-3)] rounded p-2 text-[var(--edge-text-secondary)] hover:bg-[var(--edge-surface-raised)]"
          aria-label="Expand evidence"
          title="Expand evidence"
          onClick={() => setCollapsed(false)}
        >
          <CollapseIcon collapsed />
        </button>
        {cards.length > 0 ? (
          <span
            data-testid="copilot-evidence-count"
            className="mx-auto mt-2 rounded-full bg-[var(--edge-accent-muted)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--edge-accent)]"
          >
            {cards.length}
          </span>
        ) : null}
      </aside>
    );
  }

  return (
    <aside
      data-testid="copilot-evidence-rail"
      data-collapsed="false"
      className="copilot-evidence-rail flex w-[var(--copilot-evidence-rail-width)] shrink-0 flex-col border-l border-[var(--edge-border)] bg-[var(--copilot-canvas-bg)]"
    >
      <div className="flex items-center justify-between border-b border-[var(--edge-border)] px-[var(--edge-space-3)] py-[var(--edge-space-2)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--edge-text-secondary)]">
            Evidence
          </p>
          <p className="text-[10px] text-[var(--edge-text-tertiary)]">
            {cards.length} pinned
          </p>
        </div>
        <button
          type="button"
          data-testid="copilot-evidence-collapse"
          className="rounded p-1.5 text-[var(--edge-text-secondary)] hover:bg-[var(--edge-surface-raised)]"
          aria-label="Collapse evidence"
          title="Collapse evidence"
          onClick={() => setCollapsed(true)}
        >
          <CollapseIcon collapsed={false} />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-[var(--edge-space-3)]">
        {cards.length === 0 ? (
          <EdgeEmptyState
            data-testid="copilot-evidence-empty"
            message="Pin artifacts from chat to build your evidence stack."
          />
        ) : (
          cards.map((card, index) => (
            <ResearchEvidenceCardRow
              key={card.id}
              card={card}
              index={index}
              total={cards.length}
              onUnpin={() => unpin(card.id)}
              onMoveUp={() => moveUp(index)}
              onMoveDown={() => moveDown(index)}
              onOpen={onOpenHref}
              onSendToBoard={() => {
                importEvidenceCardsToBoard([card]);
              }}
            />
          ))
        )}
      </div>
    </aside>
  );
}
