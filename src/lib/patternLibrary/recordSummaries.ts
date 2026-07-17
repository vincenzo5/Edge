import type { PatternRecord } from "./types";

export type PatternRecordSummary = {
  id: string;
  symbol: string;
  timeframe: string;
  asOf: string;
  setupFamilyId: string;
  quality: PatternRecord["quality"];
  decision: PatternRecord["decision"];
  thesis: string;
  sectionLabels: string[];
  capturedAt: string | null;
  hasSvg: boolean;
};

export function isInteractiveCapture(record: PatternRecord): boolean {
  return Boolean(record.capture) && !record.id.startsWith("seed-");
}

export function toRecordSummary(
  record: PatternRecord,
  hasSvg: boolean,
): PatternRecordSummary {
  return {
    id: record.id,
    symbol: record.symbol,
    timeframe: record.timeframe,
    asOf: record.asOf,
    setupFamilyId: record.setupFamilyId,
    quality: record.quality,
    decision: record.decision,
    thesis: record.plan.thesis,
    sectionLabels: record.capture?.sections.map((section) => section.label) ?? [],
    capturedAt: record.capture?.capturedAt ?? null,
    hasSvg,
  };
}

export function compareRecordSummariesNewestFirst(
  a: PatternRecordSummary,
  b: PatternRecordSummary,
): number {
  const aTime = a.capturedAt ?? a.asOf;
  const bTime = b.capturedAt ?? b.asOf;
  return bTime.localeCompare(aTime);
}
