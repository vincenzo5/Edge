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

export const candlesRequestSchema = z
  .object({
    symbol: marketSymbolSchema,
    range: marketRangeSchema.optional(),
    interval: marketIntervalSchema.default("1d"),
    before: z.number().finite().optional(),
    barCount: z.number().int().min(1).max(500).optional(),
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
});

export type CandlesRequest = z.infer<typeof candlesRequestSchema>;
export type SearchRequest = z.infer<typeof searchRequestSchema>;
export type QuotesRequest = z.infer<typeof quotesRequestSchema>;
export type FundamentalsQuery = z.infer<typeof fundamentalsQuerySchema>;
export type OptionsExpirationsQuery = z.infer<typeof optionsExpirationsQuerySchema>;
export type OptionsChainQuery = z.infer<typeof optionsChainQuerySchema>;
