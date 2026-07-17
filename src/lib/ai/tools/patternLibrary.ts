import { z } from "zod";
import { defineTool } from "../types";
import type { AiTool } from "../types";
import {
  rankSimilarSetups,
  predictFromRetrieval,
} from "@/lib/patternLibrary/retrieval";
import {
  loadAllRecords,
  loadRecord,
  loadTaxonomy,
  libraryStats,
  saveRecord,
} from "@/lib/patternLibrary/storage";
import { getCell, requireApp } from "./_helpers";
import type { PatternRecord } from "@/lib/patternLibrary/types";
import { patternRecordSchema } from "@/lib/patternLibrary/types";
import { extractOhlcvFeatures } from "@/lib/patternLibrary/features";

function recordFromActiveChart(
  context: Parameters<AiTool["execute"]>[1],
  setupFamilyId: string,
  quality: 1 | 2 | 3 | 4 | 5,
  decision: "take" | "pass",
  thesis: string,
): PatternRecord | null {
  requireApp(context);
  if (!context.chart) return null;
  const { cell } = getCell(context);
  const active = context.chart.getActiveChart();
  const candles = active?.chartCommands?.getCandles() ?? [];
  if (candles.length < 2) return null;

  const ohlcv = candles.map((c) => ({
    timestamp: c.t,
    open: c.o,
    high: c.h,
    low: c.l,
    close: c.c,
    volume: c.v,
  }));

  const last = ohlcv[ohlcv.length - 1]!;
  const f = extractOhlcvFeatures(ohlcv);

  return {
    id: `capture-${Date.now()}`,
    asOf: new Date(last.timestamp).toISOString(),
    symbol: cell.symbol,
    timeframe: cell.interval,
    barWindow: ohlcv.length,
    setupFamilyId,
    quality,
    decision,
    regime: f.trendSlope > 0 ? "uptrend" : f.trendSlope < 0 ? "downtrend" : "range",
    plan: {
      direction: "long",
      entry: last.close,
      stop: last.low - f.atr14 * 0.5,
      targets: [last.close + f.atr14 * 2],
      thesis,
    },
    outcome: {
      resolved: false,
      win: null,
      rMultiple: null,
      mfe: null,
      mae: null,
      holdBars: null,
    },
    ohlcv,
    chartStyleId: "edge-frozen-v1",
  };
}

export const listPatternTaxonomyTool = defineTool({
  name: "list_pattern_taxonomy",
  description:
    "List the trader's setup families, invalidation rules, quality guides, and success metrics from the personal pattern library taxonomy.",
  inputSchema: z.object({}),
  permission: "read",
  requiresConfirmation: false,
  async execute() {
    const taxonomy = loadTaxonomy();
    return {
      ok: true,
      data: {
        traderId: taxonomy.traderId,
        setupFamilies: taxonomy.setupFamilies,
        successMetrics: taxonomy.successMetrics,
        updatedAt: taxonomy.updatedAt,
      },
    };
  },
});

export const findSimilarSetupsTool = defineTool({
  name: "find_similar_setups",
  description:
    "Find past setups in the personal pattern library most similar to the active chart (OHLCV feature retrieval). Returns neighbors with scores, family votes, section summaries when available, and suggested direction.",
  inputSchema: z.object({
    topK: z.number().int().min(1).max(20).optional(),
  }),
  permission: "read",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    requireApp(context);
    if (!context.chart) {
      throw new Error("Chart context unavailable");
    }

    const draft = recordFromActiveChart(
      context,
      "pullback_in_trend",
      3,
      "take",
      "Active chart similarity query",
    );
    if (!draft) {
      throw new Error("Need at least 2 visible candles on the active chart");
    }

    const library = loadAllRecords();
    const topK = input.topK ?? 5;
    const neighbors = rankSimilarSetups(draft, library, topK);
    const prediction = predictFromRetrieval(draft, library, topK);

    return {
      ok: true,
      data: {
        query: {
          symbol: draft.symbol,
          timeframe: draft.timeframe,
          asOf: draft.asOf,
          barCount: draft.ohlcv.length,
        },
        librarySize: library.length,
        prediction: {
          familyId: prediction.predictedFamilyId,
          direction: prediction.predictedDirection,
          stop: prediction.predictedStop,
          confidence: prediction.confidence,
        },
        neighbors: neighbors.map((n) => ({
          id: n.record.id,
          score: n.score,
          rank: n.rank,
          symbol: n.record.symbol,
          setupFamilyId: n.record.setupFamilyId,
          quality: n.record.quality,
          decision: n.record.decision,
          direction: n.record.plan.direction,
          outcome: n.record.outcome,
          thesis: n.record.plan.thesis,
          sections: n.record.capture?.sections.map((s) => ({
            label: s.label,
            fromBar: s.fromBar,
            toBar: s.toBar,
          })),
        })),
      },
    };
  },
});

