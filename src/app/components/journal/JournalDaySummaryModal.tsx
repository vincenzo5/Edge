"use client";

import { useMemo } from "react";
import { EdgeModalShell } from "@/app/components/design-system";
import JournalDayTradesTable from "@/app/components/journal/JournalDayTradesTable";
import JournalMetricGrid, { type JournalMetricItem } from "@/app/components/journal/JournalMetricGrid";
import JournalPnLAreaChart, { type PnLAreaChartPoint } from "@/app/components/journal/JournalPnLAreaChart";
import {
  computeDaySummaryStats,
  computeIntradayPnLCurve,
  type DaySummaryTradeInput,
  type JournalReportTradeInput,
} from "@/lib/journal/journalStats";
import { formatDaySummaryDate } from "@/lib/journal/journalTradeDisplay";
import type { JournalTradeResponse } from "@/lib/persistence/schemas/journal";

function formatMoney(value: number, decimals = 2): string {
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatCompactMoney(value: number): string {
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatPercent(value: number | null): string {
  if (value == null) return "—";
  return `${Math.round(value * 1000) / 10}%`;
}

function formatProfitFactor(value: number | null): string {
  if (value == null) return "—";
  return value.toFixed(2);
}

type Props = {
  open: boolean;
  date: string | null;
  trades: JournalTradeResponse[];
  onClose: () => void;
  onSelectTrade: (tradeId: string) => void;
};

export default function JournalDaySummaryModal({
  open,
  date,
  trades,
  onClose,
  onSelectTrade,
}: Props) {
  const stats = useMemo(
    () => computeDaySummaryStats(trades as DaySummaryTradeInput[]),
    [trades],
  );

  const chartPoints = useMemo((): PnLAreaChartPoint[] => {
    return computeIntradayPnLCurve(trades as JournalReportTradeInput[]).map((point, index) => ({
      id: String(index),
      value: point.cumulativePnL,
      tooltipTitle: formatDaySummaryDate(date ?? point.closedAt.slice(0, 10)),
      tooltipValue: formatCompactMoney(point.cumulativePnL),
    }));
  }, [trades, date]);

  const metrics = useMemo((): JournalMetricItem[] => {
    return [
      {
        label: "Total Trades",
        value: String(stats.closedCount),
        testId: "journal-day-summary-total-trades",
      },
      {
        label: "Win Rate",
        value: formatPercent(stats.winRate),
        testId: "journal-day-summary-win-rate",
      },
      {
        label: "Gross P&L",
        value: formatMoney(stats.grossPnL),
        tone: stats.grossPnL > 0 ? "positive" : stats.grossPnL < 0 ? "negative" : "neutral",
        testId: "journal-day-summary-gross-pnl",
      },
      {
        label: "Volume",
        value: String(stats.volume),
        testId: "journal-day-summary-volume",
      },
      {
        label: "Winners / Losers",
        value: `${stats.winCount} / ${stats.lossCount}`,
        testId: "journal-day-summary-winners-losers",
      },
      {
        label: "Profit Factor",
        value: formatProfitFactor(stats.profitFactor),
        testId: "journal-day-summary-profit-factor",
      },
      {
        label: "Commissions",
        value: formatMoney(stats.totalCommissions),
        testId: "journal-day-summary-commissions",
      },
    ];
  }, [stats]);

  if (!date) return null;

  const netPnLClass =
    stats.netPnL > 0
      ? "text-[var(--edge-positive)]"
      : stats.netPnL < 0
        ? "text-[var(--edge-negative)]"
        : "text-[var(--edge-text-strong)]";

  const title = (
    <span className="flex flex-wrap items-center gap-2 text-base sm:text-lg">
      <span>{formatDaySummaryDate(date)}</span>
      <span className="text-[var(--edge-text-secondary)]">·</span>
      <span className={`font-semibold ${netPnLClass}`} data-testid="journal-day-summary-net-pnl">
        Net P&L {formatMoney(stats.netPnL)}
      </span>
    </span>
  );

  return (
    <EdgeModalShell
      open={open}
      title={title}
      ariaLabel={`${formatDaySummaryDate(date)} day summary`}
      onClose={onClose}
      maxWidth="lg"
      align="center"
      testId="journal-day-summary-modal"
    >
      <div className="space-y-4 px-5 py-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
          <div
            className="rounded border border-[var(--edge-border-subtle)] bg-[var(--edge-surface-panel)] p-3"
            data-testid="journal-day-summary-chart"
          >
            {chartPoints.length > 0 ? (
              <JournalPnLAreaChart
                points={chartPoints}
                testId="journal-day-pnl"
                compact
                ariaLabel="Intraday P&L"
                gradientIdPrefix="day-pnl-area"
              />
            ) : (
              <p
                className="py-10 text-center text-sm text-[var(--edge-text-secondary)]"
                data-testid="journal-day-summary-chart-empty"
              >
                No intraday P&L for this day.
              </p>
            )}
          </div>
          <JournalMetricGrid metrics={metrics} testId="journal-day-summary-metrics" />
        </div>
        <JournalDayTradesTable trades={trades} onSelectTrade={onSelectTrade} />
      </div>
    </EdgeModalShell>
  );
}
