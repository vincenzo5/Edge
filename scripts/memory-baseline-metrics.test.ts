import { describe, expect, it } from "vitest";
import {
  bytesToMb,
  normalizeCdpHeapMetrics,
  normalizeDeskComposite,
  normalizeProcessRssSample,
  normalizeSurfaceMetrics,
  normalizeUaSpecificMemory,
  processRssBelowHeapWarn,
  surfacePolicyPass,
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

describe("normalizeProcessRssSample", () => {
  it("maps before/after bytes to L4 fields", () => {
    expect(
      normalizeProcessRssSample({
        beforeBytes: 100 * 1024 * 1024,
        afterBytes: 120 * 1024 * 1024,
        method: "os-ps-max-renderer",
        note: "headless=true; platform=darwin; pid=1001",
      }),
    ).toEqual({
      processRssBeforeMb: 100,
      processRssAfterMb: 120,
      processRssDeltaMb: 20,
      processSampleMethod: "os-ps-max-renderer",
      processSampleNote: "headless=true; platform=darwin; pid=1001",
    });
  });

  it("returns nulls for missing samples without faking zero", () => {
    expect(
      normalizeProcessRssSample({
        method: "unavailable",
        note: "headless=true; platform=win32; os-ps unsupported on this platform",
      }),
    ).toEqual({
      processRssBeforeMb: null,
      processRssAfterMb: null,
      processRssDeltaMb: null,
      processSampleMethod: "unavailable",
      processSampleNote: "headless=true; platform=win32; os-ps unsupported on this platform",
    });
  });
});

describe("processRssBelowHeapWarn", () => {
  it("warns when process RSS is below JS heap", () => {
    expect(processRssBelowHeapWarn(80, 100)).toBe(true);
    expect(processRssBelowHeapWarn(120, 100)).toBe(false);
    expect(processRssBelowHeapWarn(null, 100)).toBe(false);
    expect(processRssBelowHeapWarn(120, null)).toBe(false);
  });
});

describe("normalizeSurfaceMetrics", () => {
  it("maps surface inventory to L5 fields", () => {
    expect(
      normalizeSurfaceMetrics({
        canvasCount: 3,
        webglContextCount: 2,
        gpuMemoryBytes: 16 * 1024 * 1024,
      }),
    ).toEqual({
      canvasCount: 3,
      webglContextCount: 2,
      gpuMemoryMb: 16,
      gpuMemoryNote: null,
    });
  });

  it("returns null gpuMemoryMb with note when GPU bytes are missing", () => {
    expect(
      normalizeSurfaceMetrics({
        canvasCount: 2,
        webglContextCount: 0,
        gpuMemoryNote: "no GPU memory extension (headless)",
      }),
    ).toEqual({
      canvasCount: 2,
      webglContextCount: 0,
      gpuMemoryMb: null,
      gpuMemoryNote: "no GPU memory extension (headless)",
    });
  });

  it("does not fake zero gpuMemoryMb when bytes are zero or invalid", () => {
    expect(normalizeSurfaceMetrics({ canvasCount: 1, webglContextCount: 0, gpuMemoryBytes: 0 })).toEqual({
      canvasCount: 1,
      webglContextCount: 0,
      gpuMemoryMb: null,
      gpuMemoryNote: "gpu memory unavailable",
    });
  });
});

describe("surfacePolicyPass", () => {
  it("passes single-cell when canvases are present", () => {
    expect(surfacePolicyPass(1, 1, 2, 0)).toBe(true);
  });

  it("requires all visible engines mounted for multi-cell simultaneous render", () => {
    expect(surfacePolicyPass(8, 8, 8, 0)).toBe(true);
    expect(surfacePolicyPass(8, 1, 8, 0)).toBe(false);
    expect(surfacePolicyPass(8, 8, 8, 7)).toBe(false);
    expect(surfacePolicyPass(8, 0, 3, 0)).toBe(false);
  });
});

describe("normalizeDeskComposite", () => {
  it("sums known MB layers and preserves explicit skips", () => {
    expect(
      normalizeDeskComposite({
        browserProcessRssMb: 120.5,
        nodeRssMb: 299,
        sidecarRssMb: 42,
        redisUsedMb: 8.25,
        skippedNoSidecar: false,
        skippedNoRedis: false,
      }),
    ).toEqual({
      browserProcessRssMb: 120.5,
      nodeRssMb: 299,
      sidecarRssMb: 42,
      redisUsedMb: 8.25,
      totalKnownMb: 469.75,
      skippedNoSidecar: false,
      skippedNoRedis: false,
    });
  });

  it("defaults skips to true and does not fake zero for missing samples", () => {
    expect(
      normalizeDeskComposite({
        nodeRssMb: 150,
      }),
    ).toEqual({
      browserProcessRssMb: null,
      nodeRssMb: 150,
      sidecarRssMb: null,
      redisUsedMb: null,
      totalKnownMb: 150,
      skippedNoSidecar: true,
      skippedNoRedis: true,
    });
  });

  it("returns null totalKnownMb when all layers are missing", () => {
    expect(normalizeDeskComposite({})).toEqual({
      browserProcessRssMb: null,
      nodeRssMb: null,
      sidecarRssMb: null,
      redisUsedMb: null,
      totalKnownMb: null,
      skippedNoSidecar: true,
      skippedNoRedis: true,
    });
  });
});
