import { z } from "zod";
import type { Interval, Range } from "@/lib/chart/contracts";
import { SUPPORTED_INTERVALS } from "@edge/chart-core/data-source";

export const MARKET_RANGES = [
  "1d",
  "5d",
  "1mo",
  "3mo",
  "6mo",
  "1y",
  "2y",
  "5y",
  "ytd",
  "max",
] as const satisfies readonly Range[];

export const marketSymbolSchema = z
  .string()
  .trim()
  .min(1)
  .transform((s) => s.toUpperCase());

export const marketSymbolsSchema = z
  .array(marketSymbolSchema)
  .min(1)
  .max(50);

const intervalValues = SUPPORTED_INTERVALS as unknown as readonly [Interval, ...Interval[]];

export const marketIntervalSchema = z.enum(intervalValues);

export const marketRangeSchema = z.enum(MARKET_RANGES);

export const marketSessionModeSchema = z.enum(["regular", "extended"]);

export const dataConnectionIdSchema = z.enum(["ib-paper", "ib-live"]);

export const candlesRequestSchema = z
  .object({
    symbol: marketSymbolSchema,
    range: marketRangeSchema.optional(),
    interval: marketIntervalSchema.default("1d"),
    before: z.number().finite().optional(),
    barCount: z.number().int().min(1).max(500).optional(),
    sessionMode: marketSessionModeSchema.optional().default("regular"),
    connectionId: dataConnectionIdSchema.optional(),
  })
  .superRefine((val, ctx) => {
    if (val.before == null && val.range == null) {
      // Default range applied at route layer when omitted.
    }
    if (val.before != null && val.range != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide either range or before pagination, not both",
        path: ["before"],
      });
    }
  });

export const searchRequestSchema = z.object({
  query: z.string(),
  limit: z.number().int().min(1).max(20).optional(),
});

export const quotesRequestSchema = z.object({
  symbols: marketSymbolsSchema,
  connectionId: dataConnectionIdSchema.optional(),
});

export const fundamentalsQuerySchema = z.object({
  symbol: marketSymbolSchema,
});

export const optionExpirationDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expiration must be YYYY-MM-DD");

export const optionsExpirationsQuerySchema = z.object({
  underlying: marketSymbolSchema,
});

export const optionsStrikeWindowSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("full") }),
  z.object({
    mode: z.literal("atm"),
    count: z.number().int().min(4).max(100).optional(),
    spot: z.number().positive().optional(),
  }),
]);

export const optionsChainQuerySchema = z.object({
  underlying: marketSymbolSchema,
  expiration: optionExpirationDateSchema,
  strikeWindow: z
    .string()
    .optional()
    .transform((value) => {
      if (!value?.trim()) return undefined;
      try {
        return JSON.parse(value) as unknown;
      } catch {
        return undefined;
      }
    })
    .pipe(optionsStrikeWindowSchema.optional()),
});

export const macroSeriesQuerySchema = z.object({
  seriesId: z.string().trim().min(1),
  limit: z.number().int().min(1).max(500).optional(),
});

export const secFilingsQuerySchema = z.object({
  symbol: marketSymbolSchema,
  limit: z.number().int().min(1).max(50).optional(),
});

export const eventFamilySchema = z.enum([
  "corporate",
  "filing",
  "macro",
  "news",
  "market_structure",
]);

export const eventImportanceSchema = z.enum(["low", "medium", "high"]);

export const eventsQuerySchema = z.object({
  symbol: marketSymbolSchema.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  families: z
    .string()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean)
        : undefined,
    )
    .pipe(z.array(eventFamilySchema).optional()),
  canonicalIds: z
    .string()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean)
        : undefined,
    ),
  importance: z
    .string()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean)
        : undefined,
    )
    .pipe(z.array(eventImportanceSchema).optional()),
  includeMacro: z.boolean().optional().default(false),
});

