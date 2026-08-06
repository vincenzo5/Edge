import { formatTradeHeaderStatus, formatTradeListDate } from "@/lib/journal/journalTradeDisplay";
import type { JournalTradeResponse } from "@/lib/persistence/schemas/journal";

export function journalTradeDetailAriaLabel(trade: JournalTradeResponse): string {
  const status = formatTradeHeaderStatus(trade);
  const pnlPart = status.pnl ? ` ${status.pnl}` : "";
  return `${trade.symbol} ${status.label}${pnlPart} ${trade.direction} trade`;
}

export function journalTradeDetailSubtitle(trade: JournalTradeResponse): string {
  const opened = formatTradeListDate(trade.openedAt);
  if (!trade.closedAt) return `Opened ${opened}`;
  return `Opened ${opened} · Closed ${formatTradeListDate(trade.closedAt)}`;
}

export function journalTradeDetailTitleText(trade: JournalTradeResponse): string {
  const status = formatTradeHeaderStatus(trade);
  const pnlPart = status.pnl ? ` · ${status.pnl}` : "";
  return `${trade.symbol} · ${status.label}${pnlPart}`;
}

export function journalTradeDetailTitle(trade: JournalTradeResponse): {
  title: string;
  subtitle: string;
} {
  return {
    title: journalTradeDetailTitleText(trade),
    subtitle: journalTradeDetailSubtitle(trade),
  };
}
