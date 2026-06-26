import type { Candle, Theme, VisibleRange } from '../contracts';
import { plotWidth } from '../layout';

export function closes(candles: Candle[]): number[] {
  return candles.map((c) => c.c);
}

export function volumes(candles: Candle[]): number[] {
  return candles.map((c) => c.v ?? 0);
}

/** Simple moving average. */
export function sma(values: number[], period: number): number[] {
  const n = values.length;
  const out = new Array(n).fill(NaN);
  if (period < 1 || n < period) return out;

  for (let i = period - 1; i < n; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += values[j];
    out[i] = sum / period;
  }
  return out;
}

/** Rolling population standard deviation. */
export function stddev(values: number[], period: number): number[] {
  const n = values.length;
  const out = new Array(n).fill(NaN);
  if (period < 1 || n < period) return out;

  for (let i = period - 1; i < n; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += values[j];
    const mean = sum / period;
    let sq = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const d = values[j] - mean;
      sq += d * d;
    }
    out[i] = Math.sqrt(sq / period);
  }
  return out;
}

export function highest(values: number[], period: number): number[] {
  const n = values.length;
  const out = new Array(n).fill(NaN);
  if (period < 1 || n < period) return out;

  for (let i = period - 1; i < n; i++) {
    let max = -Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      if (Number.isFinite(values[j])) max = Math.max(max, values[j]);
    }
    out[i] = max === -Infinity ? NaN : max;
  }
  return out;
}

export function lowest(values: number[], period: number): number[] {
  const n = values.length;
  const out = new Array(n).fill(NaN);
  if (period < 1 || n < period) return out;

  for (let i = period - 1; i < n; i++) {
    let min = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      if (Number.isFinite(values[j])) min = Math.min(min, values[j]);
    }
    out[i] = min === Infinity ? NaN : min;
  }
  return out;
}

/** Simple moving average seed, then exponential moving average. */
export function ema(values: number[], period: number): number[] {
  const n = values.length;
  const out = new Array(n).fill(NaN);
  if (n < period) return out;

  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  out[period - 1] = sum / period;

  const k = 2 / (period + 1);
  for (let i = period; i < n; i++) {
    out[i] = values[i] * k + out[i - 1] * (1 - k);
  }
  return out;
}

/** EMA on a series that may contain leading NaNs (e.g. MACD line before slow EMA warms up). */
export function emaNullable(values: number[], period: number): number[] {
  const n = values.length;
  const out = new Array(n).fill(NaN);
  let sum = 0;
  let count = 0;
  let prev: number | null = null;

  for (let i = 0; i < n; i++) {
    const v = values[i];
    if (!Number.isFinite(v)) continue;

    if (prev === null) {
      sum += v;
      count += 1;
      if (count === period) {
        prev = sum / period;
        out[i] = prev;
      }
    } else {
      const k = 2 / (period + 1);
      prev = v * k + prev * (1 - k);
      out[i] = prev;
    }
  }
  return out;
}

export type MacdSeries = {
  macd: number[];
  signal: number[];
  histogram: number[];
};

export function computeMacd(
  closes: number[],
  fast = 12,
  slow = 26,
  signalPeriod = 9
): MacdSeries {
  const n = closes.length;
  const macd = new Array(n).fill(NaN);
  const signal = new Array(n).fill(NaN);
  const histogram = new Array(n).fill(NaN);

  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);

  for (let i = 0; i < n; i++) {
    if (Number.isFinite(emaFast[i]) && Number.isFinite(emaSlow[i])) {
      macd[i] = emaFast[i] - emaSlow[i];
    }
  }

  const signalEma = emaNullable(macd, signalPeriod);
  for (let i = 0; i < n; i++) {
    signal[i] = signalEma[i];
    if (Number.isFinite(macd[i]) && Number.isFinite(signal[i])) {
      histogram[i] = macd[i] - signal[i];
    }
  }

  return { macd, signal, histogram };
}

