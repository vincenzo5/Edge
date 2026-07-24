import { describe, expect, it } from "vitest";
import { buildMarginCallReferenceLines } from "./marginCallOverlays";

describe("buildMarginCallReferenceLines", () => {
  it("returns empty array for invalid price", () => {
    expect(buildMarginCallReferenceLines(null)).toEqual([]);
    expect(buildMarginCallReferenceLines(Number.NaN)).toEqual([]);
  });

  it("builds dashed margin call line with label", () => {
    const lines = buildMarginCallReferenceLines(14.82, "stop_reachable");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      id: "risk-margin-call",
      price: 14.82,
      label: "MARGIN CALL 14.82",
      color: "var(--edge-warning)",
      lineDash: [6, 4],
    });
  });

  it("uses negative color when margin call comes first", () => {
    const lines = buildMarginCallReferenceLines(22.4, "margin_call_first");
    expect(lines[0]?.color).toBe("var(--edge-negative)");
  });
});
