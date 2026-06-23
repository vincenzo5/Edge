import type { Candle, IndicatorConfig, Interval, Theme } from './contracts';
import type { ChartSettings, RequiredChartSettings } from './chartSettings';
import {
  mergeChartSettings,
  resolvePriceDecimals,
} from './chartSettings';
import { formatChange, formatPrice, formatVolume } from './format';
import { INTERVALS } from '../chartConfig';
import { IndicatorRegistry } from './pluginHost';
import { legendFromOutputs } from './indicatorCompute';
import { getInputSchema, resolveIndicatorInputs } from './indicatorInputs';
import type { InputValue } from './plugin-api';
import type { LegendSection } from './legend/types';

export type { LegendSection, LegendValueEntry, LegendActionIcon, SeriesOutput, SeriesColor, PlotKind } from './legend/types';

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
  inputs: Record<string, InputValue>,
  showInputs: boolean,
): string {
  if (!showInputs) return name;
  const paramValues = Object.values(inputs).filter(
    (v) => typeof v === 'number' || typeof v === 'string',
  );
  return paramValues.length > 0 ? `${name} ${paramValues.join(' ')}` : name;
}

function resolveTitleText(
  opts: {
    symbol: string;
    symbolName?: string;
    exchange?: string;
    interval: Interval;
  },
  settings: RequiredChartSettings,
): string {
  const intervalLabel =
    INTERVALS.find((i) => i.value === opts.interval)?.label ??
    opts.interval.toUpperCase();

  switch (settings.statusLine.titleMode) {
    case 'symbol':
      return [opts.symbol, intervalLabel].join(' · ');
    case 'description':
      return [opts.symbolName ?? opts.symbol, intervalLabel, opts.exchange]
        .filter(Boolean)
        .join(' · ');
    case 'name':
    default:
      return [opts.symbolName ?? opts.symbol, intervalLabel, opts.exchange]
        .filter(Boolean)
        .join(' · ');
  }
}

export function resolvePriceLegend(
  opts: {
    symbol: string;
    symbolName?: string;
    exchange?: string;
    interval: Interval;
    candles: Candle[];
    dataIndex: number | null;
    chartSettings?: ChartSettings;
  },
): LegendSection[] | null {
  const settings = mergeChartSettings(opts.chartSettings);
  const legend = resolveLegendBar(opts.candles, opts.dataIndex);
  if (!legend) return null;

  const { candle, change, changePct } = legend;
  const isUp = change >= 0;
  const displayName = opts.symbolName ?? opts.symbol;
  const decimals = resolvePriceDecimals(settings.symbol.precision);
  const changeValue = formatChange(change, changePct);

  const sections: LegendSection[] = [];

  if (settings.statusLine.showTitle || settings.statusLine.showLogo) {
    if (settings.statusLine.showLogo) {
      sections.push({
        kind: 'badge',
        letter: (displayName || opts.symbol).charAt(0).toUpperCase(),
        tooltip: 'Ticker symbol',
      });
    }
    if (settings.statusLine.showTitle) {
      sections.push({
        kind: 'text',
        text: resolveTitleText(opts, settings),
        muted: true,
        tooltip: 'Symbol, timeframe, and exchange',
      });
    }
  }

  if (settings.statusLine.showChartValues) {
    sections.push(
      {
        kind: 'value',
        id: 'open',
        label: 'O',
        value: formatPrice(candle.o, decimals),
        tooltip: 'Open — price at the start of this bar',
      },
      {
        kind: 'value',
        id: 'high',
        label: 'H',
        value: formatPrice(candle.h, decimals),
        tooltip: 'High — highest price in this bar',
      },
      {
        kind: 'value',
        id: 'low',
        label: 'L',
        value: formatPrice(candle.l, decimals),
        tooltip: 'Low — lowest price in this bar',
      },
      {
        kind: 'value',
        id: 'close',
        label: 'C',
        value: formatPrice(candle.c, decimals),
        tooltip: 'Close — price at the end of this bar',
      },
    );
  }

  if (settings.statusLine.showBarChangeValues) {
    sections.push({
      kind: 'value',
      id: 'change',
      label: '',
      value: changeValue,
      color: isUp ? 'var(--tv-positive)' : 'var(--tv-negative)',
      tooltip: 'Change from the previous bar close',
    });
  }

  if (settings.statusLine.showVolume && candle.v != null && Number.isFinite(candle.v)) {
    sections.push({
      kind: 'value',
      id: 'volume',
      label: 'V',
      value: formatVolume(candle.v),
      tooltip: 'Volume for this bar',
    });
  }

  return sections.length > 0 ? sections : null;
}

export function resolveIndicatorLegend(
  indicator: IndicatorConfig,
  candles: Candle[],
  dataIndex: number | null,
  theme: Theme = 'dark',
  chartSettings?: ChartSettings,
): LegendSection[] | null {
  const index = resolveLegendIndex(candles, dataIndex);
  if (index == null) return null;

  const plugin = IndicatorRegistry.get(indicator.name);
  if (!plugin) return null;

  const settings = mergeChartSettings(chartSettings);
  const inputs = resolveIndicatorInputs(plugin, indicator);
  const sections: LegendSection[] = [];

  if (settings.statusLine.indicatorShowTitles) {
    sections.push({
      kind: 'text',
      text: formatIndicatorTitle(
        indicator.name,
        inputs,
        settings.statusLine.indicatorShowInputs,
      ),
      muted: true,
      tooltip: 'Indicator name and settings',
    });
  }

  if (settings.statusLine.indicatorShowValues) {
    const entries =
      plugin.legendAt?.(index, candles, inputs, theme) ??
      legendFromOutputs(plugin, index, candles, indicator, theme);
    if (entries) {
      for (const entry of entries) {
        if (!entry.label) continue;
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
  }

  return sections.length > 0 ? sections : null;
}

/** Append a settings gear action when the indicator plugin exposes inputSchema. */
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

export function indicatorHasSettings(name: string): boolean {
  const plugin = IndicatorRegistry.get(name);
  if (!plugin) return false;
  const schema = getInputSchema(plugin);
  return Boolean(schema && Object.keys(schema).length > 0) || Boolean(plugin.outputs?.length);
}
