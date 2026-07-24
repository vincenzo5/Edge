"use client";

import { useRouter } from "next/navigation";

import { listEvidenceCards } from "@/lib/research/evidenceStore";
import { promoteResearchCardToDesk } from "@/lib/research/promote";

import AppModuleShell from "../home/AppModuleShell";
import ModuleRouteTracker from "../home/ModuleRouteTracker";
import { useResearchEvidence } from "./useResearchEvidence";
import BoardCanvas from "./BoardCanvas";
import { useResearchBoardSession } from "./useResearchBoardSession";

export default function ResearchBoard() {
  const router = useRouter();
  const { cards: evidenceCards } = useResearchEvidence();
  const { cards, links, moveCard, removeCard, linkCards, unlink, importFromEvidence } =
    useResearchBoardSession();

  const handleImportEvidence = () => {
    const pinned = listEvidenceCards();
    if (pinned.length === 0) return;
    importFromEvidence(pinned);
  };

  const handlePromoteCard = (cardId: string) => {
    const card = cards.find((entry) => entry.id === cardId);
    if (!card) return;
    const result = promoteResearchCardToDesk(card);
    if (!result) return;
    router.push(result.href);
  };

  return (
    <AppModuleShell testId="research-board-page">
      <ModuleRouteTracker module="research" />
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--edge-border)] bg-[var(--edge-surface-toolbar)] px-4">
        <div>
          <h1 className="text-sm font-semibold text-[var(--edge-text-strong)]">Board</h1>
          <p className="text-[10px] text-[var(--edge-text-tertiary)]">
            {cards.length} card{cards.length === 1 ? "" : "s"}
            {links.length > 0 ? ` · ${links.length} link${links.length === 1 ? "" : "s"}` : ""}
          </p>
        </div>
        {cards.length > 0 ? (
          <button
            type="button"
            data-testid="research-board-import-evidence-toolbar"
            className="rounded px-2 py-1 text-xs text-[var(--edge-text-secondary)] hover:bg-[var(--edge-surface-raised)]"
            onClick={handleImportEvidence}
          >
            Import from evidence
          </button>
        ) : null}
      </header>
      <BoardCanvas
        cards={cards}
        links={links}
        evidenceCount={evidenceCards.length}
        onMoveCard={moveCard}
        onRemoveCard={removeCard}
        onLinkCards={(from, to) => {
          linkCards(from, to);
        }}
        onRemoveLink={unlink}
        onImportEvidence={handleImportEvidence}
        onPromoteCard={handlePromoteCard}
      />
    </AppModuleShell>
  );
}
