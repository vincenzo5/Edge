/**
 * Host-side TA helpers exposed to guest scripts via capability callbacks.
 * Mirrors packages/chart-core/src/indicators/math.ts without importing draw/render deps.
 */

import type { NormalizedScriptCandle } from '@edge/chart-core';
import type { PriceSource } from '@edge/chart-core/plugin-api';

export function sma(values: Array<number | null>, period: number): Array<number | null> {
  const out: Array<number | null> = new Array(values.length).fill(null);
  if (period < 1) return out;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < values.length; i += 1) {
    const v = values[i];
    if (v == null || !Number.isFinite(v)) {
      sum = 0;
      count = 0;
      continue;
    }
    sum += v;
    count += 1;
    if (count > period) {
      const old = values[i - period];
      if (old != null && Number.isFinite(old)) {
        sum -= old;
        count -= 1;
      }
    }
    if (count >= period) out[i] = sum / period;
  }
  return out;
}

export function ema(values: Array<number | null>, period: number): Array<number | null> {
  const out: Array<number | null> = new Array(values.length).fill(null);
  if (period < 1) return out;
  const k = 2 / (period + 1);
  let prev: number | null = null;
  for (let i = 0; i < values.length; i += 1) {
    const v = values[i];
    if (v == null || !Number.isFinite(v)) {
      out[i] = null;
      prev = null;
      continue;
    }
    prev = prev == null ? v : v * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

export function wma(values: Array<number | null>, period: number): Array<number | null> {
  const out: Array<number | null> = new Array(values.length).fill(null);
  if (period < 1) return out;
  const denom = (period * (period + 1)) / 2;
  for (let i = period - 1; i < values.length; i += 1) {
    let sum = 0;
    let valid = true;
    for (let j = 0; j < period; j += 1) {
      const v = values[i - period + 1 + j];
      if (v == null || !Number.isFinite(v)) {
        valid = false;
        break;
      }
      sum += v * (j + 1);
    }
    if (valid) out[i] = sum / denom;
  }
  return out;
}

export function vwma(candles: NormalizedScriptCandle[], period: number): Array<number | null> {
  const out: Array<number | null> = new Array(candles.length).fill(null);
  if (period < 1) return out;
  for (let i = period - 1; i < candles.length; i += 1) {
    let sumPv = 0;
    let sumV = 0;
    for (let j = i - period + 1; j <= i; j += 1) {
      const c = candles[j]!;
      const vol = c.v ?? 0;
      sumPv += c.c * vol;
      sumV += vol;
    }
    if (sumV > 0) out[i] = sumPv / sumV;
  }
  return out;
}

export function stddev(
  values: Array<number | null>,
  period: number,
  mean?: Array<number | null>,
): Array<number | null> {
  const out: Array<number | null> = new Array(values.length).fill(null);
  const means = mean ?? sma(values, period);
  for (let i = period - 1; i < values.length; i += 1) {
    const m = means[i];
    if (m == null) continue;
    let sumSq = 0;
    let count = 0;
    for (let j = i - period + 1; j <= i; j += 1) {
      const v = values[j];
      if (v == null || !Number.isFinite(v)) continue;
      sumSq += (v - m) ** 2;
      count += 1;
    }
    if (count >= period) out[i] = Math.sqrt(sumSq / period);
  }
  return out;
}

export function rsi(closes: Array<number | null>, period: number): Array<number | null> {
  const out: Array<number | null> = new Array(closes.length).fill(null);
  if (period < 1 || closes.length === 0) return out;
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i < closes.length; i += 1) {
    const cur = closes[i];
    const prev = closes[i - 1];
    if (cur == null || prev == null) continue;
    const change = cur - prev;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    if (i <= period) {
      avgGain += gain;
      avgLoss += loss;
      if (i === period) {
        avgGain /= period;
        avgLoss /= period;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        out[i] = 100 - 100 / (1 + rs);
      }
      continue;
    }
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    out[i] = 100 - 100 / (1 + rs);
  }
  return out;
}

export function highest(values: Array<number | null>, period: number): Array<number | null> {
  const out: Array<number | null> = new Array(values.length).fill(null);
  if (period < 1) return out;
  for (let i = period - 1; i < values.length; i += 1) {
    let max: number | null = null;
    for (let j = i - period + 1; j <= i; j += 1) {
      const v = values[j];
      if (v == null || !Number.isFinite(v)) continue;
      max = max == null ? v : Math.max(max, v);
    }
    out[i] = max;
  }
  return out;
}

export function lowest(values: Array<number | null>, period: number): Array<number | null> {
  const out: Array<number | null> = new Array(values.length).fill(null);
  if (period < 1) return out;
  for (let i = period - 1; i < values.length; i += 1) {
    let min: number | null = null;
    for (let j = i - period + 1; j <= i; j += 1) {
      const v = values[j];
      if (v == null || !Number.isFinite(v)) continue;
      min = min == null ? v : Math.min(min, v);
    }
    out[i] = min;
  }
  return out;
}

export function roc(closes: Array<number | null>, period: number): Array<number | null> {
  const out: Array<number | null> = new Array(closes.length).fill(null);
  if (period < 1) return out;
  for (let i = period; i < closes.length; i += 1) {
    const cur = closes[i];
    const prev = closes[i - period];
    if (cur == null || prev == null || prev === 0) continue;
    out[i] = ((cur - prev) / prev) * 100;
  }
  return out;
}

export function change(series: Array<number | null>, length = 1): Array<number | null> {
  const out: Array<number | null> = new Array(series.length).fill(null);
  if (length < 1) return out;
  for (let i = length; i < series.length; i += 1) {
    const cur = series[i];
    const prev = series[i - length];
    if (cur == null || prev == null) continue;
    out[i] = cur - prev;
  }
  return out;
}

export function percentChange(series: Array<number | null>, length = 1): Array<number | null> {
  const out: Array<number | null> = new Array(series.length).fill(null);
  if (length < 1) return out;
  for (let i = length; i < series.length; i += 1) {
    const cur = series[i];
    const prev = series[i - length];
    if (cur == null || prev == null || prev === 0) continue;
    out[i] = ((cur - prev) / prev) * 100;
  }
  return out;
}

export function crossover(
  a: Array<number | null>,
  b: Array<number | null>,
): Array<number | null> {
  const n = Math.min(a.length, b.length);
  const out: Array<number | null> = new Array(n).fill(0);
  for (let i = 1; i < n; i += 1) {
    const a0 = a[i - 1];
    const b0 = b[i - 1];
    const a1 = a[i];
    const b1 = b[i];
    if (a0 == null || b0 == null || a1 == null || b1 == null) {
      out[i] = null;
      continue;
    }
    out[i] = a0 <= b0 && a1 > b1 ? 1 : 0;
  }
  return out;
}

export function crossunder(
  a: Array<number | null>,
  b: Array<number | null>,
): Array<number | null> {
  const n = Math.min(a.length, b.length);
  const out: Array<number | null> = new Array(n).fill(0);
  for (let i = 1; i < n; i += 1) {
    const a0 = a[i - 1];
    const b0 = b[i - 1];
    const a1 = a[i];
    const b1 = b[i];
    if (a0 == null || b0 == null || a1 == null || b1 == null) {
      out[i] = null;
      continue;
    }
    out[i] = a0 >= b0 && a1 < b1 ? 1 : 0;
  }
  return out;
}

export type MacdResult = {
  macd: Array<number | null>;
  signal: Array<number | null>;
  histogram: Array<number | null>;
};

export function macd(
  closes: Array<number | null>,
  fast = 12,
  slow = 26,
  signalPeriod = 9,
): MacdResult {
  const n = closes.length;
  const macdLine: Array<number | null> = new Array(n).fill(null);
  const signalLine: Array<number | null> = new Array(n).fill(null);
  const histogram: Array<number | null> = new Array(n).fill(null);

  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);

  for (let i = 0; i < n; i += 1) {
    const f = emaFast[i];
    const s = emaSlow[i];
    if (f != null && s != null) macdLine[i] = f - s;
  }

  const signalEma = ema(macdLine, signalPeriod);
  for (let i = 0; i < n; i += 1) {
    signalLine[i] = signalEma[i];
    const m = macdLine[i];
    const sig = signalLine[i];
    if (m != null && sig != null) histogram[i] = m - sig;
  }

  return { macd: macdLine, signal: signalLine, histogram };
}

