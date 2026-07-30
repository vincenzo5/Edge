import { z } from "zod";

import type { ToolResult } from "@/lib/ai/types";

const chartArtifactHintSchema = z.object({
  type: z.literal("chart"),
  symbol: z.string().trim().min(1).max(16),
  interval: z.string().min(1).max(8),
  title: z.string().trim().max(120).optional(),
});

const screenerArtifactHintSchema = z.object({
  type: z.literal("screener"),
  queryLabel: z.string().trim().max(120).optional(),
  screenName: z.string().trim().max(120).optional(),
  title: z.string().trim().max(120).optional(),
});

const journalDraftArtifactHintSchema = z.object({
  type: z.literal("journalDraft"),
  draftTradeId: z.string().uuid().optional(),
  summary: z.string().trim().max(500).optional(),
  title: z.string().trim().max(120).optional(),
});

const noteArtifactHintSchema = z.object({
  type: z.literal("note"),
  title: z.string().trim().max(200).optional(),
  body: z.string().trim().min(1).max(2000),
});

const aiCalloutArtifactHintSchema = z.object({
  type: z.literal("aiCallout"),
  summary: z.string().trim().min(1).max(2000),
  title: z.string().trim().max(120).optional(),
});

const researchProfileArtifactHintSchema = z.object({
  type: z.literal("researchProfile"),
  jobId: z.string().trim().min(1).max(64),
  datasetId: z.string().trim().min(1).max(64).optional(),
  title: z.string().trim().max(120).optional(),
  keyMetrics: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  previewTable: z
    .object({
      columns: z.array(z.string()),
      rows: z.array(z.array(z.union([z.string(), z.number(), z.null()]))),
    })
    .optional(),
});

export const researchArtifactHintSchema = z.discriminatedUnion("type", [
  chartArtifactHintSchema,
  screenerArtifactHintSchema,
  journalDraftArtifactHintSchema,
  noteArtifactHintSchema,
  aiCalloutArtifactHintSchema,
  researchProfileArtifactHintSchema,
]);

export type ResearchArtifactHint = z.infer<typeof researchArtifactHintSchema>;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function chartHintFromConfig(config: Record<string, unknown>): ResearchArtifactHint | null {
  const symbol = readString(config, "symbol");
  const interval = readString(config, "interval");
  if (!symbol || !interval) return null;
  return {
    type: "chart",
    symbol: symbol.toUpperCase(),
    interval,
    title: `${symbol.toUpperCase()} · ${interval}`,
  };
}

function hintForGetChartState(data: Record<string, unknown>): ResearchArtifactHint | null {
  const config = asRecord(data.config);
  if (!config) return null;
  return chartHintFromConfig(config);
}

function hintForSetSymbol(data: Record<string, unknown>): ResearchArtifactHint | null {
  const symbol = readString(data, "symbol");
  if (!symbol) return null;
  return {
    type: "chart",
    symbol: symbol.toUpperCase(),
    interval: "D",
    title: `${symbol.toUpperCase()} chart`,
  };
}

function hintForSummarizeScreen(data: Record<string, unknown>): ResearchArtifactHint | null {
  const screenName = readString(data, "screenName");
  const thesisSummary = readString(data, "thesisSummary");
  const queryLabel = screenName ?? thesisSummary?.slice(0, 120);
  return {
    type: "screener",
    screenName,
    queryLabel,
    title: screenName ?? "Screener results",
  };
}

function hintForListJournalTrades(data: Record<string, unknown>): ResearchArtifactHint | null {
  const trades = data.trades;
  if (!Array.isArray(trades) || trades.length === 0) {
    return {
      type: "journalDraft",
      summary: "No journal trades matched",
      title: "Journal trades",
    };
  }
  const first = asRecord(trades[0]);
  const symbol = first ? readString(first, "symbol") : undefined;
  const tradeId = first ? readString(first, "id") : undefined;
  const count = typeof data.count === "number" ? data.count : trades.length;
  return {
    type: "journalDraft",
    draftTradeId: tradeId,
    summary: symbol ? `${count} trade(s) · ${symbol}` : `${count} journal trade(s)`,
    title: "Journal trades",
  };
}

function hintForGetJournalTrade(data: Record<string, unknown>): ResearchArtifactHint | null {
  const tradeRecord = asRecord(data.trade);
  if (!tradeRecord) return null;
  const tradeId = readString(tradeRecord, "id");
  const symbol = readString(tradeRecord, "symbol");
  return {
    type: "journalDraft",
    draftTradeId: tradeId,
    summary: symbol ? `${symbol} trade` : "Journal trade",
    title: symbol ? `${symbol} trade` : "Journal trade",
  };
}

