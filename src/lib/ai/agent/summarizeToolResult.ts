import type { ToolResult } from "../types";

const MAX_SUMMARY_CHARS = 100;

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

function readNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function truncate(text: string, max = MAX_SUMMARY_CHARS): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function joinParts(parts: Array<string | undefined | null>): string {
  return truncate(parts.filter(Boolean).join(" · "));
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function formatPrice(value: number): string {
  if (Math.abs(value) >= 1000) return value.toFixed(0);
  if (Math.abs(value) >= 100) return value.toFixed(2);
  return value.toFixed(2);
}

function summarizeQuote(quote: Record<string, unknown>): string | undefined {
  const symbol = readString(quote, "symbol") ?? readString(quote, "shortName");
  const price =
    readNumber(quote, "regularMarketPrice") ??
    readNumber(quote, "price") ??
    readNumber(quote, "last");
  const changePct =
    readNumber(quote, "regularMarketChangePercent") ??
    readNumber(quote, "changePercent");

  if (symbol && price != null && changePct != null) {
    return `${symbol.toUpperCase()} $${formatPrice(price)} (${formatPercent(changePct)})`;
  }
  if (symbol && price != null) {
    return `${symbol.toUpperCase()} $${formatPrice(price)}`;
  }
  if (symbol) {
    return symbol.toUpperCase();
  }
  return undefined;
}

function summarizeGetCandles(data: Record<string, unknown>): string {
  const symbol = readString(data, "symbol")?.toUpperCase();
  const count =
    readNumber(data, "count") ??
    (Array.isArray(data.candles) ? data.candles.length : undefined);
  const interval = readString(data, "interval");
  return joinParts([
    symbol,
    count != null ? `${count} bars` : undefined,
    interval,
  ]);
}

function summarizeGetQuotes(data: Record<string, unknown>): string {
  const quotes = data.quotes;
  if (!Array.isArray(quotes) || quotes.length === 0) {
    return "No quotes";
  }
  if (quotes.length === 1) {
    const first = asRecord(quotes[0]);
    if (first) {
      return summarizeQuote(first) ?? "1 quote";
    }
    return "1 quote";
  }
  const first = asRecord(quotes[0]);
  const lead = first ? summarizeQuote(first) : undefined;
  if (lead) {
    return truncate(`${lead} +${quotes.length - 1} more`);
  }
  return `${quotes.length} quotes`;
}

function summarizeGetAppState(data: Record<string, unknown>): string {
  const theme = readString(data, "theme");
  const cells = Array.isArray(data.cells) ? data.cells : [];
  const activeIndex = readNumber(data, "activeCellIndex") ?? 0;
  const activeCell = asRecord(cells[activeIndex] ?? cells[0]);
  const symbol = activeCell ? readString(activeCell, "symbol")?.toUpperCase() : undefined;
  const cellLabel =
    cells.length <= 1 ? "1 cell" : `${cells.length} cells`;
  return joinParts([symbol, theme, cellLabel]);
}

function summarizeSummarizeChart(data: Record<string, unknown>): string {
  const symbol = readString(data, "symbol")?.toUpperCase();
  const interval = readString(data, "interval");
  const drawingCount = readNumber(data, "drawingCount");
  return joinParts([
    symbol,
    interval,
    drawingCount != null ? `${drawingCount} drawings` : undefined,
  ]);
}

function summarizeSearchSymbols(data: Record<string, unknown>): string {
  const results = data.results;
  if (!Array.isArray(results)) return "No matches";
  if (results.length === 0) return "No matches";
  const first = asRecord(results[0]);
  const symbol = first ? readString(first, "symbol")?.toUpperCase() : undefined;
  if (results.length === 1 && symbol) return symbol;
  if (symbol) return `${results.length} matches · ${symbol}`;
  return `${results.length} matches`;
}

function summarizeGetChartState(data: Record<string, unknown>): string {
  const config = asRecord(data.config);
  const symbol = config ? readString(config, "symbol")?.toUpperCase() : undefined;
  const interval = config ? readString(config, "interval") : undefined;
  const drawingCount = config?.drawings;
  const drawings =
    Array.isArray(drawingCount) ? drawingCount.length : readNumber(data, "drawingCount");
  return joinParts([
    symbol,
    interval,
    drawings != null ? `${drawings} drawings` : undefined,
  ]);
}

function summarizeGetVisibleCandles(data: Record<string, unknown>): string {
  const symbol = readString(data, "symbol")?.toUpperCase();
  const count =
    readNumber(data, "count") ??
    (Array.isArray(data.candles) ? data.candles.length : undefined);
  return joinParts([symbol, count != null ? `${count} visible bars` : undefined]);
}

function summarizeSetSymbol(data: Record<string, unknown>): string {
  const symbol = readString(data, "symbol")?.toUpperCase();
  return symbol ? `Switched to ${symbol}` : "Symbol updated";
}

function summarizeCompareSymbols(data: Record<string, unknown>): string {
  const symbols = data.symbols;
  if (Array.isArray(symbols) && symbols.length > 0) {
    const labels = symbols
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.toUpperCase());
    if (labels.length > 0) {
      return truncate(`Comparing ${labels.join(", ")}`);
    }
  }
  return "Comparison layout ready";
}

