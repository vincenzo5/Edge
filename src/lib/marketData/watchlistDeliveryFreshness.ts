import { classifyUsEquitySession, type MarketSessionKind } from "@edge/chart-core";

/** Poll interval while US equity session is open (pre/regular/post). */
export const WATCHLIST_REST_POLL_OPEN_MS = 15_000;

/** Poll interval while US equity session is closed (nights/weekends). */
export const WATCHLIST_REST_POLL_CLOSED_MS = 30_000;

export function resolveWatchlistRestPollIntervalMs(
  session: MarketSessionKind = classifyUsEquitySession(),
): number {
  return session === "closed" ? WATCHLIST_REST_POLL_CLOSED_MS : WATCHLIST_REST_POLL_OPEN_MS;
}

/** Neutral closed-market copy when delivery is healthy. */
export function closedMarketHealthySubtitle(): string {
  return "Market closed · quotes current";
}
