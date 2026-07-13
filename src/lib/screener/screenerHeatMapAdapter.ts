import type { HeatMapConfig, HeatMapItem } from "@/lib/heatmap/types";
import type { ScreenerResultRow } from "@/lib/screener/types";

const SIZE_METRIC_LABELS: Record<Exclude<HeatMapConfig["sizeBy"]["metric"], "equal">, string> = {
  marketCap: "Market cap",
  volume: "Volume",
};

export function heatMapSizeMetricCoverageWarning(
  items: HeatMapItem[],
  config: HeatMapConfig,
): string | null {
  if (config.sizeBy.metric === "equal" || items.length === 0) return null;
  const missing = items.filter(
    (item) => item.sizeValue == null || !Number.isFinite(item.sizeValue) || item.sizeValue <= 0,
  ).length;
  if (missing / items.length < 0.5) return null;
  const label = SIZE_METRIC_LABELS[config.sizeBy.metric];
  return `${label} unavailable for many symbols; try Equal size or run a fundamental screen.`;
}

function readSizeValue(row: ScreenerResultRow, metric: HeatMapConfig["sizeBy"]["metric"]): number | null {
  switch (metric) {
    case "marketCap":
      return row.marketCap;
    case "volume":
      return row.volume;
    case "equal":
      return 1;
    default:
      return null;
  }
}

function readColorValue(row: ScreenerResultRow, metric: HeatMapConfig["colorBy"]["metric"]): number | null {
  switch (metric) {
    case "changePercent":
      return row.changePercent;
    case "volume":
      return row.volume;
    case "beta":
      return row.beta;
    default:
      return null;
  }
}

export function screenerRowsToHeatMapItems(
  rows: ScreenerResultRow[],
  config: HeatMapConfig,
): HeatMapItem[] {
  return rows.map((row) => {
    const symbol = row.symbol.trim().toUpperCase();
    return {
      id: symbol,
      label: symbol,
      sizeValue: readSizeValue(row, config.sizeBy.metric),
      colorValue: readColorValue(row, config.colorBy.metric),
      groupPath: [row.sector ?? "Other", row.industry ?? "Other"],
      meta: row,
    };
  });
}

export function topHeatMapQuoteSymbols(
  rows: ScreenerResultRow[],
  config: HeatMapConfig,
  cap = 64,
): string[] {
  const items = screenerRowsToHeatMapItems(rows, config);
  const sorted = [...items].sort((a, b) => {
    const aSize = a.sizeValue ?? 0;
    const bSize = b.sizeValue ?? 0;
    return bSize - aSize;
  });
  return sorted
    .slice(0, cap)
    .map((item) => item.id)
    .filter(Boolean);
}
