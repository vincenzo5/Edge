import { describe, it, expect } from 'vitest';
import {
  resolvePriceLegendLayout,
  resolveBarTone,
  barToneToColor,
} from './priceLegendLayout';
import type { Candle } from '@edge/chart-core/contracts';

const candles: Candle[] = [
  { t: 1_700_000_000_000, o: 10, h: 12, l: 9, c: 11, v: 1000 },
  { t: 1_700_086_400_000, o: 11, h: 13, l: 10, c: 12, v: 2000 },
  { t: 1_700_172_800_000, o: 12, h: 14, l: 11, c: 11.8, v: 1500 },
];

describe('resolveBarTone', () => {
  it('returns positive for gains', () => {
    expect(resolveBarTone(0.5)).toBe('positive');
  });

  it('returns negative for losses', () => {
    expect(resolveBarTone(-0.5)).toBe('negative');
  });

  it('returns neutral for flat', () => {
    expect(resolveBarTone(0)).toBe('neutral');
  });
});

describe('barToneToColor', () => {
  it('maps tones to CSS variables', () => {
    expect(barToneToColor('positive')).toBe('var(--edge-positive)');
    expect(barToneToColor('negative')).toBe('var(--edge-negative)');
    expect(barToneToColor('neutral')).toBe('var(--edge-text-secondary)');
  });
});

describe('resolvePriceLegendLayout', () => {
  it('returns idle mode when crosshair index is null', () => {
    const layout = resolvePriceLegendLayout({
      symbol: 'AAPL',
      symbolName: 'Apple Inc.',
      exchange: 'NASDAQ',
      interval: '1d',
      candles,
      dataIndex: null,
    });

    expect(layout?.mode).toBe('idle');
    expect(layout?.barTone).toBe('negative');
  });

  it('returns crosshair mode when crosshair index is valid', () => {
    const layout = resolvePriceLegendLayout({
      symbol: 'AAPL',
      interval: '1d',
      candles,
      dataIndex: 1,
    });

    expect(layout?.mode).toBe('crosshair');
    expect(layout?.ohlc?.close).toBe('12');
    expect(layout?.barTone).toBe('positive');
  });

  it('uses neutral tone when bar is flat vs previous close', () => {
    const flatCandles: Candle[] = [
      { t: 1, o: 10, h: 11, l: 9, c: 10, v: 100 },
      { t: 2, o: 10, h: 11, l: 9, c: 10, v: 100 },
    ];
    const layout = resolvePriceLegendLayout({
      symbol: 'AAPL',
      interval: '1d',
      candles: flatCandles,
      dataIndex: null,
    });

    expect(layout?.barTone).toBe('neutral');
    expect(layout?.valueColor).toBe('var(--edge-text-secondary)');
  });

  it('uses livePrice for close and recomputes change when idle', () => {
    const layout = resolvePriceLegendLayout({
      symbol: 'AAPL',
      interval: '1d',
      candles,
      dataIndex: null,
      livePrice: 264.35,
    });

    expect(layout?.mode).toBe('idle');
    expect(layout?.ohlc?.close).toBe('264.35');
    expect(layout?.isLive).toBe(true);
    expect(layout?.change).toContain('+');
  });

  it('uses bar close when crosshair active even with livePrice', () => {
    const layout = resolvePriceLegendLayout({
      symbol: 'AAPL',
      interval: '1d',
      candles,
      dataIndex: 1,
      livePrice: 264.35,
    });

    expect(layout?.mode).toBe('crosshair');
    expect(layout?.ohlc?.close).toBe('12');
    expect(layout?.isLive).toBe(false);
  });

  it('respects chartSettings toggles', () => {
    const layout = resolvePriceLegendLayout({
      symbol: 'AAPL',
      interval: '1d',
      candles,
      dataIndex: 1,
      chartSettings: {
        statusLine: {
          showTitle: false,
          showLogo: false,
          showChartValues: false,
          showBarChangeValues: false,
        },
      },
    });

    expect(layout).toBeNull();
  });

  it('strips ohlc and change in compact mode', () => {
    const layout = resolvePriceLegendLayout({
      symbol: 'AAPL',
      interval: '1d',
      candles,
      dataIndex: null,
      compact: true,
    });

    expect(layout?.ohlc).toBeNull();
    expect(layout?.change).toBeNull();
    expect(layout?.identity).not.toBeNull();
  });

  it('returns null for empty candles', () => {
    expect(
      resolvePriceLegendLayout({
        symbol: 'AAPL',
        interval: '1d',
        candles: [],
        dataIndex: null,
      }),
    ).toBeNull();
  });

  it('includes identity with letter when showLogo is enabled', () => {
    const layout = resolvePriceLegendLayout({
      symbol: 'AAPL',
      symbolName: 'Apple Inc.',
      exchange: 'NASDAQ',
      interval: '1d',
      candles,
      dataIndex: null,
    });

    expect(layout?.identity?.letter).toBe('A');
    expect(layout?.identity?.title).toBe('Apple Inc.');
    expect(layout?.identity).not.toHaveProperty('intervalLabel');
    expect(layout?.identity).not.toHaveProperty('exchange');
  });

  it('uses negative tone for down bar', () => {
    const layout = resolvePriceLegendLayout({
      symbol: 'AAPL',
      interval: '1d',
      candles,
      dataIndex: null,
    });

    expect(layout?.barTone).toBe('negative');
    expect(layout?.valueColor).toBe('var(--edge-negative)');
  });
});
