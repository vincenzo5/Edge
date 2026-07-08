"use client";

import { useState } from "react";
import { JOURNAL_SCOPED_EMPTY_MESSAGE } from "@/lib/journal/journalEmptyCopy";
import type { BreakdownRow } from "@/lib/journal/journalStats";

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
  setupRows: BreakdownRow[];
  tagRows: BreakdownRow[];
};

export default function JournalBreakdownReport({ setupRows, tagRows }: Props) {
  const [tab, setTab] = useState<"setup" | "tag">("setup");
  const rows = tab === "setup" ? setupRows : tagRows;

  return (
    <section
      data-testid="journal-breakdown-report"
      className="rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] p-3"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[var(--edge-text-strong)]">Breakdown</h2>
        <div className="flex gap-1">
          <TabButton active={tab === "setup"} onClick={() => setTab("setup")} testId="journal-breakdown-setup">
            Setup
          </TabButton>
          <TabButton active={tab === "tag"} onClick={() => setTab("tag")} testId="journal-breakdown-tags">
            Tags
          </TabButton>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-[var(--edge-text-secondary)]" data-testid="journal-breakdown-empty">
          {JOURNAL_SCOPED_EMPTY_MESSAGE}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="text-[var(--edge-text-secondary)]">
              <tr>
                <th className="px-2 py-1">Bucket</th>
                <th className="px-2 py-1">Trades</th>
                <th className="px-2 py-1">Win rate</th>
                <th className="px-2 py-1">Net P&L</th>
                <th className="px-2 py-1">Profit factor</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.bucket} data-testid={`journal-breakdown-row-${row.bucket}`} className="border-t border-[var(--edge-border-subtle)]">
                  <td className="px-2 py-1 font-medium">{row.bucket}</td>
                  <td className="px-2 py-1">{row.tradeCount}</td>
                  <td className="px-2 py-1">{formatPercent(row.winRate)}</td>
                  <td className="px-2 py-1">{formatMoney(row.netPnL)}</td>
                  <td className="px-2 py-1">{row.profitFactor?.toFixed(2) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function TabButton({
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
