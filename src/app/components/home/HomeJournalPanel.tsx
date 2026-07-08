"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchJournalTrades } from "@/lib/persistence/client/journalClient";
import type { JournalTradeResponse } from "@/lib/persistence/schemas/journal";
import { EdgeEmptyState, EdgePanelHeader, EdgeSpinner } from "../design-system";

const MAX_TRADES = 5;

function formatMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function HomeJournalPanel() {
  const [trades, setTrades] = useState<JournalTradeResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetchJournalTrades().then((result) => {
      if (cancelled) return;
      setTrades(result.slice(0, MAX_TRADES));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      data-testid="home-journal-panel"
      className="flex h-full min-h-0 flex-col rounded-[var(--edge-radius-md)] border border-[var(--edge-border)] bg-[var(--edge-surface-panel)]"
    >
      <EdgePanelHeader
        title="Journal"
        actions={
          <Link
            href="/journal"
            data-testid="home-journal-open"
            className="text-xs text-[var(--edge-accent-blue)] hover:underline"
          >
            Open
          </Link>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <EdgeSpinner size="sm" />
          </div>
        ) : trades.length === 0 ? (
          <EdgeEmptyState message="No trades yet. Import Flex CSV or sync live IBKR fills." />
        ) : (
          <ul className="space-y-2">
            {trades.map((trade) => (
              <li
                key={trade.id}
                className="rounded-[var(--edge-radius-sm)] border border-[var(--edge-border-subtle)] px-3 py-2"
              >
                <div className="text-sm font-medium text-[var(--edge-text-strong)]">
                  {trade.symbol} · {trade.secType}
                </div>
                <div className="text-xs text-[var(--edge-text-secondary)]">
                  {trade.closedAt?.slice(0, 10) ?? trade.openedAt.slice(0, 10)} ·{" "}
                  <span className="capitalize">{trade.status}</span>
                  {trade.status === "closed" ? ` · ${formatMoney(trade.netPnL)}` : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
