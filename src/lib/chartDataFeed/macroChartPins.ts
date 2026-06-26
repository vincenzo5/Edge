/** Benchmark/index symbols that show macro event pins by default. */
const BENCHMARK_INDEX_SYMBOLS = new Set([
  "SPY",
  "QQQ",
  "DIA",
  "IWM",
  "VTI",
  "VOO",
  "IVV",
  "SPX",
  "NDX",
  "DJI",
  "^GSPC",
  "^SPX",
  "^IXIC",
  "^NDX",
  "^DJI",
  "^RUT",
]);

export function shouldIncludeMacroChartEvents(symbol: string): boolean {
  return BENCHMARK_INDEX_SYMBOLS.has(symbol.trim().toUpperCase());
}