export const newsQuerySchema = z.object({
  symbol: marketSymbolSchema.optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const ibkrSymbolQuerySchema = z.object({
  symbol: marketSymbolSchema,
});

export const ibkrCandlesQuerySchema = z.object({
  symbol: marketSymbolSchema,
  interval: marketIntervalSchema.default("1d"),
  range: marketRangeSchema.default("1mo"),
});

export const twsSymbolQuerySchema = ibkrSymbolQuerySchema;

export const twsCandlesQuerySchema = ibkrCandlesQuerySchema;

export const fmpStatementPeriodSchema = z.enum(["annual", "quarter"]);

export const marketContextQuerySchema = z.object({
  symbol: marketSymbolSchema,
});

export const fmpSymbolQuerySchema = z.object({
  symbol: marketSymbolSchema,
});

export const fmpEstimatesQuerySchema = z.object({
  symbol: marketSymbolSchema,
  period: fmpStatementPeriodSchema.default("annual"),
  limit: z.number().int().min(1).max(20).default(4),
});

export const fmpFinancialsQuerySchema = z.object({
  symbol: marketSymbolSchema,
  period: fmpStatementPeriodSchema.default("annual"),
  limit: z.number().int().min(1).max(20).default(4),
});

export const fmpExecutivesQuerySchema = z.object({
  symbol: marketSymbolSchema,
});

export const fmpMoversQuerySchema = z.object({
  kind: z.enum(["gainers", "losers", "actives"]).default("gainers"),
  limit: z.number().int().min(1).max(50).default(10),
});

const numericRangeSchema = z
  .object({
    min: z.number().optional(),
    max: z.number().optional(),
  })
  .optional();

export const rsiTechnicalRuleSchema = z.object({
  kind: z.literal("rsi"),
  period: z.number().int().min(2).max(100).default(14),
  min: z.number().optional(),
  max: z.number().optional(),
});

export const goldenCrossTechnicalRuleSchema = z.object({
  kind: z.literal("goldenCross"),
  fast: z.number().int().min(2).max(500).default(50),
  slow: z.number().int().min(2).max(500).default(200),
});

export const fiftyTwoWeekProximityTechnicalRuleSchema = z.object({
  kind: z.literal("fiftyTwoWeekProximity"),
  withinPct: z.number().min(0).max(1).default(0.05),
});

export const indicatorRuleTransformSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("bollPctB") }),
]);

export const indicatorTechnicalRuleSchema = z.object({
  kind: z.literal("indicator"),
  indicator: z.string().min(1),
  inputs: z
    .record(z.string(), z.union([z.number(), z.string(), z.boolean()]))
    .optional(),
  series: z.string().min(1),
  bar: z.enum(["last", "first"]).default("last"),
  op: z.enum([">", ">=", "<", "<=", "=="]),
  threshold: z.number(),
  transform: indicatorRuleTransformSchema.optional(),
});

export const technicalRuleSchema = z.discriminatedUnion("kind", [
  rsiTechnicalRuleSchema,
  goldenCrossTechnicalRuleSchema,
  fiftyTwoWeekProximityTechnicalRuleSchema,
  indicatorTechnicalRuleSchema,
]);

const screenerTextFilterSchema = z
  .union([
    z.string().trim().min(1),
    z.array(z.string().trim().min(1)).min(1).max(10),
  ])
  .optional();

export const screenQuerySchema = z.object({
  sector: screenerTextFilterSchema,
  industry: screenerTextFilterSchema,
  country: screenerTextFilterSchema,
  exchange: screenerTextFilterSchema,
  isEtf: z.boolean().optional(),
  isActivelyTrading: z.boolean().optional(),
  marketCap: numericRangeSchema,
  price: numericRangeSchema,
  beta: numericRangeSchema,
  volume: numericRangeSchema,
  /** Local filter: price × volume (not sent to FMP). */
  dollarVolume: numericRangeSchema,
  dividend: numericRangeSchema,
  technical: technicalRuleSchema.optional(),
  limit: z.number().int().min(1).max(1000).default(200),
  offset: z.number().int().min(0).max(20_000).optional(),
  maxResults: z.number().int().min(1).max(1000).optional(),
});

export const fmpSecFilingsQuerySchema = z.object({
  symbol: marketSymbolSchema,
  from: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "from must be YYYY-MM-DD")
    .optional(),
  to: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "to must be YYYY-MM-DD")
    .optional(),
  limit: z.number().int().min(1).max(50).default(10),
});

export const warmupCandleRequestSchema = z.object({
  symbol: marketSymbolSchema,
  interval: marketIntervalSchema.default("1d"),
  range: marketRangeSchema.optional(),
});

export const warmupRequestSchema = z.object({
  symbols: z.array(marketSymbolSchema).max(50).optional().default([]),
  candleRequests: z.array(warmupCandleRequestSchema).max(10).optional().default([]),
  optionsSymbol: marketSymbolSchema.optional(),
  activeCellIndex: z.number().int().min(0).max(9).optional(),
});

export const twsRecoverRequestSchema = z.object({
  symbols: z.array(marketSymbolSchema).max(50).optional().default([]),
  candleRequests: z.array(warmupCandleRequestSchema).max(10).optional().default([]),
  optionsSymbol: marketSymbolSchema.optional(),
});

export type CandlesRequest = z.infer<typeof candlesRequestSchema>;
export type SearchRequest = z.infer<typeof searchRequestSchema>;
export type QuotesRequest = z.infer<typeof quotesRequestSchema>;
export type FundamentalsQuery = z.infer<typeof fundamentalsQuerySchema>;
export type MarketContextQuery = z.infer<typeof marketContextQuerySchema>;
export type TechnicalRule = z.infer<typeof technicalRuleSchema>;
export type IndicatorTechnicalRule = z.infer<typeof indicatorTechnicalRuleSchema>;
export type IndicatorRuleTransform = z.infer<typeof indicatorRuleTransformSchema>;
export type ScreenQuery = z.infer<typeof screenQuerySchema>;
export type OptionsExpirationsQuery = z.infer<typeof optionsExpirationsQuerySchema>;
export type OptionsChainQuery = z.infer<typeof optionsChainQuerySchema>;
