import type { EquityCandle } from "@/lib/marketData/contracts/equities";
import type {
  AlertCondition,
  AlertDefinitionResponse,
  AlertOperator,
  AlertSymbolState,
  AlertSymbolStateEntry,
} from "@/lib/persistence/schemas/alerts";
import {
  combineConditionResults,
  formatConditionsSummary,
  getSymbolStateEntry,
  normalizeAlertConditions,
  shouldFireCombinedAlert,
} from "@/lib/alerts/alertConditions";
import {
  isInsideZone,
  resolveAlertEvaluationTarget,
} from "@/lib/alerts/drawingAlertGeometry";
import {
  evaluateIndicatorCrossCondition,
  evaluateIndicatorLevelEdge,
} from "@/lib/alerts/indicatorAlertEval";
import { evaluateScriptConditionFromSnapshot } from "@/lib/alerts/scriptAlertEval";

export type AlertEvaluationInput = {
  operator: AlertOperator;
  targetPrice: number;
  quotePrice: number;
  previousPrice: number | null;
  zoneHigh?: number | null;
};

export function evaluateAlertCondition(input: AlertEvaluationInput): boolean {
  const { operator, targetPrice, quotePrice, previousPrice, zoneHigh } = input;
  if (!Number.isFinite(quotePrice) || !Number.isFinite(targetPrice)) return false;

  switch (operator) {
    case "cross_above":
      if (previousPrice == null || !Number.isFinite(previousPrice)) {
        return quotePrice >= targetPrice;
      }
      return previousPrice < targetPrice && quotePrice >= targetPrice;
    case "cross_below":
      if (previousPrice == null || !Number.isFinite(previousPrice)) {
        return quotePrice <= targetPrice;
      }
      return previousPrice > targetPrice && quotePrice <= targetPrice;
    case "touch_above":
      return quotePrice >= targetPrice;
    case "touch_below":
      return quotePrice <= targetPrice;
    case "enter_zone": {
      if (zoneHigh == null || !Number.isFinite(zoneHigh)) return false;
      if (previousPrice == null || !Number.isFinite(previousPrice)) {
        return isInsideZone(quotePrice, targetPrice, zoneHigh);
      }
      return (
        !isInsideZone(previousPrice, targetPrice, zoneHigh) &&
        isInsideZone(quotePrice, targetPrice, zoneHigh)
      );
    }
    case "exit_zone": {
      if (zoneHigh == null || !Number.isFinite(zoneHigh)) return false;
      if (previousPrice == null || !Number.isFinite(previousPrice)) {
        return !isInsideZone(quotePrice, targetPrice, zoneHigh);
      }
      return (
        isInsideZone(previousPrice, targetPrice, zoneHigh) &&
        !isInsideZone(quotePrice, targetPrice, zoneHigh)
      );
    }
    default:
      return false;
  }
}

export type AlertLegEvaluationContext = {
  alert: AlertDefinitionResponse;
  symbol: string;
  quotePrice: number | null;
  previousPrice: number | null;
  candlesByInterval: Map<string, EquityCandle[]>;
  symbolStateEntry: AlertSymbolStateEntry;
  nowMs?: number;
};

export function evaluatePriceLeg(
  alert: AlertDefinitionResponse,
  condition: Extract<AlertCondition, { kind: "price" }>,
  context: AlertLegEvaluationContext,
): boolean {
  if (context.quotePrice == null) return false;

  const target = resolveAlertEvaluationTarget(
    {
      ...alert,
      operator: condition.operator,
      price: condition.price,
      priceHigh: condition.priceHigh ?? alert.priceHigh,
    },
    context.nowMs,
  );
  if (!target) return false;

  return evaluateAlertCondition({
    operator: condition.operator,
    targetPrice: target.targetPrice,
    quotePrice: context.quotePrice,
    previousPrice: context.previousPrice,
    zoneHigh: target.zoneHigh ?? condition.priceHigh ?? null,
  });
}

export function evaluateAlertLeg(
  condition: AlertCondition,
  context: AlertLegEvaluationContext,
): {
  satisfied: boolean;
  statePatch: Partial<AlertSymbolStateEntry>;
} {
  switch (condition.kind) {
    case "price":
      return {
        satisfied: evaluatePriceLeg(context.alert, condition, context),
        statePatch: {},
      };
    case "indicator_level": {
      const candles = context.candlesByInterval.get(condition.interval) ?? [];
      const previousValue = context.symbolStateEntry.lastSeriesA;
      const { edge, value } = evaluateIndicatorLevelEdge(condition, candles, previousValue);
      return {
        satisfied: edge,
        statePatch: { lastSeriesA: value },
      };
    }
    case "indicator_cross": {
      const candles = context.candlesByInterval.get(condition.interval) ?? [];
      const result = evaluateIndicatorCrossCondition(
        condition,
        candles,
        context.symbolStateEntry,
      );
      return {
        satisfied: result.satisfied,
        statePatch: {
          lastSeriesA: result.seriesA,
          lastSeriesB: result.seriesB,
        },
      };
    }
    case "script_condition":
      return {
        satisfied: evaluateScriptConditionFromSnapshot(
          context.symbolStateEntry,
          context.nowMs,
        ),
        statePatch: {},
      };
    default:
      return { satisfied: false, statePatch: {} };
  }
}

