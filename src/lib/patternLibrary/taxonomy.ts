import type { PatternTaxonomy, SetupFamily, SuccessMetrics } from "./types";

export const DEFAULT_SUCCESS_METRICS: SuccessMetrics = {
  labelAgreementMin: 0.55,
  qualityAgreementMin: 0.5,
  stopErrorMaxAtr: 0.5,
  directionWilsonLowerMin: 0.5,
  longShortGapMaxPp: 10,
  confidenceCorrelationMin: 0.3,
};

export const DEFAULT_SETUP_FAMILIES: SetupFamily[] = [
  {
    id: "unclassified",
    name: "Unclassified",
    description: "Interactive capture not yet assigned to a setup family.",
    markets: ["US equities"],
    timeframes: ["5m", "15m", "1h", "4h", "1d"],
    mustHave: ["User-defined section path"],
    invalidation: "Assign a setup family when reviewing the capture.",
    qualityGuide: {
      "1": "Rough / unclear",
      "2": "Partial structure",
      "3": "Average",
      "4": "Clean",
      "5": "Textbook",
    },
    nearMisses: [],
  },
  {
    id: "pullback_in_trend",
    name: "Pullback in trend",
    description: "Higher-timeframe trend intact; counter-trend dip into support with shallow structure.",
    markets: ["US equities", "index futures"],
    timeframes: ["15m", "1h", "4h"],
    mustHave: [
      "Clear higher-timeframe trend direction",
      "Pullback holds prior swing structure",
      "Volume dries up on pullback leg",
    ],
    invalidation: "Close below pullback low / broken swing structure on signal timeframe.",
    qualityGuide: {
      "1": "Trend unclear or choppy overlap",
      "2": "Trend ok but pullback messy / wide spread",
      "3": "Clean structure, average context",
      "4": "Textbook alignment across TFs",
      "5": "A+ — tight risk, catalyst, liquidity",
    },
    nearMisses: [
      "Deep retrace that looks like reversal",
      "Pullback into resistance instead of support",
      "Gap against trend without acceptance",
    ],
  },
  {
    id: "breakout_retest",
    name: "Breakout retest",
    description: "Level breaks with acceptance; first retest holds as new support/resistance.",
    markets: ["US equities", "crypto"],
    timeframes: ["15m", "1h", "4h"],
    mustHave: [
      "Defined level with multiple touches",
      "Decisive break with follow-through",
      "Retest holds without reclaiming range",
    ],
    invalidation: "Full reclaim back inside prior range on closing basis.",
    qualityGuide: {
      "1": "Level untested / single touch only",
      "2": "Break without volume or follow-through",
      "3": "Valid break; retest forming",
      "4": "Clean retest with rejection wick",
      "5": "Multi-day base + volume expansion",
    },
    nearMisses: [
      "False breakout (no acceptance)",
      "Retest that slices through level",
      "Break on low liquidity open only",
    ],
  },
  {
    id: "range_fade",
    name: "Range fade",
    description: "Mean reversion at range extremes when trend is absent on signal TF.",
    markets: ["US equities"],
    timeframes: ["5m", "15m", "1h"],
    mustHave: [
      "Horizontal boundaries respected recently",
      "No higher-TF trend acceleration into level",
      "Rejection signal at boundary",
    ],
    invalidation: "Close beyond range boundary with expansion.",
    qualityGuide: {
      "1": "Range not established",
      "2": "Boundary test but weak rejection",
      "3": "Defined range; average location",
      "4": "Multiple touches; tight range",
      "5": "Extreme of range + divergence",
    },
    nearMisses: [
      "Early fade before boundary",
      "Range morphing into flag",
      "News-driven expansion day",
    ],
  },
  {
    id: "failed_breakdown",
    name: "Failed breakdown (spring)",
    description: "Price breaks support then quickly reclaims — trapped shorts.",
    markets: ["US equities", "index futures"],
    timeframes: ["15m", "1h"],
    mustHave: [
      "Prior support level",
      "Undercut and reclaim within few bars",
      "Volume spike on reclaim",
    ],
    invalidation: "Acceptance back below reclaimed level.",
    qualityGuide: {
      "1": "No clear level",
      "2": "Slow reclaim / overlapping bars",
      "3": "Standard spring shape",
      "4": "Sharp reclaim + hold",
      "5": "HTF support + breadth confirmation",
    },
    nearMisses: [
      "True breakdown continuation",
      "Reclaim that fails next session",
      "Low-volume undercut only",
    ],
  },
  {
    id: "momentum_continuation",
    name: "Momentum continuation",
    description: "Strong trend day or leg; entry on first orderly pause or flag.",
    markets: ["US equities", "crypto"],
    timeframes: ["5m", "15m"],
    mustHave: [
      "Large impulse leg vs recent ATR",
      "Orderly consolidation (not wide chop)",
      "No major overhead supply yet",
    ],
    invalidation: "Loss of consolidation low (long) or high (short).",
    qualityGuide: {
      "1": "Impulse weak / overlapping",
      "2": "Flag too wide or too long",
      "3": "Standard flag after impulse",
      "4": "Tight flag + volume dry-up",
      "5": "Leader + sector tailwind",
    },
    nearMisses: [
      "Exhaustion spike without base",
      "Late entry after extension",
      "Flag in middle of nowhere",
    ],
  },
  {
    id: "reversal_climax",
    name: "Reversal climax",
    description: "Extended move ends with climactic volume/ range; first structural shift.",
    markets: ["US equities", "crypto"],
    timeframes: ["15m", "1h", "4h"],
    mustHave: [
      "Extended move vs mean",
      "Climactic bar or cluster",
      "Lower high / higher low forming",
    ],
    invalidation: "New extreme in trend direction after entry.",
    qualityGuide: {
      "1": "No extension / no climax",
      "2": "Climax but no structure shift",
      "3": "Early reversal signs",
      "4": "Clear shift + retest",
      "5": "Multi-TF divergence + level",
    },
    nearMisses: [
      "Pause in trend mistaken for reversal",
      "Single wick without follow-through",
      "Counter-trend without HTF reason",
    ],
  },
];

export function createDefaultTaxonomy(traderId = "default"): PatternTaxonomy {
  return {
    version: 1,
    traderId,
    updatedAt: new Date().toISOString(),
    setupFamilies: DEFAULT_SETUP_FAMILIES,
    successMetrics: DEFAULT_SUCCESS_METRICS,
  };
}

export function getSetupFamily(
  taxonomy: PatternTaxonomy,
  familyId: string,
): SetupFamily | undefined {
  return taxonomy.setupFamilies.find((f) => f.id === familyId);
}

export function validateRecordFamily(
  taxonomy: PatternTaxonomy,
  familyId: string,
): boolean {
  return taxonomy.setupFamilies.some((f) => f.id === familyId);
}
