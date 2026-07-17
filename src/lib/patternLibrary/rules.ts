import type { OhlcvBar, PatternRecord, PatternTaxonomy } from "./types";
import { extractOhlcvFeatures } from "./features";

export type RuleMatch = {
  ruleId: string;
  familyId: string;
  direction: "long" | "short" | "neutral";
  confidence: number;
  reason: string;
};

export type RuleDefinition = {
  id: string;
  familyId: string;
  direction: "long" | "short" | "neutral";
  minConfidence: number;
  evaluate: (bars: OhlcvBar[]) => { match: boolean; confidence: number; reason: string };
};

function lastBar(bars: OhlcvBar[]): OhlcvBar {
  return bars[bars.length - 1]!;
}

export const DEFAULT_RULES: RuleDefinition[] = [
  {
    id: "trend_pullback_long",
    familyId: "pullback_in_trend",
    direction: "long",
    minConfidence: 0.55,
    evaluate(bars) {
      const f = extractOhlcvFeatures(bars);
      const match =
        f.trendSlope > 0 &&
        f.impulsePct > -0.02 &&
        f.impulsePct < 0.04 &&
        f.nearLow < 0.35;
      return {
        match,
        confidence: match ? 0.65 : 0.2,
        reason: "Positive slope with shallow pullback near range low",
      };
    },
  },
  {
    id: "breakout_retest_long",
    familyId: "breakout_retest",
    direction: "long",
    minConfidence: 0.55,
    evaluate(bars) {
      const f = extractOhlcvFeatures(bars);
      const match =
        f.impulsePct > 0.03 &&
        f.higherHighs >= 2 &&
        f.nearHigh > 0.15 &&
        f.nearHigh < 0.45;
      return {
        match,
        confidence: match ? 0.7 : 0.15,
        reason: "Impulse up with higher highs; price not at absolute high",
      };
    },
  },
  {
    id: "range_fade_short",
    familyId: "range_fade",
    direction: "short",
    minConfidence: 0.5,
    evaluate(bars) {
      const f = extractOhlcvFeatures(bars);
      const match =
        Math.abs(f.trendSlope) < f.atr14 * 0.02 &&
        f.nearHigh > 0.75 &&
        f.rangePct < 0.08;
      return {
        match,
        confidence: match ? 0.6 : 0.1,
        reason: "Flat slope at range top in tight range",
      };
    },
  },
  {
    id: "failed_breakdown_long",
    familyId: "failed_breakdown",
    direction: "long",
    minConfidence: 0.55,
    evaluate(bars) {
      const f = extractOhlcvFeatures(bars);
      const bar = lastBar(bars);
      const prev = bars[bars.length - 2];
      const undercut =
        prev != null && bar.low < prev.low && bar.close > prev.close;
      const match = undercut && f.nearLow < 0.3;
      return {
        match,
        confidence: match ? 0.68 : 0.12,
        reason: "Undercut prior low with bullish close reclaim",
      };
    },
  },
  {
    id: "momentum_flag_long",
    familyId: "momentum_continuation",
    direction: "long",
    minConfidence: 0.55,
    evaluate(bars) {
      const f = extractOhlcvFeatures(bars);
      const match =
        f.impulsePct > 0.05 &&
        f.volumeTrend < 0 &&
        f.trendSlope > 0;
      return {
        match,
        confidence: match ? 0.72 : 0.1,
        reason: "Strong impulse with drying volume in uptrend",
      };
    },
  },
  {
    id: "reversal_climax_short",
    familyId: "reversal_climax",
    direction: "short",
    minConfidence: 0.5,
    evaluate(bars) {
      const f = extractOhlcvFeatures(bars);
      const match =
        f.impulsePct > 0.06 &&
        f.nearHigh > 0.85 &&
        f.volumeTrend > 0.2;
      return {
        match,
        confidence: match ? 0.66 : 0.1,
        reason: "Extended move at highs with climactic volume",
      };
    },
  },
  {
    id: "downtrend_pullback_short",
    familyId: "pullback_in_trend",
    direction: "short",
    minConfidence: 0.55,
    evaluate(bars) {
      const f = extractOhlcvFeatures(bars);
      const match =
        f.trendSlope < 0 &&
        f.impulsePct < 0.02 &&
        f.impulsePct > -0.04 &&
        f.nearHigh > 0.65;
      return {
        match,
        confidence: match ? 0.64 : 0.15,
        reason: "Negative slope with shallow rally near range high",
      };
    },
  },
];

export function evaluateRules(
  bars: OhlcvBar[],
  rules: RuleDefinition[] = DEFAULT_RULES,
): RuleMatch[] {
  return rules
    .map((rule) => {
      const result = rule.evaluate(bars);
      if (!result.match || result.confidence < rule.minConfidence) return null;
      return {
        ruleId: rule.id,
        familyId: rule.familyId,
        direction: rule.direction,
        confidence: result.confidence,
        reason: result.reason,
      };
    })
    .filter((m): m is RuleMatch => m !== null)
    .sort((a, b) => b.confidence - a.confidence);
}

export function predictFromRules(
  record: PatternRecord,
  rules: RuleDefinition[] = DEFAULT_RULES,
): {
  predictedFamilyId: string | null;
  predictedDirection: "long" | "short" | "neutral";
  predictedStop: number | null;
  confidence: number;
  matches: RuleMatch[];
} {
  const matches = evaluateRules(record.ohlcv, rules);
  if (matches.length === 0) {
    return {
      predictedFamilyId: null,
      predictedDirection: "neutral",
      predictedStop: null,
      confidence: 0,
      matches,
    };
  }
  const top = matches[0]!;
  const f = extractOhlcvFeatures(record.ohlcv);
  const stop =
    top.direction === "long"
      ? record.ohlcv[record.ohlcv.length - 1]!.low - f.atr14 * 0.5
      : top.direction === "short"
        ? record.ohlcv[record.ohlcv.length - 1]!.high + f.atr14 * 0.5
        : null;

  return {
    predictedFamilyId: top.familyId,
    predictedDirection: top.direction,
    predictedStop: stop,
    confidence: top.confidence,
    matches,
  };
}

export function rulesFromTaxonomy(_taxonomy: PatternTaxonomy): RuleDefinition[] {
  return DEFAULT_RULES;
}
