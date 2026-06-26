/** Server-side flag for including phase metadata in API responses and service traces. */
export function isMarketDataPerfEnabled(): boolean {
  if (process.env.MARKET_DATA_PERF === "1") return true;
  if (process.env.MARKET_DATA_PERF === "0") return false;
  return process.env.NODE_ENV === "development";
}
