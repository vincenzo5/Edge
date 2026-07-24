import type { Candle, Interval, Range } from "@edge/chart-core";
import type { ChartType } from "@/lib/chartConfig";
import { formatPrice, formatVolume } from "@edge/chart-core";
import {
  CHART_TYPE_MENU,
  intervalShortLabel,
} from "@/lib/chart/chartHeaderMetadata";
import { rangePresetLabel } from "@/lib/chart/rangePresets";
import {
  resolveChartTimeZone,
  type ChartTimeZone,
} from "@/lib/chart/timeZone";

export type ChartCopyItem = {
  id: string;
  label: string;
  value: string;
};

export type BuildChartCopyItemsInput = {
  valueLabel: string | null;
  timestamp: number | null;
  dataIndex: number | null;
  candles: Candle[];
  symbol: string;
  exchange?: string;
  interval: Interval;
  range: Range;
  rangePreset?: Range | null;
  chartType: ChartType;
  timeZone: ChartTimeZone;
};

const DAILY_INTERVALS = new Set<Interval>(["1d", "1wk", "1mo"]);

function chartTypeLabel(chartType: ChartType): string {
  return (
    CHART_TYPE_MENU.find((item) => item.chartType === chartType)?.label ??
    chartType
  );
}

function rangeLabel(range: Range, rangePreset?: Range | null): string {
  const active = rangePreset ?? range;
  return rangePresetLabel(active);
}

function resolveCandle(
  candles: Candle[],
  dataIndex: number | null,
  timestamp: number | null,
): Candle | null {
  if (
    dataIndex != null &&
    dataIndex >= 0 &&
    dataIndex < candles.length
  ) {
    return candles[dataIndex] ?? null;
  }
  if (timestamp != null) {
    const match = candles.find((c) => c.t === timestamp);
    if (match) return match;
  }
  return null;
}

function formatCopyDateTime(
  timestamp: number,
  interval: Interval,
  timeZone: ChartTimeZone,
  exchange?: string,
): string {
  const iana = resolveChartTimeZone(timeZone, exchange);
  const date = new Date(timestamp);
  if (DAILY_INTERVALS.has(interval)) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: iana,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: iana,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(",", "");
}

function formatOhlc(candle: Candle): string {
  return `O ${formatPrice(candle.o)} H ${formatPrice(candle.h)} L ${formatPrice(candle.l)} C ${formatPrice(candle.c)}`;
}

function formatSymbolExchange(symbol: string, exchange?: string): string {
  return exchange ? `${exchange}:${symbol}` : symbol;
}

function formatCandleSummary(
  input: BuildChartCopyItemsInput,
  candle: Candle,
): string {
  const date = formatCopyDateTime(
    candle.t,
    input.interval,
    input.timeZone,
    input.exchange,
  );
  const parts = [
    formatSymbolExchange(input.symbol, input.exchange),
    intervalShortLabel(input.interval),
    date,
    formatOhlc(candle),
  ];
  if (candle.v != null && Number.isFinite(candle.v)) {
    parts.push(`V ${formatVolume(candle.v)}`);
  }
  return parts.join(" ");
}

function formatChartContext(input: BuildChartCopyItemsInput): string {
  const symbolPart = formatSymbolExchange(input.symbol, input.exchange);
  const rangePart = rangeLabel(input.range, input.rangePreset);
  const typePart = chartTypeLabel(input.chartType);
  return `${symbolPart} · ${intervalShortLabel(input.interval)} · ${rangePart} · ${typePart}`;
}

function pushItem(
  items: ChartCopyItem[],
  id: string,
  label: string,
  value: string,
): void {
  if (!value.trim()) return;
  items.push({ id, label, value });
}

/** Build copy-menu entries from crosshair and chart state. */
export function buildChartCopyItems(
  input: BuildChartCopyItemsInput,
): ChartCopyItem[] {
  const items: ChartCopyItem[] = [];
  const candle = resolveCandle(
    input.candles,
    input.dataIndex,
    input.timestamp,
  );

  if (input.valueLabel) {
    pushItem(items, "price", "Price", input.valueLabel);
  }

  const timestamp = input.timestamp ?? candle?.t ?? null;
  if (timestamp != null) {
    const formatted = formatCopyDateTime(
      timestamp,
      input.interval,
      input.timeZone,
      input.exchange,
    );
    pushItem(items, "date-time", "Date/time", formatted);
  }

  if (candle) {
    pushItem(items, "ohlc", "OHLC", formatOhlc(candle));
    if (candle.v != null && Number.isFinite(candle.v)) {
      pushItem(items, "volume", "Volume", formatVolume(candle.v));
    }
    pushItem(
      items,
      "candle-data",
      "Candle data",
      formatCandleSummary(input, candle),
    );
  }

  pushItem(items, "symbol", "Symbol", input.symbol);

  if (input.exchange) {
    pushItem(
      items,
      "symbol-exchange",
      "Symbol + exchange",
      formatSymbolExchange(input.symbol, input.exchange),
    );
  }

  pushItem(items, "chart-context", "Chart context", formatChartContext(input));

  return items;
}
