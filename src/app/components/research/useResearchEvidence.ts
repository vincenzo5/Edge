"use client";

import { useCallback, useSyncExternalStore } from "react";

import type { ResearchArtifactHint } from "@/lib/research/artifactHint";
import { researchCardFromHint, type PinProvenance } from "@/lib/research/cardFromHint";
import {
  isEvidencePinned,
  listEvidenceCards,
  pinEvidenceCard,
  reorderEvidenceCards,
  subscribeResearchEvidence,
  unpinEvidenceCard,
} from "@/lib/research/evidenceStore";
import type { ResearchCardSketch } from "@/lib/research/sessionSketch";

const EMPTY_EVIDENCE_CARDS: ResearchCardSketch[] = [];

function subscribe(callback: () => void): () => void {
  return subscribeResearchEvidence(callback);
}

function getSnapshot(): ResearchCardSketch[] {
  return listEvidenceCards();
}

function getServerSnapshot(): ResearchCardSketch[] {
  return EMPTY_EVIDENCE_CARDS;
}

export function useResearchEvidence() {
  const cards = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const pinFromHint = useCallback(
    (hint: ResearchArtifactHint, provenance: PinProvenance) => {
      if (provenance.toolCallId && isEvidencePinned(provenance.toolCallId)) {
        return null;
      }
      const card = researchCardFromHint(hint, provenance);
      return pinEvidenceCard(card, {
        toolCallId: provenance.toolCallId,
        threadId: provenance.threadId,
      });
    },
    [],
  );

  const unpin = useCallback((cardId: string) => {
    unpinEvidenceCard(cardId);
  }, []);

  const moveUp = useCallback((index: number) => {
    reorderEvidenceCards(index, index - 1);
  }, []);

  const moveDown = useCallback((index: number) => {
    reorderEvidenceCards(index, index + 1);
  }, []);

  const isPinned = useCallback((toolCallId: string) => isEvidencePinned(toolCallId), []);

  return {
    cards,
    pinFromHint,
    unpin,
    moveUp,
    moveDown,
    isPinned,
  };
}
