import type {
  AlertCondition,
  AlertConditionCombinator,
  AlertDefinitionResponse,
  AlertIndicatorCompareOp,
  AlertIndicatorCrossCondition,
  AlertIndicatorLevelCondition,
  AlertIndicatorName,
  AlertOperator,
  AlertPriceCondition,
  AlertScriptCondition,
  AlertSymbolState,
  AlertSymbolStateEntry,
} from "@/lib/persistence/schemas/alerts";
import { alertConditionSchema } from "@/lib/persistence/schemas/alerts";

export function buildPriceCondition(input: {
  operator: AlertOperator;
  price: number;
  priceHigh?: number | null;
}): AlertPriceCondition {
  return {
    kind: "price",
    operator: input.operator,
    price: input.price,
    priceHigh: input.priceHigh ?? null,
  };
}

export function normalizeAlertConditions(alert: Pick<
  AlertDefinitionResponse,
  "operator" | "price" | "priceHigh" | "conditions"
>): AlertCondition[] {
  if (alert.conditions?.length) {
    return alert.conditions.map((condition) => alertConditionSchema.parse(condition));
  }
  return [
    buildPriceCondition({
      operator: alert.operator,
      price: alert.price,
      priceHigh: alert.priceHigh,
    }),
  ];
}

export function denormalizeFromConditions(conditions: AlertCondition[]): {
  operator: AlertOperator;
  price: number;
  priceHigh: number | null;
} {
  const firstPrice = conditions.find((condition) => condition.kind === "price");
  if (firstPrice) {
    return {
      operator: firstPrice.operator,
      price: firstPrice.price,
      priceHigh: firstPrice.priceHigh ?? null,
    };
  }
  return {
    operator: "touch_above",
    price: 0,
    priceHigh: null,
  };
}

export function expandCreateAlertInput(input: {
  symbol?: string;
  watchlistId?: string;
  operator?: AlertOperator;
  price?: number;
  priceHigh?: number | null;
  combinator?: AlertConditionCombinator | null;
  conditions?: AlertCondition[];
}): {
  symbol: string;
  watchlistId: string | null;
  operator: AlertOperator;
  price: number;
  priceHigh: number | null;
  combinator: AlertConditionCombinator | null;
  conditions: AlertCondition[];
} {
  const conditions =
    input.conditions?.map((condition) => alertConditionSchema.parse(condition)) ??
    (input.operator != null && input.price != null
      ? [
          buildPriceCondition({
            operator: input.operator,
            price: input.price,
            priceHigh: input.priceHigh,
          }),
        ]
      : []);

  if (conditions.length === 0) {
    throw new Error("At least one alert condition is required.");
  }

  const combinator =
    conditions.length === 2 ? (input.combinator ?? null) : null;
  if (conditions.length === 2 && !combinator) {
    throw new Error("combinator is required for two conditions.");
  }

  const denormalized = denormalizeFromConditions(conditions);
  const symbol = input.watchlistId ? "*" : (input.symbol ?? "").trim().toUpperCase();

  return {
    symbol,
    watchlistId: input.watchlistId ?? null,
    operator: denormalized.operator,
    price: denormalized.price,
    priceHigh: denormalized.priceHigh,
    combinator,
    conditions,
  };
}

export function syncPriceLegFromDenormalized(
  conditions: AlertCondition[],
  patch: { operator?: AlertOperator; price?: number; priceHigh?: number | null },
): AlertCondition[] {
  const next = conditions.map((condition) => ({ ...condition }));
  const priceIndex = next.findIndex((condition) => condition.kind === "price");
  if (priceIndex < 0) return next;
  const current = next[priceIndex] as AlertPriceCondition;
  next[priceIndex] = {
    ...current,
    operator: patch.operator ?? current.operator,
    price: patch.price ?? current.price,
    priceHigh:
      patch.priceHigh !== undefined ? patch.priceHigh : current.priceHigh ?? null,
  };
  return next;
}

