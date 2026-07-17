import { describe, expect, it } from "vitest";
import { generateSeedRecords } from "./seedData";
import { splitByTimeHoldout, assertNoLookAhead } from "./holdout";
import { rankSimilarSetups, predictFromRetrieval } from "./retrieval";

describe("patternLibrary holdout and retrieval", () => {
  const records = generateSeedRecords(100, 99);

  it("splits 80/20 by time with holdout at end", () => {
    const { train, holdout } = splitByTimeHoldout(records, 0.2);
    expect(train.length).toBe(80);
    expect(holdout.length).toBe(20);
    expect(new Date(train[train.length - 1]!.asOf).getTime()).toBeLessThanOrEqual(
      new Date(holdout[0]!.asOf).getTime(),
    );
  });

  it("seed records have no look-ahead bars", () => {
    for (const r of records) {
      expect(assertNoLookAhead(r)).toBe(true);
    }
  });

  it("retrieval returns neighbors for query", () => {
    const query = records[90]!;
    const neighbors = rankSimilarSetups(query, records.slice(0, 80), 5);
    expect(neighbors.length).toBe(5);
    expect(neighbors[0]!.score).toBeGreaterThan(0);
  });

  it("predictFromRetrieval yields family and direction", () => {
    const query = records[95]!;
    const pred = predictFromRetrieval(query, records.slice(0, 80), 5);
    expect(pred.predictedFamilyId).toBeTruthy();
    expect(["long", "short", "neutral"]).toContain(pred.predictedDirection);
  });
});
