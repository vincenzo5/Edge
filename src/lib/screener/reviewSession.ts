import type { ScreenerResultRow } from "@/lib/screener/types";
import type { ScreenerSessionState } from "@/lib/screener/screenerSession";

export const REVIEW_KEEPERS_WATCHLIST_NAME = "Keepers";

export type ReviewProgress = {
  current: number;
  total: number;
  label: string;
};

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function clampReviewIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(index, total - 1));
}

function addUniqueSymbol(symbols: string[], symbol: string): string[] {
  const normalized = normalizeSymbol(symbol);
  if (!normalized || symbols.includes(normalized)) return symbols;
  return [...symbols, normalized];
}

export function reviewProgress(index: number, total: number): ReviewProgress {
  const safeTotal = Math.max(0, total);
  const current = safeTotal === 0 ? 0 : Math.min(index + 1, safeTotal);
  return {
    current,
    total: safeTotal,
    label: safeTotal === 0 ? "0 / 0" : `${current} / ${safeTotal}`,
  };
}

export function getReviewSymbol(
  rows: ScreenerResultRow[],
  index: number,
): ScreenerResultRow | null {
  if (index < 0 || index >= rows.length) return null;
  return rows[index] ?? null;
}

export function advanceReview(
  session: ScreenerSessionState,
  rows: ScreenerResultRow[],
  delta: 1 | -1,
): ScreenerSessionState {
  return {
    ...session,
    reviewIndex: clampReviewIndex(session.reviewIndex + delta, rows.length),
  };
}

export function keepCurrent(
  session: ScreenerSessionState,
  rows: ScreenerResultRow[],
): ScreenerSessionState {
  const row = getReviewSymbol(rows, session.reviewIndex);
  if (!row) return session;

  return {
    ...session,
    keepers: addUniqueSymbol(session.keepers, row.symbol),
    reviewIndex: clampReviewIndex(session.reviewIndex + 1, rows.length),
  };
}

export function skipCurrent(
  session: ScreenerSessionState,
  rows: ScreenerResultRow[],
): ScreenerSessionState {
  const row = getReviewSymbol(rows, session.reviewIndex);
  if (!row) return session;

  return {
    ...session,
    skipped: addUniqueSymbol(session.skipped, row.symbol),
    reviewIndex: clampReviewIndex(session.reviewIndex + 1, rows.length),
  };
}

export function jumpToSymbol(
  session: ScreenerSessionState,
  rows: ScreenerResultRow[],
  symbol: string,
): ScreenerSessionState {
  const normalized = normalizeSymbol(symbol);
  const index = rows.findIndex((row) => normalizeSymbol(row.symbol) === normalized);
  if (index < 0) return session;

  return {
    ...session,
    reviewIndex: index,
  };
}

export function startReview(session: ScreenerSessionState): ScreenerSessionState {
  return {
    ...session,
    reviewActive: true,
    reviewIndex: 0,
  };
}

export function clearReviewSession(session: ScreenerSessionState): ScreenerSessionState {
  return {
    ...session,
    reviewActive: false,
    reviewIndex: 0,
    keepers: [],
    skipped: [],
  };
}
