import type {
  CompareResearchRunsResult,
  ParameterDiff,
  PreviewTable,
  ResearchJobRecord,
} from "./contracts";
import { createArtifactId } from "./fingerprints";

type CompareRunEntry = {
  ref: string;
  label: string;
  record: ResearchJobRecord;
  keyMetrics: Record<string, string | number>;
  toolInput: unknown;
  datasetId?: string;
  toolName: string;
};

function refLabel(ref: string, index: number): string {
  return ref.length <= 8 ? ref : `run${index + 1}`;
}

function collectMetricKeys(entries: CompareRunEntry[]): string[] {
  const keys = new Set<string>();
  for (const entry of entries) {
    for (const key of Object.keys(entry.keyMetrics)) {
      keys.add(key);
    }
  }
  return [...keys].sort();
}

function flattenPaths(value: unknown, prefix = ""): Map<string, unknown> {
  const paths = new Map<string, unknown>();
  if (value == null || typeof value !== "object") {
    paths.set(prefix || "$", value);
    return paths;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      const next = prefix ? `${prefix}[${index}]` : `[${index}]`;
      for (const [path, val] of flattenPaths(item, next)) {
        paths.set(path, val);
      }
    });
    return paths;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (keys.length === 0) {
    paths.set(prefix || "$", value);
    return paths;
  }
  for (const key of keys) {
    const next = prefix ? `${prefix}.${key}` : key;
    for (const [path, val] of flattenPaths(record[key], next)) {
      paths.set(path, val);
    }
  }
  return paths;
}

function stableValue(value: unknown): string {
  return JSON.stringify(value);
}

function computeParameterDiffs(entries: CompareRunEntry[]): ParameterDiff[] {
  const pathMaps = entries.map((entry) => flattenPaths(entry.toolInput));
  const allPaths = new Set<string>();
  for (const map of pathMaps) {
    for (const path of map.keys()) allPaths.add(path);
  }

  const diffs: ParameterDiff[] = [];
  for (const path of [...allPaths].sort()) {
    const values: Record<string, unknown> = {};
    const seen = new Set<string>();
    entries.forEach((entry, index) => {
      const map = pathMaps[index]!;
      const value = map.get(path);
      const serialized = stableValue(value);
      if (seen.has(serialized)) return;
      seen.add(serialized);
      values[entry.label] = value;
    });
    if (Object.keys(values).length > 1) {
      diffs.push({ path, values });
    }
  }
  return diffs.slice(0, 40);
}

function buildPreviewTable(entries: CompareRunEntry[], metricKeys: string[]): PreviewTable | undefined {
  if (metricKeys.length === 0) return undefined;
  const columns = ["Metric", ...entries.map((entry) => entry.label)];
  const rows = metricKeys.slice(0, 20).map((metric) => [
    metric,
    ...entries.map((entry) => entry.keyMetrics[metric] ?? "—"),
  ]);
  return { columns, rows };
}

function summarizeKeyMetrics(
  entries: CompareRunEntry[],
  sharedDataset: boolean,
  sharedToolName: boolean,
  parameterDiffCount: number,
): Record<string, string | number> {
  const metrics: Record<string, string | number> = {
    "Runs compared": entries.length,
    "Shared dataset": sharedDataset ? "yes" : "no",
    "Shared tool": sharedToolName ? entries[0]?.toolName ?? "mixed" : "mixed",
    "Parameter diffs": parameterDiffCount,
  };

  const primaryMetric =
    entries[0]?.keyMetrics["holdout.meanForwardReturn"] ??
    entries[0]?.keyMetrics["Total return"] ??
    entries[0]?.keyMetrics["Total bars"];
  if (primaryMetric != null) {
    metrics["Primary (first run)"] = primaryMetric;
  }

  const last = entries[entries.length - 1];
  const lastMetric =
    last?.keyMetrics["holdout.meanForwardReturn"] ??
    last?.keyMetrics["Total return"] ??
    last?.keyMetrics["Total bars"];
  if (lastMetric != null && entries.length > 1) {
    metrics["Primary (last run)"] = lastMetric;
  }

  return metrics;
}

export function compareResearchRuns(args: {
  refs: string[];
  records: ResearchJobRecord[];
}): CompareResearchRunsResult {
  const entries: CompareRunEntry[] = args.records.map((record, index) => {
    const compact = record.compactResult;
    if (!compact || record.status !== "succeeded") {
      throw new Error(`Run not available for compare: ${args.refs[index] ?? record.jobId}`);
    }
    return {
      ref: args.refs[index] ?? record.jobId,
      label: refLabel(args.refs[index] ?? record.jobId, index),
      record,
      keyMetrics: compact.keyMetrics,
      toolInput: record.toolInput ?? {},
      datasetId: record.datasetId ?? compact.datasetId,
      toolName: record.toolName,
    };
  });

  if (entries.length < 2) {
    throw new Error("At least two succeeded research runs are required to compare");
  }

  const datasetIds = new Set(entries.map((entry) => entry.datasetId).filter(Boolean));
  const toolNames = new Set(entries.map((entry) => entry.toolName));
  const sharedDataset = datasetIds.size <= 1;
  const sharedToolName = toolNames.size === 1;

  const warnings: string[] = [];
  if (!sharedDataset) {
    warnings.push("Compared runs use different datasets — interpret metric deltas cautiously");
  }
  if (!sharedToolName) {
    warnings.push("Compared runs use different tools — KPI columns may not align");
  }

  const metricKeys = collectMetricKeys(entries);
  const metricRows = metricKeys.map((metric) => ({
    metric,
    values: Object.fromEntries(
      entries.map((entry) => [entry.label, entry.keyMetrics[metric] ?? "—"]),
    ),
  }));

  const parameterDiffs = computeParameterDiffs(entries);
  const previewTable = buildPreviewTable(entries, metricKeys.slice(0, 12));

  return {
    compareId: createArtifactId("cmp"),
    runCount: entries.length,
    refs: entries.map((entry) => entry.ref),
    jobIds: entries.map((entry) => entry.record.jobId),
    runFingerprints: entries.map((entry) => entry.record.runFingerprint ?? entry.record.jobId),
    sharedDataset,
    sharedToolName,
    warnings,
    keyMetrics: summarizeKeyMetrics(entries, sharedDataset, sharedToolName, parameterDiffs.length),
    previewTable,
    parameterDiffs,
    metricRows,
  };
}
