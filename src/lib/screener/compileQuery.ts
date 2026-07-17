import type { TechnicalRule } from "@/lib/marketData/schemas/request";
import type { ScreenQuery } from "./types";
import { formatTechnicalRuleSummary } from "./validateIndicatorRule";

export type QueryRuleField =
  | "sector"
  | "industry"
  | "country"
  | "exchange"
  | "isEtf"
  | "marketCap"
  | "price"
  | "beta"
  | "volume"
  | "dollarVolume"
  | "dividend";

export type QueryRule = {
  id: string;
  field: QueryRuleField;
  value?: string | boolean;
  min?: number;
  max?: number;
};

export type TechnicalQueryRule = {
  id: string;
  kind: "technical";
  technical: TechnicalRule;
};

export type RuleGroupChild = QueryRule | TechnicalQueryRule | RuleGroup;

export type RuleGroup = {
  id: string;
  combinator: "and" | "or";
  children: RuleGroupChild[];
};

export const QUERY_RULE_FIELDS: { id: QueryRuleField; label: string; kind: "text" | "boolean" | "range" }[] = [
  { id: "sector", label: "Sector", kind: "text" },
  { id: "industry", label: "Industry", kind: "text" },
  { id: "country", label: "Country", kind: "text" },
  { id: "exchange", label: "Exchange", kind: "text" },
  { id: "isEtf", label: "ETF only", kind: "boolean" },
  { id: "marketCap", label: "Market cap", kind: "range" },
  { id: "price", label: "Price", kind: "range" },
  { id: "beta", label: "Beta", kind: "range" },
  { id: "volume", label: "Volume", kind: "range" },
  { id: "dollarVolume", label: "Dollar volume", kind: "range" },
  { id: "dividend", label: "Dividend", kind: "range" },
];

function queryRuleFieldMeta(field: QueryRuleField) {
  return QUERY_RULE_FIELDS.find((entry) => entry.id === field) ?? QUERY_RULE_FIELDS[0];
}

export function formatQueryRuleSummary(rule: QueryRule): string {
  const meta = queryRuleFieldMeta(rule.field);
  if (meta.kind === "text") {
    const value = typeof rule.value === "string" ? rule.value.trim() : "";
    return value ? `${meta.label} = ${value}` : meta.label;
  }
  if (meta.kind === "boolean") {
    if (rule.value === true) return `${meta.label} = yes`;
    if (rule.value === false) return `${meta.label} = no`;
    return meta.label;
  }
  const min = rule.min;
  const max = rule.max;
  if (min != null && max != null) return `${meta.label} ${min}–${max}`;
  if (min != null) return `${meta.label} ≥ ${min}`;
  if (max != null) return `${meta.label} ≤ ${max}`;
  return meta.label;
}

export function collectFilterSummaries(group: RuleGroup): string[] {
  const summaries: string[] = [];
  for (const child of group.children) {
    if (isRuleGroup(child)) {
      summaries.push(...collectFilterSummaries(child));
    } else if (isTechnicalQueryRule(child)) {
      summaries.push(formatTechnicalRuleSummary(child.technical));
    } else {
      summaries.push(formatQueryRuleSummary(child));
    }
  }
  return summaries;
}

export function collectRuleGroupNodeIds(group: RuleGroup): string[] {
  const ids: string[] = [];
  for (const child of group.children) {
    if (isRuleGroup(child)) {
      ids.push(child.id);
      ids.push(...collectRuleGroupNodeIds(child));
    } else {
      ids.push(child.id);
    }
  }
  return ids;
}

const TEXT_OR_FIELDS = new Set<QueryRuleField>([
  "sector",
  "industry",
  "country",
  "exchange",
]);

export function createDefaultRuleGroup(): RuleGroup {
  return {
    id: "root",
    combinator: "and",
    children: [],
  };
}

export function isRuleGroup(node: RuleGroupChild): node is RuleGroup {
  return "children" in node && Array.isArray(node.children);
}

export function isTechnicalQueryRule(node: RuleGroupChild): node is TechnicalQueryRule {
  return "kind" in node && node.kind === "technical";
}

