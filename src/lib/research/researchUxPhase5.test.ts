import { beforeEach, describe, expect, it } from "vitest";

import {
  clearBoardFocusForTests,
  getBoardFocusedCardId,
  setBoardFocusedCardId,
  subscribeBoardFocus,
} from "./boardFocusStore";
import { createResearchBoardPort } from "./researchBoardPort";

describe("boardFocusStore", () => {
  beforeEach(() => {
    clearBoardFocusForTests();
  });

  it("tracks focused card id", () => {
    expect(getBoardFocusedCardId()).toBeNull();
    setBoardFocusedCardId("card-1");
    expect(getBoardFocusedCardId()).toBe("card-1");
    setBoardFocusedCardId(null);
    expect(getBoardFocusedCardId()).toBeNull();
  });

  it("notifies subscribers", () => {
    let count = 0;
    const unsubscribe = subscribeBoardFocus(() => {
      count += 1;
    });
    setBoardFocusedCardId("card-1");
    expect(count).toBe(1);
    unsubscribe();
    setBoardFocusedCardId("card-2");
    expect(count).toBe(1);
  });
});

describe("researchBoardPort", () => {
  beforeEach(() => {
    clearBoardFocusForTests();
  });

  it("focusCard throws for unknown card", () => {
    const port = createResearchBoardPort();
    expect(() => port.focusCard("00000000-0000-4000-8000-000000000001")).toThrow(
      /not found/i,
    );
  });
});
