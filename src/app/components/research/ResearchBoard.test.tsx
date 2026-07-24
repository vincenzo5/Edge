import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { clearResearchBoardSessionForTests, getActiveBoardSession } from "@/lib/research/boardSessionStore";
import { clearResearchEvidenceForTests, pinEvidenceCard } from "@/lib/research/evidenceStore";
import { researchCardFromHint } from "@/lib/research/cardFromHint";

import BoardCanvas from "./BoardCanvas";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("BoardCanvas", () => {
  beforeEach(() => {
    clearResearchBoardSessionForTests();
    clearResearchEvidenceForTests();
  });

  it("shows empty state with import CTA when evidence exists", () => {
    const card = researchCardFromHint(
      { type: "chart", symbol: "NVDA", interval: "5", title: "NVDA · 5" },
      { threadId: "t1", messageId: "m1" },
    );
    pinEvidenceCard(card);

    const onImportEvidence = vi.fn();
    render(
      <BoardCanvas
        cards={[]}
        links={[]}
        evidenceCount={1}
        onMoveCard={vi.fn()}
        onRemoveCard={vi.fn()}
        onLinkCards={vi.fn()}
        onRemoveLink={vi.fn()}
        onImportEvidence={onImportEvidence}
        onPromoteCard={vi.fn()}
      />,
    );

    expect(screen.getByTestId("research-board-empty")).toBeTruthy();
    fireEvent.click(screen.getByTestId("research-board-import-evidence"));
    expect(onImportEvidence).toHaveBeenCalled();
  });

  it("renders cards and links on the board surface", () => {
    const cardA = researchCardFromHint(
      { type: "chart", symbol: "NVDA", interval: "5", title: "NVDA · 5" },
      { threadId: "t1", messageId: "m1" },
    );
    const cardB = researchCardFromHint(
      { type: "note", body: "Thesis", title: "Thesis" },
      { threadId: "t1", messageId: "m2" },
    );
    cardA.position = { x: 100, y: 100, width: 240, height: 120 };
    cardB.position = { x: 400, y: 200, width: 240, height: 120 };

    render(
      <BoardCanvas
        cards={[cardA, cardB]}
        links={[
          {
            id: "link-1",
            fromCardId: cardA.id,
            toCardId: cardB.id,
            label: "supports",
          },
        ]}
        onMoveCard={vi.fn()}
        onRemoveCard={vi.fn()}
        onLinkCards={vi.fn()}
        onRemoveLink={vi.fn()}
        onImportEvidence={vi.fn()}
        onPromoteCard={vi.fn()}
      />,
    );

    expect(screen.getByTestId("research-board-canvas")).toBeTruthy();
    expect(screen.getByTestId(`research-board-card-${cardA.id}`)).toBeTruthy();
    expect(screen.getByTestId(`research-board-link-link-1`)).toBeTruthy();
  });
});

describe("ResearchBoard integration", () => {
  beforeEach(() => {
    clearResearchBoardSessionForTests();
  });

  it("persists imported cards in session store", async () => {
    const { importEvidenceCardsToBoard } = await import("@/lib/research/boardSessionStore");
    const card = researchCardFromHint(
      { type: "chart", symbol: "CSCO", interval: "1d", title: "CSCO · 1d" },
      { threadId: "t1", messageId: "m1" },
    );

    importEvidenceCardsToBoard([card]);
    expect(getActiveBoardSession().cards).toHaveLength(1);
    expect(getActiveBoardSession().cards[0]?.symbol).toBe("CSCO");
  });
});
