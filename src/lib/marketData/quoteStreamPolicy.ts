export const SSE_COLD_FIRST_PAINT_MS = 2_000;
export const SSE_RECONNECT_FIRST_PAINT_MS = 8_000;

/** Pick SSE first-snapshot deadline based on whether quotes are already populated. */
export function resolveQuoteStreamFirstPaintMs(hasExistingQuotes: boolean): number {
  return hasExistingQuotes ? SSE_RECONNECT_FIRST_PAINT_MS : SSE_COLD_FIRST_PAINT_MS;
}
