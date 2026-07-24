import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  addBoardCard,
  clearResearchBoardSessionForTests,
  createResearchSession,
  deleteResearchSession,
  getActiveBoardSession,
  listResearchSessionSummaries,
  renameResearchSession,
  setActiveResearchSession,
} from "./boardSessionStore";
import { researchCardFromHint } from "./cardFromHint";

describe("research session multi-session store", () => {
  beforeEach(() => {
    clearResearchBoardSessionForTests();
  });

  it("creates additional sessions and tracks summaries", () => {
    const first = getActiveBoardSession();
    const second = createResearchSession("Second board");

    expect(second.title).toBe("Second board");
    expect(listResearchSessionSummaries()).toHaveLength(2);
    expect(getActiveBoardSession().id).toBe(second.id);

    setActiveResearchSession(first.id);
    expect(getActiveBoardSession().id).toBe(first.id);
  });

  it("renames and archives sessions", () => {
    const session = createResearchSession("Rename me");
    renameResearchSession(session.id, "Renamed board");
    expect(listResearchSessionSummaries()[0]?.title).toBe("Renamed board");

    deleteResearchSession(session.id);
    expect(listResearchSessionSummaries()).toHaveLength(1);
  });

  it("keeps card mutations scoped to the active session", () => {
    const first = getActiveBoardSession();
    const second = createResearchSession("Other board");

    const card = researchCardFromHint(
      { type: "chart", symbol: "NVDA", interval: "5", title: "NVDA · 5" },
      { threadId: "thread-1", messageId: "msg-1" },
    );
    addBoardCard(card);
    expect(getActiveBoardSession().cards).toHaveLength(1);

    setActiveResearchSession(first.id);
    expect(getActiveBoardSession().cards).toHaveLength(0);

    setActiveResearchSession(second.id);
    expect(getActiveBoardSession().cards).toHaveLength(1);
  });
});
