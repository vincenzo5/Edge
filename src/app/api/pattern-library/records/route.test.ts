import { describe, expect, it } from "vitest";
import {
  compareRecordSummariesNewestFirst,
  isInteractiveCapture,
  toRecordSummary,
} from "@/lib/patternLibrary/recordSummaries";
import type { PatternRecord } from "@/lib/patternLibrary/types";

function makeRecord(overrides: Partial<PatternRecord> = {}): PatternRecord {
  return {
    id: "capture-test-1",
    asOf: "2026-01-01T12:00:00.000Z",
    symbol: "AAPL",
    timeframe: "1d",
    barWindow: 2,
    setupFamilyId: "unclassified",
    quality: 3,
    decision: "take",
    regime: "uptrend",
    plan: {
      direction: "long",
      entry: 100,
      stop: 95,
      targets: [110],
      thesis: "setup → outcome",
    },
    outcome: {
      resolved: false,
      win: null,
      rMultiple: null,
      mfe: null,
      mae: null,
      holdBars: null,
    },
    ohlcv: [
      { timestamp: 1, open: 1, high: 2, low: 0.5, close: 1.5 },
      { timestamp: 2, open: 1.5, high: 2.5, low: 1, close: 2 },
    ],
    chartStyleId: "edge-frozen-v1",
    capture: {
      patternStart: { barIndex: 0, timestamp: 1 },
      patternEnd: { barIndex: 1, timestamp: 2 },
      sections: [
        {
          id: "section-1",
          label: "setup",
          fromBar: 0,
          toBar: 0,
          fromTimestamp: 1,
          toTimestamp: 1,
        },
      ],
      paddingBars: { left: 5, right: 0 },
      interval: "1d",
      capturedAt: "2026-07-17T13:00:00.000Z",
    },
    ...overrides,
  };
}

describe("patternLibrary recordSummaries", () => {
  it("filters interactive captures and excludes seed records", () => {
    expect(isInteractiveCapture(makeRecord())).toBe(true);
    expect(isInteractiveCapture(makeRecord({ id: "seed-001" }))).toBe(false);
    expect(isInteractiveCapture(makeRecord({ capture: undefined }))).toBe(false);
  });

  it("builds summary with section labels and svg flag", () => {
    const summary = toRecordSummary(makeRecord(), true);
    expect(summary.sectionLabels).toEqual(["setup"]);
    expect(summary.hasSvg).toBe(true);
    expect(summary.thesis).toBe("setup → outcome");
  });

  it("sorts newest captures first", () => {
    const older = toRecordSummary(
      makeRecord({ id: "older", capture: { ...makeRecord().capture!, capturedAt: "2026-07-01T00:00:00.000Z" } }),
      true,
    );
    const newer = toRecordSummary(
      makeRecord({ id: "newer", capture: { ...makeRecord().capture!, capturedAt: "2026-07-17T00:00:00.000Z" } }),
      true,
    );
    expect(compareRecordSummariesNewestFirst(older, newer)).toBeGreaterThan(0);
  });
});

describe("pattern-library records API schemas", () => {
  it("accepts metadata patch bodies with at least one field", async () => {
    const { z } = await import("zod");
    const { setupQualitySchema } = await import("@/lib/patternLibrary/types");
    const patchRecordBodySchema = z
      .object({
        setupFamilyId: z.string().min(1).optional(),
        quality: setupQualitySchema.optional(),
        notes: z.string().optional(),
        thesis: z.string().optional(),
      })
      .refine(
        (value) =>
          value.setupFamilyId != null ||
          value.quality != null ||
          value.notes != null ||
          value.thesis != null,
        { message: "At least one field must be provided" },
      );

    expect(patchRecordBodySchema.safeParse({ quality: 4 }).success).toBe(true);
    expect(patchRecordBodySchema.safeParse({}).success).toBe(false);
  });
});
