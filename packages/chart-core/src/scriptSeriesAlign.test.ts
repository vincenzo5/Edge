import { describe, expect, it } from 'vitest';
import { makeSyntheticCandles } from './scriptFixtures';
import { alignSeriesToPrimary } from './scriptSeriesAlign';
import {
  dedupeScriptSeriesKeys,
  isPrimaryScriptSeriesKey,
  parseScriptSeriesKey,
  serializeScriptSeriesKey,
} from './scriptSeriesRequest';
import { buildSecondarySeriesFingerprint } from './scriptSeriesFingerprint';

describe('scriptSeriesRequest', () => {
  const context = { symbol: 'AAPL', interval: '1h' as const };

  it('serializes symbol and interval with defaults', () => {
    expect(serializeScriptSeriesKey({}, context)).toBe('AAPL|1h');
    expect(serializeScriptSeriesKey({ interval: '1d' }, context)).toBe('AAPL|1d');
    expect(serializeScriptSeriesKey({ symbol: 'spy' }, context)).toBe('SPY|1h');
  });

  it('detects primary series key', () => {
    expect(isPrimaryScriptSeriesKey('AAPL|1h', context)).toBe(true);
    expect(isPrimaryScriptSeriesKey('AAPL|1d', context)).toBe(false);
  });

  it('dedupes keys in order', () => {
    expect(dedupeScriptSeriesKeys(['AAPL|1d', 'SPY|1d', 'AAPL|1d'])).toEqual(['AAPL|1d', 'SPY|1d']);
  });

  it('parses keys', () => {
    expect(parseScriptSeriesKey('SPY|1d')).toEqual({ symbol: 'SPY', interval: '1d' });
  });
});

describe('alignSeriesToPrimary', () => {
  it('maps HTF close without lookahead', () => {
    const primary = [
      { t: 100, o: 1, h: 1, l: 1, c: 1, v: 1 },
      { t: 200, o: 2, h: 2, l: 2, c: 2, v: 1 },
      { t: 300, o: 3, h: 3, l: 3, c: 3, v: 1 },
    ];
    const secondary = [
      { t: 50, o: 10, h: 10, l: 10, c: 10, v: 1 },
      { t: 150, o: 20, h: 20, l: 20, c: 20, v: 1 },
      { t: 250, o: 30, h: 30, l: 30, c: 30, v: 1 },
    ];
    const aligned = alignSeriesToPrimary(primary, secondary);
    expect(aligned[0]?.c).toBe(10);
    expect(aligned[1]?.c).toBe(20);
    expect(aligned[2]?.c).toBe(30);
  });

  it('uses missing NaN slots before first secondary bar', () => {
    const primary = makeSyntheticCandles(3);
    const secondary = makeSyntheticCandles(2).map((c, i) => ({ ...c, t: primary[i + 1]!.t }));
    const aligned = alignSeriesToPrimary(primary, secondary);
    expect(Number.isNaN(aligned[0]!.c)).toBe(true);
    expect(Number.isFinite(aligned[1]!.c)).toBe(true);
  });

  it('returns empty for empty primary', () => {
    expect(alignSeriesToPrimary([], makeSyntheticCandles(5))).toEqual([]);
  });
});

describe('buildSecondarySeriesFingerprint', () => {
  it('is stable for key order', () => {
    const a = alignSeriesToPrimary(makeSyntheticCandles(5), makeSyntheticCandles(5));
    const fp1 = buildSecondarySeriesFingerprint({ 'SPY|1d': a });
    const fp2 = buildSecondarySeriesFingerprint({ 'SPY|1d': a });
    expect(fp1).toBe(fp2);
    expect(fp1.length).toBeGreaterThan(0);
  });
});
