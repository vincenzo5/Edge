"use client";

import { useCallback, useEffect, useState } from "react";

import { EdgeButton } from "../design-system";
import { useActiveChart } from "../ActiveChartContext";
import AttachJournalTradeModal from "./AttachJournalTradeModal";
import TradeChartForkModal from "./TradeChartForkModal";
import { captureTradeChartFork } from "@/lib/journal/captureTradeChartFork";
import {
  deleteJournalTradeChartSnapshotRemote,
  fetchJournalFills,
  fetchJournalTradeChartSnapshots,
} from "@/lib/persistence/client/journalClient";
import type {
  JournalChartSnapshotResponse,
  JournalFillResponse,
  JournalTradeResponse,
} from "@/lib/persistence/schemas/journal";
import { JOURNAL_CHART_SNAPSHOT_MAX_PER_TRADE } from "@/lib/journal/chartSnapshotValidation";

type Props = {
  trade: JournalTradeResponse;
  fills?: JournalFillResponse[];
};

export default function JournalTradeChartSnapshots({ trade, fills: fillsProp }: Props) {
  const activeChart = useActiveChart();
  const [snapshots, setSnapshots] = useState<JournalChartSnapshotResponse[]>([]);
  const [fills, setFills] = useState<JournalFillResponse[]>(fillsProp ?? []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [openSnapshot, setOpenSnapshot] = useState<JournalChartSnapshotResponse | null>(null);

  const loadSnapshots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchJournalTradeChartSnapshots(trade.id);
      setSnapshots(rows);
    } catch {
      setError("Could not load chart snapshots.");
    } finally {
      setLoading(false);
    }
  }, [trade.id]);

  useEffect(() => {
    void loadSnapshots();
  }, [loadSnapshots]);

  useEffect(() => {
    if (fillsProp) {
      setFills(fillsProp);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const rows = await fetchJournalFills();
        if (!cancelled) setFills(rows);
      } catch {
        if (!cancelled) setFills([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fillsProp, trade.id]);

  async function handleCaptureActiveChart() {
    if (!activeChart) {
      setError("No active chart is mounted.");
      return;
    }
    if (!activeChart.chartCommands.canCaptureSnapshot()) {
      setError("Active chart is still loading.");
      return;
    }
    setCapturing(true);
    setError(null);
    try {
      const result = await captureTradeChartFork({
        trade,
        cellConfig: activeChart.config,
        captureScreenshot: () =>
          activeChart.chartCommands.captureSnapshot({ includeCrosshair: false }),
        label: `${trade.symbol} setup`,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await loadSnapshots();
    } finally {
      setCapturing(false);
    }
  }

  async function handleDelete(snapshotId: string) {
    const deleted = await deleteJournalTradeChartSnapshotRemote(trade.id, snapshotId);
    if (!deleted) {
      setError("Could not delete chart snapshot.");
      return;
    }
    if (openSnapshot?.id === snapshotId) setOpenSnapshot(null);
    await loadSnapshots();
  }

  const atLimit = snapshots.length >= JOURNAL_CHART_SNAPSHOT_MAX_PER_TRADE;
  const canCaptureActive =
    activeChart?.config?.symbol != null &&
    activeChart.chartCommands?.canCaptureSnapshot() === true &&
    activeChart.config.symbol.trim().toUpperCase() === trade.symbol.trim().toUpperCase();

  return (
    <section className="space-y-2" data-testid="journal-trade-chart-snapshots">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--edge-text-secondary)]">
          Trade charts
        </h3>
        <span className="text-[10px] text-[var(--edge-text-muted)]">
          {snapshots.length}/{JOURNAL_CHART_SNAPSHOT_MAX_PER_TRADE}
        </span>
      </div>

      {error ? (
        <p className="text-xs text-[var(--edge-negative)]" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <EdgeButton
          type="button"
          variant="secondary"
          disabled={capturing || atLimit || !canCaptureActive}
          title={
            !canCaptureActive
              ? activeChart?.config?.symbol
                ? `Active chart is ${activeChart.config.symbol}, not ${trade.symbol}`
                : "No chart in this workspace yet — open a chart tile with this symbol"
              : atLimit
                ? `Maximum ${JOURNAL_CHART_SNAPSHOT_MAX_PER_TRADE} chart snapshots per trade`
                : undefined
          }
          onClick={() => void handleCaptureActiveChart()}
          data-testid="journal-trade-chart-capture-active"
        >
          {capturing ? "Capturing…" : "Capture active chart"}
        </EdgeButton>
      </div>

      {loading ? (
        <p className="text-xs text-[var(--edge-text-secondary)]">Loading chart snapshots…</p>
      ) : null}

      {!loading && snapshots.length === 0 ? (
        <p className="text-xs text-[var(--edge-text-secondary)]" data-testid="journal-trade-chart-empty">
          No chart forks yet. Capture the active chart or attach from the chart snapshot menu.
        </p>
      ) : null}

      {!loading && snapshots.length > 0 ? (
        <ul className="space-y-2">
          {snapshots.map((snapshot) => (
            <li
              key={snapshot.id}
              className="flex items-center justify-between gap-2 rounded border border-[var(--edge-border)] px-3 py-2"
              data-testid={`journal-trade-chart-row-${snapshot.id}`}
            >
              <div className="min-w-0">
                <div className="truncate text-sm text-[var(--edge-text-strong)]">
                  {snapshot.label ?? `${snapshot.symbol} chart`}
                </div>
                <div className="text-[10px] text-[var(--edge-text-secondary)]">
                  {snapshot.interval} · captured {new Date(snapshot.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <EdgeButton
                  type="button"
                  variant="secondary"
                  onClick={() => setOpenSnapshot(snapshot)}
                  data-testid={`journal-trade-chart-open-${snapshot.id}`}
                >
                  Open
                </EdgeButton>
                <EdgeButton
                  type="button"
                  variant="secondary"
                  onClick={() => void handleDelete(snapshot.id)}
                  data-testid={`journal-trade-chart-delete-${snapshot.id}`}
                >
                  Delete
                </EdgeButton>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {openSnapshot ? (
        <TradeChartForkModal
          open
          onClose={() => setOpenSnapshot(null)}
          trade={trade}
          fills={fills.filter((fill) => trade.fillExecIds.includes(fill.execId))}
          snapshot={openSnapshot}
          onSnapshotUpdated={(updated) => {
            setOpenSnapshot(updated);
            setSnapshots((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
          }}
        />
      ) : null}
    </section>
  );
}
