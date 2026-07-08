import type { JournalTradeResponse } from "@/lib/persistence/schemas/journal";

export function journalTradeDetailTitle(trade: JournalTradeResponse): {
  title: string;
  subtitle: string;
} {
  const title = `${trade.symbol} · ${trade.secType} · ${trade.status}`;
  const subtitle = `Opened ${trade.openedAt.slice(0, 19)}${
    trade.closedAt ? ` · Closed ${trade.closedAt.slice(0, 19)}` : ""
  }`;
  return { title, subtitle };
}
