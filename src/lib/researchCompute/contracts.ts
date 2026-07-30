import { z } from "zod";
import { SUPPORTED_INTERVALS } from "@edge/chart-core/dataSource";

import {
  MAX_RESEARCH_CODE_SOURCE_BYTES,
  MAX_RESEARCH_STDOUT_CHARS,
} from "./constants";

export const researchIntervalSchema = z.enum(SUPPORTED_INTERVALS as [string, ...string[]]);

export const researchAdjustmentSchema = z.enum(["split", "dividend", "none"]);
export type ResearchAdjustment = z.infer<typeof researchAdjustmentSchema>;

export const researchJobStatusSchema = z.enum([
  "queued",
  "running",
  "succeeded",
  "failed",
  "canceled",
]);
export type ResearchJobStatus = z.infer<typeof researchJobStatusSchema>;

export const artifactKindSchema = z.enum([
  "run_manifest",
  "metrics_json",
  "preview_table",
  "equity_curve",
  "trades_table",
  "source_py",
]);
export type ArtifactKind = z.infer<typeof artifactKindSchema>;

export const researchBarSchema = z.object({
  t: z.number().int(),
  o: z.number(),
  h: z.number(),
  l: z.number(),
  c: z.number(),
  v: z.number().optional(),
});
export type ResearchBar = z.infer<typeof researchBarSchema>;

export const datasetIdentitySchema = z.object({
  symbols: z.array(z.string().trim().min(1).max(16)).min(1).max(50),
  interval: researchIntervalSchema,
  fromMs: z.number().int(),
  toMs: z.number().int(),
  provider: z.string().trim().min(1).max(32),
  adjustment: researchAdjustmentSchema.default("split"),
  timezone: z.string().trim().min(1).max(64).default("UTC"),
});
export type DatasetIdentity = z.infer<typeof datasetIdentitySchema>;

export const acquisitionMetaSchema = z.object({
  providerRoute: z.string(),
  sources: z.array(z.string()),
  warnings: z.array(z.string()),
  rowCount: z.number().int().nonnegative(),
  paginationPages: z.number().int().nonnegative(),
});
export type AcquisitionMeta = z.infer<typeof acquisitionMetaSchema>;

export const datasetManifestSchema = z.object({
  datasetId: z.string().min(1),
  identity: datasetIdentitySchema,
  identityFingerprint: z.string().min(1),
  contentFingerprint: z.string().min(1),
  acquisitionMeta: acquisitionMetaSchema,
  materializedAt: z.string().datetime(),
  computeVersion: z.string(),
  acquisitionPolicyVersion: z.string(),
  symbolRowCounts: z.record(z.string(), z.number().int().nonnegative()),
});
export type DatasetManifest = z.infer<typeof datasetManifestSchema>;

export const artifactRefSchema = z.object({
  artifactId: z.string().min(1),
  kind: artifactKindSchema,
  label: z.string().optional(),
});
export type ArtifactRef = z.infer<typeof artifactRefSchema>;

export const previewTableSchema = z.object({
  columns: z.array(z.string().min(1)).min(1).max(12),
  rows: z.array(z.array(z.union([z.string(), z.number(), z.null()]))).max(20),
});
export type PreviewTable = z.infer<typeof previewTableSchema>;

export const compactResearchResultSchema = z.object({
  jobId: z.string().min(1),
  status: researchJobStatusSchema,
  runFingerprint: z.string().min(1),
  provenance: z.record(z.string(), z.unknown()).optional(),
  warnings: z.array(z.string()),
  keyMetrics: z.record(z.string(), z.union([z.string(), z.number()])),
  artifactRefs: z.array(artifactRefSchema),
  previewTable: previewTableSchema.optional(),
  datasetId: z.string().optional(),
  datasetRef: z
    .object({
      datasetId: z.string(),
      identityFingerprint: z.string(),
    })
    .optional(),
});
export type CompactResearchResult = z.infer<typeof compactResearchResultSchema>;

export const runManifestSchema = z.object({
  jobId: z.string().min(1),
  toolName: z.string().min(1),
  datasetRef: z.object({
    datasetId: z.string(),
    identityFingerprint: z.string(),
  }),
  runFingerprint: z.string().min(1),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().optional(),
  status: researchJobStatusSchema,
  warnings: z.array(z.string()),
  computeVersion: z.string(),
  workerImageId: z.string().optional(),
  artifactRefs: z.array(artifactRefSchema),
});
export type RunManifest = z.infer<typeof runManifestSchema>;

