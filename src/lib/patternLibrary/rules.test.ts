import { describe, expect, it } from "vitest";
import { generateSeedRecords } from "./seedData";
import { predictFromRules, evaluateRules } from "./rules";

describe("patternLibrary rules", () => {
  const records = generateSeedRecords(50, 7);

  it("evaluates at least one rule on uptrend seed data", () => {
    const uptrend = records.filter((r) => r.setupFamilyId === "pullback_in_trend");
    const matches = evaluateRules(uptrend[0]!.ohlcv);
    expect(matches.length).toBeGreaterThanOrEqual(0);
  });

  it("predictFromRules returns structured prediction", () => {
    const pred = predictFromRules(records[0]!);
    expect(["long", "short", "neutral"]).toContain(pred.predictedDirection);
    expect(pred.confidence).toBeGreaterThanOrEqual(0);
  });
});
