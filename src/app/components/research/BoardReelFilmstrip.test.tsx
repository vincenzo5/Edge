import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { clearBoardFocusForTests, setBoardFocusedCardId } from "@/lib/research/boardFocusStore";
import { researchCardFromHint } from "@/lib/research/cardFromHint";
import type { ResearchReelBeatSketch } from "@/lib/research/sessionSketch";

import BoardReelFilmstrip from "./BoardReelFilmstrip";

describe("BoardReelFilmstrip", () => {
  beforeEach(() => {
    clearBoardFocusForTests();
  });

  it("shows empty hint when reel has no beats", () => {
    render(
      <BoardReelFilmstrip
        reel={[]}
        cards={[]}
        onCheckpointFocused={vi.fn()}
        onRemoveBeat={vi.fn()}
        onDraftJournal={vi.fn()}
      />,
    );

    expect(screen.getByTestId("research-reel-empty")).toBeTruthy();
    expect(screen.getByTestId("research-reel-draft-journal")).toBeDisabled();
  });

  it("focuses card when clicking a beat", () => {
    const card = researchCardFromHint(
      { type: "chart", symbol: "NVDA", interval: "1d", title: "NVDA · 1d" },
      { threadId: "t1", messageId: "m1" },
    );
    const beat: ResearchReelBeatSketch = {
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      cardId: card.id,
      order: 0,
      label: "Chart mark",
    };

    render(
      <BoardReelFilmstrip
        reel={[beat]}
        cards={[card]}
        onCheckpointFocused={vi.fn()}
        onRemoveBeat={vi.fn()}
        onDraftJournal={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId("research-reel-beat-focus-cccccccc-cccc-4ccc-8ccc-cccccccccccc"));
    expect(screen.getByTestId("research-reel-beat-cccccccc-cccc-4ccc-8ccc-cccccccccccc")).toBeTruthy();
  });

  it("calls checkpoint and draft journal handlers", () => {
    const card = researchCardFromHint(
      { type: "note", body: "Thesis", title: "Thesis" },
      { threadId: "t1", messageId: "m1" },
    );
    const beat: ResearchReelBeatSketch = {
      id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      cardId: card.id,
      order: 0,
    };
    const onCheckpointFocused = vi.fn();
    const onDraftJournal = vi.fn();
    const onRemoveBeat = vi.fn();

    setBoardFocusedCardId(card.id);

    render(
      <BoardReelFilmstrip
        reel={[beat]}
        cards={[card]}
        onCheckpointFocused={onCheckpointFocused}
        onRemoveBeat={onRemoveBeat}
        onDraftJournal={onDraftJournal}
      />,
    );

    fireEvent.click(screen.getByTestId("research-reel-checkpoint"));
    expect(onCheckpointFocused).toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("research-reel-draft-journal"));
    expect(onDraftJournal).toHaveBeenCalled();
  });
});