export type StochResult = {
  k: Array<number | null>;
  d: Array<number | null>;
};

export function stoch(
  candles: NormalizedScriptCandle[],
  kPeriod = 9,
  dPeriod = 3,
): StochResult {
  const n = candles.length;
  const k: Array<number | null> = new Array(n).fill(null);

  for (let i = kPeriod - 1; i < n; i += 1) {
    let hi: number | null = null;
    let lo: number | null = null;
    for (let j = i - kPeriod + 1; j <= i; j += 1) {
      const c = candles[j]!;
      hi = hi == null ? c.h : Math.max(hi, c.h);
      lo = lo == null ? c.l : Math.min(lo, c.l);
    }
    const close = candles[i]!.c;
    if (hi != null && lo != null) {
      const range = hi - lo;
      k[i] = range > 0 ? (100 * (close - lo)) / range : 50;
    }
  }

  const d = sma(k, dPeriod);
  return { k, d };
}

export type BollingerResult = {
  middle: Array<number | null>;
  upper: Array<number | null>;
  lower: Array<number | null>;
};

export function bollinger(
  closes: Array<number | null>,
  period = 20,
  mult = 2,
): BollingerResult {
  const n = closes.length;
  const middle = sma(closes, period);
  const dev = stddev(closes, period, middle);
  const upper: Array<number | null> = new Array(n).fill(null);
  const lower: Array<number | null> = new Array(n).fill(null);

  for (let i = 0; i < n; i += 1) {
    const m = middle[i];
    const sd = dev[i];
    if (m != null && sd != null) {
      upper[i] = m + mult * sd;
      lower[i] = m - mult * sd;
    }
  }

  return { middle, upper, lower };
}

