/** Client + build-time flag for market data latency telemetry. */
export function isMarketDataTelemetryEnabled(): boolean {
  const flag =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_MARKET_DATA_TELEMETRY
      : undefined;
  if (flag === "1") return true;
  if (flag === "0") return false;
  return typeof process !== "undefined" && process.env.NODE_ENV === "development";
}
