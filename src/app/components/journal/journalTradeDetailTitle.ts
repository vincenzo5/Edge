import {
  formatTradeCloseTime,
  formatTradeListDate,
} from "@/lib/journal/journalTradeDisplay";
import type { JournalTradeResponse } from "@/lib/persistence/schemas/journal";

const TRADE_DETAIL_TIME_ZONE = "America/New_York";

export function journalTradeDetailAriaLabel(trade: JournalTradeResponse): string {
  return `${trade.symbol} ${trade.secType} ${trade.status} trade`;
}

export function journalTradeDetailSubtitle(trade: JournalTradeResponse): string {
  const opened = formatTradeDetailTimestamp(trade.openedAt);
  if (!trade.closedAt) return `Opened ${opened}`;
  return `Opened ${opened} · Closed ${formatTradeDetailTimestamp(trade.closedAt)}`;
}

function formatTradeDetailTimestamp(iso: string): string {
  const date = formatTradeListDate(iso);
  const time = formatTradeCloseTime(iso, TRADE_DETAIL_TIME_ZONE);
  return `${date} ${time} ET`;
}

export function journalTradeDetailTitleText(trade: JournalTradeResponse): string {
  return `${trade.symbol} · ${trade.secType} · ${trade.status}`;
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
