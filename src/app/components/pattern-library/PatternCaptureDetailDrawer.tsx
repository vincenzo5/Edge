"use client";

import { useCallback, useEffect, useState } from "react";
import type { Interval } from "@/lib/chart/contracts";
import type { Range } from "@/lib/yahoo";
import type { PatternRecord } from "@/lib/patternLibrary/types";
import type { SetupQuality } from "@/lib/patternLibrary/types";
import { rangeForManualInterval } from "@/lib/chart/rangeInterval";
import { EdgeButton, EdgeSlideOver } from "@/app/components/design-system";
import { useAppActions } from "../AppActionsContext";
import { usePatternLibrary } from "./PatternLibraryContext";
import {
  formatCaptureDate,
  patternRecordSvgUrl,
  sectionPath,
  type SetupFamilyOption,
} from "./patternLibraryUi";

const VALID_INTERVALS = new Set<Interval>([
  "1m",
  "5m",
  "15m",
  "30m",
  "1h",
  "2h",
  "1d",
  "1wk",
  "1mo",
]);

type Props = {
  recordId: string | null;
  onClose: () => void;
  onUpdated: (record: PatternRecord) => void;
};

export default function PatternCaptureDetailDrawer({
  recordId,
  onClose,
  onUpdated,
}: Props) {
  const appActions = useAppActions();
  const { requestChartGoto } = usePatternLibrary();
  const [record, setRecord] = useState<PatternRecord | null>(null);
  const [families, setFamilies] = useState<SetupFamilyOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!recordId) {
      setRecord(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const [recordRes, taxonomyRes] = await Promise.all([
          fetch(`/api/pattern-library/records/${encodeURIComponent(recordId)}`),
          fetch("/api/pattern-library/taxonomy"),
        ]);
        if (!recordRes.ok) {
          throw new Error("Failed to load capture");
        }
        const recordPayload = (await recordRes.json()) as { record: PatternRecord };
        const taxonomyPayload = taxonomyRes.ok
          ? ((await taxonomyRes.json()) as { setupFamilies: SetupFamilyOption[] })
          : { setupFamilies: [] };
        if (cancelled) return;
        setRecord(recordPayload.record);
        setFamilies(taxonomyPayload.setupFamilies);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load capture");
          setRecord(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [recordId]);

  const saveMetadata = useCallback(
    async (patch: {
      setupFamilyId?: string;
      quality?: SetupQuality;
      notes?: string;
      thesis?: string;
    }) => {
      if (!recordId) return;
      setSaving(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/pattern-library/records/${encodeURIComponent(recordId)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
          },
        );
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "Save failed");
        }
        const payload = (await response.json()) as { record: PatternRecord };
        setRecord(payload.record);
        onUpdated(payload.record);
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Save failed");
      } finally {
        setSaving(false);
      }
    },
    [onUpdated, recordId],
  );

  const handleGoToChart = useCallback(() => {
    if (!record?.capture) return;
    const capture = record.capture;
    const intervalCandidate = capture.interval as Interval;
    const interval = VALID_INTERVALS.has(intervalCandidate)
      ? intervalCandidate
      : (record.timeframe as Interval);
    const range = (capture.range as Range | undefined) ?? rangeForManualInterval(interval);

    appActions?.patchActiveCell({
      symbol: record.symbol,
      interval,
      range,
      rangePreset: null,
    });
    requestChartGoto({
      symbol: record.symbol,
      atMs: capture.patternEnd.timestamp,
    });
    onClose();
  }, [appActions, onClose, record, requestChartGoto]);

  if (!recordId) return null;

  const title = record ? `${record.symbol} · ${record.timeframe}` : "Pattern capture";
  const subtitle = record
    ? formatCaptureDate(record.capture?.capturedAt ?? record.asOf)
    : undefined;

  return (
    <EdgeSlideOver
      open
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      testId="pattern-capture-detail-drawer"
      width="half"
    >
      {loading ? (
        <div className="text-sm text-[var(--edge-text-muted)]">Loading capture…</div>
      ) : null}

      {error ? (
        <div className="mb-3 text-sm text-[var(--edge-danger)]">{error}</div>
      ) : null}

      {record ? (
        <div className="space-y-4">
          <div className="overflow-hidden rounded border border-[var(--edge-border)] bg-[var(--edge-surface-chart)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={patternRecordSvgUrl(record.id)}
              alt={`${record.symbol} pattern capture`}
              className="block w-full"
            />
          </div>

          {record.capture?.sections.length ? (
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--edge-text-muted)]">
                Sections
              </div>
              <div className="space-y-1">
                {record.capture.sections.map((section) => (
                  <div
                    key={section.id}
                    className="flex items-center justify-between rounded bg-[var(--edge-surface-muted)] px-2 py-1 text-sm text-[var(--edge-text-secondary)]"
                  >
                    <span>{section.label}</span>
                    <span className="font-mono text-xs tabular-nums text-[var(--edge-text-muted)]">
                      {section.fromBar === section.toBar
                        ? `bar ${section.fromBar}`
                        : `bars ${section.fromBar}–${section.toBar}`}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-xs text-[var(--edge-text-muted)]">
                {sectionPath(record.capture.sections.map((section) => section.label))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-3">
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-[var(--edge-text-muted)]">Setup family</span>
              <select
                value={record.setupFamilyId}
                disabled={saving}
                onChange={(event) => void saveMetadata({ setupFamilyId: event.target.value })}
                className="rounded border border-[var(--edge-border)] bg-[var(--edge-surface-chart)] px-2 py-1.5 text-[var(--edge-text-primary)]"
              >
                {families.map((family) => (
                  <option key={family.id} value={family.id}>
                    {family.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-xs text-[var(--edge-text-muted)]">Quality</span>
              <select
                value={record.quality}
                disabled={saving}
                onChange={(event) =>
                  void saveMetadata({
                    quality: Number.parseInt(event.target.value, 10) as SetupQuality,
                  })
                }
                className="rounded border border-[var(--edge-border)] bg-[var(--edge-surface-chart)] px-2 py-1.5 text-[var(--edge-text-primary)]"
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-xs text-[var(--edge-text-muted)]">Thesis</span>
              <textarea
                defaultValue={record.plan.thesis}
                disabled={saving}
                rows={2}
                onBlur={(event) => {
                  const next = event.target.value.trim();
                  if (next !== record.plan.thesis) {
                    void saveMetadata({ thesis: next });
                  }
                }}
                className="rounded border border-[var(--edge-border)] bg-[var(--edge-surface-chart)] px-2 py-1.5 text-[var(--edge-text-primary)]"
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-xs text-[var(--edge-text-muted)]">Notes</span>
              <textarea
                defaultValue={record.notes ?? ""}
                disabled={saving}
                rows={3}
                onBlur={(event) => {
                  const next = event.target.value.trim();
                  if (next !== (record.notes ?? "")) {
                    void saveMetadata({ notes: next });
                  }
                }}
                className="rounded border border-[var(--edge-border)] bg-[var(--edge-surface-chart)] px-2 py-1.5 text-[var(--edge-text-primary)]"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <EdgeButton variant="primary" onClick={handleGoToChart} disabled={!record.capture}>
              Go to chart
            </EdgeButton>
            <EdgeButton onClick={onClose}>Close</EdgeButton>
          </div>
        </div>
      ) : null}
    </EdgeSlideOver>
  );
}