export const researchJobRecordSchema = z.object({
  jobId: z.string().min(1),
  toolName: z.string().min(1),
  status: researchJobStatusSchema,
  datasetId: z.string().optional(),
  runFingerprint: z.string().optional(),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().optional(),
  error: z.string().optional(),
  containerId: z.string().optional(),
  compactResult: compactResearchResultSchema.optional(),
});
export type ResearchJobRecord = z.infer<typeof researchJobRecordSchema>;

export const profileOptionsSchema = z.object({
  rollingWindow: z.number().int().min(5).max(252).optional(),
  correlationMaxSymbols: z.number().int().min(2).max(20).optional(),
});
export type ProfileOptions = z.infer<typeof profileOptionsSchema>;

export const createDatasetInputSchema = z.object({
  symbols: z.array(z.string().trim().min(1).max(16)).min(1).max(50),
  interval: researchIntervalSchema,
  fromMs: z.number().int(),
  toMs: z.number().int(),
  provider: z.string().trim().min(1).max(32).optional(),
  adjustment: researchAdjustmentSchema.optional(),
  timezone: z.string().trim().min(1).max(64).optional(),
});
export type CreateDatasetInput = z.infer<typeof createDatasetInputSchema>;

/** Curated indicator ids for signal IR (Phase 2 v1). */
export const signalIndicatorIdSchema = z.enum(["ma", "ema", "rsi", "atr", "macd", "boll"]);
export type SignalIndicatorId = z.infer<typeof signalIndicatorIdSchema>;

export const signalCompareOpSchema = z.enum(["gt", "lt", "gte", "lte"]);
export type SignalCompareOp = z.infer<typeof signalCompareOpSchema>;

export const signalDirectionSchema = z.enum(["long", "short"]);
export type SignalDirection = z.infer<typeof signalDirectionSchema>;

export const signalRegimeSchema = z.enum(["vol_tercile"]);
export type SignalRegime = z.infer<typeof signalRegimeSchema>;

export const signalIndicatorInputsSchema = z
  .record(z.string(), z.number().finite())
  .optional();

export const signalSeriesRefSchema: z.ZodType<SignalSeriesRef> = z.lazy(() =>
  z.discriminatedUnion("op", [
    z.object({ op: z.literal("close") }),
    z.object({
      op: z.literal("indicator"),
      id: signalIndicatorIdSchema,
      inputs: signalIndicatorInputsSchema,
      series: z.string().trim().min(1).max(32).optional(),
    }),
  ]),
);

export type SignalSeriesRef =
  | { op: "close" }
  | {
      op: "indicator";
      id: SignalIndicatorId;
      inputs?: Record<string, number>;
      series?: string;
    };

export const signalNodeSchema: z.ZodType<SignalNode> = z.lazy(() =>
  z.discriminatedUnion("op", [
    z.object({
      op: z.literal("indicator"),
      id: signalIndicatorIdSchema,
      inputs: signalIndicatorInputsSchema,
      series: z.string().trim().min(1).max(32).optional(),
    }),
    z.object({
      op: signalCompareOpSchema,
      left: z.union([z.number().finite(), signalSeriesRefSchema]),
      right: z.union([z.number().finite(), signalSeriesRefSchema]),
    }),
    z.object({
      op: z.enum(["cross_above", "cross_below"]),
      left: signalSeriesRefSchema,
      right: signalSeriesRefSchema,
    }),
    z.object({
      op: z.literal("boll_pct_b"),
      compare: signalCompareOpSchema,
      value: z.number().finite(),
      inputs: signalIndicatorInputsSchema,
    }),
    z.object({
      op: z.enum(["and", "or"]),
      nodes: z.array(signalNodeSchema).min(2).max(8),
    }),
  ]),
);

export type SignalNode =
  | {
      op: "indicator";
      id: SignalIndicatorId;
      inputs?: Record<string, number>;
      series?: string;
    }
  | {
      op: SignalCompareOp;
      left: number | SignalSeriesRef;
      right: number | SignalSeriesRef;
    }
  | {
      op: "cross_above" | "cross_below";
      left: SignalSeriesRef;
      right: SignalSeriesRef;
    }
  | {
      op: "boll_pct_b";
      compare: SignalCompareOp;
      value: number;
      inputs?: Record<string, number>;
    }
  | {
      op: "and" | "or";
      nodes: SignalNode[];
    };

