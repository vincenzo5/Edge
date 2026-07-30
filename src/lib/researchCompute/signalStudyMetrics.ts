import type { Candle } from "@edge/chart-core";
import {
  closes,
  computeAtr,
  computeBollinger,
  computeMacd,
  computeRsi,
  ema,
  sma,
} from "@edge/chart-core/indicators/math";

import type {
  PreviewTable,
  ResearchBar,
  SignalCompareOp,
  SignalDirection,
  SignalIndicatorId,
  SignalNode,
  SignalSeriesRef,
  SignalStudySpec,
} from "./contracts";
import { assertSignalGraphLimits } from "./contracts";
import { MAX_PREVIEW_TABLE_ROWS } from "./constants";
import { formatPercent, mean, stdDev } from "./math";

export type SignalStudyMetrics = {
  keyMetrics: Record<string, string | number>;
  previewTable: PreviewTable;
  warnings: string[];
};

type NumericSeries = number[];

function toCandles(bars: ResearchBar[]): Candle[] {
  return bars.map((bar) => ({
    t: bar.t,
    o: bar.o,
    h: bar.h,
    l: bar.l,
    c: bar.c,
    v: bar.v,
  }));
}

function resolveIndicatorSeries(
  id: SignalIndicatorId,
  candles: Candle[],
  inputs?: Record<string, number>,
  series?: string,
): NumericSeries {
  const closeSeries = closes(candles);
  switch (id) {
    case "ma": {
      const period = inputs?.period ?? 20;
      return sma(closeSeries, period);
    }
    case "ema": {
      const period = inputs?.period ?? 20;
      return ema(closeSeries, period);
    }
    case "rsi": {
      const period = inputs?.period ?? 14;
      return computeRsi(closeSeries, period);
    }
    case "atr": {
      const period = inputs?.period ?? 14;
      return computeAtr(candles, period);
    }
    case "macd": {
      const fast = inputs?.fast ?? 12;
      const slow = inputs?.slow ?? 26;
      const signalPeriod = inputs?.signal ?? 9;
      const data = computeMacd(closeSeries, fast, slow, signalPeriod);
      const key = series ?? "macd";
      if (key === "signal") return data.signal;
      if (key === "histogram") return data.histogram;
      return data.macd;
    }
    case "boll": {
      const period = inputs?.period ?? 20;
      const mult = inputs?.std ?? 2;
      const data = computeBollinger(closeSeries, period, mult);
      const key = series ?? "middle";
      if (key === "upper") return data.upper;
      if (key === "lower") return data.lower;
      return data.middle;
    }
    default:
      return new Array(closeSeries.length).fill(Number.NaN);
  }
}

function evalSeriesRef(ref: SignalSeriesRef, candles: Candle[]): NumericSeries {
  if (ref.op === "close") {
    return closes(candles);
  }
  return resolveIndicatorSeries(ref.id, candles, ref.inputs, ref.series);
}

function evalOperand(
  operand: number | SignalSeriesRef,
  candles: Candle[],
): NumericSeries | number {
  if (typeof operand === "number") return operand;
  return evalSeriesRef(operand, candles);
}

function compareSeries(
  left: NumericSeries,
  right: NumericSeries | number,
  op: SignalCompareOp,
): boolean[] {
  const length = left.length;
  const out = new Array<boolean>(length).fill(false);
  for (let index = 0; index < length; index += 1) {
    const leftValue = left[index];
    if (!Number.isFinite(leftValue)) continue;
    const rightValue = typeof right === "number" ? right : right[index];
    if (!Number.isFinite(rightValue)) continue;
    switch (op) {
      case "gt":
        out[index] = leftValue > rightValue;
        break;
      case "lt":
        out[index] = leftValue < rightValue;
        break;
      case "gte":
        out[index] = leftValue >= rightValue;
        break;
      case "lte":
        out[index] = leftValue <= rightValue;
        break;
    }
  }
  return out;
}

