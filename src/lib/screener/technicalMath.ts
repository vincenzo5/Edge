import { candleValueFingerprint } from "@edge/chart-core/indicatorCompute";
import { resolveIndicatorInputs } from "@edge/chart-core/indicatorInputs";
import { getIndicator, isIndicatorImplemented } from "@edge/chart-core/indicators";
import { closes, computeRsi, highest, sma } from "@edge/chart-core/indicators/math";
import type { EquityCandle } from "@/lib/marketData/contracts/equities";
import type { Range } from "@/lib/chart/contracts";
import type {
  IndicatorTechnicalRule,
  IndicatorRuleTransform,
  TechnicalRule,
} from "@/lib/marketData/schemas/request";

export const FIFTY_TWO_WEEK_LOOKBACK = 252;

export type TechnicalRuleEvaluation = {
  passes: boolean;
  value: number | null;
  seriesKey?: string;
};

function lastFinite(values: number[]): number | null {
  for (let i = values.length - 1; i >= 0; i -= 1) {
    const value = values[i];
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function firstFinite(values: number[]): number | null {
  for (let i = 0; i < values.length; i += 1) {
    const value = values[i];
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function pickBarValue(series: number[], bar: "last" | "first"): number | null {
  return bar === "last" ? lastFinite(series) : firstFinite(series);
}

function compareValue(value: number, op: IndicatorTechnicalRule["op"], threshold: number): boolean {
  switch (op) {
    case ">":
      return value > threshold;
    case ">=":
      return value >= threshold;
    case "<":
      return value < threshold;
    case "<=":
      return value <= threshold;
    case "==":
      return value === threshold;
    default:
      return false;
  }
}

function computeBollPctBSeries(
  data: Record<string, number[]>,
  candles: EquityCandle[],
): number[] {
  const upper = data.upper ?? [];
  const lower = data.lower ?? [];
  const length = Math.min(upper.length, lower.length, candles.length);
  const series = new Array<number>(length).fill(Number.NaN);
  for (let i = 0; i < length; i += 1) {
    const up = upper[i];
    const lo = lower[i];
    const close = candles[i]?.c;
    if (
      close == null ||
      !Number.isFinite(up) ||
      !Number.isFinite(lo) ||
      !Number.isFinite(close) ||
      up === lo
    ) {
      continue;
    }
    series[i] = (close - lo) / (up - lo);
  }
  return series;
}

function applyIndicatorTransform(
  data: Record<string, number[]>,
  transform: IndicatorRuleTransform | undefined,
  candles: EquityCandle[],
  seriesKey: string,
): { series: number[]; resolvedKey: string } {
  if (transform?.kind === "bollPctB") {
    return { series: computeBollPctBSeries(data, candles), resolvedKey: "bollPctB" };
  }
  return { series: data[seriesKey] ?? [], resolvedKey: seriesKey };
}

export function evaluateIndicatorRule(
  rule: IndicatorTechnicalRule,
  candles: EquityCandle[],
): TechnicalRuleEvaluation {
  const plugin = getIndicator(rule.indicator);
  if (!plugin || !isIndicatorImplemented(plugin)) {
    return { passes: false, value: null };
  }

  const inputs = resolveIndicatorInputs(plugin, { inputs: rule.inputs });
  const data = plugin.compute?.(candles, inputs) ?? {};
  const { series, resolvedKey } = applyIndicatorTransform(
    data,
    rule.transform,
    candles,
    rule.series,
  );
  const value = pickBarValue(series, rule.bar);
  if (value == null || Number.isNaN(value)) {
    return { passes: false, value: null, seriesKey: resolvedKey };
  }
  return {
    passes: compareValue(value, rule.op, rule.threshold),
    value,
    seriesKey: resolvedKey,
  };
}

export function computeRsiForLast(candles: EquityCandle[], period: number): number | null {
  if (candles.length <= period) return null;
  const series = computeRsi(closes(candles), period);
  return lastFinite(series);
}

export function computeSmaForLast(candles: EquityCandle[], period: number): number | null {
  if (candles.length < period) return null;
  const series = sma(closes(candles), period);
  return lastFinite(series);
}

/** Distance below the rolling 52-week high as a fraction of the high (0 = at high). */
export function computeFiftyTwoWeekHighDistancePct(candles: EquityCandle[]): number | null {
  if (candles.length < FIFTY_TWO_WEEK_LOOKBACK) return null;
  const highs = candles.map((candle) => candle.h);
  const highSeries = highest(highs, FIFTY_TWO_WEEK_LOOKBACK);
  const high = lastFinite(highSeries);
  const lastClose = candles[candles.length - 1]?.c;
  if (high == null || lastClose == null || !Number.isFinite(high) || high <= 0) return null;
  return (high - lastClose) / high;
}

export function evaluateTechnicalRule(
  rule: TechnicalRule,
  candles: EquityCandle[],
): TechnicalRuleEvaluation {
  switch (rule.kind) {
    case "rsi": {
      const rsi = computeRsiForLast(candles, rule.period);
      if (rsi == null) return { passes: false, value: null, seriesKey: "rsi" };
      let passes = true;
      if (rule.min != null && rsi < rule.min) passes = false;
      if (rule.max != null && rsi > rule.max) passes = false;
      return { passes, value: rsi, seriesKey: "rsi" };
    }
    case "goldenCross": {
      const fast = computeSmaForLast(candles, rule.fast);
      const slow = computeSmaForLast(candles, rule.slow);
      if (fast == null || slow == null) {
        return { passes: false, value: null, seriesKey: "smaSpread" };
      }
      return {
        passes: fast > slow,
        value: fast - slow,
        seriesKey: "smaSpread",
      };
    }
    case "fiftyTwoWeekProximity": {
      const distance = computeFiftyTwoWeekHighDistancePct(candles);
      if (distance == null) {
        return { passes: false, value: null, seriesKey: "fiftyTwoWeekDistance" };
      }
      return {
        passes: distance >= 0 && distance <= rule.withinPct,
        value: distance,
        seriesKey: "fiftyTwoWeekDistance",
      };
    }
    case "indicator":
      return evaluateIndicatorRule(rule, candles);
    default:
      return { passes: false, value: null };
  }
}

export function minCandlesForTechnicalRule(rule: TechnicalRule): number {
  switch (rule.kind) {
    case "rsi":
      return rule.period + 1;
    case "goldenCross":
      return Math.max(rule.fast, rule.slow);
    case "fiftyTwoWeekProximity":
      return FIFTY_TWO_WEEK_LOOKBACK;
    case "indicator": {
      const plugin = getIndicator(rule.indicator);
      if (!plugin?.inputSchema) return 50;
      const periodInput = rule.inputs?.period ?? plugin.defaultInputs?.period;
      const period =
        typeof periodInput === "number" && Number.isFinite(periodInput) ? periodInput : 20;
      if (rule.indicator === "MACD") {
        const slow =
          typeof rule.inputs?.slow === "number" ? rule.inputs.slow : 26;
        const signal =
          typeof rule.inputs?.signal === "number" ? rule.inputs.signal : 9;
        return slow + signal + 5;
      }
      return Math.max(period * 2, 50);
    }
    default:
      return 1;
  }
}

/** Candle range for per-symbol fallback fetches — universe path slices local store. */
export function rangeForTechnicalRule(rule: TechnicalRule): Range {
  switch (rule.kind) {
    case "goldenCross":
    case "fiftyTwoWeekProximity":
      return "1y";
    case "indicator": {
      const plugin = getIndicator(rule.indicator);
      const periodInput = rule.inputs?.period ?? plugin?.defaultInputs?.period;
      const period =
        typeof periodInput === "number" && Number.isFinite(periodInput) ? periodInput : 20;
      if (rule.indicator === "MACD") return "1y";
      if (period >= 100) return "1y";
      return "3mo";
    }
    case "rsi":
    default:
      return "3mo";
  }
}

function stableIndicatorInputs(
  inputs: IndicatorTechnicalRule["inputs"],
): Array<[string, string | number | boolean]> {
  if (!inputs) return [];
  return Object.keys(inputs)
    .sort()
    .map((key) => [key, inputs[key]!]);
}

export function technicalRuleFingerprint(rule: TechnicalRule): string {
  if (rule.kind === "indicator") {
    return JSON.stringify({
      kind: rule.kind,
      indicator: rule.indicator,
      inputs: stableIndicatorInputs(rule.inputs),
      series: rule.series,
      bar: rule.bar,
      op: rule.op,
      threshold: rule.threshold,
      transform: rule.transform ?? null,
    });
  }
  return JSON.stringify(rule);
}

export function technicalCacheFingerprint(
  rule: TechnicalRule,
  candles: EquityCandle[],
): string {
  return `${technicalRuleFingerprint(rule)}|${candleValueFingerprint(candles)}`;
}

export { candleValueFingerprint };
