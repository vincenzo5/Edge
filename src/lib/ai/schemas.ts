import { z } from "zod";

export const GRID_MODES = ["1x1", "2x1", "2x2", "3x1", "1x2"] as const;
export const CHART_TYPES = [
  "candle_solid",
  "candle_stroke",
  "ohlc",
  "area",
  "heikin_ashi",
] as const;
export const RANGES = [
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
] as const;
export const INTERVALS = [
  "1m",
  "5m",
  "15m",
  "30m",
  "1h",
  "2h",
  "1d",
  "1wk",
  "1mo",
] as const;
export const THEMES = ["light", "dark"] as const;

export const IMPLEMENTED_INDICATORS = [
  "MA",
  "EMA",
  "BOLL",
  "MACD",
  "RSI",
  "VOL",
] as const;

export const DRAWING_TYPES = [
  "trend_line",
  "horizontal_line",
  "vertical_line",
  "ray",
  "rectangle",
  "parallel_channel",
  "price_channel",
  "circle",
  "fib_retracement",
  "price_line",
  "annotation",
  "measure",
  "ruler",
] as const;

export const drawingPointSchema = z.object({
  timestamp: z.number().optional(),
  value: z.number().optional(),
  dataIndex: z.number().int().optional(),
});

export const drawingStylePatchSchema = z
  .object({
    color: z.string().optional(),
    lineWidth: z.number().optional(),
    dash: z.array(z.number()).optional(),
    fillColor: z.string().optional(),
    fillOpacity: z.number().optional(),
  })
  .optional();

export const ANNOTATION_KINDS = [
  "thesis",
  "invalidation",
  "target",
  "note",
] as const;

export const ANNOTATION_STATUSES = [
  "proposed",
  "accepted",
  "active",
  "triggered",
  "invalidated",
] as const;

export const ANNOTATION_SOURCES = ["user", "ai", "imported"] as const;

export const annotationKindSchema = z.enum(ANNOTATION_KINDS);
export const annotationStatusSchema = z.enum(ANNOTATION_STATUSES);
export const annotationSourceSchema = z.enum(ANNOTATION_SOURCES);

export const drawingMetadataSchema = z
  .object({
    kind: annotationKindSchema.optional(),
    status: annotationStatusSchema.optional(),
    source: annotationSourceSchema.optional(),
    rationale: z.string().optional(),
    threadId: z.string().optional(),
    linkGroupId: z.string().optional(),
    playbookId: z.string().optional(),
    fields: z.record(z.string(), z.unknown()).optional(),
    computed: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
    links: z
      .array(
        z.object({
          drawingId: z.string().optional(),
          symbol: z.string().optional(),
        }),
      )
      .optional(),
  })
  .optional();

export const drawingMetadataPatchSchema = drawingMetadataSchema;

export const metadataFilterSchema = z.object({
  kind: z.union([annotationKindSchema, z.array(annotationKindSchema)]).optional(),
  status: z.union([annotationStatusSchema, z.array(annotationStatusSchema)]).optional(),
  source: z.union([annotationSourceSchema, z.array(annotationSourceSchema)]).optional(),
});

export const cellIndexSchema = z.number().int().min(0).optional();

export const symbolSchema = z
  .string()
  .trim()
  .min(1)
  .transform((s) => s.toUpperCase());

export const symbolsSchema = z
  .array(symbolSchema)
  .min(1)
  .max(50);