function typicalPrice(c: NormalizedScriptCandle): number {
  return (c.h + c.l + c.c) / 3;
}

export function cci(candles: NormalizedScriptCandle[], period = 20): Array<number | null> {
  const n = candles.length;
  const out: Array<number | null> = new Array(n).fill(null);
  const tp = candles.map(typicalPrice);
  const meanTp = sma(tp, period);

  for (let i = period - 1; i < n; i += 1) {
    const m = meanTp[i];
    if (m == null) continue;
    let md = 0;
    for (let j = i - period + 1; j <= i; j += 1) {
      md += Math.abs(tp[j]! - m);
    }
    md /= period;
    if (md > 0) out[i] = (tp[i]! - m) / (0.015 * md);
  }
  return out;
}

export function obv(candles: NormalizedScriptCandle[]): Array<number | null> {
  const n = candles.length;
  const out: Array<number | null> = new Array(n).fill(null);
  if (n === 0) return out;
  out[0] = 0;
  for (let i = 1; i < n; i += 1) {
    const vol = candles[i]!.v ?? 0;
    const prev = out[i - 1] ?? 0;
    const curClose = candles[i]!.c;
    const prevClose = candles[i - 1]!.c;
    if (curClose > prevClose) out[i] = prev + vol;
    else if (curClose < prevClose) out[i] = prev - vol;
    else out[i] = prev;
  }
  return out;
}

function wilderSmooth(values: number[], period: number): Array<number | null> {
  const n = values.length;
  const out: Array<number | null> = new Array(n).fill(null);
  if (n < period) return out;

  let sum = 0;
  for (let i = 0; i < period; i += 1) sum += values[i]!;
  out[period - 1] = sum / period;

  for (let i = period; i < n; i += 1) {
    const prev = out[i - 1];
    if (prev != null) out[i] = (prev * (period - 1) + values[i]!) / period;
  }
  return out;
}

export type DmiResult = {
  plusDi: Array<number | null>;
  minusDi: Array<number | null>;
  adx: Array<number | null>;
};

