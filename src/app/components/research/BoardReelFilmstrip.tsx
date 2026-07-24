"use client";

import { useSyncExternalStore } from "react";

import {
  getBoardFocusedCardId,
  setBoardFocusedCardId,
  subscribeBoardFocus,
} from "@/lib/research/boardFocusStore";
import { researchCardSubtitle, researchCardTitle } from "@/lib/research/cardFromHint";
import { sortReelBeats } from "@/lib/research/reelBeats";
import type { ResearchCardSketch, ResearchReelBeatSketch } from "@/lib/research/sessionSketch";

type Props = {
  reel: ResearchReelBeatSketch[];
  cards: ResearchCardSketch[];
  onCheckpointFocused: () => void;
  onRemoveBeat: (beatId: string) => void;
  onDraftJournal: () => void;
};

function beatLabel(beat: ResearchReelBeatSketch, card: ResearchCardSketch | undefined): string {
  if (beat.label?.trim()) return beat.label.trim();
  if (card) return researchCardTitle(card);
  return "Missing card";
}

function beatKind(card: ResearchCardSketch | undefined): string {
  if (!card) return "Unknown";
  return researchCardSubtitle(card) ?? card.type;
}

export default function BoardReelFilmstrip({
  reel,
  cards,
  onCheckpointFocused,
  onRemoveBeat,
  onDraftJournal,
}: Props) {
  const focusedCardId = useSyncExternalStore(
    subscribeBoardFocus,
    getBoardFocusedCardId,
    () => null,
  );

  const cardById = new Map(cards.map((card) => [card.id, card]));
  const ordered = sortReelBeats(reel);
  const focusedBeatId =
    focusedCardId != null
      ? ordered.find((beat) => beat.cardId === focusedCardId)?.id ?? null
      : null;

  const handleFocusBeat = (beat: ResearchReelBeatSketch) => {
    setBoardFocusedCardId(beat.cardId);
  };

  return (
    <section
      className="flex shrink-0 flex-col gap-1 border-b border-[var(--edge-border)] bg-[var(--edge-surface-toolbar)] px-4 py-2"
      data-testid="research-board-reel"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--edge-text-tertiary)]">
          Session reel
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="research-reel-checkpoint"
            className="rounded px-2 py-0.5 text-xs text-[var(--edge-text-secondary)] hover:bg-[var(--edge-surface-raised)] disabled:opacity-40"
            disabled={focusedCardId == null}
            onClick={onCheckpointFocused}
          >
            Checkpoint focused
          </button>
          <button
            type="button"
            data-testid="research-reel-draft-journal"
            className="rounded px-2 py-0.5 text-xs text-[var(--edge-text-secondary)] hover:bg-[var(--edge-surface-raised)] disabled:opacity-40"
            disabled={ordered.length === 0}
            onClick={onDraftJournal}
          >
            Draft journal
          </button>
        </div>
      </div>

      {ordered.length === 0 ? (
        <p
          className="text-xs text-[var(--edge-text-tertiary)]"
          data-testid="research-reel-empty"
        >
          Add cards or checkpoint focused card to build the reel.
        </p>
      ) : (
        <div
          className="flex gap-2 overflow-x-auto pb-1"
          data-testid="research-reel-filmstrip"
        >
          {ordered.map((beat, index) => {
            const card = cardById.get(beat.cardId);
            const isActive = beat.id === focusedBeatId;
            return (
              <div
                key={beat.id}
                className="group flex shrink-0 items-stretch"
                data-testid={`research-reel-beat-${beat.id}`}
              >
                <button
                  type="button"
                  data-testid={`research-reel-beat-focus-${beat.id}`}
                  className={`flex min-w-[120px] max-w-[180px] flex-col rounded border px-2 py-1 text-left transition-colors ${
                    isActive
                      ? "border-[var(--edge-accent)] bg-[var(--edge-surface-raised)]"
                      : "border-[var(--edge-border)] bg-[var(--edge-surface-base)] hover:bg-[var(--edge-surface-raised)]"
                  }`}
                  onClick={() => handleFocusBeat(beat)}
                >
                  <span className="text-[10px] text-[var(--edge-text-tertiary)]">
                    {index + 1} · {beatKind(card)}
                  </span>
                  <span className="truncate text-xs font-medium text-[var(--edge-text-strong)]">
                    {beatLabel(beat, card)}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label="Remove beat"
                  data-testid={`research-reel-beat-remove-${beat.id}`}
                  className="ml-0.5 hidden rounded px-1 text-xs text-[var(--edge-text-tertiary)] hover:bg-[var(--edge-surface-raised)] group-hover:inline"
                  onClick={() => onRemoveBeat(beat.id)}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