export function computeBollinger(
  closes: number[],
  period = 20,
  mult = 2,
): { middle: number[]; upper: number[]; lower: number[] } {
  const middle = sma(closes, period);
  const dev = stddev(closes, period);
  const n = closes.length;
  const upper = new Array(n).fill(NaN);
  const lower = new Array(n).fill(NaN);

  for (let i = 0; i < n; i++) {
    if (Number.isFinite(middle[i]) && Number.isFinite(dev[i])) {
      upper[i] = middle[i] + mult * dev[i];
      lower[i] = middle[i] - mult * dev[i];
    }
  }

  return { middle, upper, lower };
}

/** Wilder-smoothed RSI. */
export function computeRsi(closes: number[], period = 14): number[] {
  const n = closes.length;
  const out = new Array(n).fill(NaN);
  if (n <= period) return out;

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change >= 0) avgGain += change;
    else avgLoss -= change;
  }
  avgGain /= period;
  avgLoss /= period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < n; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  return out;
}

export function rangeInViewport(
  series: number[],
  startIndex: number,
  endIndex: number
): { min: number; max: number } | null {
  let min = Infinity;
  let max = -Infinity;
  const start = Math.max(0, Math.floor(startIndex));
  const end = Math.min(series.length, Math.ceil(endIndex));

  for (let i = start; i < end; i++) {
    const v = series[i];
    if (!Number.isFinite(v)) continue;
    min = Math.min(min, v);
    max = Math.max(max, v);
  }

  if (min === Infinity || max === -Infinity) return null;
  return { min, max };
}

export function mergeRanges(
  ranges: Array<{ min: number; max: number } | null>
): { min: number; max: number } | null {
  let min = Infinity;
  let max = -Infinity;
  for (const r of ranges) {
    if (!r) continue;
    min = Math.min(min, r.min);
    max = Math.max(max, r.max);
  }
  if (min === Infinity || max === -Infinity) return null;
  return { min, max };
}

/** Expand a range so zero sits at the vertical center (for zero-centered oscillators). */
export function symmetricRangeAroundZero(
  range: { min: number; max: number } | null
): { min: number; max: number } | null {
  if (!range) return null;
  const bound = Math.max(Math.abs(range.min), Math.abs(range.max));
  if (bound === 0) return { min: -1, max: 1 };
  return { min: -bound, max: bound };
}

export function fixedRange(min: number, max: number): { min: number; max: number } {
  return { min, max };
}

/** Typical price (HLC/3) per candle. */
export function typicalPrices(candles: import('../contracts').Candle[]): number[] {
  return candles.map((c) => (c.h + c.l + c.c) / 3);
}

/** Cumulative VWAP from series start. */
export function computeVwap(candles: import('../contracts').Candle[]): number[] {
  const n = candles.length;
  const out = new Array(n).fill(NaN);
  let cumTpVol = 0;
  let cumVol = 0;

  for (let i = 0; i < n; i++) {
    const c = candles[i];
    const vol = c.v ?? 0;
    const tp = (c.h + c.l + c.c) / 3;
    cumTpVol += tp * vol;
    cumVol += vol;
    if (cumVol > 0) out[i] = cumTpVol / cumVol;
  }
  return out;
}

/** Wilder-smoothed true range → ATR. */
export function computeAtr(candles: import('../contracts').Candle[], period = 14): number[] {
  const n = candles.length;
  const tr = new Array(n).fill(NaN);
  for (let i = 0; i < n; i++) {
    const c = candles[i];
    if (i === 0) {
      tr[i] = c.h - c.l;
    } else {
      const prevClose = candles[i - 1].c;
      tr[i] = Math.max(c.h - c.l, Math.abs(c.h - prevClose), Math.abs(c.l - prevClose));
    }
  }

  const out = new Array(n).fill(NaN);
  if (n < period) return out;

  let sum = 0;
  for (let i = 0; i < period; i++) sum += tr[i];
  out[period - 1] = sum / period;

  for (let i = period; i < n; i++) {
    out[i] = (out[i - 1] * (period - 1) + tr[i]) / period;
  }
  return out;
}

export type StochasticSeries = { k: number[]; d: number[]; j: number[] };

