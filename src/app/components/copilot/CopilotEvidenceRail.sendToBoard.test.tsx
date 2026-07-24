import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { clearResearchBoardSessionForTests, getActiveBoardSession } from "@/lib/research/boardSessionStore";
import { clearResearchEvidenceForTests, pinEvidenceCard } from "@/lib/research/evidenceStore";
import { researchCardFromHint } from "@/lib/research/cardFromHint";
import { CopilotEvidenceRail } from "./CopilotEvidenceRail";

describe("CopilotEvidenceRail send to board", () => {
  beforeEach(() => {
    clearResearchEvidenceForTests();
    clearResearchBoardSessionForTests();
  });

  it("sends a pinned card to the board session", () => {
    const card = researchCardFromHint(
      { type: "chart", symbol: "NVDA", interval: "5", title: "NVDA · 5" },
      { threadId: "t1", messageId: "m1" },
    );
    pinEvidenceCard(card);

    render(<CopilotEvidenceRail onOpenHref={vi.fn()} />);
    fireEvent.click(screen.getByTestId(`research-evidence-send-board-${card.id}`));

    const session = getActiveBoardSession();
    expect(session.cards).toHaveLength(1);
    expect(session.cards[0]?.symbol).toBe("NVDA");
    expect(session.cards[0]?.id).not.toBe(card.id);
  });
});
