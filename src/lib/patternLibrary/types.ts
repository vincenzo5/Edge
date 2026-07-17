import { z } from "zod";

export const setupQualitySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

export type SetupQuality = z.infer<typeof setupQualitySchema>;

export const setupDecisionSchema = z.enum(["take", "pass"]);

export type SetupDecision = z.infer<typeof setupDecisionSchema>;

export const marketRegimeSchema = z.enum([
  "uptrend",
  "downtrend",
  "range",
  "volatile",
  "unknown",
]);

export type MarketRegime = z.infer<typeof marketRegimeSchema>;

export const setupFamilySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  markets: z.array(z.string()).min(1),
  timeframes: z.array(z.string()).min(1),
  mustHave: z.array(z.string()).min(1),
  invalidation: z.string().min(1),
  qualityGuide: z.record(z.string(), z.string()),
  nearMisses: z.array(z.string()),
});

export type SetupFamily = z.infer<typeof setupFamilySchema>;

export const successMetricsSchema = z.object({
  labelAgreementMin: z.number().min(0).max(1),
  qualityAgreementMin: z.number().min(0).max(1),
  stopErrorMaxAtr: z.number().positive(),
  directionWilsonLowerMin: z.number().min(0).max(1),
  longShortGapMaxPp: z.number().min(0).max(100),
  confidenceCorrelationMin: z.number().min(-1).max(1),
});

export type SuccessMetrics = z.infer<typeof successMetricsSchema>;

export const patternTaxonomySchema = z.object({
  version: z.literal(1),
  traderId: z.string().min(1),
  updatedAt: z.string().datetime(),
  setupFamilies: z.array(setupFamilySchema).min(1),
  successMetrics: successMetricsSchema,
});

export type PatternTaxonomy = z.infer<typeof patternTaxonomySchema>;

export const ohlcvBarSchema = z.object({
  timestamp: z.number(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number().optional(),
});

export type OhlcvBar = z.infer<typeof ohlcvBarSchema>;

export const tradePlanSchema = z.object({
  direction: z.enum(["long", "short", "neutral"]),
  entry: z.number().nullable(),
  stop: z.number().nullable(),
  targets: z.array(z.number()),
  thesis: z.string(),
});

export type TradePlan = z.infer<typeof tradePlanSchema>;

export const tradeOutcomeSchema = z.object({
  resolved: z.boolean(),
  win: z.boolean().nullable(),
  rMultiple: z.number().nullable(),
  mfe: z.number().nullable(),
  mae: z.number().nullable(),
  holdBars: z.number().nullable(),
});

export type TradeOutcome = z.infer<typeof tradeOutcomeSchema>;

export const patternAnchorSchema = z.object({
  barIndex: z.number().int().nonnegative(),
  timestamp: z.number(),
});

export type PatternAnchor = z.infer<typeof patternAnchorSchema>;

export const patternSectionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  note: z.string().optional(),
  fromBar: z.number().int().nonnegative(),
  toBar: z.number().int().nonnegative(),
  fromTimestamp: z.number(),
  toTimestamp: z.number(),
  high: z.number().optional(),
  low: z.number().optional(),
});

export type PatternSection = z.infer<typeof patternSectionSchema>;

export const patternCaptureSchema = z.object({
  patternStart: patternAnchorSchema,
  patternEnd: patternAnchorSchema,
  sections: z.array(patternSectionSchema).min(1),
  paddingBars: z.object({
    left: z.number().int().min(0).max(20),
    right: z.number().int().min(0).max(20),
  }),
  interval: z.string().min(1),
  range: z.string().optional(),
  indicatorsSnapshot: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        params: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .optional(),
  sourceCellId: z.string().optional(),
  capturedAt: z.string().datetime(),
});

export type PatternCapture = z.infer<typeof patternCaptureSchema>;

export const patternRecordSchema = z.object({
  id: z.string().min(1),
  asOf: z.string().datetime(),
  symbol: z.string().min(1),
  timeframe: z.string().min(1),
  barWindow: z.number().int().positive(),
  setupFamilyId: z.string().min(1),
  quality: setupQualitySchema,
  decision: setupDecisionSchema,
  regime: marketRegimeSchema,
  plan: tradePlanSchema,
  outcome: tradeOutcomeSchema,
  ohlcv: z.array(ohlcvBarSchema).min(2),
  chartStyleId: z.string().min(1),
  chartSvgPath: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  capture: patternCaptureSchema.optional(),
});

export type PatternRecord = z.infer<typeof patternRecordSchema>;

export const bakeoffArmSchema = z.enum(["few_shot_vlm", "retrieval", "rules"]);

export type BakeoffArm = z.infer<typeof bakeoffArmSchema>;

export const bakeoffPredictionSchema = z.object({
  recordId: z.string(),
  arm: bakeoffArmSchema,
  predictedFamilyId: z.string().nullable(),
  predictedDirection: z.enum(["long", "short", "neutral"]),
  predictedStop: z.number().nullable(),
  confidence: z.number().min(0).max(1),
  rationale: z.string().optional(),
});

export type BakeoffPrediction = z.infer<typeof bakeoffPredictionSchema>;

export const bakeoffMetricsSchema = z.object({
  arm: bakeoffArmSchema,
  n: z.number().int().nonnegative(),
  familyAccuracy: z.number().nullable(),
  directionAccuracy: z.number().nullable(),
  directionWilson95: z.tuple([z.number(), z.number()]).nullable(),
  stopWithinHalfAtrRate: z.number().nullable(),
  longShortGapPp: z.number().nullable(),
  confidenceSignedR: z.number().nullable(),
});

export type BakeoffMetrics = z.infer<typeof bakeoffMetricsSchema>;
