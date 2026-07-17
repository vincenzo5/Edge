import { describe, expect, it } from "vitest";
import { z } from "zod";
import { patternRecordSchema } from "@/lib/patternLibrary/types";

const saveCaptureBodySchema = z.object({
  record: patternRecordSchema,
});

describe("pattern-library captures API schema", () => {
  it("accepts capture records with min 2 ohlcv bars", () => {
    const parsed = saveCaptureBodySchema.safeParse({
      record: {
        id: "capture-aapl-1",
        asOf: new Date().toISOString(),
        symbol: "AAPL",
        timeframe: "1h",
        barWindow: 3,
        setupFamilyId: "unclassified",
        quality: 3,
        decision: "take",
        regime: "range",
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
          { timestamp: 3, open: 2, high: 3, low: 1.5, close: 2.5 },
        ],
        chartStyleId: "edge-frozen-v1",
        capture: {
          patternStart: { barIndex: 0, timestamp: 1 },
          patternEnd: { barIndex: 2, timestamp: 3 },
          sections: [
            {
              id: "section-1",
              label: "setup",
              fromBar: 0,
              toBar: 1,
              fromTimestamp: 1,
              toTimestamp: 2,
            },
            {
              id: "section-2",
              label: "outcome",
              fromBar: 1,
              toBar: 2,
              fromTimestamp: 2,
              toTimestamp: 3,
            },
          ],
          paddingBars: { left: 5, right: 0 },
          interval: "1h",
          capturedAt: new Date().toISOString(),
        },
      },
    });
    expect(parsed.success).toBe(true);
  });
});
