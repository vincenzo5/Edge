import type { Candle, Interval } from '@edge/chart-core';
import { formatChange, formatPrice } from '@edge/chart-core/format';
import type { ChartSettings } from './chartSettings';
import { mergeChartSettings, resolvePriceDecimals } from './chartSettings';
import { resolveLegendBar, resolveLegendIndex } from './legend';

export type PriceLegendMode = 'idle' | 'crosshair';

export type BarTone = 'positive' | 'negative' | 'neutral';

export type PriceLegendLayout = {
  mode: PriceLegendMode;
  identity: {
    letter?: string;
    title: string;
  } | null;
  barTone: BarTone;
  valueColor: string;
  ohlc: {
    open: string;
    high: string;
    low: string;
    close: string;
  } | null;
  change: string | null;
  isLive: boolean;
};

export type ResolvePriceLegendLayoutOpts = {
  symbol: string;
  symbolName?: string;
  exchange?: string;
  interval: Interval;
  candles: Candle[];
  dataIndex: number | null;
  chartSettings?: ChartSettings;
  livePrice?: number | null;
  compact?: boolean;
};

export function resolveBarTone(change: number): BarTone {
  if (change > 0) return 'positive';
  if (change < 0) return 'negative';
  return 'neutral';
}

export function barToneToColor(tone: BarTone): string {
  switch (tone) {
    case 'positive':
      return 'var(--edge-positive)';
    case 'negative':
      return 'var(--edge-negative)';
    case 'neutral':
      return 'var(--edge-text-secondary)';
  }
}

function isCrosshairActive(candles: Candle[], dataIndex: number | null): boolean {
  return dataIndex != null && dataIndex >= 0 && dataIndex < candles.length;
}

export function resolvePriceLegendLayout(
  opts: ResolvePriceLegendLayoutOpts,
): PriceLegendLayout | null {
  const settings = mergeChartSettings(opts.chartSettings);
  const legend = resolveLegendBar(opts.candles, opts.dataIndex);
  if (!legend) return null;

  const { candle, index } = legend;
  const crosshairActive = isCrosshairActive(opts.candles, opts.dataIndex);
  const mode: PriceLegendMode = crosshairActive ? 'crosshair' : 'idle';
  const displayName = opts.symbolName ?? opts.symbol;
  const decimals = resolvePriceDecimals(settings.symbol.precision);
  const compact = opts.compact ?? false;

  const useLivePrice =
    mode === 'idle' &&
    opts.livePrice != null &&
    Number.isFinite(opts.livePrice);

  const prev = index > 0 ? opts.candles[index - 1] : null;
  const prevClose = prev?.c ?? candle.o;

  let change = legend.change;
  let changePct = legend.changePct;
  if (useLivePrice) {
    change = opts.livePrice! - prevClose;
    changePct = prevClose !== 0 ? (change / prevClose) * 100 : 0;
  }

  const barTone = resolveBarTone(change);
  const valueColor = barToneToColor(barTone);

  let identity: PriceLegendLayout['identity'] = null;
  if (settings.statusLine.showTitle || settings.statusLine.showLogo) {
    identity = {
      letter: settings.statusLine.showLogo
        ? (displayName || opts.symbol).charAt(0).toUpperCase()
        : undefined,
      title: displayName || opts.symbol,
    };
  }

  let ohlc: PriceLegendLayout['ohlc'] = null;
  if (settings.statusLine.showChartValues && !compact) {
    const closeValue = useLivePrice ? opts.livePrice! : candle.c;
    ohlc = {
      open: formatPrice(candle.o, decimals),
      high: formatPrice(candle.h, decimals),
      low: formatPrice(candle.l, decimals),
      close: formatPrice(closeValue, decimals),
    };
  }

  const changeText =
    settings.statusLine.showBarChangeValues && !compact
      ? formatChange(change, changePct)
      : null;

  if (!identity && !ohlc && !changeText) return null;

  return {
    mode,
    identity,
    barTone,
    valueColor,
    ohlc,
    change: changeText,
    isLive: useLivePrice,
  };
}

/** @internal exported for tests */
export { isCrosshairActive, resolveLegendIndex };
