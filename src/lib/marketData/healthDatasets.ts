import type { ChartDataMeta } from "@edge/chart-core";
import type { DatasetId } from "./state/catalog";
import { getDatasetDefinition } from "./state/catalog";
import type {
  DataHealthDatasetKind,
  DataHealthDatasetRow,
  DataHealthDatasetStatus,
} from "./health";
import type { SanitizedDatasetState } from "./state/deliveryRegistry";
import type { DatasetKind } from "./trust/dataTrust";
import {
  buildTrustMeta,
  defaultUsageForDataset,
  provenanceFromMeta,
} from "./trust/dataTrust";

function attachDemandTrustFields(row: DataHealthDatasetRow): DataHealthDatasetRow {
  if (row.status !== "loaded" || !row.source || !row.trustDataset) return row;
  const trust = buildTrustMeta(
    row.trustDataset,
    defaultUsageForDataset(row.trustDataset),
    provenanceFromMeta({
      source: row.source,
      stale: row.stale,
      warnings: row.warnings,
      cacheTier: row.cacheTier,
      asOf: row.asOf,
      receivedAt: row.receivedAt,
    }),
  );
  return {
    ...row,
    usage: trust.usage,
    allowedForTradingDecision: trust.readiness.allowedForTradingDecision,
    readinessReasons:
      trust.readiness.status === "blocked" ? trust.readiness.reasons : undefined,
  };
}

export type DemandDatasetInput = {
  datasetId: DatasetId;
  meta?: Partial<ChartDataMeta> | null;
  detail?: string;
  status?: DataHealthDatasetStatus;
  warnings?: string[];
  trustDataset?: DatasetKind;
  active?: boolean;
};

function demandMetaEqual(
  a: DemandDatasetInput["meta"],
  b: DemandDatasetInput["meta"],
): boolean {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  return (
    a.source === b.source &&
    a.asOf === b.asOf &&
    a.stale === b.stale &&
    a.lastUpdateAt === b.lastUpdateAt &&
    a.cacheTier === b.cacheTier &&
    (a.warnings?.join("\0") ?? "") === (b.warnings?.join("\0") ?? "")
  );
}

/** Skip redundant demand-dataset writes that would re-render DataHealthProvider. */
export function areDemandDatasetInputsEqual(
  a: DemandDatasetInput,
  b: DemandDatasetInput | undefined,
): boolean {
  if (!b) return false;
  return (
    a.datasetId === b.datasetId &&
    (a.active ?? true) === (b.active ?? true) &&
    a.detail === b.detail &&
    a.status === b.status &&
    a.trustDataset === b.trustDataset &&
    (a.warnings?.join("\0") ?? "") === (b.warnings?.join("\0") ?? "") &&
    demandMetaEqual(a.meta, b.meta)
  );
}

export type BrokerageSubdatasetInput = {
  datasetId: Extract<
    DatasetId,
    | "account_summary"
    | "positions"
    | "account_pnl"
    | "orders"
    | "executions_fills"
    | "broker_ledger_ingest"
  >;
  detail?: string;
  asOf?: number;
  receivedAt?: number;
  status?: DataHealthDatasetStatus;
  warnings?: string[];
};

export type PersistenceSyncHealthInput = {
  expected: boolean;
  status: "synced" | "local_only" | "auth_blocked" | "conflict" | "error" | "idle";
  detail?: string;
  warnings?: string[];
};

export type PreTradeHealthInput = {
  active: boolean;
  blocked?: boolean;
  reasons?: string[];
  quoteAgeMs?: number;
  connectionLabel?: string;
};

const DATASET_LABELS: Partial<Record<DatasetId, string>> = {
  screener_descriptive: "Screener",
  screener_technical: "Screener (technical)",
  screener_universe_daily: "Universe store",
  screener_movers: "Market movers",
  fundamentals_display: "Fundamentals",
  events_market: "Events",
  news_symbol: "News",
  macro_series: "Macro",
  sec_filings_direct: "SEC filings",
  fmp_profile: "Company profile",
  fmp_estimates: "Analyst estimates",
  fmp_financials: "Financials",
  fmp_executives: "Executives",
  fmp_sec_filings_search: "Filing search",
  market_context: "Market context",
  account_summary: "Account summary",
  positions: "Positions",
  account_pnl: "PnL",
  orders: "Orders",
  executions_fills: "Executions",
  broker_ledger_ingest: "Ledger ingest",
  pre_trade_quote: "Pre-trade quote",
  watchlist_library: "Watchlist sync",
  screener_library: "Screener sync",
  chart_workspaces: "Workspace sync",
  chart_templates: "Template sync",
  research_notes: "Research notes sync",
};

const DATASET_KIND_MAP: Partial<Record<DatasetId, DataHealthDatasetKind>> = {
  screener_descriptive: "screener",
  screener_technical: "screener",
  screener_universe_daily: "screener",
  screener_movers: "screener",
  fundamentals_display: "fundamentals",
  events_market: "research",
  news_symbol: "research",
  macro_series: "research",
  sec_filings_direct: "research",
  fmp_profile: "research",
  fmp_estimates: "research",
  fmp_financials: "research",
  fmp_executives: "research",
  fmp_sec_filings_search: "research",
  market_context: "research",
  account_summary: "brokerage_detail",
  positions: "brokerage_detail",
  account_pnl: "brokerage_detail",
  orders: "brokerage_detail",
  executions_fills: "brokerage_detail",
  broker_ledger_ingest: "brokerage_detail",
  pre_trade_quote: "pre_trade",
  watchlist_library: "cloud_sync",
  screener_library: "cloud_sync",
  chart_workspaces: "cloud_sync",
  chart_templates: "cloud_sync",
  research_notes: "cloud_sync",
};

