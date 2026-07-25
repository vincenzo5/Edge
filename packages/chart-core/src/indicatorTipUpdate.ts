import type { Candle } from './contracts';
import { macd as macdPlugin } from './indicators/macd';
import type { ResolvedInputs } from './plugin-api';
import type { CandleSeriesAdvanceKind } from './candleSeriesIdentity';
import {
  closes,
  computeAtr,
  computeMacd,
  computeRsi,
  computeVwap,
  ema,
  emaNullable,
  sma,
} from './indicators/math';

export type ComputeCacheAux = {
  emaFast?: number;
  emaSlow?: number;
  signalEma?: number;
  avgGain?: number;
  avgLoss?: number;
  prevAtr?: number;
  cumTpVol?: number;
  cumVol?: number;
  lastTipTpVol?: number;
};

const INCREMENTAL_PLUGINS = new Set(['EMA', 'MA', 'RSI', 'ATR', 'MACD', 'VWAP']);

export function supportsIncrementalTipUpdate(pluginName: string): boolean {
  return INCREMENTAL_PLUGINS.has(pluginName);
}

function resolvePeriod(inputs: ResolvedInputs, fallback: number): number {
  const v = inputs.period;
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function resolveMacdInputs(inputs: ResolvedInputs): { fast: number; slow: number; signal: number } {
  return {
    fast: typeof inputs.fast === 'number' ? inputs.fast : 12,
    slow: typeof inputs.slow === 'number' ? inputs.slow : 26,
    signal: typeof inputs.signal === 'number' ? inputs.signal : 9,
  };
}

function cloneSeries(data: Record<string, number[]>): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const [key, values] of Object.entries(data)) {
    out[key] = values.slice();
  }
  return out;
}

function extractRsiAux(closeSeries: number[], period: number): Pick<ComputeCacheAux, 'avgGain' | 'avgLoss'> | null {
  const n = closeSeries.length;
  if (n <= period + 1) return null;

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const change = closeSeries[i]! - closeSeries[i - 1]!;
    if (change >= 0) avgGain += change;
    else avgLoss -= change;
  }
  avgGain /= period;
  avgLoss /= period;

  for (let i = period + 1; i < n - 1; i++) {
    const change = closeSeries[i]! - closeSeries[i - 1]!;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  return { avgGain, avgLoss };
}

export function buildComputeCacheAux(
  pluginName: string,
  candles: Candle[],
  inputs: ResolvedInputs,
  data: Record<string, number[]>,
): ComputeCacheAux | undefined {
  const closeSeries = closes(candles);
  const n = candles.length;
  if (n === 0) return undefined;
  const i = n - 1;

  switch (pluginName) {
    case 'EMA': {
      const period = resolvePeriod(inputs, 20);
      const series = ema(closeSeries, period);
      return Number.isFinite(series[i]) ? { prevAtr: series[i] } : undefined;
    }
    case 'MA': {
      return undefined;
    }
    case 'RSI': {
      const period = resolvePeriod(inputs, 14);
      return extractRsiAux(closeSeries, period) ?? undefined;
    }
    case 'ATR': {
      const period = resolvePeriod(inputs, 14);
      const series = computeAtr(candles, period);
      const prev = i > 0 ? series[i - 1] : NaN;
      return Number.isFinite(prev) ? { prevAtr: prev } : undefined;
    }
    case 'MACD': {
      const { fast, slow } = resolveMacdInputs(inputs);
      const emaFastArr = ema(closeSeries, fast);
      const emaSlowArr = ema(closeSeries, slow);
      if (i === 0) return undefined;
      if (!Number.isFinite(emaFastArr[i - 1]) || !Number.isFinite(emaSlowArr[i - 1])) {
        return undefined;
      }
      return {
        emaFast: emaFastArr[i - 1],
        emaSlow: emaSlowArr[i - 1],
      };
    }
    case 'VWAP': {
      let cumTpVol = 0;
      let cumVol = 0;
      for (let j = 0; j < n; j++) {
        const c = candles[j]!;
        const vol = c.v ?? 0;
        const tp = (c.h + c.l + c.c) / 3;
        cumTpVol += tp * vol;
        cumVol += vol;
      }
      const last = candles[i]!;
      const lastVol = last.v ?? 0;
      const lastTp = (last.h + last.l + last.c) / 3;
      return {
        cumTpVol,
        cumVol,
        lastTipTpVol: lastTp * lastVol,
      };
    }
    default:
      return undefined;
  }
}

