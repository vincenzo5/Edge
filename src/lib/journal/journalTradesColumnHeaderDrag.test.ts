import { describe, expect, it } from "vitest";
import {
  JOURNAL_TRADES_HEADER_DRAG_HOLD_MS,
  JOURNAL_TRADES_HEADER_DRAG_MOVE_PX,
  resolveHeaderDropIndex,
  shouldActivateHeaderDrag,
} from "./journalTradesColumnHeaderDrag";

describe("journalTradesColumnHeaderDrag", () => {
  it("resolves drop index from pointer position", () => {
    const headers = [
      { left: 0, width: 100 },
      { left: 100, width: 100 },
      { left: 200, width: 100 },
    ];
    expect(resolveHeaderDropIndex(40, headers)).toBe(0);
    expect(resolveHeaderDropIndex(120, headers)).toBe(1);
    expect(resolveHeaderDropIndex(260, headers)).toBe(2);
  });

  it("activates drag after hold threshold", () => {
    expect(
      shouldActivateHeaderDrag(0, 0, JOURNAL_TRADES_HEADER_DRAG_HOLD_MS),
    ).toBe(true);
    expect(
      shouldActivateHeaderDrag(0, 0, JOURNAL_TRADES_HEADER_DRAG_HOLD_MS - 1),
    ).toBe(false);
  });

  it("activates drag after move threshold", () => {
    expect(
      shouldActivateHeaderDrag(JOURNAL_TRADES_HEADER_DRAG_MOVE_PX, 0, 0),
    ).toBe(true);
    expect(
      shouldActivateHeaderDrag(JOURNAL_TRADES_HEADER_DRAG_MOVE_PX - 1, 0, 0),
    ).toBe(false);
  });
});
