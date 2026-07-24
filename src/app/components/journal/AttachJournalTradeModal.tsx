"use client";

import { useEffect, useMemo, useState } from "react";

import { EdgeButton } from "../design-system";
import EdgeModalShell from "../design-system/EdgeModalShell";
import { useActiveChart } from "../ActiveChartContext";
import { captureTradeChartFork } from "@/lib/journal/captureTradeChartFork";
import { fetchJournalTrades } from "@/lib/persistence/client/journalClient";
import type { JournalTradeResponse } from "@/lib/persistence/schemas/journal";
import { formatTradeCloseTime, formatTradeMoney } from "@/lib/journal/journalTradeDisplay";

type Props = {
  open: boolean;
  onClose: () => void;
  onAttached?: (snapshotId: string) => void;
};

function sortTradesForPicker(trades: JournalTradeResponse[], symbol: string): JournalTradeResponse[] {
  const normalized = symbol.trim().toUpperCase();
  return trades
    .filter((trade) => trade.symbol.trim().toUpperCase() === normalized)
    .sort((left, right) => {
      if (left.status !== right.status) {
        return left.status === "open" ? -1 : 1;
      }
      return Date.parse(right.openedAt) - Date.parse(left.openedAt);
    });
}

export default function AttachJournalTradeModal({ open, onClose, onAttached }: Props) {
  const activeChart = useActiveChart();
  const [trades, setTrades] = useState<JournalTradeResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [attachingId, setAttachingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const chartSymbol = activeChart?.config.symbol?.trim().toUpperCase() ?? "";
  const matchingTrades = useMemo(
    () => (chartSymbol ? sortTradesForPicker(trades, chartSymbol) : []),
    [trades, chartSymbol],
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const rows = await fetchJournalTrades();
        if (!cancelled) setTrades(rows);
      } catch {
        if (!cancelled) setError("Could not load journal trades.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function handleAttach(trade: JournalTradeResponse) {
    if (!activeChart) {
      setError("No active chart to capture.");
      return;
    }
    if (!activeChart.chartCommands.canCaptureSnapshot()) {
      setError("Chart is still loading.");
      return;
    }

    setAttachingId(trade.id);
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
      onAttached?.(result.snapshotId);
      onClose();
    } finally {
      setAttachingId(null);
    }
  }

  return (
    <EdgeModalShell
      open={open}
      onClose={onClose}
      title="Attach to journal trade"
      subtitle={
        chartSymbol
          ? `Capture the active ${chartSymbol} chart (markup + screenshot) to a trade.`
          : "Open a chart before attaching."
      }
      maxWidth="md"
      testId="attach-journal-trade-modal"
    >
      <div className="space-y-3 px-5 py-4">
        {error ? (
          <p className="text-xs text-[var(--edge-negative)]" role="alert">
            {error}
          </p>
        ) : null}
        {loading ? (
          <p className="text-xs text-[var(--edge-text-secondary)]">Loading trades…</p>
        ) : null}
        {!loading && !chartSymbol ? (
          <p className="text-xs text-[var(--edge-text-secondary)]">
            Select a chart cell with a symbol before attaching.
          </p>
        ) : null}
        {!loading && chartSymbol && matchingTrades.length === 0 ? (
          <p className="text-xs text-[var(--edge-text-secondary)]">
            No journal trades found for {chartSymbol}.
          </p>
        ) : null}
        {!loading && matchingTrades.length > 0 ? (
          <ul className="max-h-[360px] space-y-2 overflow-y-auto" data-testid="attach-journal-trade-list">
            {matchingTrades.map((trade) => (
              <li
                key={trade.id}
                className="flex items-center justify-between gap-3 rounded border border-[var(--edge-border)] px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[var(--edge-text-strong)]">
                    {trade.symbol}{" "}
                    <span className="text-[10px] uppercase text-[var(--edge-text-secondary)]">
                      {trade.status}
                    </span>
                  </div>
                  <div className="text-[10px] text-[var(--edge-text-secondary)]">
                    Opened {formatTradeCloseTime(trade.openedAt)}
                    {trade.netPnL != null ? ` · P&L ${formatTradeMoney(trade.netPnL)}` : ""}
                  </div>
                </div>
                <EdgeButton
                  type="button"
                  variant="secondary"
                  disabled={attachingId != null}
                  onClick={() => void handleAttach(trade)}
                  data-testid={`attach-journal-trade-${trade.id}`}
                >
                  {attachingId === trade.id ? "Capturing…" : "Attach"}
                </EdgeButton>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </EdgeModalShell>
  );
}
