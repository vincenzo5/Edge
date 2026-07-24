"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import {
  addBoardCard,
  addBoardLink,
  appendReelBeat,
  getActiveBoardSession,
  getActiveSessionRecord,
  importEvidenceCardsToBoard,
  listResearchSessionSummaries,
  removeBoardCard,
  removeBoardLink,
  removeReelBeat,
  reorderReelBeats,
  subscribeResearchBoardSession,
  updateBoardCardPosition,
} from "@/lib/research/boardSessionStore";
import { getBoardFocusedCardId } from "@/lib/research/boardFocusStore";
import { composeJournalDraftSummaryFromReel } from "@/lib/research/reelJournalDraft";
import {
  createResearchSessionState,
  deleteResearchSessionState,
  hydrateResearchSessionsState,
  renameResearchSessionState,
  saveResearchSessionState,
  switchResearchSessionState,
} from "@/lib/persistence/client/researchSessionsClient";
import type { ResearchSessionSummary } from "@/lib/persistence/schemas/researchSessions";
import type { ResearchCardSketch, ResearchSessionSketch } from "@/lib/research/sessionSketch";
import { RESEARCH_SESSION_SKETCH_VERSION } from "@/lib/research/sessionSketch";

const PERSIST_DEBOUNCE_MS = 400;

function subscribe(callback: () => void): () => void {
  return subscribeResearchBoardSession(callback);
}

function getSnapshot() {
  return getActiveBoardSession();
}

function getServerSnapshot(): ResearchSessionSketch {
  return {
    id: "ssr",
    schemaVersion: RESEARCH_SESSION_SKETCH_VERSION,
    title: "Research session",
    cards: [],
    links: [],
    threadIds: [],
    reel: [],
    updatedAt: new Date(0).toISOString(),
  };
}

function getSummariesSnapshot(): ResearchSessionSummary[] {
  return listResearchSessionSummaries();
}

export function useResearchBoardSession() {
  const session = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const summaries = useSyncExternalStore(subscribe, getSummariesSnapshot, () => []);
  const [isHydrating, setIsHydrating] = useState(true);
  const [hydrateError, setHydrateError] = useState<string | null>(null);
  const syncRevisionRef = useRef(1);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshSyncRevision = useCallback(() => {
    syncRevisionRef.current = getActiveSessionRecord().syncRevision;
  }, []);

  const persistNow = useCallback(async () => {
    const active = getActiveSessionRecord();
    const result = await saveResearchSessionState({
      sessionId: active.id,
      syncRevision: syncRevisionRef.current,
    });
    syncRevisionRef.current = result.syncRevision;
  }, []);

  const schedulePersist = useCallback(() => {
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
    }
    persistTimerRef.current = setTimeout(() => {
      persistTimerRef.current = null;
      void persistNow();
    }, PERSIST_DEBOUNCE_MS);
  }, [persistNow]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const hydrated = await hydrateResearchSessionsState();
        if (cancelled) return;
        syncRevisionRef.current = hydrated.syncRevision;
        setHydrateError(null);
      } catch (error) {
        if (cancelled) return;
        setHydrateError(
          error instanceof Error ? error.message : "Unable to load research sessions.",
        );
      } finally {
        if (!cancelled) {
          setIsHydrating(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
      }
    };
  }, []);

  const addCard = useCallback(
    (card: ResearchCardSketch) => {
      const added = addBoardCard(card);
      schedulePersist();
      return added;
    },
    [schedulePersist],
  );

  const moveCard = useCallback(
    (cardId: string, position: { x: number; y: number; width?: number; height?: number }) => {
      updateBoardCardPosition(cardId, position);
      schedulePersist();
    },
    [schedulePersist],
  );

  const removeCard = useCallback(
    (cardId: string) => {
      removeBoardCard(cardId);
      schedulePersist();
    },
    [schedulePersist],
  );

  const linkCards = useCallback(
    (fromCardId: string, toCardId: string, label?: string) => {
      const link = addBoardLink(fromCardId, toCardId, label);
      if (link) schedulePersist();
      return link;
    },
    [schedulePersist],
  );

  const unlink = useCallback(
    (linkId: string) => {
      removeBoardLink(linkId);
      schedulePersist();
    },
    [schedulePersist],
  );

  const importFromEvidence = useCallback(
    (cards: ResearchCardSketch[]) => {
      const imported = importEvidenceCardsToBoard(cards);
      schedulePersist();
      return imported;
    },
    [schedulePersist],
  );

  const newSession = useCallback(async (title?: string) => {
    const created = await createResearchSessionState({ title });
    syncRevisionRef.current = created.syncRevision;
    return created;
  }, []);

  const switchSession = useCallback(async (sessionId: string) => {
    await switchResearchSessionState(sessionId);
    refreshSyncRevision();
  }, [refreshSyncRevision]);

  const renameSession = useCallback(
    async (sessionId: string, title: string) => {
      const result = await renameResearchSessionState({
        sessionId,
        title,
        syncRevision: syncRevisionRef.current,
      });
      syncRevisionRef.current = result.syncRevision;
      return result;
    },
    [],
  );

  const deleteSession = useCallback(async (sessionId: string) => {
    await deleteResearchSessionState(sessionId);
    refreshSyncRevision();
  }, [refreshSyncRevision]);

  const appendBeat = useCallback(
    (cardId: string, label?: string, allowDuplicate = false) => {
      const beat = appendReelBeat({ cardId, label, allowDuplicate });
      if (beat) schedulePersist();
      return beat;
    },
    [schedulePersist],
  );

  const removeBeat = useCallback(
    (beatId: string) => {
      removeReelBeat(beatId);
      schedulePersist();
    },
    [schedulePersist],
  );

  const reorderBeats = useCallback(
    (orderedBeatIds: string[]) => {
      reorderReelBeats(orderedBeatIds);
      schedulePersist();
    },
    [schedulePersist],
  );

  const checkpointFocused = useCallback(() => {
    const focusedId = getBoardFocusedCardId();
    if (!focusedId) return null;
    return appendBeat(focusedId, undefined, true);
  }, [appendBeat]);

  const draftJournalFromReel = useCallback(() => {
    const active = getActiveBoardSession();
    const summary = composeJournalDraftSummaryFromReel(active, active.reel, active.cards);
    const cardId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `journal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const card = addBoardCard({
      id: cardId,
      type: "journalDraft",
      source: "user",
      summary,
    });
    schedulePersist();
    return card;
  }, [schedulePersist]);

  const primaryThreadId = session.threadIds[0] ?? null;

  return {
    session,
    summaries,
    cards: session.cards,
    links: session.links,
    reel: session.reel,
    isHydrating,
    hydrateError,
    primaryThreadId,
    addCard,
    moveCard,
    removeCard,
    linkCards,
    unlink,
    importFromEvidence,
    newSession,
    switchSession,
    renameSession,
    deleteSession,
    appendBeat,
    removeBeat,
    reorderBeats,
    checkpointFocused,
    draftJournalFromReel,
  };
}
