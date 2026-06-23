import { describe, expect, it } from "vitest";
import {
  buildThesisSummary,
  filterDrawingsByMetadata,
  mergeMetadata,
  normalizeMetadata,
  summarizeAnnotations,
} from "@/lib/chart/annotationMetadata";
import type { SerializedDrawing } from "@/lib/chart/contracts";

const baseDrawing = (overrides: Partial<SerializedDrawing> = {}): SerializedDrawing => ({
  id: "d1",
  name: "horizontal_line",
  label: "Support",
  points: [{ value: 100, timestamp: 1_700_000_000_000 }],
  visible: true,
  locked: false,
  zLevel: 0,
  ...overrides,
});

describe("annotationMetadata", () => {
  it("normalizes AI source to proposed status", () => {
    expect(normalizeMetadata({ source: "ai", kind: "invalidation" })).toEqual({
      source: "ai",
      kind: "invalidation",
      status: "proposed",
    });
  });

  it("normalizes user source to active status", () => {
    expect(normalizeMetadata({ kind: "target" })).toEqual({
      kind: "target",
      source: "user",
      status: "active",
    });
  });

  it("filters drawings by kind and status", () => {
    const drawings = [
      baseDrawing({
        id: "a",
        metadata: { kind: "invalidation", status: "active", source: "user" },
      }),
      baseDrawing({
        id: "b",
        metadata: { kind: "target", status: "proposed", source: "ai" },
      }),
    ];
    const filtered = filterDrawingsByMetadata(drawings, {
      kind: "invalidation",
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("a");
  });

  it("merges metadata patches", () => {
    const merged = mergeMetadata(
      { kind: "thesis", status: "proposed", source: "ai", rationale: "old" },
      { status: "accepted", rationale: "new" },
    );
    expect(merged).toMatchObject({
      kind: "thesis",
      status: "accepted",
      source: "ai",
      rationale: "new",
    });
  });

  it("summarizes annotations by kind and status", () => {
    const summary = summarizeAnnotations([
      baseDrawing({
        metadata: { kind: "thesis", status: "active", source: "user" },
      }),
      baseDrawing({
        id: "d2",
        metadata: { kind: "invalidation", status: "proposed", source: "ai" },
      }),
    ]);
    expect(summary.byKind.thesis).toBe(1);
    expect(summary.byKind.invalidation).toBe(1);
    expect(summary.proposedCount).toBe(1);
  });

  it("builds thesis summary string", () => {
    const summary = buildThesisSummary([
      baseDrawing({
        metadata: { kind: "thesis", status: "active", source: "user" },
      }),
      baseDrawing({
        id: "d2",
        metadata: { kind: "invalidation", status: "active", source: "ai" },
      }),
    ]);
    expect(summary).toContain("1 active thesis");
    expect(summary).toContain("1 invalidation level");
  });
});