function readKeyMetrics(data: Record<string, unknown>): Record<string, string | number> | undefined {
  const metrics = data.keyMetrics;
  if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) return undefined;
  const entries = Object.entries(metrics as Record<string, unknown>).slice(0, 24);
  const result: Record<string, string | number> = {};
  for (const [key, value] of entries) {
    if (typeof value === "string" || typeof value === "number") {
      result[key] = value;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function readPreviewTable(data: Record<string, unknown>) {
  const preview = data.previewTable;
  if (!preview || typeof preview !== "object" || Array.isArray(preview)) return undefined;
  const record = preview as Record<string, unknown>;
  const columns = record.columns;
  const rows = record.rows;
  if (!Array.isArray(columns) || !Array.isArray(rows)) return undefined;
  return {
    columns: columns.filter((value): value is string => typeof value === "string"),
    rows: rows
      .slice(0, 20)
      .filter((row): row is unknown[] => Array.isArray(row))
      .map((row) =>
        row.map((cell) =>
          typeof cell === "string" || typeof cell === "number" || cell === null ? cell : String(cell),
        ),
      ),
  };
}

function hintForResearchProfile(data: Record<string, unknown>, title: string): ResearchArtifactHint {
  return {
    type: "researchProfile",
    jobId: readString(data, "jobId") ?? "unknown",
    datasetId: readString(data, "datasetId"),
    title,
    keyMetrics: readKeyMetrics(data),
    previewTable: readPreviewTable(data),
  };
}

function hintForCreateResearchDataset(data: Record<string, unknown>): ResearchArtifactHint | null {
  const datasetId = readString(data, "datasetId");
  if (!datasetId) return null;
  const rowCount = data.rowCount;
  const metrics: Record<string, string | number> = {
    "Dataset id": datasetId,
  };
  if (typeof rowCount === "number") metrics["Total bars"] = rowCount;
  const provenance = asRecord(data.provenance);
  const sources = provenance?.sources;
  if (Array.isArray(sources) && sources.length > 0) {
    metrics.Source = sources.map(String).join(", ");
  }
  return {
    type: "researchProfile",
    jobId: datasetId,
    datasetId,
    title: "Research dataset",
    keyMetrics: metrics,
  };
}

function fallbackCallout(summary: string): ResearchArtifactHint {
  const trimmed = summary.trim();
  return {
    type: "aiCallout",
    summary: trimmed.slice(0, 2000),
    title: trimmed.slice(0, 120),
  };
}

/** Map a successful tool result to a compact pin hint for Talk artifact cards. */
export function toArtifactHint(toolName: string, result: ToolResult): ResearchArtifactHint | null {
  if (!result.ok || result.data == null) return null;

  const data = asRecord(result.data);
  if (!data) return null;

  switch (toolName) {
    case "get_chart_state":
      return hintForGetChartState(data);
    case "set_symbol":
      return hintForSetSymbol(data);
    case "summarize_screen":
      return hintForSummarizeScreen(data);
    case "list_journal_trades":
      return hintForListJournalTrades(data);
    case "get_journal_trade":
      return hintForGetJournalTrade(data);
    case "profile_research_dataset":
      return hintForResearchProfile(data, "Research profile");
    case "create_research_dataset":
      return hintForCreateResearchDataset(data);
    default:
      return null;
  }
}

/** Build a pin hint from a client-visible tool summary when structured data is unavailable. */
export function artifactHintFromSummary(
  toolName: string,
  summary: string,
  ok: boolean,
): ResearchArtifactHint | null {
  if (!ok) return null;
  const trimmed = summary.trim();
  if (!trimmed) return null;

  if (toolName === "summarize_screen") {
    return {
      type: "screener",
      queryLabel: trimmed.slice(0, 120),
      title: "Screener results",
    };
  }

  const chartMatch = trimmed.match(/"symbol"\s*:\s*"([A-Z0-9.-]+)"/i);
  const intervalMatch = trimmed.match(/"interval"\s*:\s*"([^"]+)"/i);
  if (chartMatch) {
    return {
      type: "chart",
      symbol: chartMatch[1]!.toUpperCase(),
      interval: intervalMatch?.[1] ?? "D",
      title: `${chartMatch[1]!.toUpperCase()} chart`,
    };
  }

  return fallbackCallout(trimmed);
}

export function parseResearchArtifactHint(raw: unknown): ResearchArtifactHint {
  return researchArtifactHintSchema.parse(raw);
}
