import { beforeEach, describe, expect, it } from "vitest";

import {
  addBoardCard,
  appendReelBeat,
  clearResearchBoardSessionForTests,
  getActiveBoardSession,
  removeBoardCard,
  removeReelBeat,
  reorderReelBeats,
} from "./boardSessionStore";
import { researchCardFromHint } from "./cardFromHint";
import {
  appendReelBeatPure,
  pruneReelForRemovedCard,
  reorderReelBeatsPure,
  sortReelBeats,
} from "./reelBeats";
import { composeJournalDraftSummaryFromReel } from "./reelJournalDraft";
import type { ResearchReelBeatSketch } from "./sessionSketch";

const BEAT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const BEAT_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function chartCard(symbol: string) {
  return researchCardFromHint(
    { type: "chart", symbol, interval: "1d", title: `${symbol} · 1d` },
    { threadId: "thread-1", messageId: "msg-1" },
  );
}

describe("reelBeats pure helpers", () => {
  it("appends with dedupe and renumbers order", () => {
    const card = chartCard("NVDA");
    const first = appendReelBeatPure([], [card], { cardId: card.id });
    const second = appendReelBeatPure(first, [card], { cardId: card.id });

    expect(second).toHaveLength(1);
    expect(sortReelBeats(second)[0]?.order).toBe(0);
  });

  it("allows duplicate when allowDuplicate is true", () => {
    const card = chartCard("NVDA");
    const first = appendReelBeatPure([], [card], { cardId: card.id });
    const second = appendReelBeatPure(first, [card], {
      cardId: card.id,
      allowDuplicate: true,
      createId: () => BEAT_B,
    });

    expect(second).toHaveLength(2);
    expect(sortReelBeats(second).map((beat) => beat.order)).toEqual([0, 1]);
  });

  it("reorders beats by id list", () => {
    const cardA = chartCard("AAPL");
    const cardB = chartCard("MSFT");
    const reel: ResearchReelBeatSketch[] = [
      { id: BEAT_A, cardId: cardA.id, order: 0 },
      { id: BEAT_B, cardId: cardB.id, order: 1 },
    ];
    const next = reorderReelBeatsPure(reel, [BEAT_B, BEAT_A]);
    expect(sortReelBeats(next).map((beat) => beat.id)).toEqual([BEAT_B, BEAT_A]);
    expect(sortReelBeats(next).map((beat) => beat.order)).toEqual([0, 1]);
  });

  it("prunes beats for removed card", () => {
    const cardA = chartCard("AAPL");
    const cardB = chartCard("MSFT");
    const reel: ResearchReelBeatSketch[] = [
      { id: BEAT_A, cardId: cardA.id, order: 0 },
      { id: BEAT_B, cardId: cardB.id, order: 1 },
    ];
    const next = pruneReelForRemovedCard(reel, cardA.id);
    expect(next).toHaveLength(1);
    expect(next[0]?.cardId).toBe(cardB.id);
    expect(next[0]?.order).toBe(0);
  });
});

describe("research session reel store", () => {
  beforeEach(() => {
    clearResearchBoardSessionForTests();
  });

  it("auto-appends reel beat when adding a board card", () => {
    const card = chartCard("NVDA");
    addBoardCard(card);

    const session = getActiveBoardSession();
    expect(session.reel).toHaveLength(1);
    expect(session.reel[0]?.cardId).toBe(card.id);
  });

  it("dedupes auto-append but allows manual checkpoint duplicate", () => {
    const card = chartCard("NVDA");
    addBoardCard(card);

    const duplicate = appendReelBeat({ cardId: card.id });
    expect(duplicate).toBeNull();
    expect(getActiveBoardSession().reel).toHaveLength(1);

    const checkpoint = appendReelBeat({ cardId: card.id, allowDuplicate: true });
    expect(checkpoint).not.toBeNull();
    expect(getActiveBoardSession().reel).toHaveLength(2);
  });

  it("prunes reel beats when removing a card", () => {
    const cardA = chartCard("AAPL");
    const cardB = chartCard("MSFT");
    addBoardCard(cardA);
    addBoardCard(cardB);

    removeBoardCard(cardA.id);

    const session = getActiveBoardSession();
    expect(session.cards).toHaveLength(1);
    expect(session.reel).toHaveLength(1);
    expect(session.reel[0]?.cardId).toBe(cardB.id);
  });

  it("reorders and removes reel beats", () => {
    const cardA = chartCard("AAPL");
    const cardB = chartCard("MSFT");
    addBoardCard(cardA);
    addBoardCard(cardB);

    const beats = sortReelBeats(getActiveBoardSession().reel);
    const beatForA = beats.find((beat) => beat.cardId === cardA.id);
    const beatForB = beats.find((beat) => beat.cardId === cardB.id);
    expect(beatForA).toBeDefined();
    expect(beatForB).toBeDefined();

    reorderReelBeats([beatForB!.id, beatForA!.id]);
    const reordered = sortReelBeats(getActiveBoardSession().reel);
    expect(reordered[0]?.cardId).toBe(cardB.id);

    removeReelBeat(beatForA!.id);
    expect(getActiveBoardSession().reel).toHaveLength(1);
    expect(getActiveBoardSession().reel[0]?.cardId).toBe(cardB.id);
  });
});

describe("reel journal draft composer", () => {
  it("builds ordered summary from reel beats", () => {
    const cardA = chartCard("NVDA");
    const cardB = chartCard("AMD");
    const summary = composeJournalDraftSummaryFromReel(
      { title: "Semis scan", question: "Which name breaks first?" },
      [
        { id: "b1", cardId: cardA.id, order: 0, label: "Scan NVDA" },
        { id: "b2", cardId: cardB.id, order: 1 },
      ],
      [cardA, cardB],
    );

    expect(summary).toContain("Question: Which name breaks first?");
    expect(summary).toContain("1. Scan NVDA");
    expect(summary).toContain("2.");
  });
});
