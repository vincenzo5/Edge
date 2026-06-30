import type { TechnicalRule } from "@/lib/marketData/schemas/request";
import type { QueryRuleField, RuleGroup, RuleGroupChild } from "./compileQuery";
import { isRuleGroup, isTechnicalQueryRule } from "./compileQuery";
import { patchScreenerState } from "./screenStorage";
import type { ScreenerColumnId, ScreenerResultRow, ScreenerSortSpec, ScreenerState, PersistedScreenerSortSpec } from "./types";
import { isScreenerColumnId } from "./types";

const RANGE_FIELDS = new Set<QueryRuleField>([
  "marketCap",
  "price",
  "beta",
  "volume",
  "dividend",
]);

const FIELD_TO_COLUMN: Partial<Record<QueryRuleField, ScreenerColumnId>> = {
  sector: "sector",
  industry: "industry",
  country: "country",
  marketCap: "marketCap",
  price: "price",
  beta: "beta",
  volume: "volume",
  dividend: "dividendYield",
};

export function primaryIndicatorKeyForTechnicalRule(rule: TechnicalRule): string | null {
  switch (rule.kind) {
    case "rsi":
      return "rsi";
    case "goldenCross":
      return "smaSpread";
    case "fiftyTwoWeekProximity":
      return "fiftyTwoWeekDistance";
    case "indicator": {
      if (rule.transform?.kind === "bollPctB") return "bollPctB";
      return rule.series;
    }
    default:
      return null;
  }
}

function sortDirectionForField(field: QueryRuleField): "asc" | "desc" {
  return RANGE_FIELDS.has(field) ? "desc" : "asc";
}

function deriveFromLeadingChild(child: RuleGroupChild | undefined): ScreenerSortSpec | null {
  if (!child) return null;
  if (isRuleGroup(child)) {
    return deriveFromLeadingChild(child.children[0]);
  }
  if (isTechnicalQueryRule(child)) {
    const key = primaryIndicatorKeyForTechnicalRule(child.technical);
    return key ? { column: key, direction: "desc" } : null;
  }
  const column = FIELD_TO_COLUMN[child.field];
  if (!column) return null;
  return { column, direction: sortDirectionForField(child.field) };
}

export function deriveDefaultSortFromRoot(root: RuleGroup): ScreenerSortSpec | null {
  return deriveFromLeadingChild(root.children[0]);
}

export function compareScreenerRows(
  a: ScreenerResultRow,
  b: ScreenerResultRow,
  sort: ScreenerSortSpec,
  indicatorValues?: Record<string, Record<string, number>>,
): number {
  const column = sort.column;
  let av: number | string | null;
  let bv: number | string | null;

  if (isScreenerColumnId(column)) {
    av = a[column as keyof ScreenerResultRow] as number | string | null;
    bv = b[column as keyof ScreenerResultRow] as number | string | null;
  } else if (indicatorValues) {
    const aKey = a.symbol.trim().toUpperCase();
    const bKey = b.symbol.trim().toUpperCase();
    av = indicatorValues[aKey]?.[column] ?? null;
    bv = indicatorValues[bKey]?.[column] ?? null;
  } else {
    return 0;
  }

  if (av == null && bv == null) return 0;
  if (av == null) return 1;
  if (bv == null) return -1;
  if (typeof av === "number" && typeof bv === "number") {
    return sort.direction === "asc" ? av - bv : bv - av;
  }
  const left = String(av).toLowerCase();
  const right = String(bv).toLowerCase();
  const cmp = left.localeCompare(right);
  return sort.direction === "asc" ? cmp : -cmp;
}

export function applyLeadingRuleTableDefaults(state: ScreenerState, root: RuleGroup): {
  state: ScreenerState;
  displaySort: ScreenerSortSpec | null;
} {
  const derived = deriveDefaultSortFromRoot(root);
  if (!derived) return { state, displaySort: null };

  let columns = state.columns;
  if (isScreenerColumnId(derived.column)) {
    columns = columns.includes(derived.column) ? columns : [...columns, derived.column];
  }

  const persistedSort = isScreenerColumnId(derived.column)
    ? ({ column: derived.column, direction: derived.direction } satisfies PersistedScreenerSortSpec)
    : state.sort ?? null;

  return {
    state: patchScreenerState(state, {
      columns,
      sort: persistedSort,
    }),
    displaySort: derived,
  };
}
