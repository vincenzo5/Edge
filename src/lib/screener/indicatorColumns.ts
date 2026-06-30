import type { ScreenerIndicatorColumnDef, ScreenerResultRow } from "./types";

export function deriveIndicatorColumnsFromValues(
  rows: ScreenerResultRow[],
  indicatorValues?: Record<string, Record<string, number>>,
): ScreenerIndicatorColumnDef[] {
  if (!indicatorValues) return [];
  const keys = new Set<string>();
  for (const row of rows) {
    const metrics = indicatorValues[row.symbol.trim().toUpperCase()];
    if (!metrics) continue;
    for (const key of Object.keys(metrics)) keys.add(key);
  }
  return [...keys].sort().map((key) => ({ key, label: key }));
}

export function firstIndicatorSortKey(
  rows: ScreenerResultRow[],
  indicatorValues?: Record<string, Record<string, number>>,
): string | null {
  const columns = deriveIndicatorColumnsFromValues(rows, indicatorValues);
  return columns[0]?.key ?? null;
}
