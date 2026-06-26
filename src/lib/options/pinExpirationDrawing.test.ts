import { describe, it, expect } from "vitest";
import {
  groupContractsByStrike,
  expirationToTimestamp,
} from "./optionsClient";
import {
  createExpirationVerticalLine,
  isExpirationPinned,
  pinExpirationDrawing,
} from "./pinExpirationDrawing";

describe("optionsClient", () => {
  it("groups contracts by strike", () => {
    const rows = groupContractsByStrike([
      {
        contractSymbol: "AAPL250620C00150000",
        underlying: "AAPL",
        type: "call",
        expiration: "2025-06-20",
        strike: 150,
        updatedAt: 1,
      },
      {
        contractSymbol: "AAPL250620P00150000",
        underlying: "AAPL",
        type: "put",
        expiration: "2025-06-20",
        strike: 150,
        updatedAt: 1,
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.call?.type).toBe("call");
    expect(rows[0]?.put?.type).toBe("put");
  });

  it("maps expiration date to chart timestamp", () => {
    expect(expirationToTimestamp("2025-06-20")).toBe(
      Date.parse("2025-06-20T16:00:00.000Z"),
    );
  });
});

describe("pinExpirationDrawing", () => {
  it("creates a vertical line drawing for an expiration", () => {
    const drawing = createExpirationVerticalLine("2025-06-20", "AAPL");
    expect(drawing.name).toBe("vertical_line");
    expect(drawing.label).toContain("2025-06-20");
    expect(drawing.points[0]?.timestamp).toBe(expirationToTimestamp("2025-06-20"));
  });

  it("does not duplicate pinned expirations", () => {
    const first = pinExpirationDrawing([], "2025-06-20", "AAPL");
    expect(first).toHaveLength(1);
    expect(isExpirationPinned(first, "2025-06-20")).toBe(true);
    const second = pinExpirationDrawing(first, "2025-06-20", "AAPL");
    expect(second).toHaveLength(1);
  });
});
