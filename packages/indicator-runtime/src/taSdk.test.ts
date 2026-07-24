import { describe, expect, it } from 'vitest';
import { makeSyntheticCandles } from '@edge/chart-core';
import {
  bollinger,
  cci,
  crossover,
  crossunder,
  HOST_TA_SDK,
  macd,
  stoch,
  wma,
} from './taSdk';
import { GUEST_TA_BOOTSTRAP } from './guestTaBootstrap';

/** Extract top-level method names from the guest TA bootstrap string. */
function guestTaMethodNames(): string[] {
  const marker = 'const __edgeTa = {';
  const idx = GUEST_TA_BOOTSTRAP.indexOf(marker);
  if (idx < 0) return [];

  let i = idx + marker.length - 1;
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  const bodyStart = i + 1;

  for (; i < GUEST_TA_BOOTSTRAP.length; i += 1) {
    const ch = GUEST_TA_BOOTSTRAP[i]!;
    const prev = GUEST_TA_BOOTSTRAP[i - 1];
    if (!inDouble && ch === "'" && prev !== '\\') {
      inSingle = !inSingle;
      continue;
    }
    if (!inSingle && ch === '"' && prev !== '\\') {
      inDouble = !inDouble;
      continue;
    }
    if (inSingle || inDouble) continue;
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        const body = GUEST_TA_BOOTSTRAP.slice(bodyStart, i);
        const names: string[] = [];
        const re = /^  ([a-zA-Z][a-zA-Z0-9]*)\([^)]*\)\s*\{/gm;
        let m: RegExpExecArray | null;
        while ((m = re.exec(body)) !== null) {
          names.push(m[1]!);
        }
        return names.sort();
      }
    }
  }
  return [];
}

describe('taSdk', () => {
  it('keeps HOST_TA_SDK and GUEST_TA_BOOTSTRAP method names in lockstep', () => {
    const hostKeys = Object.keys(HOST_TA_SDK).sort();
    const guestKeys = guestTaMethodNames();
    expect(guestKeys).toEqual(hostKeys);
  });

  it('computes sma over synthetic closes', () => {
    const candles = makeSyntheticCandles(20);
    const closes = candles.map((c) => c.c);
    const result = HOST_TA_SDK.sma(closes, 5);
    expect(result[4]).not.toBeNull();
    expect(result[0]).toBeNull();
  });

  it('computes wma with weighted window', () => {
    const values = [1, 2, 3, 4, 5].map((v) => v);
    expect(wma(values, 3)[2]).toBeCloseTo((1 * 1 + 2 * 2 + 3 * 3) / 6);
  });

  it('returns macd composite series', () => {
    const candles = makeSyntheticCandles(60);
    const closes = candles.map((c) => c.c);
    const result = macd(closes);
    expect(result.macd.length).toBe(candles.length);
    expect(result.signal.length).toBe(candles.length);
    expect(result.histogram.length).toBe(candles.length);
    expect(result.histogram.some((v) => v != null)).toBe(true);
  });

  it('returns stoch k and d series', () => {
    const candles = makeSyntheticCandles(40).map((c) => ({
      t: c.t,
      o: c.o,
      h: c.h,
      l: c.l,
      c: c.c,
      v: c.v ?? 0,
    }));
    const result = stoch(candles);
    expect(result.k.some((v) => v != null)).toBe(true);
    expect(result.d.some((v) => v != null)).toBe(true);
  });

  it('computes cci on typical price', () => {
    const candles = makeSyntheticCandles(40).map((c) => ({
      t: c.t,
      o: c.o,
      h: c.h,
      l: c.l,
      c: c.c,
      v: c.v ?? 0,
    }));
    expect(cci(candles, 20).some((v) => v != null)).toBe(true);
  });

  it('detects crossover and crossunder at bar i', () => {
    const a = [0, 1, 2, 3, 4].map((v) => v);
    const b = [2, 2, 2, 2, 2].map((v) => v);
    expect(crossover(a, b)[3]).toBe(1);
    expect(crossunder([4, 3, 2, 1, 0], b)[3]).toBe(1);
  });

  it('returns bollinger bands', () => {
    const closes = makeSyntheticCandles(40).map((c) => c.c);
    const bands = bollinger(closes);
    expect(bands.upper.some((v) => v != null)).toBe(true);
    expect(bands.lower.some((v) => v != null)).toBe(true);
  });

  it('extracts price source series', () => {
    const candles = makeSyntheticCandles(5);
    const normalized = candles.map((c) => ({ t: c.t, o: c.o, h: c.h, l: c.l, c: c.c, v: c.v ?? 0 }));
    expect(HOST_TA_SDK.source(normalized, 'close')[0]).toBe(normalized[0]!.c);
    expect(HOST_TA_SDK.source(normalized, 'hlc3')[0]).toBeCloseTo(
      (normalized[0]!.h + normalized[0]!.l + normalized[0]!.c) / 3,
    );
  });

  it('computes highest/lowest rolling windows', () => {
    const values = [1, 5, 3, 8, 2].map((v) => v);
    expect(HOST_TA_SDK.highest(values, 3)[3]).toBe(8);
    expect(HOST_TA_SDK.lowest(values, 3)[3]).toBe(3);
  });

  it('computes roc and atr', () => {
    const candles = makeSyntheticCandles(30);
    const closes = candles.map((c) => c.c);
    const normalized = candles.map((c) => ({ t: c.t, o: c.o, h: c.h, l: c.l, c: c.c, v: c.v ?? 0 }));
    expect(HOST_TA_SDK.roc(closes, 5).some((v) => v != null)).toBe(true);
    expect(HOST_TA_SDK.atr(normalized, 5).some((v) => v != null)).toBe(true);
  });
});
