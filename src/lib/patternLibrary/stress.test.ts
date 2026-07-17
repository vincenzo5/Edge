import { describe, expect, it } from "vitest";
import { generateSeedRecords } from "./seedData";
import { runBakeoff } from "./bakeoff";
import { runStressTests } from "./stress";

describe("patternLibrary stress tests", () => {
  it("runs stress battery on bakeoff predictions", async () => {
    const records = generateSeedRecords(100, 55);
    const bakeoff = await runBakeoff(records);
    const predMap = new Map<string, "long" | "short" | "neutral">();
    for (const p of bakeoff.predictions.filter((x) => x.arm === "retrieval")) {
      predMap.set(p.recordId, p.predictedDirection);
    }
    const report = runStressTests(records, predMap);
    expect(report.lookAhead.pass).toBe(true);
    expect(report.styleAblation.length).toBeGreaterThan(0);
    expect(report.relativeComparison.total).toBeGreaterThan(0);
  });
});
