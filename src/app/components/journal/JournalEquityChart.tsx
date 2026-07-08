"use client";

import Tooltip from "@/app/components/Tooltip";
import JournalPnLAreaChart, { type PnLAreaChartPoint } from "@/app/components/journal/JournalPnLAreaChart";
import { JOURNAL_SCOPED_EMPTY_MESSAGE } from "@/lib/journal/journalEmptyCopy";
import type { EquityCurvePoint } from "@/lib/journal/journalStats";

const EQUITY_HELP =
  "Displays how your total account P&L accumulated over the course of each trading day.";

function formatShortDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${month}/${day}/${year.slice(2)}`;
}

function formatLongDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${month}/${day}/${year}`;
}

function formatAxisMoney(value: number): string {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return value < 0 ? `-${formatted}` : formatted;
}

function toChartPoints(points: EquityCurvePoint[]): PnLAreaChartPoint[] {
  return points.map((point) => ({
    id: point.date,
    value: point.cumulativePnL,
    tooltipTitle: formatLongDate(point.date),
    tooltipValue: `${formatLongDate(point.date)}: ${formatAxisMoney(point.cumulativePnL)}`,
  }));
}

function EquityHelpIcon() {
  return (
    <Tooltip content={EQUITY_HELP} theme="dark" side="top" portaled>
      <span
        className="inline-flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-[var(--edge-border)] text-[9px] leading-none text-[var(--edge-text-secondary)]"
        aria-label="Equity curve help"
        tabIndex={0}
        data-testid="journal-equity-help"
      >
        i
      </span>
    </Tooltip>
  );
}

function EquityChartHeader() {
  return (
    <div className="mb-3 flex shrink-0 items-center gap-1.5 border-b border-[var(--edge-border-subtle)] pb-3">
      <h2 className="text-sm font-semibold text-[var(--edge-text-strong)]">Equity curve</h2>
      <EquityHelpIcon />
    </div>
  );
}

type Props = {
  points: EquityCurvePoint[];
};

export default function JournalEquityChart({ points }: Props) {
  if (points.length === 0) {
    return (
      <section
        data-testid="journal-equity-chart"
        className="flex h-full min-h-0 flex-col rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] p-3"
      >
        <EquityChartHeader />
        <p className="text-sm text-[var(--edge-text-secondary)]" data-testid="journal-equity-empty">
          {JOURNAL_SCOPED_EMPTY_MESSAGE}
        </p>
      </section>
    );
  }

  return (
    <section
      data-testid="journal-equity-chart"
      className="flex h-full min-h-0 flex-col rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] p-3"
    >
      <EquityChartHeader />
      <JournalPnLAreaChart
        points={toChartPoints(points)}
        testId="journal-equity"
        ariaLabel="Equity curve"
        gradientIdPrefix="equity-area"
        xStartLabel={formatShortDate(points[0]!.date)}
        xEndLabel={formatShortDate(points[points.length - 1]!.date)}
      />
    </section>
  );
}