function evalCross(
  left: NumericSeries,
  right: NumericSeries,
  op: "cross_above" | "cross_below",
): boolean[] {
  const length = Math.min(left.length, right.length);
  const out = new Array<boolean>(length).fill(false);
  for (let index = 1; index < length; index += 1) {
    const prevLeft = left[index - 1];
    const prevRight = right[index - 1];
    const currLeft = left[index];
    const currRight = right[index];
    if (
      !Number.isFinite(prevLeft) ||
      !Number.isFinite(prevRight) ||
      !Number.isFinite(currLeft) ||
      !Number.isFinite(currRight)
    ) {
      continue;
    }
    if (op === "cross_above") {
      out[index] = prevLeft <= prevRight && currLeft > currRight;
    } else {
      out[index] = prevLeft >= prevRight && currLeft < currRight;
    }
  }
  return out;
}

function evalBollPctB(
  candles: Candle[],
  compare: SignalCompareOp,
  value: number,
  inputs?: Record<string, number>,
): boolean[] {
  const period = inputs?.period ?? 20;
  const mult = inputs?.std ?? 2;
  const closeSeries = closes(candles);
  const { upper, lower } = computeBollinger(closeSeries, period, mult);
  const pctSeries = new Array<number>(candles.length).fill(Number.NaN);
  for (let index = 0; index < candles.length; index += 1) {
    const up = upper[index];
    const lo = lower[index];
    const close = candles[index]?.c;
    if (
      close == null ||
      !Number.isFinite(up) ||
      !Number.isFinite(lo) ||
      up === lo
    ) {
      continue;
    }
    pctSeries[index] = (close - lo) / (up - lo);
  }
  return compareSeries(pctSeries, value, compare);
}

export function evalSignalEvents(node: SignalNode, candles: Candle[]): boolean[] {
  assertSignalGraphLimits(node);
  const length = candles.length;
  switch (node.op) {
    case "indicator":
      throw new Error("Indicator leaf must be wrapped in a compare or cross node");
    case "gt":
    case "lt":
    case "gte":
    case "lte": {
      const left = evalOperand(node.left, candles);
      const right = evalOperand(node.right, candles);
      if (typeof left === "number") {
        throw new Error("Compare left operand must be a series");
      }
      return compareSeries(left, right, node.op);
    }
    case "cross_above":
    case "cross_below": {
      const left = evalSeriesRef(node.left, candles);
      const right = evalSeriesRef(node.right, candles);
      return evalCross(left, right, node.op);
    }
    case "boll_pct_b":
      return evalBollPctB(candles, node.compare, node.value, node.inputs);
    case "and": {
      const masks = node.nodes.map((child) => evalSignalEvents(child, candles));
      const out = new Array<boolean>(length).fill(true);
      for (const mask of masks) {
        for (let index = 0; index < length; index += 1) {
          out[index] = out[index]! && Boolean(mask[index]);
        }
      }
      return out;
    }
    case "or": {
      const masks = node.nodes.map((child) => evalSignalEvents(child, candles));
      const out = new Array<boolean>(length).fill(false);
      for (const mask of masks) {
        for (let index = 0; index < length; index += 1) {
          out[index] = out[index]! || Boolean(mask[index]);
        }
      }
      return out;
    }
    default:
      return new Array<boolean>(length).fill(false);
  }
}

function forwardReturn(
  bars: ResearchBar[],
  eventIndex: number,
  entryLagBars: number,
  horizonBars: number,
  direction: SignalDirection,
): number | null {
  const entryIndex = eventIndex + entryLagBars;
  const exitIndex = eventIndex + entryLagBars + horizonBars - 1;
  if (exitIndex >= bars.length || entryIndex >= bars.length) return null;
  const entry = bars[entryIndex]?.c;
  const exit = bars[exitIndex]?.c;
  if (entry == null || exit == null || entry === 0) return null;
  const raw = (exit - entry) / entry;
  return direction === "short" ? -raw : raw;
}

type PartitionMetrics = {
  eventCount: number;
  hitRate: number;
  meanForwardReturn: number;
  expectancy: number;
  maxDrawdown: number;
  returns: number[];
};

