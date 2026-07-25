export type UaSpecificMemoryInput =
  | { bytes: number; unavailableReason?: null | undefined }
  | { bytes?: null | undefined; unavailableReason: string };

export type UaSpecificMemoryFields = {
  uaSpecificMemoryBytes: number | null;
  uaSpecificMemoryMb: number | null;
  uaSpecificUnavailableReason: string | null;
};

export type CdpPerformanceMetric = {
  name: string;
  value: number;
};

export type CdpHeapFields = {
  cdpJsHeapUsedSizeMb: number | null;
  cdpJsHeapTotalSizeMb: number | null;
};

export function bytesToMb(bytes: number | null | undefined): number | null {
  if (bytes == null || !Number.isFinite(bytes)) return null;
  return Math.round((bytes / (1024 * 1024)) * 100) / 100;
}

export function normalizeUaSpecificMemory(input: UaSpecificMemoryInput): UaSpecificMemoryFields {
  if (input.bytes != null && Number.isFinite(input.bytes)) {
    return {
      uaSpecificMemoryBytes: input.bytes,
      uaSpecificMemoryMb: bytesToMb(input.bytes),
      uaSpecificUnavailableReason: null,
    };
  }

  const reason =
    typeof input.unavailableReason === "string" && input.unavailableReason.trim().length > 0
      ? input.unavailableReason.trim()
      : "measureUserAgentSpecificMemory unavailable";

  return {
    uaSpecificMemoryBytes: null,
    uaSpecificMemoryMb: null,
    uaSpecificUnavailableReason: reason,
  };
}

export function normalizeCdpHeapMetrics(metrics: CdpPerformanceMetric[]): CdpHeapFields {
  const byName = new Map<string, number>();
  for (const metric of metrics) {
    if (typeof metric.name === "string" && Number.isFinite(metric.value)) {
      byName.set(metric.name, metric.value);
    }
  }

  const used = byName.get("JSHeapUsedSize");
  const total = byName.get("JSHeapTotalSize");

  return {
    cdpJsHeapUsedSizeMb: used != null ? bytesToMb(used) : null,
    cdpJsHeapTotalSizeMb: total != null ? bytesToMb(total) : null,
  };
}

export type ProcessRssSampleInput = {
  beforeBytes?: number | null;
  afterBytes?: number | null;
  method?: string | null;
  note?: string | null;
};

export type ProcessRssFields = {
  processRssBeforeMb: number | null;
  processRssAfterMb: number | null;
  processRssDeltaMb: number | null;
  processSampleMethod: string | null;
  processSampleNote: string | null;
};

export function normalizeProcessRssSample(input: ProcessRssSampleInput): ProcessRssFields {
  const beforeMb = bytesToMb(input.beforeBytes);
  const afterMb = bytesToMb(input.afterBytes);
  const deltaMb =
    beforeMb != null && afterMb != null ? Math.round((afterMb - beforeMb) * 100) / 100 : null;

  const method =
    typeof input.method === "string" && input.method.trim().length > 0 ? input.method.trim() : null;
  const note =
    typeof input.note === "string" && input.note.trim().length > 0 ? input.note.trim() : null;

  return {
    processRssBeforeMb: beforeMb,
    processRssAfterMb: afterMb,
    processRssDeltaMb: deltaMb,
    processSampleMethod: method,
    processSampleNote: note,
  };
}

export function processRssBelowHeapWarn(
  processRssAfterMb: number | null,
  jsHeapUsedMb: number | null,
): boolean {
  if (processRssAfterMb == null || jsHeapUsedMb == null) return false;
  return processRssAfterMb < jsHeapUsedMb;
}

export type SurfaceMetricsInput = {
  canvasCount?: number | null;
  webglContextCount?: number | null;
  gpuMemoryBytes?: number | null;
  gpuMemoryNote?: string | null;
};

export type SurfaceMetricsFields = {
  canvasCount: number | null;
  webglContextCount: number | null;
  gpuMemoryMb: number | null;
  gpuMemoryNote: string | null;
};

