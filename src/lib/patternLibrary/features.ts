import type { OhlcvBar, PatternRecord } from "./types";

export type OhlcvFeatures = {
  barCount: number;
  lastClose: number;
  atr14: number;
  trendSlope: number;
  rangePct: number;
  volumeTrend: number;
  higherHighs: number;
  lowerLows: number;
  impulsePct: number;
  nearHigh: number;
  nearLow: number;
};

function trueRange(prev: OhlcvBar, curr: OhlcvBar): number {
  return Math.max(
    curr.high - curr.low,
    Math.abs(curr.high - prev.close),
    Math.abs(curr.low - prev.close),
  );
}

export function computeAtr(bars: OhlcvBar[], period = 14): number {
  if (bars.length < 2) return 0;
  const trs: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    trs.push(trueRange(bars[i - 1]!, bars[i]!));
  }
  const slice = trs.slice(-period);
  if (slice.length === 0) return 0;
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function linearRegressionSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const xs = values.map((_, i) => i);
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i]! - xMean) * (values[i]! - yMean);
    den += (xs[i]! - xMean) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

export function extractOhlcvFeatures(bars: OhlcvBar[]): OhlcvFeatures {
  const closes = bars.map((b) => b.close);
  const highs = bars.map((b) => b.high);
  const lows = bars.map((b) => b.low);
  const volumes = bars.map((b) => b.volume ?? 0);
  const lastClose = closes[closes.length - 1] ?? 0;
  const windowHigh = Math.max(...highs);
  const windowLow = Math.min(...lows);
  const rangePct = windowLow > 0 ? (windowHigh - windowLow) / windowLow : 0;

  let higherHighs = 0;
  let lowerLows = 0;
  for (let i = 2; i < highs.length; i++) {
    if (highs[i]! > highs[i - 1]! && highs[i - 1]! > highs[i - 2]!) higherHighs++;
    if (lows[i]! < lows[i - 1]! && lows[i - 1]! < lows[i - 2]!) lowerLows++;
  }

  const lookback = Math.min(10, closes.length);
  const startClose = closes[closes.length - lookback] ?? lastClose;
  const impulsePct = startClose > 0 ? (lastClose - startClose) / startClose : 0;

  const volFirst = volumes.slice(0, Math.floor(volumes.length / 2));
  const volSecond = volumes.slice(Math.floor(volumes.length / 2));
  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const volumeTrend =
    avg(volFirst) > 0 ? (avg(volSecond) - avg(volFirst)) / avg(volFirst) : 0;

  const atr14 = computeAtr(bars, 14);
  const span = windowHigh - windowLow || 1;

  return {
    barCount: bars.length,
    lastClose,
    atr14,
    trendSlope: linearRegressionSlope(closes.slice(-20)),
    rangePct,
    volumeTrend,
    higherHighs,
    lowerLows,
    impulsePct,
    nearHigh: (windowHigh - lastClose) / span,
    nearLow: (lastClose - windowLow) / span,
  };
}

export function featuresToVector(f: OhlcvFeatures): number[] {
  return [
    f.trendSlope,
    f.rangePct,
    f.volumeTrend,
    f.higherHighs,
    f.lowerLows,
    f.impulsePct,
    f.nearHigh,
    f.nearLow,
    f.atr14 > 0 ? f.lastClose / f.atr14 : 0,
  ];
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! ** 2;
    nb += b[i]! ** 2;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function recordFeatureVector(record: PatternRecord): number[] {
  return featuresToVector(extractOhlcvFeatures(record.ohlcv));
}
