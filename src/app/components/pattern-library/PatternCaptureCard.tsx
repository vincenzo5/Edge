"use client";

import type { PatternRecordSummary } from "@/lib/patternLibrary/recordSummaries";
import {
  formatCaptureDate,
  patternRecordSvgUrl,
  sectionPath,
} from "./patternLibraryUi";

type Props = {
  summary: PatternRecordSummary;
  selected: boolean;
  onSelect: () => void;
};

export default function PatternCaptureCard({ summary, selected, onSelect }: Props) {
  const needsReview = summary.setupFamilyId === "unclassified";

  return (
    <button
      type="button"
      data-testid={`pattern-capture-card-${summary.id}`}
      onClick={onSelect}
      className={`w-full rounded-md border p-2 text-left transition-colors ${
        selected
          ? "border-[var(--edge-accent)] bg-[var(--edge-surface-hover)]"
          : "border-[var(--edge-border)] bg-[var(--edge-surface-panel)] hover:bg-[var(--edge-surface-hover)]"
      }`}
    >
      <div className="mb-2 overflow-hidden rounded border border-[var(--edge-border)] bg-[var(--edge-surface-chart)]">
        {summary.hasSvg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={patternRecordSvgUrl(summary.id)}
            alt={`${summary.symbol} pattern capture`}
            className="block h-24 w-full object-cover object-left"
          />
        ) : (
          <div className="flex h-24 items-center justify-center text-xs text-[var(--edge-text-muted)]">
            No preview
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-[var(--edge-text-primary)]">
            {summary.symbol} · {summary.timeframe}
          </div>
          <div className="text-xs text-[var(--edge-text-muted)]">
            {formatCaptureDate(summary.capturedAt ?? summary.asOf)}
          </div>
        </div>
        {needsReview ? (
          <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--edge-warning)] bg-[var(--edge-surface-muted)]">
            Review
          </span>
        ) : null}
      </div>

      {summary.sectionLabels.length > 0 ? (
        <div className="mt-2 truncate text-xs text-[var(--edge-text-secondary)]">
          {sectionPath(summary.sectionLabels)}
        </div>
      ) : null}
    </button>
  );
}
