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
