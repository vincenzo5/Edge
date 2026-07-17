import { describe, expect, it } from "vitest";
import { generateSeedRecords } from "./seedData";
import { runBakeoff, wilsonInterval, signedPointBiserial } from "./bakeoff";

describe("patternLibrary bakeoff", () => {
  const records = generateSeedRecords(100, 42);

  it("computes Wilson interval", () => {
    const ci = wilsonInterval(19, 37);
    expect(ci).not.toBeNull();
    expect(ci![0]).toBeLessThanOrEqual(19 / 37);
    expect(ci![1]).toBeGreaterThanOrEqual(19 / 37);
  });

  it("computes signed point-biserial correlation", () => {
    const r = signedPointBiserial([0.9, 0.8, 0.2, 0.3], [true, true, false, false]);
    expect(r).not.toBeNull();
    expect(r!).toBeGreaterThan(0);
  });

  it("runs three-arm bakeoff on seed library", async () => {
    const result = await runBakeoff(records, { holdoutFraction: 0.2 });
    expect(result.trainCount).toBe(80);
    expect(result.holdoutCount).toBe(20);
    expect(result.metrics.length).toBe(3);
    expect(result.predictions.length).toBe(60);
    expect(result.recommendation.length).toBeGreaterThan(10);
    for (const m of result.metrics) {
      expect(m.arm).toBeTruthy();
    }
  });
});