export function dmi(
  candles: NormalizedScriptCandle[],
  diPeriod = 14,
  adxSmoothing = 14,
): DmiResult {
  const n = candles.length;
  const plusDi: Array<number | null> = new Array(n).fill(null);
  const minusDi: Array<number | null> = new Array(n).fill(null);
  const adx: Array<number | null> = new Array(n).fill(null);
  if (n < diPeriod) return { plusDi, minusDi, adx };

  const tr: number[] = new Array(n).fill(0);
  const plusDm: number[] = new Array(n).fill(0);
  const minusDm: number[] = new Array(n).fill(0);

  tr[0] = candles[0]!.h - candles[0]!.l;
  for (let i = 1; i < n; i += 1) {
    const c = candles[i]!;
    const prev = candles[i - 1]!;
    const upMove = c.h - prev.h;
    const downMove = prev.l - c.l;
    plusDm[i] = upMove > downMove && upMove > 0 ? upMove : 0;
    minusDm[i] = downMove > upMove && downMove > 0 ? downMove : 0;
    tr[i] = Math.max(c.h - c.l, Math.abs(c.h - prev.c), Math.abs(c.l - prev.c));
  }

  const smoothTr = wilderSmooth(tr, diPeriod);
  const smoothPlusDm = wilderSmooth(plusDm, diPeriod);
  const smoothMinusDm = wilderSmooth(minusDm, diPeriod);

  const dx: Array<number | null> = new Array(n).fill(null);
  for (let i = diPeriod - 1; i < n; i += 1) {
    const str = smoothTr[i];
    if (str == null || str === 0) continue;
    const pdi = (100 * (smoothPlusDm[i] ?? 0)) / str;
    const mdi = (100 * (smoothMinusDm[i] ?? 0)) / str;
    plusDi[i] = pdi;
    minusDi[i] = mdi;
    const sumDi = pdi + mdi;
    if (sumDi > 0) dx[i] = (100 * Math.abs(pdi - mdi)) / sumDi;
  }

  const adxStart = 2 * diPeriod - 2;
  if (n > adxStart) {
    let adxSum = 0;
    for (let i = diPeriod - 1; i <= adxStart; i += 1) {
      adxSum += dx[i] ?? 0;
    }
    adx[adxStart] = adxSum / diPeriod;
    for (let i = adxStart + 1; i < n; i += 1) {
      const prevAdx = adx[i - 1];
      const curDx = dx[i];
      if (prevAdx != null && curDx != null) {
        adx[i] = (prevAdx * (adxSmoothing - 1) + curDx) / adxSmoothing;
      }
    }
  }

  return { plusDi, minusDi, adx };
}

export function atr(candles: NormalizedScriptCandle[], period: number): Array<number | null> {
  const out: Array<number | null> = new Array(candles.length).fill(null);
  if (period < 1 || candles.length === 0) return out;
  const tr: number[] = [];
  for (let i = 0; i < candles.length; i += 1) {
    const c = candles[i]!;
    const prevClose = i > 0 ? candles[i - 1]!.c : c.c;
    tr.push(Math.max(c.h - c.l, Math.abs(c.h - prevClose), Math.abs(c.l - prevClose)));
  }
  const trSeries = tr.map((v) => v);
  return ema(trSeries, period);
}

export function source(
  candles: NormalizedScriptCandle[],
  priceSource: PriceSource,
): Array<number | null> {
  return candles.map((c) => {
    let value: number;
    switch (priceSource) {
      case 'open':
        value = c.o;
        break;
      case 'high':
        value = c.h;
        break;
      case 'low':
        value = c.l;
        break;
      case 'hlc3':
        value = (c.h + c.l + c.c) / 3;
        break;
      case 'ohlcv':
        value = c.v;
        break;
      case 'close':
      default:
        value = c.c;
        break;
    }
    return Number.isFinite(value) ? value : null;
  });
}

export const HOST_TA_SDK = {
  sma,
  ema,
  wma,
  vwma,
  stddev,
  rsi,
  highest,
  lowest,
  roc,
  change,
  percentChange,
  crossover,
  crossunder,
  macd,
  stoch,
  bollinger,
  cci,
  obv,
  dmi,
  atr,
  source,
};

export type HostTaSdk = typeof HOST_TA_SDK;