export const patternLibraryStatsTool = defineTool({
  name: "pattern_library_stats",
  description:
    "Return counts and breakdown of the personal pattern library (takes vs passes, by setup family).",
  inputSchema: z.object({}),
  permission: "read",
  requiresConfirmation: false,
  async execute() {
    const stats = libraryStats();
    return { ok: true, data: stats };
  },
});

export const capturePatternSetupTool = defineTool({
  name: "capture_pattern_setup",
  description:
    "Build a draft pattern-library record from the active chart (OHLCV + annotations context). Does not persist. Prefer in-app Pattern Capture Mode (Shift+P) for multi-section bar-snapped captures.",
  inputSchema: z.object({
    setupFamilyId: z.string().min(1),
    quality: z.union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
    ]),
    decision: z.enum(["take", "pass"]),
    thesis: z.string().min(1),
    direction: z.enum(["long", "short", "neutral"]).optional(),
  }),
  permission: "read",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const taxonomy = loadTaxonomy();
    if (!taxonomy.setupFamilies.some((f) => f.id === input.setupFamilyId)) {
      throw new Error(`Unknown setup family: ${input.setupFamilyId}`);
    }

    const draft = recordFromActiveChart(
      context,
      input.setupFamilyId,
      input.quality,
      input.decision,
      input.thesis,
    );
    if (!draft) {
      throw new Error("Need at least 2 visible candles on the active chart");
    }

    if (input.direction) {
      draft.plan.direction = input.direction;
    }

    const { cell } = getCell(context);
    const annotationSummary = cell.drawings
      .filter((d) => d.metadata?.kind)
      .map((d) => ({
        kind: d.metadata?.kind,
        status: d.metadata?.status,
        rationale: d.metadata?.rationale,
        price: d.points[0]?.value ?? null,
      }));

    return {
      ok: true,
      data: {
        draft,
        annotations: annotationSummary,
        persistHint: "Use save_pattern_capture or in-app Pattern Capture Mode (Shift+P) to persist",
      },
    };
  },
});

export const savePatternCaptureTool = defineTool({
  name: "save_pattern_capture",
  description:
    "Persist a pattern capture record (with optional section metadata) to the personal pattern library on disk.",
  inputSchema: z.object({
    record: patternRecordSchema,
    renderBars: z
      .array(
        z.object({
          timestamp: z.number(),
          open: z.number(),
          high: z.number(),
          low: z.number(),
          close: z.number(),
          volume: z.number().optional(),
        }),
      )
      .optional(),
    leftPaddingApplied: z.number().int().min(0).max(20).optional(),
  }),
  permission: "write",
  requiresConfirmation: true,
  async execute(input) {
    if (!input.record.capture) {
      throw new Error("Record must include capture metadata");
    }
    saveRecord(input.record, {
      renderBars: input.renderBars,
      leftPaddingApplied: input.leftPaddingApplied,
    });
    return { ok: true, data: { id: input.record.id } };
  },
});

export const getPatternCaptureTool = defineTool({
  name: "get_pattern_capture",
  description: "Load a saved pattern capture record from the personal pattern library by id.",
  inputSchema: z.object({
    id: z.string().min(1),
  }),
  permission: "read",
  requiresConfirmation: false,
  async execute(input) {
    const record = loadRecord(input.id);
    if (!record) {
      throw new Error(`Pattern capture not found: ${input.id}`);
    }
    return { ok: true, data: { record } };
  },
});

export const patternLibraryTools = [
  listPatternTaxonomyTool,
  findSimilarSetupsTool,
  patternLibraryStatsTool,
  capturePatternSetupTool,
  savePatternCaptureTool,
  getPatternCaptureTool,
];
