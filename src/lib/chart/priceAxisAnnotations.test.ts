import { describe, expect, it } from 'vitest';
import {
  collectSymbolAnnotations,
  collectIndicatorAnnotations,
  collectDrawingAnnotations,
  formatAnnotationPrice,
  formatBarCountdown,
  layoutPriceAxisAnnotations,
} from './priceAxisAnnotations';
import { linearScaleContext } from './priceScaleTransform';
import { mergeChartSettings } from './chartSettings';
import type { Candle, VisibleRange, IndicatorConfig, SerializedDrawing } from './contracts';
import '@/lib/chart/indicators/registry';

const candles: Candle[] = [
  { t: 1_700_000_000_000, o: 10, h: 12, l: 9, c: 11 },
  { t: 1_700_000_360_000, o: 11, h: 13, l: 10, c: 12.5 },
];

const vp: VisibleRange = {
  startIndex: 0,
  endIndex: 2,
  priceMin: 8,
  priceMax: 14,
  width: 300,
  height: 200,
  priceScaleContext: linearScaleContext(),
  xForIndex: (i) => i * 100,
  yForPrice: (p) => 200 - ((p - 8) / 6) * 180,
  indexForX: (x) => Math.floor(x / 100),
  priceForY: (y) => 8 + ((200 - y) / 180) * 6,
};

describe('formatAnnotationPrice', () => {
  it('formats linear prices', () => {
    expect(formatAnnotationPrice(12.5, linearScaleContext())).toBe('12.5');
  });
});

describe('formatBarCountdown', () => {
  it('returns HH:MM:SS remaining in bar', () => {
    const lastT = 1_700_000_000_000;
    const now = lastT + 30_000;
    expect(formatBarCountdown(lastT, '1m', now)).toBe('00:00:30');
  });
});

describe('collectSymbolAnnotations', () => {
  it('includes last price line and label by default', () => {
    const settings = mergeChartSettings();
    const anns = collectSymbolAnnotations(candles, vp, settings, 'dark', '1m', candles[1].t + 30_000);
    expect(anns.some((a) => a.source === 'symbol' && a.line === 'solid')).toBe(true);
    expect(anns.some((a) => a.source === 'countdown')).toBe(true);
  });

  it('respects hidden symbol label mode', () => {
    const settings = mergeChartSettings({
      scales: { symbolPriceLabelMode: 'hidden', showCountdownToBarClose: false },
    });
    const anns = collectSymbolAnnotations(candles, vp, settings, 'dark');
    expect(anns).toHaveLength(0);
  });
});

describe('collectIndicatorAnnotations', () => {
  it('collects overlay indicator values when enabled', () => {
    const longCandles: Candle[] = Array.from({ length: 25 }, (_, i) => ({
      t: i * 60_000,
      o: 10 + i * 0.1,
      h: 11 + i * 0.1,
      l: 9 + i * 0.1,
      c: 10 + i * 0.1,
    }));
    const indicators: IndicatorConfig[] = [
      { id: 'ma1', name: 'MA', pane: 'main', visible: true, inputs: { period: 5 } },
    ];
    const settings = mergeChartSettings({ scales: { indicatorPriceLabelMode: 'nameValue' } });
    const anns = collectIndicatorAnnotations(
      indicators,
      longCandles,
      vp,
      settings,
      'dark',
      'price',
    );
    expect(anns.length).toBeGreaterThan(0);
    expect(anns[0].label).toMatch(/MA/);
  });

  it('returns empty when indicator labels hidden', () => {
    const indicators: IndicatorConfig[] = [
      { id: 'ma1', name: 'MA', pane: 'main', visible: true },
    ];
    const settings = mergeChartSettings({ scales: { indicatorPriceLabelMode: 'hidden' } });
    expect(
      collectIndicatorAnnotations(indicators, candles, vp, settings, 'dark', 'price'),
    ).toHaveLength(0);
  });
});

describe('collectDrawingAnnotations', () => {
  it('collects axis annotations from drawing plugins', () => {
    const drawing: SerializedDrawing = {
      id: 'd1',
      name: 'horizontal_line',
      label: 'H-Line',
      points: [{ value: 42.5 }],
      visible: true,
      locked: false,
      zLevel: 0,
      paneId: 'price',
    };
    const settings = mergeChartSettings({ scales: { drawingPriceLabels: 'visible' } });
    const anns = collectDrawingAnnotations([drawing], vp, candles, settings, 'dark', 'price');
    expect(anns.some((a) => a.source === 'drawing' && a.value === 42.5)).toBe(true);
  });
});

describe('layoutPriceAxisAnnotations', () => {
  it('separates overlapping labels when enabled', () => {
    const settings = mergeChartSettings({ scales: { noOverlappingPriceLabels: true } });
    const annotations = [
      {
        id: 'a',
        paneId: 'price',
        source: 'symbol' as const,
        value: 10,
        label: '10',
        color: '#fff',
        showLabel: true,
        priority: 100,
      },
      {
        id: 'b',
        paneId: 'price',
        source: 'indicator' as const,
        value: 10.01,
        label: '10.01',
        color: '#fff',
        showLabel: true,
        priority: 50,
      },
    ];
    const laidOut = layoutPriceAxisAnnotations(annotations, vp, settings, 180);
    expect(laidOut).toHaveLength(2);
    expect(laidOut[1].displayY).toBeGreaterThanOrEqual(laidOut[0].displayY + 18);
  });
});
