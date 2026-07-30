export const SSE_COLD_FIRST_PAINT_MS = 2_000;
export const SSE_RECONNECT_FIRST_PAINT_MS = 8_000;
/** Log slow-path health event when first paint exceeds this threshold (QA-10). */
export const QUOTE_STREAM_SLOW_FIRST_PAINT_MS = 10_000;

/** Backoff base for client SSE rejoin after a blip (REST bridge stays active meanwhile). */
export const SSE_RECONNECT_BASE_MS = 2_000;
export const SSE_RECONNECT_MAX_MS = 30_000;
/** Failed rejoin attempts before sticky REST until cooldown. */
export const SSE_RECONNECT_MAX_ATTEMPTS = 5;
export const SSE_RECONNECT_COOLDOWN_MS = 60_000;

/** Pick SSE first-snapshot deadline based on whether quotes are already populated. */
export function resolveQuoteStreamFirstPaintMs(hasExistingQuotes: boolean): number {
  return hasExistingQuotes ? SSE_RECONNECT_FIRST_PAINT_MS : SSE_COLD_FIRST_PAINT_MS;
}

/** Exponential backoff for watchlist SSE rejoin (attempt is 0-based). */
export function resolveSseReconnectDelayMs(attempt: number): number {
  const cappedAttempt = Math.max(0, Math.min(attempt, 8));
  return Math.min(SSE_RECONNECT_BASE_MS * 2 ** cappedAttempt, SSE_RECONNECT_MAX_MS);
}

export const TWS_SSE_RECONNECT_BASE_MS = 1_000;
export const TWS_SSE_RECONNECT_MAX_MS = 8_000;
export const TWS_SSE_MAX_RECONNECT_ATTEMPTS = 4;

/** Backoff for server-side TWS sidecar SSE reconnect before REST poll fallback. */
export function resolveTwsSseReconnectDelayMs(attempt: number): number {
  const cappedAttempt = Math.max(0, Math.min(attempt, 4));
  return Math.min(TWS_SSE_RECONNECT_BASE_MS * 2 ** cappedAttempt, TWS_SSE_RECONNECT_MAX_MS);
}