function summarizeProfileResearchDataset(data: Record<string, unknown>): string {
  const jobId = readString(data, "jobId");
  const metrics = readKeyMetrics(data);
  const symbols = metrics?.Symbols;
  const totalBars = metrics?.["Total bars"];
  return joinParts([
    jobId ? `Job ${jobId.slice(0, 8)}` : undefined,
    symbols != null ? `${symbols} symbols` : undefined,
    totalBars != null ? `${totalBars} bars` : undefined,
  ]);
}

function summarizeRunSignalStudy(data: Record<string, unknown>): string {
  const jobId = readString(data, "jobId");
  const metrics = readKeyMetrics(data);
  const trainEvents = metrics?.["train.eventCount"];
  const holdoutHit = metrics?.["holdout.hitRate"];
  const holdoutMean = metrics?.["holdout.meanForwardReturn"];
  return joinParts([
    jobId ? `Job ${jobId.slice(0, 8)}` : undefined,
    trainEvents != null ? `${trainEvents} train events` : undefined,
    holdoutHit != null ? `holdout ${holdoutHit}` : undefined,
    holdoutMean != null ? `μ ${holdoutMean}` : undefined,
  ]);
}

function summarizeRunStrategyEvaluation(data: Record<string, unknown>): string {
  const jobId = readString(data, "jobId");
  const metrics = readKeyMetrics(data);
  const tradeCount = metrics?.["Trade count"];
  const totalReturn = metrics?.["Total return"];
  const maxDd = metrics?.["Max drawdown"];
  const feesPaid = metrics?.["Fees paid"];
  return joinParts([
    jobId ? `Job ${jobId.slice(0, 8)}` : undefined,
    tradeCount != null ? `${tradeCount} trades` : undefined,
    totalReturn != null ? `return ${totalReturn}` : undefined,
    maxDd != null ? `maxDD ${maxDd}` : undefined,
    feesPaid != null ? `fees ${feesPaid}` : undefined,
  ]);
}

function summarizeRunResearchCode(data: Record<string, unknown>): string {
  const jobId = readString(data, "jobId");
  const metrics = readKeyMetrics(data);
  const metricKeys = metrics ? Object.keys(metrics).slice(0, 3) : [];
  const metricParts = metricKeys.map((key) => `${key}: ${metrics![key]}`);
  return joinParts([
    jobId ? `Job ${jobId.slice(0, 8)}` : undefined,
    metricParts.length > 0 ? metricParts.join(", ") : undefined,
  ]);
}

function summarizeCancelResearchJob(data: Record<string, unknown>): string {
  const jobId = readString(data, "jobId");
  const status = readString(data, "status");
  return joinParts([jobId ? `Job ${jobId.slice(0, 8)}` : undefined, status ?? "canceled"]);
}

function summarizeCreateResearchDataset(data: Record<string, unknown>): string {
  const datasetId = readString(data, "datasetId");
  const rowCount = readNumber(data, "rowCount");
  const created = data.created === true ? "created" : data.created === false ? "reused" : undefined;
  return joinParts([
    datasetId ? `Dataset ${datasetId.slice(0, 12)}` : undefined,
    rowCount != null ? `${rowCount} bars` : undefined,
    created,
  ]);
}

function summarizeCompareResearchRuns(data: Record<string, unknown>): string {
  const runCount = readNumber(data, "runCount");
  const metrics = readKeyMetrics(data);
  const diffCount = metrics?.["Parameter diffs"];
  return joinParts([
    runCount != null ? `${runCount} runs` : undefined,
    diffCount != null ? `${diffCount} param diffs` : undefined,
    metrics?.["Shared dataset"] != null ? `dataset ${metrics["Shared dataset"]}` : undefined,
  ]);
}

function summarizeExportResearchDraft(data: Record<string, unknown>): string {
  const draftKind = readString(data, "draftKind");
  const title = readString(data, "title");
  const provenance = data.provenance;
  const jobId =
    provenance != null && typeof provenance === "object" && !Array.isArray(provenance)
      ? readString(provenance as Record<string, unknown>, "jobId")
      : undefined;
  return joinParts([
    title,
    draftKind,
    jobId ? `from ${jobId.slice(0, 8)}` : undefined,
  ]);
}

