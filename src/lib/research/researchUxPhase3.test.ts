import { beforeEach, describe, expect, it } from "vitest";

import {
  addBoardCard,
  addBoardLink,
  clearResearchBoardSessionForTests,
  getActiveBoardSession,
  importEvidenceCardsToBoard,
  removeBoardCard,
  removeBoardLink,
  updateBoardCardPosition,
} from "./boardSessionStore";
import { researchCardFromHint } from "./cardFromHint";
import { clearResearchEvidenceForTests } from "./evidenceStore";
import { RESEARCH_SESSIONS_STORAGE_KEY } from "./sessionSketch";

describe("board session store", () => {
  beforeEach(() => {
    clearResearchBoardSessionForTests();
    clearResearchEvidenceForTests();
  });

  it("creates a default active session", () => {
    const session = getActiveBoardSession();
    expect(session.title).toBe("Research session");
    expect(session.cards).toEqual([]);
    expect(session.links).toEqual([]);
    expect(session.schemaVersion).toBe(1);
  });

  it("adds cards with cascade positions and persists to localStorage", () => {
    const card = researchCardFromHint(
      { type: "chart", symbol: "NVDA", interval: "5", title: "NVDA · 5" },
      { threadId: "thread-1", messageId: "msg-1" },
    );

    const added = addBoardCard(card);
    expect(added.position).toMatchObject({ x: 80, y: 80, width: 320, height: 220 });

    const session = getActiveBoardSession();
    expect(session.cards).toHaveLength(1);
    expect(session.threadIds).toContain("thread-1");
    expect(window.localStorage.getItem(RESEARCH_SESSIONS_STORAGE_KEY)).toContain("NVDA");
  });

  it("updates card position and removes incident links", () => {
    const cardA = addBoardCard(
      researchCardFromHint(
        { type: "chart", symbol: "AAPL", interval: "1d", title: "AAPL · 1d" },
        { threadId: "t1", messageId: "m1" },
      ),
    );
    const cardB = addBoardCard(
      researchCardFromHint(
        { type: "note", body: "Thesis note", title: "Thesis" },
        { threadId: "t1", messageId: "m2" },
      ),
    );

    updateBoardCardPosition(cardA.id, { x: 200, y: 300 });
    expect(getActiveBoardSession().cards[0]?.position).toMatchObject({ x: 200, y: 300 });

    const link = addBoardLink(cardA.id, cardB.id, "supports");
    expect(link).toMatchObject({ fromCardId: cardA.id, toCardId: cardB.id, label: "supports" });
    expect(getActiveBoardSession().links).toHaveLength(1);

    removeBoardCard(cardA.id);
    const session = getActiveBoardSession();
    expect(session.cards).toHaveLength(1);
    expect(session.links).toHaveLength(0);
    expect(session.cards[0]?.id).toBe(cardB.id);
  });

  it("imports evidence cards with cloned ids", () => {
    const evidenceCard = researchCardFromHint(
      { type: "screener", queryLabel: "OR high", title: "OR high" },
      { threadId: "t1", messageId: "m1" },
    );

    const imported = importEvidenceCardsToBoard([evidenceCard]);
    expect(imported).toHaveLength(1);
    expect(imported[0]?.id).not.toBe(evidenceCard.id);
    expect(imported[0]?.queryLabel).toBe("OR high");

    const session = getActiveBoardSession();
    expect(session.cards).toHaveLength(1);
  });

  it("rejects duplicate links and self links", () => {
    const cardA = addBoardCard(
      researchCardFromHint(
        { type: "aiCallout", summary: "Momentum intact" },
        { threadId: "t1", messageId: "m1" },
      ),
    );
    const cardB = addBoardCard(
      researchCardFromHint(
        { type: "journalDraft", summary: "Draft trade" },
        { threadId: "t1", messageId: "m2" },
      ),
    );

    expect(addBoardLink(cardA.id, cardA.id)).toBeNull();
    const link = addBoardLink(cardA.id, cardB.id);
    expect(link).toBeTruthy();
    expect(addBoardLink(cardA.id, cardB.id)).toBeNull();

    if (link) removeBoardLink(link.id);
    expect(getActiveBoardSession().links).toHaveLength(0);
  });
});
