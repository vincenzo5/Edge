import type { AccountPosition, AccountSummary } from "@/lib/marketData/contracts/brokerage";
import type { OrderDraft } from "./types";
import { TradingValidationError } from "./validateOrder";

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function longPositionForSymbol(
  positions: AccountPosition[],
  symbol: string,
): number {
  const target = normalizeSymbol(symbol);
  let total = 0;
  for (const row of positions) {
    const rowSymbol = row.contract?.symbol;
    if (!rowSymbol || normalizeSymbol(rowSymbol) !== target) continue;
    const qty = row.position ?? 0;
    if (qty > 0) total += qty;
  }
  return total;
}

/** Hard block uncovered short sales (flat or short). */
export function assertCoveredSell(
  draft: OrderDraft,
  positions: AccountPosition[],
): void {
  if (draft.side !== "SELL") return;
  const held = longPositionForSymbol(positions, draft.symbol);
  if (draft.quantity > held) {
    throw new TradingValidationError(
      `SELL ${draft.quantity} ${normalizeSymbol(draft.symbol)} exceeds long position (${held}); uncovered short sales are blocked.`,
    );
  }
}

/** Soft PDT warning — non-blocking on paper. */
export function pdtWarnings(summary: AccountSummary | null): string[] {
  if (!summary) return [];
  const tag = summary.tags.DayTradesRemaining;
  if (!tag?.value) return [];
  const remaining = Number(tag.value);
  if (!Number.isFinite(remaining) || remaining > 0) return [];
  return [
    "Pattern day trader: DayTradesRemaining is 0 — additional day trades may be restricted.",
  ];
}
