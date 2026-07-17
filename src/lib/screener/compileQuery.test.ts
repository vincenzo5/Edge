import { describe, it, expect } from "vitest";
import { SCREENER_PRESETS } from "./presets";
import {
  compileScreenQueryFromGroup,
  compileScreenQueryFromRules,
  formatQueryRuleSummary,
  groupFromScreenQuery,
  groupHasTechnicalRule,
  isTechnicalQueryRule,
  rulesFromScreenQuery,
} from "./compileQuery";

describe("formatQueryRuleSummary", () => {
  it("formats text, boolean, and range rules", () => {
    expect(formatQueryRuleSummary({ id: "1", field: "sector", value: "Technology" })).toBe(
      "Sector = Technology",
    );
    expect(formatQueryRuleSummary({ id: "2", field: "isEtf", value: true })).toBe("ETF only = yes");
    expect(
      formatQueryRuleSummary({ id: "3", field: "marketCap", min: 1_000_000_000, max: 10_000_000_000 }),
    ).toBe("Market cap 1000000000–10000000000");
    expect(formatQueryRuleSummary({ id: "4", field: "volume", min: 500_000 })).toBe(
      "Volume ≥ 500000",
    );
    expect(formatQueryRuleSummary({ id: "5", field: "dollarVolume", min: 2_000_000 })).toBe(
      "Dollar volume ≥ 2000000",
    );
  });
});

describe("compileScreenQueryFromRules", () => {
  it("compiles descriptive and range rules", () => {
    expect(
      compileScreenQueryFromRules([
        { id: "1", field: "sector", value: "Technology" },
        { id: "2", field: "marketCap", min: 10_000_000_000 },
        { id: "3", field: "isEtf", value: false },
      ], 100),
    ).toEqual({
      limit: 100,
      sector: "Technology",
      marketCap: { min: 10_000_000_000 },
      isEtf: false,
    });
  });

  it("round-trips dollarVolume through rulesFromScreenQuery", () => {
    const query = {
      price: { min: 5 },
      dollarVolume: { min: 2_000_000 },
      limit: 200,
    };
    expect(compileScreenQueryFromRules(rulesFromScreenQuery(query), 200)).toEqual(query);
  });

  it("round-trips through rulesFromScreenQuery", () => {
    const query = {
      sector: "Healthcare",
      price: { min: 5, max: 100 },
      limit: 50,
    };
    const rules = rulesFromScreenQuery(query);
    expect(compileScreenQueryFromRules(rules, 50)).toEqual(query);
  });
});

describe("compileScreenQueryFromGroup", () => {
  it("compiles OR groups on the same text field to string arrays", () => {
    expect(
      compileScreenQueryFromGroup(
        {
          id: "root",
          combinator: "and",
          children: [
            {
              id: "or-group",
              combinator: "or",
              children: [
                { id: "1", field: "sector", value: "Technology" },
                { id: "2", field: "sector", value: "Healthcare" },
              ],
            },
            { id: "3", field: "marketCap", min: 1_000_000_000 },
          ],
        },
        100,
      ),
    ).toEqual({
      limit: 100,
      sector: ["Technology", "Healthcare"],
      marketCap: { min: 1_000_000_000 },
    });
  });

  it("round-trips array sectors through groupFromScreenQuery", () => {
    const query = {
      sector: ["Technology", "Healthcare"],
      limit: 25,
    };
    const group = groupFromScreenQuery(query);
    expect(compileScreenQueryFromGroup(group, 25)).toEqual(query);
  });

  it("preserves indicator technical rule through round-trip", () => {
    const query = {
      volume: { min: 500_000 },
      technical: {
        kind: "indicator" as const,
        indicator: "MACD",
        inputs: { fast: 12, slow: 26, signal: 9 },
        series: "histogram",
        bar: "last" as const,
        op: ">" as const,
        threshold: 0,
      },
      limit: 200,
    };
    const group = groupFromScreenQuery(query);
    const technicalNode = group.children.find(isTechnicalQueryRule);
    expect(technicalNode?.technical).toEqual(query.technical);
    expect(compileScreenQueryFromGroup(group, 200)).toEqual(query);
  });

  it("preserves named-kind technical rules byte-for-byte", () => {
    const namedRules = [
      { kind: "rsi" as const, period: 14, max: 30 },
      { kind: "goldenCross" as const, fast: 50, slow: 200 },
      { kind: "fiftyTwoWeekProximity" as const, withinPct: 0.05 },
    ];
    for (const technical of namedRules) {
      const query = { volume: { min: 500_000 }, technical, limit: 200 };
      const group = groupFromScreenQuery(query);
      expect(compileScreenQueryFromGroup(group, 200).technical).toEqual(technical);
    }
  });

  it("throws when multiple technical rules are compiled", () => {
    expect(() =>
      compileScreenQueryFromGroup({
        id: "root",
        combinator: "and",
        children: [
          {
            id: "t1",
            kind: "technical",
            technical: { kind: "rsi", period: 14, max: 30 },
          },
          {
            id: "t2",
            kind: "technical",
            technical: { kind: "rsi", period: 14, min: 70 },
          },
        ],
      }),
    ).toThrow(/one technical rule/i);
  });

  it("each screener preset with technical emits a technical node", () => {
    for (const preset of SCREENER_PRESETS) {
      if (preset.kind !== "screener" || !preset.query.technical) continue;
      const group = groupFromScreenQuery(preset.query);
      expect(groupHasTechnicalRule(group)).toBe(true);
      expect(compileScreenQueryFromGroup(group, preset.query.limit ?? 200).technical).toEqual(
        preset.query.technical,
      );
    }
  });
});