/** Stochastic oscillator (%K, %D) plus KDJ %J line. */
export function computeStochastic(
  candles: import('../contracts').Candle[],
  kPeriod = 9,
  dPeriod = 3,
): StochasticSeries {
  const n = candles.length;
  const k = new Array(n).fill(NaN);
  const closes = candles.map((c) => c.c);

  for (let i = kPeriod - 1; i < n; i++) {
    let highest = -Infinity;
    let lowest = Infinity;
    for (let j = i - kPeriod + 1; j <= i; j++) {
      highest = Math.max(highest, candles[j].h);
      lowest = Math.min(lowest, candles[j].l);
    }
    const range = highest - lowest;
    k[i] = range > 0 ? (100 * (closes[i] - lowest)) / range : 50;
  }

  const d = sma(k, dPeriod);
  const j = new Array(n).fill(NaN);
  for (let i = 0; i < n; i++) {
    if (Number.isFinite(k[i]) && Number.isFinite(d[i])) {
      j[i] = 3 * k[i] - 2 * d[i];
    }
  }
  return { k, d, j };
}

/** Commodity Channel Index. */
export function computeCci(candles: import('../contracts').Candle[], period = 20): number[] {
  const tp = typicalPrices(candles);
  const n = tp.length;
  const out = new Array(n).fill(NaN);
  const meanTp = sma(tp, period);

  for (let i = period - 1; i < n; i++) {
    let md = 0;
    for (let j = i - period + 1; j <= i; j++) {
      md += Math.abs(tp[j] - meanTp[i]);
    }
    md /= period;
    if (md > 0) out[i] = (tp[i] - meanTp[i]) / (0.015 * md);
  }
  return out;
}

/** On-balance volume (cumulative). */
export function computeObv(candles: import('../contracts').Candle[]): number[] {
  const n = candles.length;
  const out = new Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    const vol = candles[i].v ?? 0;
    const prev = out[i - 1];
    if (candles[i].c > candles[i - 1].c) out[i] = prev + vol;
    else if (candles[i].c < candles[i - 1].c) out[i] = prev - vol;
    else out[i] = prev;
  }
  return out;
}

/** Wilder smoothing (same seed/window as ATR/RSI). */
function wilderSmooth(values: number[], period: number): number[] {
  const n = values.length;
  const out = new Array(n).fill(NaN);
  if (n < period) return out;

  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  out[period - 1] = sum / period;

  for (let i = period; i < n; i++) {
    out[i] = (out[i - 1] * (period - 1) + values[i]) / period;
  }
  return out;
}

export type DmiSeries = { plusDi: number[]; minusDi: number[]; adx: number[] };

/** Directional Movement Index (+DI, -DI, ADX) — Wilder method. */
export function computeDmi(
  candles: import('../contracts').Candle[],
  period = 14,
): DmiSeries {
  const n = candles.length;
  const plusDi = new Array(n).fill(NaN);
  const minusDi = new Array(n).fill(NaN);
  const adx = new Array(n).fill(NaN);
  if (n < period) return { plusDi, minusDi, adx };

  const tr = new Array(n).fill(0);
  const plusDm = new Array(n).fill(0);
  const minusDm = new Array(n).fill(0);

  tr[0] = candles[0].h - candles[0].l;
  for (let i = 1; i < n; i++) {
    const c = candles[i];
    const prev = candles[i - 1];
    const upMove = c.h - prev.h;
    const downMove = prev.l - c.l;
    plusDm[i] = upMove > downMove && upMove > 0 ? upMove : 0;
    minusDm[i] = downMove > upMove && downMove > 0 ? downMove : 0;
    tr[i] = Math.max(c.h - c.l, Math.abs(c.h - prev.c), Math.abs(c.l - prev.c));
  }

  const smoothTr = wilderSmooth(tr, period);
  const smoothPlusDm = wilderSmooth(plusDm, period);
  const smoothMinusDm = wilderSmooth(minusDm, period);

  const dx = new Array(n).fill(NaN);
  for (let i = period - 1; i < n; i++) {
    if (!Number.isFinite(smoothTr[i]) || smoothTr[i] === 0) continue;
    plusDi[i] = (100 * smoothPlusDm[i]) / smoothTr[i];
    minusDi[i] = (100 * smoothMinusDm[i]) / smoothTr[i];
    const sumDi = plusDi[i] + minusDi[i];
    if (sumDi > 0) {
      dx[i] = (100 * Math.abs(plusDi[i] - minusDi[i])) / sumDi;
    }
  }

  const adxStart = 2 * period - 2;
  if (n > adxStart) {
    let adxSum = 0;
    for (let i = period - 1; i <= adxStart; i++) {
      adxSum += dx[i] ?? 0;
    }
    adx[adxStart] = adxSum / period;
    for (let i = adxStart + 1; i < n; i++) {
      if (Number.isFinite(dx[i]) && Number.isFinite(adx[i - 1])) {
        adx[i] = (adx[i - 1] * (period - 1) + dx[i]) / period;
      }
    }
  }

  return { plusDi, minusDi, adx };
}

