import {
  DATASET_CATALOG,
  type DatasetDefinition,
  type DatasetId,
  type DatasetLifecycle,
  listActiveDatasets,
} from "./catalog";

/** How Phase 7 classifies catalog rows for health coverage. */
export type CoverageMode =
  | "observed"
  | "demand_gated"
  | "inherited"
  | "control_plane"
  | "excluded";

export type CoverageDisposition = {
  mode: CoverageMode;
  reason: string;
  inheritsFrom?: DatasetId;
};

export type CatalogCoverageRow = {
  datasetId: DatasetId;
  lifecycle: DatasetLifecycle;
  family: DatasetDefinition["family"];
  disposition: CoverageDisposition;
};

export type CatalogCoverageReport = {
  active: number;
  observed: number;
  demandGated: number;
  inherited: number;
  controlPlane: number;
  excluded: number;
  unclassified: number;
  rows: CatalogCoverageRow[];
};

const EXPLICIT_DISPOSITIONS: Partial<Record<DatasetId, CoverageDisposition>> = {
  chart_candles: { mode: "observed", reason: "always-active chart feed" },
  watchlist_quotes: { mode: "observed", reason: "always-active watchlist feed" },
  options_expirations: { mode: "demand_gated", reason: "options UI registers meta" },
  options_chain: { mode: "demand_gated", reason: "options UI registers meta" },
  account_summary: { mode: "observed", reason: "brokerage account feed when enabled" },
  positions: { mode: "observed", reason: "brokerage account feed when enabled" },
  broker_ledger_ingest: { mode: "observed", reason: "ledger cursor surfaced on account row" },
  instrument_search: { mode: "demand_gated", reason: "on-demand symbol lookup" },
  fundamentals_display: { mode: "demand_gated", reason: "symbol fundamentals panel" },
  screener_descriptive: { mode: "demand_gated", reason: "active screener session" },
  screener_technical: { mode: "demand_gated", reason: "active screener session" },
  screener_universe_daily: { mode: "demand_gated", reason: "screener universe warm" },
  screener_movers: { mode: "demand_gated", reason: "screener movers preset" },
  events_market: { mode: "demand_gated", reason: "research/events overlay" },
  news_symbol: { mode: "demand_gated", reason: "news overlay" },
  macro_series: { mode: "demand_gated", reason: "macro research panel" },
  sec_filings_direct: { mode: "demand_gated", reason: "filings research" },
  fmp_profile: { mode: "demand_gated", reason: "FMP research routes" },
  fmp_estimates: { mode: "demand_gated", reason: "FMP research routes" },
  fmp_financials: { mode: "demand_gated", reason: "FMP research routes" },
  fmp_executives: { mode: "demand_gated", reason: "FMP research routes" },
  fmp_sec_filings_search: { mode: "demand_gated", reason: "FMP research routes" },
  market_context: { mode: "demand_gated", reason: "chart legend context" },
  derived_metrics: { mode: "inherited", reason: "inherits upstream quotes/fundamentals", inheritsFrom: "watchlist_quotes" },
  chart_indicators: { mode: "inherited", reason: "inherits chart candles", inheritsFrom: "chart_candles" },
  orders: { mode: "demand_gated", reason: "account/trading surfaces" },
  executions_fills: { mode: "demand_gated", reason: "account/trading surfaces" },
  account_pnl: { mode: "demand_gated", reason: "account surfaces" },
  pre_trade_quote: { mode: "demand_gated", reason: "trade preview/submit path" },
  order_intents: { mode: "control_plane", reason: "server-only intent store" },
  journal_trades: { mode: "excluded", reason: "derived brokerage journal content" },
  watchlist_library: { mode: "demand_gated", reason: "cloud sync when Postgres expected" },
  screener_library: { mode: "demand_gated", reason: "cloud sync when Postgres expected" },
  chart_workspaces: { mode: "demand_gated", reason: "cloud sync when Postgres expected" },
  chart_templates: { mode: "demand_gated", reason: "cloud sync when Postgres expected" },
  script_library: { mode: "demand_gated", reason: "cloud sync when Postgres expected" },
  research_notes: { mode: "demand_gated", reason: "cloud sync when Postgres expected" },
  account_snapshots: { mode: "excluded", reason: "historical ingest snapshots" },
  pattern_library: { mode: "excluded", reason: "user content filesystem" },
  risk_settings: { mode: "excluded", reason: "deferred Postgres resource" },
  market_data_warmup: { mode: "control_plane", reason: "best-effort warmup control plane" },
  market_data_health: { mode: "control_plane", reason: "health snapshot source" },
  tws_recovery: { mode: "control_plane", reason: "recovery orchestration" },
  tws_ibkr_probes: { mode: "excluded", reason: "on-demand diagnostics only" },
};

