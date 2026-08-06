"use client";

import { importEvidenceCardsToBoard } from "@/lib/research/boardSessionStore";
import { EdgeEmptyState } from "../design-system";
import { ResearchEvidenceCardRow } from "./CopilotArtifactCard";
import { useResearchEvidence } from "../research/useResearchEvidence";

type Props = {
  onOpenHref: (href: string) => void;
};

export function CopilotEvidenceRail({ onOpenHref }: Props) {
  const { cards, unpin, moveUp, moveDown } = useResearchEvidence();

  return (
    <aside
      data-testid="copilot-evidence-rail"
      className="copilot-evidence-rail flex w-[var(--copilot-evidence-rail-width)] shrink-0 flex-col border-l border-[var(--edge-border)] bg-[var(--copilot-canvas-bg)]"
    >
      <div className="flex items-center justify-between border-b border-[var(--edge-border)] px-[var(--edge-space-3)] py-[var(--edge-space-2)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--edge-text-secondary)]">
            Pinned
          </p>
          <p className="text-[10px] text-[var(--edge-text-tertiary)]">
            {cards.length} {cards.length === 1 ? "item" : "items"}
          </p>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-[var(--edge-space-3)]">
        {cards.length === 0 ? (
          <EdgeEmptyState
            data-testid="copilot-evidence-empty"
            message="Pin artifacts from chat to build your stack."
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
