import type { AccountPosition } from "@/lib/marketData/contracts/brokerage";
import type { JournalTradeResponse } from "@/lib/persistence/schemas/journal";

export type ReconcileJournalOpensResult = {
  inSync: boolean;
  missingFromJournal: Array<{ key: string; symbol: string; quantity: number }>;
  ghostInJournal: Array<{ tradeId: string; symbol: string; netQuantity: number }>;
};

type JournalBookEntry = {
  tradeId: string;
  symbol: string;
  quantity: number;
};

function positionKey(conId: number | null | undefined, symbol: string): string {
  if (conId != null && conId > 0) return `conId:${conId}`;
  return `sym:${symbol.trim().toUpperCase()}`;
}

function livePositionSymbol(row: AccountPosition): string {
  return (
    row.contract.localSymbol?.trim() ||
    row.contract.symbol?.trim() ||
    "—"
  );
}

function livePositionKey(row: AccountPosition): string {
  return positionKey(row.contract.conId, livePositionSymbol(row));
}

function normalizeQuantity(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return 0;
  return Math.round(value * 10000) / 10000;
}

function signedJournalTradeQty(trade: JournalTradeResponse): number {
  const abs = Math.abs(normalizeQuantity(trade.netQuantity));
  return trade.direction === "short" ? -abs : abs;
}

function signedLegQty(
  legQty: number | null | undefined,
  tradeDirection: JournalTradeResponse["direction"],
): number {
  const normalized = normalizeQuantity(legQty);
  if (Math.abs(normalized) <= 0) return 0;
  if (legQty != null && legQty < 0) return normalized;
  if (legQty != null && legQty > 0) return normalized;
  return tradeDirection === "short" ? -Math.abs(normalized) : Math.abs(normalized);
}

function scopeLivePositions(
  livePositions: AccountPosition[],
  accountId: string | null | undefined,
): AccountPosition[] {
  const normalizedAccount = accountId?.trim();
  return livePositions.filter((row) => {
    const qty = normalizeQuantity(row.position);
    if (Math.abs(qty) <= 0) return false;
    if (!normalizedAccount) return true;
    return (row.account?.trim() ?? "") === normalizedAccount;
  });
}

function resolveLiveKeyForSymbolOnlyTrade(
  trade: JournalTradeResponse,
  scopedPositions: AccountPosition[],
  targetSignedQty: number,
): string {
  const tradeSymbol = trade.symbol.trim().toUpperCase();

  const symbolMatches = scopedPositions.filter((row) => {
    const sym = (row.contract.symbol?.trim() ?? "").toUpperCase();
    const local = (row.contract.localSymbol?.trim() ?? "").toUpperCase();
    return sym === tradeSymbol || local === tradeSymbol;
  });

  if (symbolMatches.length === 1) {
    return livePositionKey(symbolMatches[0]!);
  }

  if (symbolMatches.length > 1) {
    const qtyMatches = symbolMatches.filter(
      (row) => Math.abs(normalizeQuantity(row.position) - targetSignedQty) <= 0.0001,
    );
    if (qtyMatches.length === 1) {
      return livePositionKey(qtyMatches[0]!);
    }
  }

  return positionKey(null, trade.symbol);
}

function resolveJournalKeysForTrade(
  trade: JournalTradeResponse,
  scopedPositions: AccountPosition[],
): string[] {
  const legsWithConId = (trade.legs ?? []).filter(
    (leg) => leg.conId != null && leg.conId > 0,
  );

  if (legsWithConId.length > 0) {
    return [
      ...new Set(
        legsWithConId.map((leg) =>
          positionKey(leg.conId, leg.symbol?.trim() || trade.symbol),
        ),
      ),
    ];
  }

  return [
    resolveLiveKeyForSymbolOnlyTrade(
      trade,
      scopedPositions,
      signedJournalTradeQty(trade),
    ),
  ];
}

function addJournalBookContribution(
  book: Map<string, JournalBookEntry>,
  key: string,
  trade: JournalTradeResponse,
  quantity: number,
): void {
  const existing = book.get(key);
  if (existing) {
    existing.quantity += quantity;
    return;
  }

  book.set(key, {
    tradeId: trade.id,
    symbol: trade.symbol,
    quantity,
  });
}

