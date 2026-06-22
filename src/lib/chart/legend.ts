import type { Candle, IndicatorConfig, Interval, Theme } from './contracts';
import { formatChange, formatPrice, formatVolume } from './format';
import { INTERVALS } from '../chartConfig';
import { IndicatorRegistry } from './pluginHost';
import { legendFromOutputs } from './indicatorCompute';
import type { LegendSection } from './legend/types';

export type { LegendSection, LegendValueEntry, LegendActionIcon, SeriesOutput, SeriesColor } from './legend/types';

export type LegendBarData = {
  candle: Candle;
  index: number;
  change: number;
  changePct: number;
};

/** Resolve which bar index the legend should display (crosshair bar or last bar). */
export function resolveLegendIndex(
  candles: Candle[],
  dataIndex: number | null,
): number | null {
  if (candles.length === 0) return null;

  if (dataIndex != null && dataIndex >= 0 && dataIndex < candles.length) {
    return dataIndex;
  }

  return candles.length - 1;
}

/** Resolve which candle the legend should display (crosshair bar or last bar). */
export function resolveLegendBar(
  candles: Candle[],
  dataIndex: number | null,
): LegendBarData | null {
  const index = resolveLegendIndex(candles, dataIndex);
  if (index == null) return null;

  const candle = candles[index];
  if (!candle) return null;

  const prev = index > 0 ? candles[index - 1] : null;
  const prevClose = prev?.c ?? candle.o;
  const change = candle.c - prevClose;
  const changePct = prevClose !== 0 ? (change / prevClose) * 100 : 0;

  return { candle, index, change, changePct };
}

function formatIndicatorTitle(
  name: string,
  params?: Record<string, number>,
  defaultParams?: Record<string, number>,
): string {
  const merged = { ...defaultParams, ...params };
  const paramValues = Object.values(merged);
  return paramValues.length > 0 ? `${name} ${paramValues.join(' ')}` : name;
}

export function resolvePriceLegend(
  opts: {
    symbol: string;
    symbolName?: string;
    exchange?: string;
    interval: Interval;
    candles: Candle[];
    dataIndex: number | null;
  },
): LegendSection[] | null {
  const legend = resolveLegendBar(opts.candles, opts.dataIndex);
  if (!legend) return null;

  const { candle, change, changePct } = legend;
  const isUp = change >= 0;
  const displayName = opts.symbolName ?? opts.symbol;
  const intervalLabel =
    INTERVALS.find((i) => i.value === opts.interval)?.label ??
    opts.interval.toUpperCase();

  const titleParts = [displayName, intervalLabel];
  if (opts.exchange) titleParts.push(opts.exchange);

  const changeValue = formatChange(change, changePct);

  return [
    {
      kind: 'badge',
      letter: (displayName || opts.symbol).charAt(0).toUpperCase(),
      tooltip: 'Ticker symbol',
    },
    {
      kind: 'text',
      text: titleParts.join(' · '),
      muted: true,
      tooltip: 'Symbol, timeframe, and exchange',
    },
    {
      kind: 'value',
      id: 'open',
      label: 'O',
      value: formatPrice(candle.o),
      tooltip: 'Open — price at the start of this bar',
    },
    {
      kind: 'value',
      id: 'high',
      label: 'H',
      value: formatPrice(candle.h),
      tooltip: 'High — highest price in this bar',
    },
    {
      kind: 'value',
      id: 'low',
      label: 'L',
      value: formatPrice(candle.l),
      tooltip: 'Low — lowest price in this bar',
    },
    {
      kind: 'value',
      id: 'close',
      label: 'C',
      value: formatPrice(candle.c),
      tooltip: 'Close — price at the end of this bar',
    },
    {
      kind: 'value',
      id: 'change',
      label: '',
      value: changeValue,
      color: isUp ? '#00FF88' : '#f87171',
      tooltip: 'Change from the previous bar close',
    },
  ];
}

export function resolveIndicatorLegend(
  indicator: IndicatorConfig,
  candles: Candle[],
  dataIndex: number | null,
  theme: Theme = 'dark',
): LegendSection[] | null {
  const index = resolveLegendIndex(candles, dataIndex);
  if (index == null) return null;

  const plugin = IndicatorRegistry.get(indicator.name);
  if (!plugin) return null;

  const sections: LegendSection[] = [
    {
      kind: 'text',
      text: formatIndicatorTitle(
        indicator.name,
        indicator.params,
        plugin.defaultParams,
      ),
      muted: true,
      tooltip: 'Indicator name and settings',
    },
  ];

  const entries =
    plugin.legendAt?.(index, candles, indicator.params, theme) ??
    legendFromOutputs(plugin, index, candles, indicator.params, theme);
  if (entries) {
    for (const entry of entries) {
      sections.push({
        kind: 'value',
        id: entry.id,
        label: entry.label,
        value:
          entry.value != null && Number.isFinite(entry.value)
            ? entry.id === 'vol'
              ? formatVolume(entry.value)
              : formatPrice(entry.value, entry.decimals ?? 4)
            : '—',
        color: entry.color,
        tooltip: entry.tooltip,
      });
    }
  }

  return sections;
}

/** Append a settings gear action when the indicator plugin exposes paramSchema. */
export function appendLegendSettingsAction(
  sections: LegendSection[],
  indicatorId: string,
): LegendSection[] {
  return [
    ...sections,
    {
      kind: 'action',
      id: `settings-${indicatorId}`,
      icon: 'settings',
      tooltip: 'Indicator settings',
    },
  ];
}