export const signalStudySpecSchema = z.object({
  signal: signalNodeSchema,
  horizonBars: z.number().int().min(1).max(60),
  entryLagBars: z.number().int().min(1).max(5).default(1),
  direction: signalDirectionSchema.default("long"),
  trainToMs: z.number().int(),
  bootstrapSamples: z.number().int().min(0).max(500).default(0),
  regime: signalRegimeSchema.optional(),
});
export type SignalStudySpec = z.infer<typeof signalStudySpecSchema>;

export const strategyFillTimingSchema = z.enum(["next_open", "next_close"]);
export type StrategyFillTiming = z.infer<typeof strategyFillTimingSchema>;

export const strategySizingSchema = z.object({
  mode: z.literal("fixed_shares"),
  shares: z.number().finite().positive().max(1_000_000),
});
export type StrategySizing = z.infer<typeof strategySizingSchema>;

export const strategyEvalSpecSchema = z.object({
  entry: signalNodeSchema,
  exit: signalNodeSchema,
  direction: signalDirectionSchema.default("long"),
  entryLagBars: z.number().int().min(1).max(5).default(1),
  maxHoldBars: z.number().int().min(1).max(252),
  fillTiming: strategyFillTimingSchema,
  feesBps: z.number().finite().min(0).max(500),
  slippageBps: z.number().finite().min(0).max(500),
  sizing: strategySizingSchema,
  startingEquity: z.number().finite().positive().default(100_000),
});
export type StrategyEvalSpec = z.infer<typeof strategyEvalSpecSchema>;

export const strategyTradeSchema = z.object({
  symbol: z.string(),
  entryT: z.number().int(),
  exitT: z.number().int(),
  side: signalDirectionSchema,
  shares: z.number(),
  entryPx: z.number(),
  exitPx: z.number(),
  pnl: z.number(),
  returnPct: z.number(),
  holdBars: z.number().int(),
  feesPaid: z.number(),
});
export type StrategyTrade = z.infer<typeof strategyTradeSchema>;

export const equityCurvePointSchema = z.object({
  t: z.number().int(),
  equity: z.number(),
});
export type EquityCurvePoint = z.infer<typeof equityCurvePointSchema>;

export const researchCodeSpecSchema = z.object({
  source: z
    .string()
    .min(1)
    .max(MAX_RESEARCH_CODE_SOURCE_BYTES)
    .refine(
      (value) => Buffer.byteLength(value, "utf8") <= MAX_RESEARCH_CODE_SOURCE_BYTES,
      `Source exceeds max bytes (${MAX_RESEARCH_CODE_SOURCE_BYTES})`,
    ),
  label: z.string().trim().min(1).max(120).optional(),
});
export type ResearchCodeSpec = z.infer<typeof researchCodeSpecSchema>;

export const researchWorkerResultSchema = z.object({
  status: z.enum(["succeeded", "failed"]),
  stdout: z.string().max(MAX_RESEARCH_STDOUT_CHARS).optional(),
  keyMetrics: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
  previewTable: previewTableSchema.optional(),
  warnings: z.array(z.string()).default([]),
  error: z.string().optional(),
  traceback: z.string().optional(),
});
export type ResearchWorkerResult = z.infer<typeof researchWorkerResultSchema>;

export const MAX_SIGNAL_IR_DEPTH = 4;
export const MAX_SIGNAL_IR_NODES = 32;

/** Count nodes and max depth; throws if limits exceeded. */
export function assertSignalGraphLimits(node: SignalNode, depth = 1, count = { n: 0 }): void {
  count.n += 1;
  if (count.n > MAX_SIGNAL_IR_NODES) {
    throw new Error(`Signal IR exceeds max nodes (${MAX_SIGNAL_IR_NODES})`);
  }
  if (depth > MAX_SIGNAL_IR_DEPTH) {
    throw new Error(`Signal IR exceeds max depth (${MAX_SIGNAL_IR_DEPTH})`);
  }
  if (node.op === "and" || node.op === "or") {
    for (const child of node.nodes) {
      assertSignalGraphLimits(child, depth + 1, count);
    }
  }
}
