import { researchCardTitle } from "./cardFromHint";
import { sortReelBeats } from "./reelBeats";
import type { ResearchCardSketch, ResearchReelBeatSketch, ResearchSessionSketch } from "./sessionSketch";

export function composeJournalDraftSummaryFromReel(
  session: Pick<ResearchSessionSketch, "title" | "question">,
  reel: ResearchReelBeatSketch[],
  cards: ResearchCardSketch[],
): string {
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const lines: string[] = [];

  if (session.question?.trim()) {
    lines.push(`Question: ${session.question.trim()}`);
    lines.push("");
  }

  lines.push(`Session: ${session.title}`);
  lines.push("");

  const ordered = sortReelBeats(reel);
  if (ordered.length === 0) {
    lines.push("No reel checkpoints recorded.");
    return lines.join("\n").slice(0, 500);
  }

  ordered.forEach((beat, index) => {
    const card = cardById.get(beat.cardId);
    const label = beat.label?.trim() || (card ? researchCardTitle(card) : "Missing card");
    lines.push(`${index + 1}. ${label}`);
  });

  return lines.join("\n").slice(0, 500);
}