/** Williams %R oscillator (-100 … 0). */
export function computeWilliamsR(
  candles: import('../contracts').Candle[],
  period = 14,
): number[] {
  const n = candles.length;
  const out = new Array(n).fill(NaN);
  const closes = candles.map((c) => c.c);

  for (let i = period - 1; i < n; i++) {
    let highest = -Infinity;
    let lowest = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      highest = Math.max(highest, candles[j].h);
      lowest = Math.min(lowest, candles[j].l);
    }
    const range = highest - lowest;
    out[i] = range > 0 ? (-100 * (highest - closes[i])) / range : -50;
  }
  return out;
}

/** Rate of change (%). */
export function computeRoc(closes: number[], period = 12): number[] {
  const n = closes.length;
  const out = new Array(n).fill(NaN);
  for (let i = period; i < n; i++) {
    const prev = closes[i - period];
    if (prev !== 0 && Number.isFinite(prev)) {
      out[i] = ((closes[i] - prev) / prev) * 100;
    }
  }
  return out;
}

export type SupertrendSeries = { supertrend: number[]; direction: number[] };

/** ATR-based Supertrend (Pine `ta.supertrend` semantics). */
export function computeSupertrend(
  candles: import('../contracts').Candle[],
  atrPeriod = 10,
  multiplier = 3,
): SupertrendSeries {
  const n = candles.length;
  const supertrend = new Array(n).fill(NaN);
  const direction = new Array(n).fill(NaN);
  if (n === 0) return { supertrend, direction };

  const atr = computeAtr(candles, atrPeriod);
  const finalUpper = new Array(n).fill(NaN);
  const finalLower = new Array(n).fill(NaN);

  const start = atrPeriod - 1;
  if (n <= start) return { supertrend, direction };

  for (let i = start; i < n; i++) {
    if (!Number.isFinite(atr[i])) continue;

    const hl2 = (candles[i].h + candles[i].l) / 2;
    const upperBand = hl2 + multiplier * atr[i];
    const lowerBand = hl2 - multiplier * atr[i];

    if (i === start) {
      finalUpper[i] = upperBand;
      finalLower[i] = lowerBand;
      direction[i] = 1;
      supertrend[i] = finalUpper[i];
      continue;
    }

    const prevFinalLower = finalLower[i - 1];
    const prevFinalUpper = finalUpper[i - 1];
    const prevClose = candles[i - 1].c;

    finalLower[i] =
      lowerBand > prevFinalLower || prevClose < prevFinalLower ? lowerBand : prevFinalLower;
    finalUpper[i] =
      upperBand < prevFinalUpper || prevClose > prevFinalUpper ? upperBand : prevFinalUpper;

    const prevDir = direction[i - 1];
    if (candles[i].c > prevFinalUpper) {
      direction[i] = -1;
    } else if (candles[i].c < prevFinalLower) {
      direction[i] = 1;
    } else {
      direction[i] = prevDir;
    }

    supertrend[i] = direction[i] === -1 ? finalLower[i] : finalUpper[i];
  }

  return { supertrend, direction };
}
