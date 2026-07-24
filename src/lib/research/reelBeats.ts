import { researchCardTitle, researchCardSubtitle } from "./cardFromHint";
import type { ResearchCardSketch, ResearchReelBeatSketch } from "./sessionSketch";
import { researchReelBeatSketchSchema } from "./sessionSketch";

export function defaultBeatLabelFromCard(card: ResearchCardSketch): string {
  const subtitle = researchCardSubtitle(card);
  const title = researchCardTitle(card);
  return subtitle ? `${subtitle}: ${title}` : title;
}

export function sortReelBeats(reel: ResearchReelBeatSketch[]): ResearchReelBeatSketch[] {
  return [...reel].sort((left, right) => left.order - right.order);
}

export function renumberReelBeats(reel: ResearchReelBeatSketch[]): ResearchReelBeatSketch[] {
  return reel.map((beat, index) =>
    researchReelBeatSketchSchema.parse({ ...beat, order: index }),
  );
}

export function reelBeatForCardId(
  reel: ResearchReelBeatSketch[],
  cardId: string,
): ResearchReelBeatSketch | undefined {
  return reel.find((beat) => beat.cardId === cardId);
}

export type AppendReelBeatOptions = {
  cardId: string;
  label?: string;
  /** When false (default), skip if cardId already has a beat. */
  allowDuplicate?: boolean;
  createId?: () => string;
};

export function appendReelBeatPure(
  reel: ResearchReelBeatSketch[],
  cards: ResearchCardSketch[],
  options: AppendReelBeatOptions,
): ResearchReelBeatSketch[] {
  const card = cards.find((entry) => entry.id === options.cardId);
  if (!card) return reel;
  if (!options.allowDuplicate && reelBeatForCardId(reel, options.cardId)) {
    return reel;
  }
  if (reel.length >= 128) return reel;

  const createId =
    options.createId ??
    (() => {
      if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
      }
      return `beat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    });

  const nextOrder = reel.length === 0 ? 0 : Math.max(...reel.map((beat) => beat.order)) + 1;
  const beat = researchReelBeatSketchSchema.parse({
    id: createId(),
    cardId: options.cardId,
    label: options.label?.trim() || defaultBeatLabelFromCard(card),
    order: nextOrder,
  });

  return renumberReelBeats([...sortReelBeats(reel), beat]);
}

export function removeReelBeatPure(
  reel: ResearchReelBeatSketch[],
  beatId: string,
): ResearchReelBeatSketch[] {
  return renumberReelBeats(sortReelBeats(reel).filter((beat) => beat.id !== beatId));
}

export function reorderReelBeatsPure(
  reel: ResearchReelBeatSketch[],
  orderedBeatIds: string[],
): ResearchReelBeatSketch[] {
  const byId = new Map(reel.map((beat) => [beat.id, beat]));
  const ordered: ResearchReelBeatSketch[] = [];
  for (const beatId of orderedBeatIds) {
    const beat = byId.get(beatId);
    if (beat) ordered.push(beat);
  }
  for (const beat of sortReelBeats(reel)) {
    if (!orderedBeatIds.includes(beat.id)) {
      ordered.push(beat);
    }
  }
  return renumberReelBeats(ordered);
}

export function pruneReelForRemovedCard(
  reel: ResearchReelBeatSketch[],
  removedCardId: string,
): ResearchReelBeatSketch[] {
  return renumberReelBeats(sortReelBeats(reel).filter((beat) => beat.cardId !== removedCardId));
}

export function appendReelBeatsForCardsPure(
  reel: ResearchReelBeatSketch[],
  cards: ResearchCardSketch[],
  cardIds: string[],
  createId?: () => string,
): ResearchReelBeatSketch[] {
  let next = reel;
  for (const cardId of cardIds) {
    next = appendReelBeatPure(next, cards, { cardId, allowDuplicate: false, createId });
  }
  return next;
}
