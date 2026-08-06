"use client";

import { useMemo } from "react";
import { usePersistedJournalComparePreset } from "@/app/components/journal/useJournalUiState";
import {
  buildComparePresetSlices,
  computeCompareReport,
  type ComparePresetId,
  type CompareReportResult,
  type JournalReportTradeInput,
} from "@/lib/journal/journalStats";
import { JOURNAL_SCOPED_EMPTY_MESSAGE } from "@/lib/journal/journalEmptyCopy";

function formatMoney(value: number): string {
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercent(value: number | null): string {
  if (value == null) return "—";
  return `${Math.round(value * 1000) / 10}%`;
}

type Props = {
  baseTrades: JournalReportTradeInput[];
};

const PRESETS: { id: ComparePresetId; label: string }[] = [
  { id: "wins_vs_losses", label: "Wins vs losses" },
  { id: "last30_vs_prior30", label: "Last 30d vs prior" },
  { id: "high_vs_low_rating", label: "High vs low rating" },
];

export default function JournalCompareReport({ baseTrades }: Props) {
  const { comparePreset: preset, setComparePreset: setPreset } = usePersistedJournalComparePreset();

  const report: CompareReportResult = useMemo(() => {
    const { sliceA, sliceB, labelA, labelB } = buildComparePresetSlices(preset);
    return computeCompareReport(baseTrades, sliceA, sliceB, { a: labelA, b: labelB });
  }, [baseTrades, preset]);

  const empty = report.sliceA.tradeCount === 0 && report.sliceB.tradeCount === 0;

  return (
    <section
      data-testid="journal-compare-report"
      className="rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] p-3"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[var(--edge-text-strong)]">Compare</h2>
        <div className="flex flex-wrap gap-1">
          {PRESETS.map((item) => (
            <PresetButton
              key={item.id}
              active={preset === item.id}
              testId={`journal-compare-preset-${item.id}`}
              onClick={() => setPreset(item.id)}
            >
              {item.label}
            </PresetButton>
          ))}
        </div>
      </div>

      {empty ? (
        <p className="text-sm text-[var(--edge-text-secondary)]" data-testid="journal-compare-empty">
          {JOURNAL_SCOPED_EMPTY_MESSAGE}
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <CompareColumn slice={report.sliceA} testId="journal-compare-a" />
          <CompareColumn slice={report.sliceB} testId="journal-compare-b" />
        </div>
      )}
    </section>
  );
}

function CompareColumn({
  slice,
  testId,
}: {
  slice: CompareReportResult["sliceA"];
  testId: string;
}) {
  return (
    <div
      data-testid={testId}
      className="rounded border border-[var(--edge-border-subtle)] bg-[var(--edge-surface-elevated)] p-3"
    >
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--edge-text-secondary)]">
        {slice.label}
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <Metric label="Trades" value={String(slice.tradeCount)} />
        <Metric label="Win rate" value={formatPercent(slice.stats.winRate)} />
        <Metric label="Net P&L" value={formatMoney(slice.stats.netPnL)} />
        <Metric
          label="Profit factor"
          value={slice.stats.profitFactor?.toFixed(2) ?? "—"}
        />
        <Metric label="Avg win" value={slice.stats.avgWin != null ? formatMoney(slice.stats.avgWin) : "—"} />
        <Metric label="Avg loss" value={slice.stats.avgLoss != null ? formatMoney(slice.stats.avgLoss) : "—"} />
        <Metric
          label="Avg R"
          value={slice.avgR != null ? `${slice.avgR.toFixed(2)}R` : "—"}
        />
        <Metric label="Trades w/ R" value={String(slice.tradeCountWithR)} />
      </dl>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[var(--edge-text-secondary)]">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums text-[var(--edge-text-strong)]">{value}</dd>
    </div>
  );
}

function PresetButton({
  active,
  onClick,
  testId,
  children,
}: {
  active: boolean;
  onClick: () => void;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      className={`rounded px-2 py-1 text-xs ${
        active
          ? "bg-[var(--edge-accent-blue)] text-white"
          : "border border-[var(--edge-border)] text-[var(--edge-text-secondary)]"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