export function combineConditionResults(
  results: boolean[],
  combinator: AlertConditionCombinator | null | undefined,
): boolean {
  if (results.length === 0) return false;
  if (results.length === 1) return results[0] ?? false;
  if (combinator === "or") return results.some(Boolean);
  return results.every(Boolean);
}

export function shouldFireCombinedAlert(
  previousSatisfied: boolean | undefined,
  combinedSatisfied: boolean,
): boolean {
  return combinedSatisfied && previousSatisfied !== true;
}

export function getSymbolStateEntry(
  symbolState: AlertSymbolState | null | undefined,
  symbol: string,
): AlertSymbolStateEntry {
  return symbolState?.[symbol] ?? {};
}

export function compareIndicatorValue(
  value: number,
  op: AlertIndicatorCompareOp,
  threshold: number,
): boolean {
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

export function formatIndicatorLevelSummary(condition: AlertIndicatorLevelCondition): string {
  const inputs =
    condition.inputs?.period != null ? `(${String(condition.inputs.period)})` : "";
  return `${condition.indicator}${inputs} ${condition.series} ${condition.op} ${condition.threshold}`;
}

export function formatIndicatorCrossSummary(condition: AlertIndicatorCrossCondition): string {
  return `${condition.indicator} ${condition.seriesA} crosses ${condition.direction} ${condition.seriesB}`;
}

export function formatScriptConditionSummary(condition: AlertScriptCondition): string {
  const title = condition.title?.trim();
  if (title) return `${condition.scriptId}: ${title}`;
  return `${condition.scriptId} ${condition.conditionId}`;
}

export function formatConditionSummary(condition: AlertCondition): string {
  switch (condition.kind) {
    case "price":
      if (
        (condition.operator === "enter_zone" || condition.operator === "exit_zone") &&
        condition.priceHigh != null
      ) {
        return `${condition.operator} ${condition.price.toFixed(2)}–${condition.priceHigh.toFixed(2)}`;
      }
      return `${condition.operator} ${condition.price.toFixed(2)}`;
    case "indicator_level":
      return formatIndicatorLevelSummary(condition);
    case "indicator_cross":
      return formatIndicatorCrossSummary(condition);
    case "script_condition":
      return formatScriptConditionSummary(condition);
    default:
      return "condition";
  }
}

export function formatConditionsSummary(alert: Pick<
  AlertDefinitionResponse,
  "combinator" | "conditions" | "operator" | "price" | "priceHigh"
>): string {
  const conditions = normalizeAlertConditions(alert);
  if (conditions.length === 1) return formatConditionSummary(conditions[0]!);
  const join = alert.combinator === "or" ? " OR " : " AND ";
  return conditions.map((condition) => formatConditionSummary(condition)).join(join);
}

export function alertHasIndicatorConditions(alert: Pick<AlertDefinitionResponse, "conditions">): boolean {
  return (alert.conditions ?? []).some(
    (condition) => condition.kind === "indicator_level" || condition.kind === "indicator_cross",
  );
}

export function alertRequiresQuotes(conditions: AlertCondition[]): boolean {
  return conditions.some((condition) => condition.kind === "price");
}

export function alertHasScriptConditions(conditions: AlertCondition[]): boolean {
  return conditions.some((condition) => condition.kind === "script_condition");
}

export const ALERT_INDICATOR_CATALOG: Record<
  AlertIndicatorName,
  {
    defaultInputs: Record<string, number>;
    levelSeries: string[];
    crossPairs: Array<{ seriesA: string; seriesB: string; label: string }>;
  }
> = {
  RSI: {
    defaultInputs: { period: 14 },
    levelSeries: ["rsi"],
    crossPairs: [],
  },
  MACD: {
    defaultInputs: { fast: 12, slow: 26, signal: 9 },
    levelSeries: ["macd", "signal", "histogram"],
    crossPairs: [{ seriesA: "macd", seriesB: "signal", label: "MACD / Signal" }],
  },
  MA: {
    defaultInputs: { period: 20 },
    levelSeries: ["ma"],
    crossPairs: [],
  },
  EMA: {
    defaultInputs: { period: 20 },
    levelSeries: ["ema"],
    crossPairs: [],
  },
};