function computePartitionMetrics(returns: number[]): PartitionMetrics {
  if (returns.length === 0) {
    return {
      eventCount: 0,
      hitRate: 0,
      meanForwardReturn: 0,
      expectancy: 0,
      maxDrawdown: 0,
      returns: [],
    };
  }
  const hits = returns.filter((value) => value > 0).length;
  const meanReturn = mean(returns);
  let peak = 0;
  let cumulative = 0;
  let maxDrawdown = 0;
  for (const value of returns) {
    cumulative += value;
    peak = Math.max(peak, cumulative);
    maxDrawdown = Math.max(maxDrawdown, peak - cumulative);
  }
  return {
    eventCount: returns.length,
    hitRate: hits / returns.length,
    meanForwardReturn: meanReturn,
    expectancy: meanReturn,
    maxDrawdown,
    returns,
  };
}

function bootstrapCi(returns: number[], samples: number): { low: number; high: number } | null {
  if (returns.length < 2 || samples <= 0) return null;
  const means: number[] = [];
  for (let sample = 0; sample < samples; sample += 1) {
    const draw: number[] = [];
    for (let index = 0; index < returns.length; index += 1) {
      draw.push(returns[Math.floor(Math.random() * returns.length)]!);
    }
    means.push(mean(draw));
  }
  means.sort((a, b) => a - b);
  const lowIndex = Math.floor(0.025 * (means.length - 1));
  const highIndex = Math.ceil(0.975 * (means.length - 1));
  return { low: means[lowIndex]!, high: means[highIndex]! };
}

function trailingVolatility(bars: ResearchBar[], index: number, window = 20): number {
  const start = Math.max(1, index - window + 1);
  const returns: number[] = [];
  for (let i = start; i <= index; i += 1) {
    const prev = bars[i - 1]?.c;
    const curr = bars[i]?.c;
    if (prev == null || curr == null || prev === 0) continue;
    returns.push((curr - prev) / prev);
  }
  return stdDev(returns);
}

function volTercileLabel(vol: number, terciles: [number, number]): "low" | "mid" | "high" {
  if (vol <= terciles[0]) return "low";
  if (vol <= terciles[1]) return "mid";
  return "high";
}

function prefixMetrics(
  prefix: string,
  metrics: PartitionMetrics,
): Record<string, string | number> {
  return {
    [`${prefix}.eventCount`]: metrics.eventCount,
    [`${prefix}.hitRate`]: formatPercent(metrics.hitRate),
    [`${prefix}.meanForwardReturn`]: formatPercent(metrics.meanForwardReturn),
    [`${prefix}.expectancy`]: formatPercent(metrics.expectancy),
    [`${prefix}.maxDrawdown`]: formatPercent(metrics.maxDrawdown),
  };
}