export function isFundamentalQueryRule(node: RuleGroupChild): node is QueryRule {
  return !isRuleGroup(node) && !isTechnicalQueryRule(node);
}

export function groupHasTechnicalRule(group: RuleGroup): boolean {
  for (const child of group.children) {
    if (isTechnicalQueryRule(child)) return true;
    if (isRuleGroup(child) && groupHasTechnicalRule(child)) return true;
  }
  return false;
}

export function createDefaultIndicatorTechnicalRule(): TechnicalRule {
  return {
    kind: "indicator",
    indicator: "RSI",
    inputs: { period: 14 },
    series: "rsi",
    bar: "last",
    op: "<=",
    threshold: 30,
  };
}

export function createDefaultTechnicalQueryRule(): TechnicalQueryRule {
  return {
    id: nextQueryNodeId("technical"),
    kind: "technical",
    technical: createDefaultIndicatorTechnicalRule(),
  };
}

export function compileScreenQueryFromRules(
  rules: QueryRule[],
  limit = 200,
): ScreenQuery {
  return compileScreenQueryFromGroup(
    {
      id: "root",
      combinator: "and",
      children: rules,
    },
    limit,
  );
}

export type CompileScreenQueryOptions = {
  /** When true, silently keep the first technical rule if multiple exist. Default: false (throws). */
  allowDuplicateTechnical?: boolean;
};

export function compileScreenQueryFromGroup(
  group: RuleGroup,
  limit = 200,
  options: CompileScreenQueryOptions = {},
): ScreenQuery {
  const query: ScreenQuery = { limit };
  let technicalAssigned = false;
  applyGroupToQuery(group, query, {
    ...options,
    onTechnicalRule: (technical) => {
      if (technicalAssigned) {
        if (options.allowDuplicateTechnical) return;
        throw new Error("Only one technical rule is allowed per screen");
      }
      query.technical = technical;
      technicalAssigned = true;
    },
  });
  return query;
}

type ApplyGroupContext = CompileScreenQueryOptions & {
  onTechnicalRule: (technical: TechnicalRule) => void;
};

function applyGroupToQuery(group: RuleGroup, query: ScreenQuery, ctx: ApplyGroupContext): void {
  if (group.combinator === "and") {
    const deferredTextRules: QueryRule[] = [];
    for (const child of group.children) {
      if (isRuleGroup(child)) {
        applyGroupToQuery(child, query, ctx);
      } else if (isTechnicalQueryRule(child)) {
        ctx.onTechnicalRule(child.technical);
      } else if (TEXT_OR_FIELDS.has(child.field) && typeof child.value === "string") {
        deferredTextRules.push(child);
      } else {
        applyRuleToQuery(child, query);
      }
    }

    const byField = new Map<QueryRuleField, string[]>();
    for (const rule of deferredTextRules) {
      if (typeof rule.value !== "string") continue;
      const value = rule.value.trim();
      if (!value) continue;
      const list = byField.get(rule.field) ?? [];
      list.push(value);
      byField.set(rule.field, list);
    }
    for (const [field, values] of byField.entries()) {
      setTextFieldOrArray(query, field, [...new Set(values)]);
    }
    return;
  }

  const orRules = group.children.filter(isFundamentalQueryRule);
  const orGroups = group.children.filter(isRuleGroup);
  const orTechnical = group.children.filter(isTechnicalQueryRule);
  for (const nested of orGroups) {
    applyGroupToQuery(nested, query, ctx);
  }
  for (const technical of orTechnical) {
    ctx.onTechnicalRule(technical.technical);
  }

  const byField = new Map<QueryRuleField, QueryRule[]>();
  for (const rule of orRules) {
    const list = byField.get(rule.field) ?? [];
    list.push(rule);
    byField.set(rule.field, list);
  }

  for (const [field, rules] of byField.entries()) {
    if (TEXT_OR_FIELDS.has(field) && rules.length > 1) {
      const values = rules
        .map((rule) => (typeof rule.value === "string" ? rule.value.trim() : ""))
        .filter(Boolean);
      if (values.length > 0) {
        setTextFieldOrArray(query, field, values);
      }
      continue;
    }
    for (const rule of rules) {
      applyRuleToQuery(rule, query);
    }
  }
}