function updateEmaTip(
  data: Record<string, number[]>,
  closeSeries: number[],
  period: number,
  advanceKind: CandleSeriesAdvanceKind | undefined,
): boolean {
  const key = 'ema';
  const series = data[key];
  if (!series) return false;

  const n = closeSeries.length;
  const i = n - 1;
  const k = 2 / (period + 1);

  if (advanceKind === 'append') {
    series.push(NaN);
  }

  if (i < period - 1) return false;

  if (i === period - 1) {
    let sum = 0;
    for (let j = 0; j < period; j++) sum += closeSeries[j]!;
    series[i] = sum / period;
    return true;
  }

  const prev = series[i - 1];
  if (!Number.isFinite(prev)) return false;
  series[i] = closeSeries[i]! * k + prev * (1 - k);
  return true;
}

function updateMaTip(
  data: Record<string, number[]>,
  closeSeries: number[],
  period: number,
  advanceKind: CandleSeriesAdvanceKind | undefined,
): boolean {
  const key = 'ma';
  const series = data[key];
  if (!series) return false;

  const n = closeSeries.length;
  const i = n - 1;

  if (advanceKind === 'append') {
    series.push(NaN);
  }

  if (i < period - 1) return false;

  let sum = 0;
  for (let j = i - period + 1; j <= i; j++) sum += closeSeries[j]!;
  series[i] = sum / period;
  return true;
}

