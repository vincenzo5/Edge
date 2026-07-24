import { describe, expect, it } from "vitest";
import {
  bytesToMb,
  normalizeCdpHeapMetrics,
  normalizeUaSpecificMemory,
} from "./memory-baseline-metrics.ts";

describe("bytesToMb", () => {
  it("rounds to two decimals", () => {
    expect(bytesToMb(1_048_576)).toBe(1);
    expect(bytesToMb(10 * 1024 * 1024)).toBe(10);
    expect(bytesToMb(10_485_760 + 524_288)).toBe(10.5);
  });

  it("returns null for missing or non-finite input", () => {
    expect(bytesToMb(null)).toBeNull();
    expect(bytesToMb(undefined)).toBeNull();
    expect(bytesToMb(Number.NaN)).toBeNull();
  });
});

describe("normalizeUaSpecificMemory", () => {
  it("maps available bytes to L3 fields", () => {
    expect(normalizeUaSpecificMemory({ bytes: 80_000_000 })).toEqual({
      uaSpecificMemoryBytes: 80_000_000,
      uaSpecificMemoryMb: 76.29,
      uaSpecificUnavailableReason: null,
    });
  });

  it("records unavailable reason without faking zero", () => {
    expect(
      normalizeUaSpecificMemory({
        unavailableReason: "measureUserAgentSpecificMemory requires cross-origin isolation",
      }),
    ).toEqual({
      uaSpecificMemoryBytes: null,
      uaSpecificMemoryMb: null,
      uaSpecificUnavailableReason: "measureUserAgentSpecificMemory requires cross-origin isolation",
    });
  });

  it("uses default reason when empty", () => {
    expect(normalizeUaSpecificMemory({ unavailableReason: "   " })).toEqual({
      uaSpecificMemoryBytes: null,
      uaSpecificMemoryMb: null,
      uaSpecificUnavailableReason: "measureUserAgentSpecificMemory unavailable",
    });
  });
});

describe("normalizeCdpHeapMetrics", () => {
  it("maps CDP heap metrics to MB fields", () => {
    expect(
      normalizeCdpHeapMetrics([
        { name: "JSHeapUsedSize", value: 10 * 1024 * 1024 },
        { name: "JSHeapTotalSize", value: 112 * 1024 * 1024 },
        { name: "Documents", value: 12 },
      ]),
    ).toEqual({
      cdpJsHeapUsedSizeMb: 10,
      cdpJsHeapTotalSizeMb: 112,
    });
  });

  it("returns null when CDP metrics are missing", () => {
    expect(normalizeCdpHeapMetrics([{ name: "Documents", value: 12 }])).toEqual({
      cdpJsHeapUsedSizeMb: null,
      cdpJsHeapTotalSizeMb: null,
    });
  });
});
