import { resolveIndicatorInputs } from "@edge/chart-core/indicatorInputs";
import { getIndicator, isIndicatorImplemented } from "@edge/chart-core/indicators";

import {
  compareIndicatorValue,
} from "@/lib/alerts/alertConditions";
import type {
  AlertIndicatorCrossCondition,
  AlertIndicatorLevelCondition,
  AlertSymbolStateEntry,
} from "@/lib/persistence/schemas/alerts";
import type { EquityCandle } from "@/lib/marketData/contracts/equities";
import type { Range } from "@edge/chart-core/contracts";
import type { IndicatorTechnicalRule } from "@/lib/marketData/schemas/request";
import {
  evaluateIndicatorRule,
  minCandlesForTechnicalRule,
  rangeForTechnicalRule,
} from "@/lib/screener/technicalMath";

function lastFinite(values: number[]): number | null {
  for (let i = values.length - 1; i >= 0; i -= 1) {
    const value = values[i];
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function previousFinite(values: number[]): number | null {
  for (let i = values.length - 2; i >= 0; i -= 1) {
    const value = values[i];
    if (Number.isFinite(value)) return value;
  }
  return null;
}

export function computeIndicatorSeriesData(
  condition: Pick<AlertIndicatorLevelCondition | AlertIndicatorCrossCondition, "indicator" | "inputs">,
  candles: EquityCandle[],
): Record<string, number[]> | null {
  const plugin = getIndicator(condition.indicator);
  if (!plugin || !isIndicatorImplemented(plugin)) return null;
  const inputs = resolveIndicatorInputs(plugin, { inputs: condition.inputs });
  return plugin.compute?.(candles, inputs) ?? null;
}

export function indicatorRuleFromLevelCondition(
  condition: AlertIndicatorLevelCondition,
): IndicatorTechnicalRule {
  return {
    kind: "indicator",
    indicator: condition.indicator,
    inputs: condition.inputs,
    series: condition.series,
    bar: "last",
    op: condition.op,
    threshold: condition.threshold,
  };
}

export function rangeForIndicatorCondition(
  condition: AlertIndicatorLevelCondition | AlertIndicatorCrossCondition,
): Range {
  return rangeForTechnicalRule(indicatorRuleFromLevelCondition({
    ...condition,
    kind: "indicator_level",
    series:
      condition.kind === "indicator_cross" ? condition.seriesA : condition.series,
    op: ">",
    threshold: 0,
  }));
}

export function minCandlesForIndicatorCondition(
  condition: AlertIndicatorLevelCondition | AlertIndicatorCrossCondition,
): number {
  return minCandlesForTechnicalRule(indicatorRuleFromLevelCondition({
    ...condition,
    kind: "indicator_level",
    series:
      condition.kind === "indicator_cross" ? condition.seriesA : condition.series,
    op: ">",
    threshold: 0,
  }));
}

export function evaluateIndicatorLevelCondition(
  condition: AlertIndicatorLevelCondition,
  candles: EquityCandle[],
): { satisfied: boolean; value: number | null } {
  const evaluation = evaluateIndicatorRule(indicatorRuleFromLevelCondition(condition), candles);
  return {
    satisfied: evaluation.passes,
    value: evaluation.value,
  };
}

export function evaluateIndicatorCrossCondition(
  condition: AlertIndicatorCrossCondition,
  candles: EquityCandle[],
  previous: Pick<AlertSymbolStateEntry, "lastSeriesA" | "lastSeriesB">,
): {
  satisfied: boolean;
  seriesA: number | null;
  seriesB: number | null;
} {
  const data = computeIndicatorSeriesData(condition, candles);
  if (!data) {
    return { satisfied: false, seriesA: null, seriesB: null };
  }

  const seriesAValues = data[condition.seriesA] ?? [];
  const seriesBValues = data[condition.seriesB] ?? [];
  const currentA = lastFinite(seriesAValues);
  const currentB = lastFinite(seriesBValues);
  if (currentA == null || currentB == null) {
    return { satisfied: false, seriesA: currentA, seriesB: currentB };
  }

  const prevA = previous.lastSeriesA ?? previousFinite(seriesAValues);
  const prevB = previous.lastSeriesB ?? previousFinite(seriesBValues);
  if (prevA == null || prevB == null) {
    return { satisfied: false, seriesA: currentA, seriesB: currentB };
  }

  const diffPrev = prevA - prevB;
  const diffCurr = currentA - currentB;
  const satisfied =
    condition.direction === "above"
      ? diffPrev <= 0 && diffCurr > 0
      : diffPrev >= 0 && diffCurr < 0;

  return { satisfied, seriesA: currentA, seriesB: currentB };
}

export function evaluateIndicatorLevelEdge(
  condition: AlertIndicatorLevelCondition,
  candles: EquityCandle[],
  previousValue: number | null | undefined,
): { edge: boolean; value: number | null } {
  const data = computeIndicatorSeriesData(condition, candles);
  if (!data) return { edge: false, value: null };
  const series = data[condition.series] ?? [];
  const current = lastFinite(series);
  if (current == null) return { edge: false, value: null };

  const currentlySatisfied = compareIndicatorValue(
    current,
    condition.op,
    condition.threshold,
  );
  if (previousValue == null || !Number.isFinite(previousValue)) {
    return { edge: currentlySatisfied, value: current };
  }

  const previouslySatisfied = compareIndicatorValue(
    previousValue,
    condition.op,
    condition.threshold,
  );
  return {
    edge: currentlySatisfied && !previouslySatisfied,
    value: current,
  };
}