function readKeyMetrics(data: Record<string, unknown>): Record<string, string | number> | undefined {
  const metrics = data.keyMetrics;
  if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) return undefined;
  const result: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(metrics as Record<string, unknown>)) {
    if (typeof value === "string" || typeof value === "number") {
      result[key] = value;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function summarizeSummarizeScreen(data: Record<string, unknown>): string {
  const screenName = readString(data, "screenName");
  const matchCount = readNumber(data, "matchCount") ?? readNumber(data, "count");
  const thesis = readString(data, "thesisSummary");
  if (screenName && matchCount != null) {
    return joinParts([screenName, `${matchCount} matches`]);
  }
  if (screenName) return screenName;
  if (matchCount != null) return `${matchCount} matches`;
  if (thesis) return truncate(thesis);
  return "Screen summarized";
}

function summarizeSuccess(toolName: string, data: unknown): string {
  const record = asRecord(data);
  if (!record) {
    return "Done";
  }

  switch (toolName) {
    case "get_candles":
      return summarizeGetCandles(record);
    case "get_quotes":
      return summarizeGetQuotes(record);
    case "get_app_state":
      return summarizeGetAppState(record);
    case "summarize_chart":
      return summarizeSummarizeChart(record);
    case "search_symbols":
      return summarizeSearchSymbols(record);
    case "get_chart_state":
      return summarizeGetChartState(record);
    case "get_visible_candles":
      return summarizeGetVisibleCandles(record);
    case "set_symbol":
      return summarizeSetSymbol(record);
    case "compare_symbols":
      return summarizeCompareSymbols(record);
    case "summarize_screen":
      return summarizeSummarizeScreen(record);
    case "profile_research_dataset":
      return summarizeProfileResearchDataset(record);
    case "run_signal_study":
      return summarizeRunSignalStudy(record);
    case "run_strategy_evaluation":
      return summarizeRunStrategyEvaluation(record);
    case "run_research_code":
      return summarizeRunResearchCode(record);
    case "cancel_research_job":
      return summarizeCancelResearchJob(record);
    case "create_research_dataset":
      return summarizeCreateResearchDataset(record);
    case "compare_research_runs":
      return summarizeCompareResearchRuns(record);
    case "export_research_draft":
      return summarizeExportResearchDraft(record);
    default:
      return summarizeGenericSuccess(record);
  }
}

function summarizeGenericSuccess(data: Record<string, unknown>): string {
  const symbol = readString(data, "symbol")?.toUpperCase();
  const count = readNumber(data, "count");
  const id = readString(data, "id");

  for (const value of Object.values(data)) {
    if (Array.isArray(value) && value.length > 0 && count == null) {
      const arrayLabel = `${value.length} items`;
      return joinParts([symbol, arrayLabel]);
    }
  }

  if (symbol && count != null) {
    return joinParts([symbol, `${count} items`]);
  }
  if (symbol) return symbol;
  if (count != null) return `${count} items`;
  if (id) return truncate(id);
  return "Done";
}

export function summarizeToolResult(toolName: string, result: ToolResult): string {
  if (!result.ok) {
    if (result.code === "confirmation_required") {
      return "Awaiting your confirmation in chat";
    }
    if (result.code === "requires_client_session") {
      return "Requires live browser session — open Edge in your browser";
    }
    const detail = result.error.slice(0, 120);
    if (toolName === "summarize_chart" && /chart context unavailable/i.test(detail)) {
      return "Chart context unavailable";
    }
    return truncate(detail || "Failed");
  }

  return summarizeSuccess(toolName, result.data);
}

/** Full payload for model continuation messages (separate from client stream summaries). */
export function formatToolResultForModel(result: ToolResult): string {
  if (!result.ok) {
    return JSON.stringify({
      ok: false,
      error: result.error,
      code: result.code,
    });
  }

  const payloadRecord =
    result.data != null &&
    typeof result.data === "object" &&
    !Array.isArray(result.data)
      ? (result.data as Record<string, unknown>)
      : null;
  const meta =
    payloadRecord &&
    payloadRecord.meta != null &&
    typeof payloadRecord.meta === "object" &&
    !Array.isArray(payloadRecord.meta)
      ? payloadRecord.meta
      : undefined;

  const serialized = JSON.stringify(
    meta !== undefined ? { data: result.data, meta } : result.data,
  );
  const maxChars = 8000;
  if (serialized.length <= maxChars) return serialized;
  return `${serialized.slice(0, maxChars)}…`;
}
