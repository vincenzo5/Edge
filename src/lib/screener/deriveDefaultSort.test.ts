import { describe, it, expect } from "vitest";
import {
  createDefaultRuleGroup,
  createDefaultTechnicalQueryRule,
  type QueryRule,
  type RuleGroup,
} from "./compileQuery";
import {
  deriveDefaultSortFromRoot,
  primaryIndicatorKeyForTechnicalRule,
} from "./deriveDefaultSort";

function rule(field: QueryRule["field"], extra: Partial<QueryRule> = {}): QueryRule {
  return { id: `rule-${field}`, field, ...extra };
}

describe("deriveDefaultSortFromRoot", () => {
  it("maps range fields to descending sort", () => {
    const root: RuleGroup = {
      id: "root",
      combinator: "and",
      children: [rule("marketCap", { min: 1_000_000_000 })],
    };
    expect(deriveDefaultSortFromRoot(root)).toEqual({
      column: "marketCap",
      direction: "desc",
    });
  });

  it("maps dividend field to dividendYield column descending", () => {
    const root: RuleGroup = {
      id: "root",
      combinator: "and",
      children: [rule("dividend", { min: 0.02 })],
    };
    expect(deriveDefaultSortFromRoot(root)).toEqual({
      column: "dividendYield",
      direction: "desc",
    });
  });

  it("maps text fields to ascending sort", () => {
    const root: RuleGroup = {
      id: "root",
      combinator: "and",
      children: [rule("sector", { value: "Technology" })],
    };
    expect(deriveDefaultSortFromRoot(root)).toEqual({
      column: "sector",
      direction: "asc",
    });
  });

  it("returns null for non-sortable exchange and isEtf rules", () => {
    expect(
      deriveDefaultSortFromRoot({
        id: "root",
        combinator: "and",
        children: [rule("exchange", { value: "NASDAQ" })],
      }),
    ).toBeNull();
    expect(
      deriveDefaultSortFromRoot({
        id: "root",
        combinator: "and",
        children: [rule("isEtf", { value: true })],
      }),
    ).toBeNull();
  });

  it("recurses into nested groups for the first child", () => {
    const root: RuleGroup = {
      id: "root",
      combinator: "and",
      children: [
        {
          id: "group-1",
          combinator: "or",
          children: [rule("volume", { min: 1_000_000 })],
        },
      ],
    };
    expect(deriveDefaultSortFromRoot(root)).toEqual({
      column: "volume",
      direction: "desc",
    });
  });

  it("returns null for empty query root", () => {
    expect(deriveDefaultSortFromRoot(createDefaultRuleGroup())).toBeNull();
  });

  it("derives indicator key sort for technical rules", () => {
    const root: RuleGroup = {
      id: "root",
      combinator: "and",
      children: [createDefaultTechnicalQueryRule()],
    };
    expect(deriveDefaultSortFromRoot(root)).toEqual({
      column: "rsi",
      direction: "desc",
    });
  });
});

describe("primaryIndicatorKeyForTechnicalRule", () => {
  it("maps built-in technical kinds to series keys", () => {
    expect(primaryIndicatorKeyForTechnicalRule({ kind: "rsi", period: 14 })).toBe("rsi");
    expect(
      primaryIndicatorKeyForTechnicalRule({ kind: "goldenCross", fast: 50, slow: 200 }),
    ).toBe("smaSpread");
    expect(
      primaryIndicatorKeyForTechnicalRule({ kind: "fiftyTwoWeekProximity", withinPct: 0.05 }),
    ).toBe("fiftyTwoWeekDistance");
  });
});