function dispositionFromCatalogRow(row: DatasetDefinition): CoverageDisposition {
  const explicit = EXPLICIT_DISPOSITIONS[row.datasetId];
  if (explicit) return explicit;

  if (row.lifecycle !== "active") {
    return { mode: "excluded", reason: `lifecycle:${row.lifecycle}` };
  }

  if (row.freshnessPolicy.kind === "inherits") {
    return {
      mode: "inherited",
      reason: "inherits upstream freshness",
      inheritsFrom: row.freshnessPolicy.datasetId,
    };
  }

  if (row.family === "infrastructure") {
    return { mode: "control_plane", reason: "infrastructure dataset" };
  }

  if (row.healthVisibility === "excluded") {
    return { mode: "excluded", reason: "intentionally excluded from user health" };
  }

  if (row.healthVisibility === "provider" || row.healthVisibility === "none") {
    return { mode: "control_plane", reason: `healthVisibility:${row.healthVisibility}` };
  }

  return { mode: "demand_gated", reason: `healthVisibility:${row.healthVisibility}` };
}

export function resolveCoverageDisposition(row: DatasetDefinition): CoverageDisposition {
  return dispositionFromCatalogRow(row);
}

export function buildCatalogCoverageReport(): CatalogCoverageReport {
  const rows: CatalogCoverageRow[] = DATASET_CATALOG.map((row) => ({
    datasetId: row.datasetId,
    lifecycle: row.lifecycle,
    family: row.family,
    disposition: resolveCoverageDisposition(row),
  }));

  const activeRows = rows.filter((row) => row.lifecycle === "active");
  const countByMode = (mode: CoverageMode) =>
    activeRows.filter((row) => row.disposition.mode === mode).length;

  // unclassified = active rows without explicit or derived disposition mapping
  const trulyUnclassified = activeRows.filter((row) => {
    const d = row.disposition;
    if (EXPLICIT_DISPOSITIONS[row.datasetId]) return false;
    if (d.mode === "inherited" && d.inheritsFrom) return false;
    if (d.mode === "control_plane" && row.family === "infrastructure") return false;
    if (d.mode === "excluded" && d.reason.startsWith("lifecycle:")) return false;
    if (d.mode === "demand_gated" && d.reason.startsWith("healthVisibility:")) return false;
    return d.reason === "intentionally excluded from user health";
  }).length;

  return {
    active: activeRows.length,
    observed: countByMode("observed"),
    demandGated: countByMode("demand_gated"),
    inherited: countByMode("inherited"),
    controlPlane: countByMode("control_plane"),
    excluded: countByMode("excluded"),
    unclassified: trulyUnclassified,
    rows,
  };
}

export function assertActiveCatalogCoverageComplete(): void {
  const report = buildCatalogCoverageReport();
  if (report.unclassified > 0) {
    const ids = report.rows
      .filter(
        (row) =>
          row.lifecycle === "active" &&
          !EXPLICIT_DISPOSITIONS[row.datasetId] &&
          row.disposition.reason === "intentionally excluded from user health",
      )
      .map((row) => row.datasetId);
    throw new Error(
      `Unclassified active catalog rows (${report.unclassified}): ${ids.join(", ")}`,
    );
  }
}

export function listDemandGatedDatasetIds(): DatasetId[] {
  return listActiveDatasets()
    .filter((row) => resolveCoverageDisposition(row).mode === "demand_gated")
    .map((row) => row.datasetId);
}
