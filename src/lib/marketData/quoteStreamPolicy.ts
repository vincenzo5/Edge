export const SSE_COLD_FIRST_PAINT_MS = 2_000;
export const SSE_RECONNECT_FIRST_PAINT_MS = 8_000;
/** Log slow-path health event when first paint exceeds this threshold (QA-10). */
export const QUOTE_STREAM_SLOW_FIRST_PAINT_MS = 10_000;

/** Pick SSE first-snapshot deadline based on whether quotes are already populated. */
export function resolveQuoteStreamFirstPaintMs(hasExistingQuotes: boolean): number {
  return hasExistingQuotes ? SSE_RECONNECT_FIRST_PAINT_MS : SSE_COLD_FIRST_PAINT_MS;
}
