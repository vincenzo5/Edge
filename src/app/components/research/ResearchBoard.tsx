"use client";

import { useRouter } from "next/navigation";

import { listEvidenceCards } from "@/lib/research/evidenceStore";
import { promoteResearchCardToDesk } from "@/lib/research/promote";

import ModuleRouteTracker from "../home/ModuleRouteTracker";
import { useResearchEvidence } from "./useResearchEvidence";
import BoardCanvas from "./BoardCanvas";
import BoardReelFilmstrip from "./BoardReelFilmstrip";
import ResearchBoardSessionRail from "./ResearchBoardSessionRail";
import { useResearchBoardSession } from "./useResearchBoardSession";

export default function ResearchBoard() {
  const router = useRouter();
  const { cards: evidenceCards } = useResearchEvidence();
  const {
    session,
    summaries,
    cards,
    links,
    reel,
    primaryThreadId,
    moveCard,
    removeCard,
    linkCards,
    unlink,
    importFromEvidence,
    newSession,
    switchSession,
    renameSession,
    deleteSession,
    checkpointFocused,
    removeBeat,
    draftJournalFromReel,
  } = useResearchBoardSession();

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

  const handleOpenTalk = (threadId: string) => {
    router.push(`/copilot?threadId=${encodeURIComponent(threadId)}`);
  };

  return (
    <div
      data-testid="research-board-page"
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
    >
      <ModuleRouteTracker module="research" />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <ResearchBoardSessionRail
          sessionId={session.id}
          sessions={summaries}
          primaryThreadId={primaryThreadId}
          onNewSession={() => {
            void newSession();
          }}
          onSwitchSession={(sessionId) => {
            void switchSession(sessionId);
          }}
          onRenameSession={(sessionId, title) => {
            void renameSession(sessionId, title);
          }}
          onDeleteSession={(sessionId) => {
            void deleteSession(sessionId);
          }}
          onOpenTalk={handleOpenTalk}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--edge-border)] bg-[var(--edge-surface-toolbar)] px-4">
            <div>
              <h1 className="text-sm font-semibold text-[var(--edge-text-strong)]">
                {session.title}
              </h1>
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
          <BoardReelFilmstrip
            reel={reel}
            cards={cards}
            onCheckpointFocused={() => {
              checkpointFocused();
            }}
            onRemoveBeat={(beatId) => {
              removeBeat(beatId);
            }}
            onDraftJournal={() => {
              draftJournalFromReel();
            }}
          />
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
        </div>
      </div>
    </div>
  );
}
