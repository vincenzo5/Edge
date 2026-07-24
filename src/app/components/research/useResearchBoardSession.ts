"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  addBoardCard,
  addBoardLink,
  getActiveBoardSession,
  importEvidenceCardsToBoard,
  removeBoardCard,
  removeBoardLink,
  subscribeResearchBoardSession,
  updateBoardCardPosition,
} from "@/lib/research/boardSessionStore";
import type { ResearchCardSketch, ResearchSessionSketch } from "@/lib/research/sessionSketch";
import { RESEARCH_SESSION_SKETCH_VERSION } from "@/lib/research/sessionSketch";

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

export function useResearchBoardSession() {
  const session = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const addCard = useCallback((card: ResearchCardSketch) => addBoardCard(card), []);

  const moveCard = useCallback(
    (cardId: string, position: { x: number; y: number; width?: number; height?: number }) => {
      updateBoardCardPosition(cardId, position);
    },
    [],
  );

  const removeCard = useCallback((cardId: string) => {
    removeBoardCard(cardId);
  }, []);

  const linkCards = useCallback((fromCardId: string, toCardId: string, label?: string) => {
    return addBoardLink(fromCardId, toCardId, label);
  }, []);

  const unlink = useCallback((linkId: string) => {
    removeBoardLink(linkId);
  }, []);

  const importFromEvidence = useCallback((cards: ResearchCardSketch[]) => {
    return importEvidenceCardsToBoard(cards);
  }, []);

  return {
    session,
    cards: session.cards,
    links: session.links,
    addCard,
    moveCard,
    removeCard,
    linkCards,
    unlink,
    importFromEvidence,
  };
}