function setTextFieldOrArray(
  query: ScreenQuery,
  field: QueryRuleField,
  values: string[],
): void {
  const unique = [...new Set(values)];
  if (unique.length === 1) {
    setTextField(query, field, unique[0]);
    return;
  }
  switch (field) {
    case "sector":
      query.sector = unique;
      break;
    case "industry":
      query.industry = unique;
      break;
    case "country":
      query.country = unique;
      break;
    case "exchange":
      query.exchange = unique;
      break;
    default:
      break;
  }
}

function setTextField(query: ScreenQuery, field: QueryRuleField, value: string): void {
  switch (field) {
    case "sector":
      query.sector = value;
      break;
    case "industry":
      query.industry = value;
      break;
    case "country":
      query.country = value;
      break;
    case "exchange":
      query.exchange = value;
      break;
    default:
      break;
  }
}

function applyRuleToQuery(rule: QueryRule, query: ScreenQuery): void {
  switch (rule.field) {
    case "sector":
      if (typeof rule.value === "string" && rule.value.trim()) {
        query.sector = rule.value.trim();
      }
      break;
    case "industry":
      if (typeof rule.value === "string" && rule.value.trim()) {
        query.industry = rule.value.trim();
      }
      break;
    case "country":
      if (typeof rule.value === "string" && rule.value.trim()) {
        query.country = rule.value.trim();
      }
      break;
    case "exchange":
      if (typeof rule.value === "string" && rule.value.trim()) {
        query.exchange = rule.value.trim();
      }
      break;
    case "isEtf":
      if (typeof rule.value === "boolean") {
        query.isEtf = rule.value;
      }
      break;
    case "marketCap":
      query.marketCap = rangeFromRule(rule);
      break;
    case "price":
      query.price = rangeFromRule(rule);
      break;
    case "beta":
      query.beta = rangeFromRule(rule);
      break;
    case "volume":
      query.volume = rangeFromRule(rule);
      break;
    case "dollarVolume":
      query.dollarVolume = rangeFromRule(rule);
      break;
    case "dividend":
      query.dividend = rangeFromRule(rule);
      break;
    default:
      break;
  }
}

function rangeFromRule(rule: QueryRule): { min?: number; max?: number } | undefined {
  const range: { min?: number; max?: number } = {};
  if (rule.min != null && Number.isFinite(rule.min)) range.min = rule.min;
  if (rule.max != null && Number.isFinite(rule.max)) range.max = rule.max;
  return Object.keys(range).length > 0 ? range : undefined;
}

export function rulesFromScreenQuery(query: ScreenQuery): QueryRule[] {
  return groupFromScreenQuery(query).children.filter(isFundamentalQueryRule);
}

export function groupFromScreenQuery(query: ScreenQuery): RuleGroup {
  const children: RuleGroupChild[] = [];
  let index = 0;
  const push = (field: QueryRuleField, patch: Omit<QueryRule, "id" | "field">) => {
    children.push({ id: `rule-${index++}`, field, ...patch });
  };

  const pushTextOrArray = (field: QueryRuleField, value: string | string[] | undefined) => {
    if (!value) return;
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry.trim()) push(field, { value: entry.trim() });
      }
      return;
    }
    if (value.trim()) push(field, { value: value.trim() });
  };

  pushTextOrArray("sector", query.sector);
  pushTextOrArray("industry", query.industry);
  pushTextOrArray("country", query.country);
  pushTextOrArray("exchange", query.exchange);
  if (query.isEtf != null) push("isEtf", { value: query.isEtf });
  if (query.marketCap) push("marketCap", query.marketCap);
  if (query.price) push("price", query.price);
  if (query.beta) push("beta", query.beta);
  if (query.volume) push("volume", query.volume);
  if (query.dollarVolume) push("dollarVolume", query.dollarVolume);
  if (query.dividend) push("dividend", query.dividend);

  if (query.technical) {
    children.push({
      id: "rule-technical",
      kind: "technical",
      technical: query.technical,
    });
  }

  return {
    id: "root",
    combinator: "and",
    children,
  };
}

export function nextQueryNodeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
