"use client";

import { useCallback, useEffect, useState } from "react";
import type { PatternRecordSummary } from "@/lib/patternLibrary/recordSummaries";
import type { PatternRecord } from "@/lib/patternLibrary/types";
import { EdgeEmptyState, EdgeSpinner } from "@/app/components/design-system";
import { PanelPopOutButton } from "../sidebar/PanelChromeActions";
import PatternCaptureCard from "./PatternCaptureCard";
import PatternCaptureDetailDrawer from "./PatternCaptureDetailDrawer";
import { usePatternLibrary } from "./PatternLibraryContext";

export function PatternsPanel() {
  const { pendingRecordId, consumePendingRecordId } = usePatternLibrary();
  const [records, setRecords] = useState<PatternRecordSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/pattern-library/records");
      if (!response.ok) {
        throw new Error("Failed to load pattern library");
      }
      const payload = (await response.json()) as { records: PatternRecordSummary[] };
      setRecords(payload.records);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load pattern library");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    const pending = consumePendingRecordId();
    if (!pending) return;
    setSelectedId(pending);
    setDetailId(pending);
  }, [consumePendingRecordId, pendingRecordId]);

  const handleUpdated = useCallback((record: PatternRecord) => {
    setRecords((current) =>
      current.map((summary) =>
        summary.id === record.id
          ? {
              ...summary,
              setupFamilyId: record.setupFamilyId,
              quality: record.quality,
              thesis: record.plan.thesis,
              sectionLabels: record.capture?.sections.map((section) => section.label) ?? [],
            }
          : summary,
      ),
    );
  }, []);

  return (
    <div
      data-testid="patterns-panel"
      className="flex h-full min-h-0 flex-col bg-[var(--edge-surface-panel)]"
    >
      <div className="flex items-center justify-between border-b border-[var(--edge-border)] px-3 py-2">
        <div>
          <div className="text-sm font-medium text-[var(--edge-text-primary)]">Patterns</div>
          <div className="text-xs text-[var(--edge-text-muted)]">
            Saved setup captures
          </div>
        </div>
        <PanelPopOutButton />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[var(--edge-text-muted)]">
            <EdgeSpinner size="sm" />
            Loading captures…
          </div>
        ) : null}

        {error ? (
          <div className="mb-3 text-sm text-[var(--edge-danger)]">{error}</div>
        ) : null}

        {!loading && !error && records.length === 0 ? (
          <EdgeEmptyState message="No captures yet. Use Capture on the chart (Shift+P) to save your first setup." />
        ) : null}

        <div className="grid gap-2">
          {records.map((summary) => (
            <PatternCaptureCard
              key={summary.id}
              summary={summary}
              selected={selectedId === summary.id}
              onSelect={() => {
                setSelectedId(summary.id);
                setDetailId(summary.id);
              }}
            />
          ))}
        </div>
      </div>

      <PatternCaptureDetailDrawer
        recordId={detailId}
        onClose={() => setDetailId(null)}
        onUpdated={handleUpdated}
      />
    </div>
  );
}