export function computeSignalStudyMetrics(args: {
  barsBySymbol: Record<string, ResearchBar[]>;
  spec: SignalStudySpec;
}): SignalStudyMetrics {
  const warnings: string[] = [];
  const spec = args.spec;
  assertSignalGraphLimits(spec.signal);

  if (spec.entryLagBars < 1) {
    warnings.push("entryLagBars must be ≥ 1 to avoid same-bar look-ahead");
  }

  const previewRows: PreviewTable["rows"] = [];
  const allTrainReturns: number[] = [];
  const allHoldoutReturns: number[] = [];

  let minT = Number.POSITIVE_INFINITY;
  let maxT = Number.NEGATIVE_INFINITY;

  for (const bars of Object.values(args.barsBySymbol)) {
    if (bars.length === 0) continue;
    minT = Math.min(minT, bars[0]!.t);
    maxT = Math.max(maxT, bars[bars.length - 1]!.t);
  }

  if (spec.trainToMs < minT || spec.trainToMs > maxT) {
    warnings.push("trainToMs falls outside dataset bar timestamps — partitions may be empty");
  }

  for (const symbol of Object.keys(args.barsBySymbol).sort()) {
    const bars = args.barsBySymbol[symbol] ?? [];
    if (bars.length === 0) continue;
    const candles = toCandles(bars);
    const events = evalSignalEvents(spec.signal, candles);
    const trainReturns: number[] = [];
    const holdoutReturns: number[] = [];

    for (let index = 0; index < events.length; index += 1) {
      if (!events[index]) continue;
      const barTime = bars[index]?.t;
      if (barTime == null) continue;
      const ret = forwardReturn(
        bars,
        index,
        spec.entryLagBars,
        spec.horizonBars,
        spec.direction,
      );
      if (ret == null || !Number.isFinite(ret)) continue;
      if (barTime <= spec.trainToMs) {
        trainReturns.push(ret);
      } else {
        holdoutReturns.push(ret);
      }
    }

    allTrainReturns.push(...trainReturns);
    allHoldoutReturns.push(...holdoutReturns);

    previewRows.push([
      symbol,
      trainReturns.length,
      formatPercent(trainReturns.length > 0 ? trainReturns.filter((v) => v > 0).length / trainReturns.length : 0),
      formatPercent(mean(trainReturns)),
      holdoutReturns.length,
      formatPercent(holdoutReturns.length > 0 ? holdoutReturns.filter((v) => v > 0).length / holdoutReturns.length : 0),
      formatPercent(mean(holdoutReturns)),
    ]);
  }

  const train = computePartitionMetrics(allTrainReturns);
  const holdout = computePartitionMetrics(allHoldoutReturns);

  if (holdout.eventCount < 5) {
    warnings.push("Holdout partition has fewer than 5 events — metrics may be unreliable");
  }
  if (train.eventCount === 0) {
    warnings.push("Train partition has zero events");
  }

  const keyMetrics: Record<string, string | number> = {
    "Horizon bars": spec.horizonBars,
    "Entry lag bars": spec.entryLagBars,
    Direction: spec.direction,
    ...prefixMetrics("train", train),
    ...prefixMetrics("holdout", holdout),
  };

  const bootstrap = bootstrapCi(allHoldoutReturns, spec.bootstrapSamples);
  if (bootstrap) {
    keyMetrics["holdout.meanReturnCiLow"] = formatPercent(bootstrap.low);
    keyMetrics["holdout.meanReturnCiHigh"] = formatPercent(bootstrap.high);
  }

  if (spec.regime === "vol_tercile") {
    const vols: number[] = [];
    for (const symbol of Object.keys(args.barsBySymbol)) {
      const bars = args.barsBySymbol[symbol] ?? [];
      const candles = toCandles(bars);
      const events = evalSignalEvents(spec.signal, candles);
      for (let index = 0; index < events.length; index += 1) {
        if (!events[index]) continue;
        vols.push(trailingVolatility(bars, index));
      }
    }
    if (vols.length >= 3) {
      const sorted = [...vols].sort((a, b) => a - b);
      const terciles: [number, number] = [
        sorted[Math.floor(sorted.length / 3)]!,
        sorted[Math.floor((2 * sorted.length) / 3)]!,
      ];
      for (const bucket of ["low", "mid", "high"] as const) {
        const bucketReturns: number[] = [];
        for (const symbol of Object.keys(args.barsBySymbol)) {
          const bars = args.barsBySymbol[symbol] ?? [];
          const candles = toCandles(bars);
          const events = evalSignalEvents(spec.signal, candles);
          for (let index = 0; index < events.length; index += 1) {
            if (!events[index]) continue;
            const label = volTercileLabel(trailingVolatility(bars, index), terciles);
            if (label !== bucket) continue;
            const ret = forwardReturn(
              bars,
              index,
              spec.entryLagBars,
              spec.horizonBars,
              spec.direction,
            );
            if (ret != null && Number.isFinite(ret)) bucketReturns.push(ret);
          }
        }
        keyMetrics[`regime.${bucket}.events`] = bucketReturns.length;
        keyMetrics[`regime.${bucket}.meanReturn`] = formatPercent(mean(bucketReturns));
      }
    }
  }

  return {
    keyMetrics,
    previewTable: {
      columns: [
        "Symbol",
        "Train events",
        "Train hit rate",
        "Train mean return",
        "Holdout events",
        "Holdout hit rate",
        "Holdout mean return",
      ],
      rows: previewRows.slice(0, MAX_PREVIEW_TABLE_ROWS),
    },
    warnings,
  };
}