function resolveDatasetKind(datasetId: DatasetId): DataHealthDatasetKind {
  return DATASET_KIND_MAP[datasetId] ?? "research";
}

function resolveTrustKindForRow(datasetId: DatasetId, trustDataset?: DatasetKind): DatasetKind {
  if (trustDataset) return trustDataset;
  const def = getDatasetDefinition(datasetId);
  if (def.policyKind) return def.policyKind;
  return "chart_candles";
}

export function buildDemandDatasetRow(input: DemandDatasetInput): DataHealthDatasetRow | null {
  if (input.active === false) return null;
  const label = DATASET_LABELS[input.datasetId] ?? input.datasetId;
  const kind = resolveDatasetKind(input.datasetId);
  if (!input.meta?.source && input.status !== "loading") {
    return {
      kind,
      datasetId: input.datasetId,
      label,
      detail: input.detail,
      status: input.status ?? "not_loaded",
      warnings: input.warnings ?? [],
    };
  }
  const meta = input.meta!;
  return attachDemandTrustFields({
    kind,
    datasetId: input.datasetId,
    label,
    detail: input.detail,
    source: meta.source,
    cacheTier: meta.cacheTier,
    stale: meta.stale,
    asOf: meta.asOf,
    receivedAt: meta.lastUpdateAt ?? meta.asOf,
    streaming: meta.streaming,
    latencyMs: meta.latencyMs,
    status: input.status ?? (meta.warnings?.length ? "unavailable" : "loaded"),
    warnings: input.warnings ?? meta.warnings ?? [],
    trustDataset: resolveTrustKindForRow(input.datasetId, input.trustDataset),
  });
}

export function buildDemandRowsFromInputs(
  inputs: DemandDatasetInput[] | undefined,
): DataHealthDatasetRow[] {
  if (!inputs?.length) return [];
  const rows: DataHealthDatasetRow[] = [];
  for (const input of inputs) {
    const row = buildDemandDatasetRow(input);
    if (row) rows.push(row);
  }
  return rows;
}

export function buildBrokerageSubdatasetRow(
  input: BrokerageSubdatasetInput,
): DataHealthDatasetRow {
  const label = DATASET_LABELS[input.datasetId] ?? input.datasetId;
  const kind = resolveDatasetKind(input.datasetId);
  const status = input.status ?? "loaded";
  if (status === "not_loaded") {
    return {
      kind,
      datasetId: input.datasetId,
      label,
      detail: input.detail,
      status,
      warnings: input.warnings ?? [],
    };
  }
  return attachDemandTrustFields({
    kind,
    datasetId: input.datasetId,
    label,
    detail: input.detail,
    source: "tws",
    asOf: input.asOf,
    receivedAt: input.receivedAt ?? input.asOf,
    streaming: true,
    status,
    warnings: input.warnings ?? [],
    trustDataset: resolveTrustKindForRow(input.datasetId),
  });
}

export function buildPreTradeDatasetRow(input: PreTradeHealthInput | undefined): DataHealthDatasetRow | null {
  if (!input?.active) return null;
  const detailParts: string[] = [];
  if (input.connectionLabel) detailParts.push(input.connectionLabel);
  if (input.quoteAgeMs != null) {
    detailParts.push(`quote ${Math.max(0, Math.round(input.quoteAgeMs / 1000))}s old`);
  }
  const hasQuoteReadinessEvidence =
    input.blocked === false && input.quoteAgeMs != null;
  const blocked = input.blocked === true || !hasQuoteReadinessEvidence;
  const readinessReasons = blocked
    ? input.reasons?.length
      ? input.reasons
      : ["Connection only — quote readiness not verified"]
    : undefined;
  return {
    kind: "pre_trade",
    datasetId: "pre_trade_quote",
    label: "Order environment",
    detail: detailParts.length ? detailParts.join(" · ") : undefined,
    source: "tws",
    status: blocked ? "unavailable" : "loaded",
    warnings: readinessReasons ?? [],
    allowedForTradingDecision: !blocked,
    readinessLabel: blocked ? "blocked" : "ok",
    readinessReasons,
  };
}

export function buildPersistenceSyncRow(
  input: PersistenceSyncHealthInput | undefined,
): DataHealthDatasetRow | null {
  if (!input?.expected) return null;
  const status: DataHealthDatasetStatus =
    input.status === "error" || input.status === "auth_blocked" || input.status === "conflict"
      ? "unavailable"
      : input.status === "idle"
        ? "not_loaded"
        : "loaded";
  return {
    kind: "cloud_sync",
    datasetId: "watchlist_library",
    label: "Cloud sync",
    detail: input.detail,
    status,
    warnings: input.warnings ?? [],
  };
}

export function mergeDeliveryDiagnosticsIntoRows(
  rows: DataHealthDatasetRow[],
  diagnostics: SanitizedDatasetState[] | undefined,
): DataHealthDatasetRow[] {
  if (!diagnostics?.length) return rows;
  const byId = new Map(diagnostics.map((row) => [row.datasetId, row]));
  return rows.map((row) => {
    if (!row.datasetId) return row;
    const diag = byId.get(row.datasetId);
    if (!diag) return row;
    return {
      ...row,
      source: row.source ?? diag.source,
      cacheTier: row.cacheTier ?? (diag.cacheTier as DataHealthDatasetRow["cacheTier"]),
      warnings: row.warnings.length ? row.warnings : diag.warnings,
    };
  });
}

export function filterVisibleCurrentDataRows(rows: DataHealthDatasetRow[]): DataHealthDatasetRow[] {
  return rows.filter((row) => {
    if (row.kind === "options" && row.status === "not_loaded") return false;
    if (row.datasetId && row.status === "not_loaded") return false;
    return true;
  });
}
