"use client";

import { EdgeEmptyState } from "@/app/components/design-system";
import {
  JOURNAL_LIST_CARD_EMPTY_HINT,
  JOURNAL_LIST_CARD_EMPTY_MESSAGES,
} from "@/lib/journal/journalEmptyCopy";
import {
  formatTradeListDate,
  formatTradeMoney,
  formatTradePrice,
  pnlToneClass,
} from "@/lib/journal/journalTradeDisplay";
import type { JournalTradeResponse } from "@/lib/persistence/schemas/journal";

export type JournalTradeListCardVariant = "recent" | "open";

type Props = {
  title: string;
  testId: string;
  variant: JournalTradeListCardVariant;
  trades: JournalTradeResponse[];
  onSelectTrade: (tradeId: string) => void;
};

const EMPTY_MESSAGES = JOURNAL_LIST_CARD_EMPTY_MESSAGES;

const COLUMN_HEADERS: Record<JournalTradeListCardVariant, [string, string, string]> = {
  recent: ["Close Date", "Symbol", "Net P&L"],
  open: ["Open Date", "Symbol", "Entry"],
};

export default function JournalTradeListCard({
  title,
  testId,
  variant,
  trades,
  onSelectTrade,
}: Props) {
  const [dateLabel, symbolLabel, valueLabel] = COLUMN_HEADERS[variant];

  return (
    <section
      data-testid={testId}
      className="flex h-full min-h-0 flex-col rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)]"
    >
      <div className="shrink-0 border-b border-[var(--edge-border-subtle)] px-3 pt-3">
        <h2
          className={`inline-block pb-2 text-sm font-semibold text-[var(--edge-text-strong)] ${
            variant === "open" ? "border-b-2 border-[var(--edge-accent-blue)]" : ""
          }`}
        >
          {title}
        </h2>
      </div>

      <div className="grid shrink-0 grid-cols-3 gap-2 border-b border-[var(--edge-border-subtle)] bg-[var(--edge-surface-hover)] px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-[var(--edge-text-secondary)]">
        <span>{dateLabel}</span>
        <span>{symbolLabel}</span>
        <span className="text-right">{valueLabel}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto" style={{ maxHeight: "20rem" }}>
        {trades.length === 0 ? (
          <EdgeEmptyState
            message={EMPTY_MESSAGES[variant]}
            action={
              <span className="text-xs text-[var(--edge-text-secondary)]">
                {JOURNAL_LIST_CARD_EMPTY_HINT}
              </span>
            }
          />
        ) : (
          <ul>
            {trades.map((trade) => (
              <li key={trade.id}>
                <button
                  type="button"
                  data-testid={`${testId}-row-${trade.id}`}
                  className="grid w-full grid-cols-3 gap-2 border-b border-[var(--edge-border-subtle)] px-3 py-2.5 text-left text-xs hover:bg-[var(--edge-surface-hover)]"
                  onClick={() => onSelectTrade(trade.id)}
                >
                  <span className="text-[var(--edge-text-primary)]">
                    {variant === "recent"
                      ? formatTradeListDate(trade.closedAt)
                      : formatTradeListDate(trade.openedAt)}
                  </span>
                  <span className="font-medium text-[var(--edge-text-strong)]">{trade.symbol}</span>
                  <span
                    className={`text-right font-medium tabular-nums ${
                      variant === "recent"
                        ? pnlToneClass(trade.netPnL)
                        : "text-[var(--edge-text-primary)]"
                    }`}
                  >
                    {variant === "recent"
                      ? formatTradeMoney(trade.netPnL)
                      : formatTradePrice(trade.avgEntry)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
