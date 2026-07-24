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
