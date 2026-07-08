"use client";

import Link from "next/link";
import type { JournalTradeResponse } from "@/lib/persistence/schemas/journal";
import { buildChartDeepLink } from "@/lib/journal/chartDeepLink";
import { computeRMultiple } from "@/lib/journal/rMultiple";

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
  selectedTradeId: string | null;
  onSelectTrade: (tradeId: string) => void;
};

export default function JournalTradeTable({ trades, selectedTradeId, onSelectTrade }: Props) {
  if (trades.length === 0) {
    return (
      <p className="text-sm text-[var(--edge-text-secondary)]" data-testid="journal-trade-empty">
        No trades yet. Import Flex CSV history or connect IBKR for live fills.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded border border-[var(--edge-border)]" data-testid="journal-trade-table">
      <table className="min-w-full text-left text-xs">
        <thead className="bg-[var(--edge-surface-panel)] text-[var(--edge-text-secondary)]">
          <tr>
            <th className="px-3 py-2">Symbol</th>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Opened</th>
            <th className="px-3 py-2">Net P&L</th>
            <th className="px-3 py-2">R</th>
            <th className="px-3 py-2">Tags</th>
            <th className="px-3 py-2">Chart</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => (
            <tr
              key={trade.id}
              data-testid={`journal-trade-row-${trade.id}`}
              className={`border-t border-[var(--edge-border-subtle)] cursor-pointer hover:bg-[var(--edge-surface-panel)] ${
                selectedTradeId === trade.id ? "bg-[var(--edge-surface-panel)]" : ""
              }`}
              onClick={() => onSelectTrade(trade.id)}
            >
              <td className="px-3 py-2 font-medium">{trade.symbol}</td>
              <td className="px-3 py-2">{trade.secType}</td>
              <td className="px-3 py-2 capitalize">{trade.status}</td>
              <td className="px-3 py-2">{trade.openedAt.slice(0, 10)}</td>
              <td className={`px-3 py-2 ${pnlClass(trade.netPnL)}`}>{formatMoney(trade.netPnL)}</td>
              <td className="px-3 py-2">
                {(() => {
                  const r = computeRMultiple(trade);
                  return r != null ? `${r.toFixed(2)}R` : "—";
                })()}
              </td>
              <td className="px-3 py-2">{(trade.tags ?? []).join(", ") || "—"}</td>
              <td className="px-3 py-2">
                <Link
                  href={buildChartDeepLink(trade)}
                  data-testid={`journal-trade-chart-${trade.id}`}
                  className="text-[var(--edge-accent-blue)] hover:underline"
                  onClick={(event) => event.stopPropagation()}
                >
                  Open
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
