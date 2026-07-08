"use client";

import type { TradeOutcomeStatus } from "@/lib/journal/journalTradeDisplay";
import { tradeOutcomeLabel } from "@/lib/journal/journalTradeDisplay";

const STATUS_CLASS: Record<TradeOutcomeStatus, string> = {
  open: "bg-[var(--edge-accent-blue)]/20 text-[var(--edge-accent-blue)]",
  win: "bg-[var(--edge-positive)]/15 text-[var(--edge-positive)]",
  loss: "bg-[var(--edge-negative)]/15 text-[var(--edge-negative)]",
  breakeven: "bg-[var(--edge-surface-hover)] text-[var(--edge-text-secondary)]",
};

type Props = {
  status: TradeOutcomeStatus;
};

export default function JournalTradeStatusBadge({ status }: Props) {
  return (
    <span
      data-testid={`journal-trade-status-${status}`}
      className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_CLASS[status]}`}
    >
      {tradeOutcomeLabel(status)}
    </span>
  );
}
