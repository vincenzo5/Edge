import { describe, expect, it } from "vitest";
import { slimDataProvenance } from "./dataProvenance";

describe("slimDataProvenance", () => {
  it("returns null when source is missing", () => {
    expect(slimDataProvenance(null)).toBeNull();
    expect(slimDataProvenance(undefined)).toBeNull();
  });

  it("projects slim fields from chart data meta", () => {
    expect(
      slimDataProvenance({
        source: "yahoo",
        asOf: 1_700_000_000_000,
        stale: true,
        warnings: ["display-only"],
        cacheTier: "hot-stale",
        latencyMs: 42,
        traceId: "trace-1",
      }),
    ).toEqual({
      source: "yahoo",
      asOf: 1_700_000_000_000,
      stale: true,
      warnings: ["display-only"],
      cacheTier: "hot-stale",
    });
  });
});
