"use client";

import type { JournalTradeResponse } from "@/lib/persistence/schemas/journal";
import { computeRMultiple } from "@/lib/journal/rMultiple";
import {
  formatDirectionLabel,
  formatInstrumentLabel,
  formatNetRoi,
  formatTradeCloseTime,
} from "@/lib/journal/journalTradeDisplay";

function formatMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function pnlClass(value: number | null | undefined): string {
  if (value == null || value === 0) return "";
  return value > 0 ? "text-[var(--edge-positive)]" : "text-[var(--edge-negative)]";
}

type Props = {
  trades: JournalTradeResponse[];
  onSelectTrade: (tradeId: string) => void;
};

export default function JournalDayTradesTable({ trades, onSelectTrade }: Props) {
  if (trades.length === 0) {
    return (
      <p
        className="px-1 py-6 text-center text-sm text-[var(--edge-text-secondary)]"
        data-testid="journal-day-trades-empty"
      >
        No closed trades on this day.
      </p>
    );
  }

  return (
    <div
      className="overflow-x-auto rounded border border-[var(--edge-border-subtle)] bg-[var(--edge-surface-panel)]"
      data-testid="journal-day-trades-table"
    >
      <table className="min-w-full text-left text-xs">
        <thead className="text-[var(--edge-text-secondary)]">
          <tr className="border-b border-[var(--edge-border-subtle)]">
            <th className="px-3 py-2 font-medium">Open time</th>
            <th className="px-3 py-2 font-medium">Ticker</th>
            <th className="px-3 py-2 font-medium">Side</th>
            <th className="px-3 py-2 font-medium">Instrument</th>
            <th className="px-3 py-2 font-medium">Net P&L</th>
            <th className="px-3 py-2 font-medium">Net ROI</th>
            <th className="px-3 py-2 font-medium">Realized R-Multiple</th>
            <th className="px-3 py-2 font-medium">Strategy</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => {
            const r = computeRMultiple(trade);
            return (
              <tr
                key={trade.id}
                data-testid={`journal-day-trades-row-${trade.id}`}
                className="cursor-pointer border-t border-[var(--edge-border-subtle)] hover:bg-[var(--edge-surface-hover)]"
                onClick={() => onSelectTrade(trade.id)}
              >
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className="text-[var(--edge-text-secondary)]">(Closed)</span>{" "}
                  {trade.closedAt ? formatTradeCloseTime(trade.closedAt) : "—"}
                </td>
                <td className="px-3 py-2">
                  <span className="inline-flex rounded bg-[var(--edge-surface-hover)] px-2 py-0.5 text-[10px] font-medium text-[var(--edge-text-strong)]">
                    {trade.symbol}
                  </span>
                </td>
                <td className="px-3 py-2 font-medium">{formatDirectionLabel(trade.direction)}</td>
                <td className="px-3 py-2">{formatInstrumentLabel(trade)}</td>
                <td className={`px-3 py-2 font-medium ${pnlClass(trade.netPnL)}`}>
                  {formatMoney(trade.netPnL)}
                </td>
                <td className={`px-3 py-2 ${pnlClass(trade.netPnL)}`}>{formatNetRoi(trade)}</td>
                <td className="px-3 py-2">{r != null ? r.toFixed(2) : "—"}</td>
                <td className="px-3 py-2">
                  {trade.setup ? (
                    <span className="inline-flex rounded bg-[color-mix(in_srgb,var(--edge-accent-blue)_18%,transparent)] px-2 py-0.5 text-[10px] font-medium capitalize text-[var(--edge-accent-blue)]">
                      {trade.setup}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