export function normalizeSurfaceMetrics(input: SurfaceMetricsInput): SurfaceMetricsFields {
  const canvasCount =
    input.canvasCount != null && Number.isFinite(input.canvasCount)
      ? Math.max(0, Math.round(input.canvasCount))
      : null;
  const webglContextCount =
    input.webglContextCount != null && Number.isFinite(input.webglContextCount)
      ? Math.max(0, Math.round(input.webglContextCount))
      : null;

  if (input.gpuMemoryBytes != null && Number.isFinite(input.gpuMemoryBytes) && input.gpuMemoryBytes > 0) {
    return {
      canvasCount,
      webglContextCount,
      gpuMemoryMb: bytesToMb(input.gpuMemoryBytes),
      gpuMemoryNote: null,
    };
  }

  const note =
    typeof input.gpuMemoryNote === "string" && input.gpuMemoryNote.trim().length > 0
      ? input.gpuMemoryNote.trim()
      : "gpu memory unavailable";

  return {
    canvasCount,
    webglContextCount,
    gpuMemoryMb: null,
    gpuMemoryNote: note,
  };
}

/** L5 guard: inactive-unmount should keep DOM canvas count below pane count when one engine is mounted. */
export function surfacePolicyPass(
  paneCount: number,
  mountedEngines: number | null,
  canvasCount: number | null,
  inactiveChartSurfaces: number | null,
): boolean {
  if (paneCount === 1) {
    return canvasCount == null || canvasCount > 0;
  }

  const expectedInactive = paneCount - 1;
  if ((inactiveChartSurfaces ?? 0) !== expectedInactive || (mountedEngines ?? 0) !== 1) {
    return false;
  }

  if (canvasCount == null || canvasCount <= 0) {
    return false;
  }

  return canvasCount < paneCount;
}

export type SurfaceMetricsRaw = {
  canvasCount: number;
  webglContextCount: number;
  gpuMemoryBytes: number | null;
  gpuMemoryNote: string | null;
};

/** Runs in browser context (Playwright page.evaluate). */
export function collectSurfaceMetricsInPage(): SurfaceMetricsRaw {
  const canvasCount = document.querySelectorAll("canvas").length;
  const webglContextCount = Number(
    (globalThis as { __edgeWebGLLiveContextCount?: number }).__edgeWebGLLiveContextCount ?? 0,
  );

  let gpuMemoryBytes: number | null = null;
  let gpuMemoryNote: string | null = null;

  try {
    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl2");
    if (!gl) {
      gpuMemoryNote =
        "webgl2 probe unavailable; OffscreenCanvas layer caches not enumerable";
    } else {
      gl.getExtension("WEBGL_memory_info");
      const GPU_MEMORY_INFO_CURRENT_AVAILABLE_VIDMEM_NVX = 0x9049;
      const GPU_MEMORY_INFO_TOTAL_AVAILABLE_MEMORY_NVX = 0x9048;
      const current = gl.getParameter(GPU_MEMORY_INFO_CURRENT_AVAILABLE_VIDMEM_NVX);
      const total = gl.getParameter(GPU_MEMORY_INFO_TOTAL_AVAILABLE_MEMORY_NVX);
      if (typeof current === "number" && Number.isFinite(current) && current > 0) {
        gpuMemoryBytes = current;
      } else if (typeof total === "number" && Number.isFinite(total) && total > 0) {
        gpuMemoryBytes = total;
      } else {
        gpuMemoryNote =
          "no GPU memory extension (headless/opaque); OffscreenCanvas layer caches not enumerable";
      }
      const loseExt = gl.getExtension("WEBGL_lose_context");
      loseExt?.loseContext();
    }
  } catch {
    gpuMemoryNote = "gpu probe failed; OffscreenCanvas layer caches not enumerable";
  }

  return { canvasCount, webglContextCount, gpuMemoryBytes, gpuMemoryNote };
}
