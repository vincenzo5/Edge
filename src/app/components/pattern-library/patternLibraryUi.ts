import type { PatternRecord } from "@/lib/patternLibrary/types";
import type { PatternRecordSummary } from "@/lib/patternLibrary/recordSummaries";

export type SetupFamilyOption = {
  id: string;
  name: string;
};

export function patternRecordSvgUrl(id: string): string {
  return `/api/pattern-library/records/${encodeURIComponent(id)}/svg`;
}

export function formatCaptureDate(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Date(parsed).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function sectionPath(labels: string[]): string {
  return labels.join(" → ");
}

export type PatternRecordDetail = PatternRecord;

export type { PatternRecordSummary };