function updateRsiTip(
  data: Record<string, number[]>,
  closeSeries: number[],
  period: number,
  aux: ComputeCacheAux | undefined,
  advanceKind: CandleSeriesAdvanceKind | undefined,
): { ok: boolean; aux?: ComputeCacheAux } {
  const key = 'rsi';
  const series = data[key];
  if (!series || aux?.avgGain == null || aux?.avgLoss == null) return { ok: false };

  const n = closeSeries.length;
  const i = n - 1;

  if (advanceKind === 'append') {
    series.push(NaN);
  }

  if (i < period) return { ok: false };

  if (i === period) {
    const change = closeSeries[i]! - closeSeries[i - 1]!;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    const avgGain = gain;
    const avgLoss = loss;
    series[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    return { ok: true, aux: { avgGain, avgLoss } };
  }

  const change = closeSeries[i]! - closeSeries[i - 1]!;
  const gain = change > 0 ? change : 0;
  const loss = change < 0 ? -change : 0;
  const avgGain = (aux.avgGain * (period - 1) + gain) / period;
  const avgLoss = (aux.avgLoss * (period - 1) + loss) / period;
  series[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  return { ok: true, aux: { avgGain, avgLoss } };
}

function trueRangeAt(candles: Candle[], i: number): number {
  const c = candles[i]!;
  if (i === 0) return c.h - c.l;
  const prevClose = candles[i - 1]!.c;
  return Math.max(c.h - c.l, Math.abs(c.h - prevClose), Math.abs(c.l - prevClose));
}

function updateAtrTip(
  data: Record<string, number[]>,
  candles: Candle[],
  period: number,
  aux: ComputeCacheAux | undefined,
  advanceKind: CandleSeriesAdvanceKind | undefined,
): { ok: boolean; aux?: ComputeCacheAux } {
  const key = 'atr';
  const series = data[key];
  if (!series) return { ok: false };

  const n = candles.length;
  const i = n - 1;

  if (advanceKind === 'append') {
    series.push(NaN);
  }

  if (i < period - 1) return { ok: false };

  if (i === period - 1) {
    let sum = 0;
    for (let j = 0; j < period; j++) sum += trueRangeAt(candles, j);
    const atrVal = sum / period;
    series[i] = atrVal;
    return { ok: true, aux: { prevAtr: atrVal } };
  }

  const prevAtr = aux?.prevAtr ?? series[i - 1];
  if (!Number.isFinite(prevAtr)) return { ok: false };

  const tr = trueRangeAt(candles, i);
  const atrVal = (prevAtr * (period - 1) + tr) / period;
  series[i] = atrVal;
  return { ok: true, aux: { prevAtr: atrVal } };
}

function updateMacdTip(
  data: Record<string, number[]>,
  closeSeries: number[],
  inputs: ResolvedInputs,
  aux: ComputeCacheAux | undefined,
  advanceKind: CandleSeriesAdvanceKind | undefined,
): { ok: boolean; aux?: ComputeCacheAux } {
  const macdSeries = data.macd;
  const signalSeries = data.signal;
  const histSeries = data.histogram;
  if (!macdSeries || !signalSeries || !histSeries) return { ok: false };
  if (aux?.emaFast == null || aux?.emaSlow == null) return { ok: false };

  const { fast, slow, signal: signalPeriod } = resolveMacdInputs(inputs);
  const n = closeSeries.length;
  const i = n - 1;
  const kFast = 2 / (fast + 1);
  const kSlow = 2 / (slow + 1);

  if (advanceKind === 'append') {
    macdSeries.push(NaN);
    signalSeries.push(NaN);
    histSeries.push(NaN);
  }

  if (i < Math.max(fast, slow) - 1) return { ok: false };

  const emaFastVal = closeSeries[i]! * kFast + aux.emaFast * (1 - kFast);
  const emaSlowVal = closeSeries[i]! * kSlow + aux.emaSlow * (1 - kSlow);
  const macdVal = emaFastVal - emaSlowVal;

  macdSeries[i] = macdVal;
  const signalArr = emaNullable(macdSeries, signalPeriod);
  for (let j = 0; j < n; j++) {
    signalSeries[j] = signalArr[j]!;
    if (Number.isFinite(macdSeries[j]) && Number.isFinite(signalArr[j])) {
      histSeries[j] = macdSeries[j]! - signalArr[j]!;
    } else {
      histSeries[j] = NaN;
    }
  }

  const signalVal = signalArr[i];
  if (!Number.isFinite(signalVal)) return { ok: false };

  return {
    ok: true,
    aux: {
      emaFast: emaFastVal,
      emaSlow: emaSlowVal,
      signalEma: signalVal,
    },
  };
}

function updateVwapTip(
  data: Record<string, number[]>,
  candles: Candle[],
  aux: ComputeCacheAux | undefined,
  advanceKind: CandleSeriesAdvanceKind | undefined,
): { ok: boolean; aux?: ComputeCacheAux } {
  const key = 'vwap';
  const series = data[key];
  if (!series) return { ok: false };

  const n = candles.length;
  const i = n - 1;
  const last = candles[i]!;
  const vol = last.v ?? 0;
  const tp = (last.h + last.l + last.c) / 3;
  const tipContribution = tp * vol;

  if (advanceKind === 'append') {
    series.push(NaN);
    if (aux?.cumTpVol == null || aux?.cumVol == null) return { ok: false };
    const cumTpVol = aux.cumTpVol + tipContribution;
    const cumVol = aux.cumVol + vol;
    series[i] = cumVol > 0 ? cumTpVol / cumVol : NaN;
    return {
      ok: true,
      aux: { cumTpVol, cumVol, lastTipTpVol: tipContribution },
    };
  }

  if (aux?.cumTpVol == null || aux?.cumVol == null || aux?.lastTipTpVol == null) {
    return { ok: false };
  }

  const cumTpVol = aux.cumTpVol - aux.lastTipTpVol + tipContribution;
  const cumVol = aux.cumVol;
  series[i] = cumVol > 0 ? cumTpVol / cumVol : NaN;
  return {
    ok: true,
    aux: { cumTpVol, cumVol, lastTipTpVol: tipContribution },
  };
}

export function tryIncrementalTipUpdate(
  pluginName: string,
  candles: Candle[],
  inputs: ResolvedInputs,
  prevData: Record<string, number[]>,
  prevAux: ComputeCacheAux | undefined,
  advanceKind: CandleSeriesAdvanceKind | undefined,
): { data: Record<string, number[]>; aux: ComputeCacheAux | undefined } | null {
  if (!supportsIncrementalTipUpdate(pluginName)) return null;

  const data = cloneSeries(prevData);
  const closeSeries = closes(candles);

  switch (pluginName) {
    case 'EMA': {
      const period = resolvePeriod(inputs, 20);
      return updateEmaTip(data, closeSeries, period, advanceKind)
        ? { data, aux: buildComputeCacheAux(pluginName, candles, inputs, data) }
        : null;
    }
    case 'MA': {
      const period = resolvePeriod(inputs, 20);
      return updateMaTip(data, closeSeries, period, advanceKind)
        ? { data, aux: undefined }
        : null;
    }
    case 'RSI': {
      const period = resolvePeriod(inputs, 14);
      const result = updateRsiTip(data, closeSeries, period, prevAux, advanceKind);
      return result.ok ? { data, aux: result.aux } : null;
    }
    case 'ATR': {
      const period = resolvePeriod(inputs, 14);
      const result = updateAtrTip(data, candles, period, prevAux, advanceKind);
      return result.ok ? { data, aux: result.aux } : null;
    }
    case 'MACD': {
      const data = macdPlugin.compute?.(candles, inputs);
      if (!data) return null;
      return {
        data,
        aux: buildComputeCacheAux(pluginName, candles, inputs, data),
      };
    }
    case 'VWAP': {
      const result = updateVwapTip(data, candles, prevAux, advanceKind);
      return result.ok ? { data, aux: result.aux } : null;
    }
    default:
      return null;
  }
}

/** Parity helper — compare incremental output to full recompute within tolerance. */
export function assertTipParity(
  pluginName: string,
  candles: Candle[],
  inputs: ResolvedInputs,
  incremental: Record<string, number[]>,
  tolerance = 1e-9,
): boolean {
  let full: Record<string, number[]>;
  switch (pluginName) {
    case 'EMA':
      full = { ema: ema(closes(candles), resolvePeriod(inputs, 20)) };
      break;
    case 'MA':
      full = { ma: sma(closes(candles), resolvePeriod(inputs, 20)) };
      break;
    case 'RSI':
      full = { rsi: computeRsi(closes(candles), resolvePeriod(inputs, 14)) };
      break;
    case 'ATR':
      full = { atr: computeAtr(candles, resolvePeriod(inputs, 14)) };
      break;
    case 'MACD': {
      const { fast, slow, signal } = resolveMacdInputs(inputs);
      full = computeMacd(closes(candles), fast, slow, signal);
      break;
    }
    case 'VWAP':
      full = { vwap: computeVwap(candles) };
      break;
    default:
      return true;
  }

  for (const [key, expected] of Object.entries(full)) {
    const actual = incremental[key];
    if (!actual || actual.length !== expected.length) return false;
    for (let i = 0; i < actual.length; i++) {
      const a = actual[i];
      const e = expected[i];
      if (!Number.isFinite(a) && !Number.isFinite(e)) continue;
      if (!Number.isFinite(a) || !Number.isFinite(e)) return false;
      if (Math.abs(a - e) > tolerance) return false;
    }
  }
  return true;
}