export function evaluateCombinedAlertDefinition(input: {
  alert: AlertDefinitionResponse;
  symbol: string;
  quotePrice: number | null;
  candlesByInterval: Map<string, EquityCandle[]>;
  symbolState?: AlertSymbolState | null;
  nowMs?: number;
}): {
  shouldFire: boolean;
  combinedSatisfied: boolean;
  nextSymbolStateEntry: AlertSymbolStateEntry;
  trendlinePriceUpdate?: { price: number };
} {
  const conditions = normalizeAlertConditions(input.alert);
  const entry = getSymbolStateEntry(input.symbolState, input.symbol);
  const previousPrice =
    entry.lastPrice ?? (input.symbol === input.alert.symbol ? input.alert.lastPrice ?? null : null);
  const previousSatisfied = entry.lastSatisfied;

  const context: AlertLegEvaluationContext = {
    alert: input.alert,
    symbol: input.symbol,
    quotePrice: input.quotePrice,
    previousPrice,
    candlesByInterval: input.candlesByInterval,
    symbolStateEntry: entry,
    nowMs: input.nowMs,
  };

  const legResults: boolean[] = [];
  let statePatch: AlertSymbolStateEntry = {};

  for (const condition of conditions) {
    const leg = evaluateAlertLeg(condition, context);
    legResults.push(leg.satisfied);
    statePatch = { ...statePatch, ...leg.statePatch };
  }

  const combinedSatisfied = combineConditionResults(legResults, input.alert.combinator);
  const shouldFire = shouldFireCombinedAlert(previousSatisfied, combinedSatisfied);

  const target =
    input.alert.drawingKind === "trend_line"
      ? resolveAlertEvaluationTarget(input.alert, input.nowMs)
      : null;

  return {
    shouldFire,
    combinedSatisfied,
    nextSymbolStateEntry: {
      ...entry,
      ...statePatch,
      lastPrice: input.quotePrice ?? entry.lastPrice ?? null,
      lastSatisfied: combinedSatisfied,
    },
    trendlinePriceUpdate: target ? { price: target.targetPrice } : undefined,
  };
}

export function evaluateAlertDefinition(input: {
  alert: AlertDefinitionResponse;
  quotePrice: number;
  previousPrice: number | null;
  nowMs?: number;
}): boolean {
  const result = evaluateCombinedAlertDefinition({
    alert: input.alert,
    symbol: input.alert.symbol,
    quotePrice: input.quotePrice,
    candlesByInterval: new Map(),
    symbolState: input.alert.symbolState ?? {},
    nowMs: input.nowMs,
  });
  return result.shouldFire;
}

export function formatAlertOperatorLabel(operator: AlertOperator): string {
  switch (operator) {
    case "cross_above":
      return "Crosses above";
    case "cross_below":
      return "Crosses below";
    case "touch_above":
      return "Touches above";
    case "touch_below":
      return "Touches below";
    case "enter_zone":
      return "Enters zone";
    case "exit_zone":
      return "Exits zone";
    default:
      return operator;
  }
}

export function defaultAlertMessage(input: {
  symbol: string;
  operator: AlertOperator;
  price: number;
  priceHigh?: number | null;
  drawingKind?: AlertDefinitionResponse["drawingKind"];
  alert?: Pick<AlertDefinitionResponse, "combinator" | "conditions" | "operator" | "price" | "priceHigh">;
}): string {
  if (input.alert) {
    return `${input.symbol} ${formatConditionsSummary(input.alert)}`;
  }
  if (input.operator === "enter_zone" || input.operator === "exit_zone") {
    const high = input.priceHigh ?? input.price;
    return `${input.symbol} ${formatAlertOperatorLabel(input.operator).toLowerCase()} ${input.price.toFixed(2)}–${high.toFixed(2)}`;
  }
  if (input.drawingKind) {
    return `${input.symbol} ${formatAlertOperatorLabel(input.operator).toLowerCase()} drawing level ${input.price.toFixed(2)}`;
  }
  return `${input.symbol} ${formatAlertOperatorLabel(input.operator).toLowerCase()} ${input.price.toFixed(2)}`;
}

export function isAlertInCooldown(
  lastFiredAt: string | null | undefined,
  cooldownMs: number,
  nowMs: number = Date.now(),
): boolean {
  if (!lastFiredAt) return false;
  const firedMs = new Date(lastFiredAt).getTime();
  if (!Number.isFinite(firedMs)) return false;
  return nowMs - firedMs < cooldownMs;
}

export function formatAlertLevelSummary(
  alert: Pick<
    AlertDefinitionResponse,
    "combinator" | "conditions" | "operator" | "price" | "priceHigh" | "drawingKind"
  >,
): string {
  if (alert.conditions?.length) {
    return formatConditionsSummary(alert);
  }
  if (alert.drawingKind === "rectangle" && alert.priceHigh != null) {
    return `${formatAlertOperatorLabel(alert.operator)} ${alert.price.toFixed(2)}–${alert.priceHigh.toFixed(2)}`;
  }
  return `${formatAlertOperatorLabel(alert.operator)} ${alert.price.toFixed(2)}`;
}