function buildJournalBook(
  openTrades: JournalTradeResponse[],
  scopedPositions: AccountPosition[],
): Map<string, JournalBookEntry> {
  const journalBook = new Map<string, JournalBookEntry>();

  for (const trade of openTrades) {
    if (trade.status !== "open") continue;

    const legsWithConId = (trade.legs ?? []).filter(
      (leg) => leg.conId != null && leg.conId > 0,
    );

    if (legsWithConId.length > 0) {
      const legTotals = new Map<number, number>();
      for (const leg of legsWithConId) {
        const conId = leg.conId!;
        let qty = signedLegQty(leg.netQuantity, trade.direction);
        if (Math.abs(qty) <= 0 && legsWithConId.length === 1) {
          qty = signedJournalTradeQty(trade);
        }
        if (Math.abs(qty) <= 0) continue;
        legTotals.set(conId, (legTotals.get(conId) ?? 0) + qty);
      }

      for (const [conId, qty] of legTotals) {
        const leg = legsWithConId.find((row) => row.conId === conId);
        const symbol = leg?.symbol?.trim() || trade.symbol;
        addJournalBookContribution(
          journalBook,
          positionKey(conId, symbol),
          trade,
          qty,
        );
      }
      continue;
    }

    const signedQty = signedJournalTradeQty(trade);
    const key = resolveLiveKeyForSymbolOnlyTrade(trade, scopedPositions, signedQty);
    addJournalBookContribution(journalBook, key, trade, signedQty);
  }

  return journalBook;
}

function buildLiveBook(
  scopedPositions: AccountPosition[],
): Map<string, { symbol: string; quantity: number }> {
  const liveBook = new Map<string, { symbol: string; quantity: number }>();

  for (const row of scopedPositions) {
    const symbol = livePositionSymbol(row);
    const key = livePositionKey(row);
    const existing = liveBook.get(key);
    const qty = normalizeQuantity(row.position);
    if (existing) {
      existing.quantity += qty;
    } else {
      liveBook.set(key, { symbol, quantity: qty });
    }
  }

  return liveBook;
}

function quantitiesMatch(a: number, b: number): boolean {
  return Math.abs(a - b) <= 0.0001;
}

/** Resolve a journal open trade to its live IB position row (conId-first, symbol fallback). */
export function lookupLivePosition(
  trade: JournalTradeResponse,
  livePositions: AccountPosition[],
  accountId: string | null | undefined,
): AccountPosition | null {
  const scoped = scopeLivePositions(livePositions, accountId);
  const keys = resolveJournalKeysForTrade(trade, scoped);
  const matches = scoped.filter((row) => keys.includes(livePositionKey(row)));

  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0]!;

  const unrealizedPNL = matches.reduce((sum, row) => {
    const value = row.unrealizedPNL;
    return sum + (value != null && Number.isFinite(value) ? value : 0);
  }, 0);

  return {
    ...matches[0]!,
    unrealizedPNL,
  };
}

/** Mark-to-market unrealized PnL for an open trade from the live account book. */
export function resolveLiveUnrealizedPnL(
  trade: JournalTradeResponse,
  livePositions: AccountPosition[],
  accountId: string | null | undefined,
): number | null {
  const position = lookupLivePosition(trade, livePositions, accountId);
  const pnl = position?.unrealizedPNL;
  if (pnl == null || !Number.isFinite(pnl)) return null;
  return pnl;
}

/** Compare journal open trades to live IB positions for one account. */
export function reconcileJournalOpensWithPositions(
  openTrades: JournalTradeResponse[],
  livePositions: AccountPosition[],
  accountId: string | null | undefined,
): ReconcileJournalOpensResult {
  const scopedPositions = scopeLivePositions(livePositions, accountId);
  const liveBook = buildLiveBook(scopedPositions);
  const journalBook = buildJournalBook(openTrades, scopedPositions);

  const missingFromJournal: ReconcileJournalOpensResult["missingFromJournal"] = [];
  for (const [key, live] of liveBook) {
    const journal = journalBook.get(key);
    if (!journal || !quantitiesMatch(journal.quantity, live.quantity)) {
      missingFromJournal.push({ key, symbol: live.symbol, quantity: live.quantity });
    }
  }

  const ghostInJournal: ReconcileJournalOpensResult["ghostInJournal"] = [];
  for (const [key, journal] of journalBook) {
    const live = liveBook.get(key);
    if (!live || !quantitiesMatch(live.quantity, journal.quantity)) {
      ghostInJournal.push({
        tradeId: journal.tradeId,
        symbol: journal.symbol,
        netQuantity: Math.abs(journal.quantity),
      });
    }
  }

  return {
    inSync: missingFromJournal.length === 0 && ghostInJournal.length === 0,
    missingFromJournal,
    ghostInJournal,
  };
}
