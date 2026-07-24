import type { DataUsage } from "../trust/dataTrust";
import type { DatasetKind } from "../trust/dataTrust";

/** Stable dataset identifiers from Phase 1 catalog. */
export type DatasetId =
  | "chart_candles"
  | "watchlist_quotes"
  | "instrument_search"
  | "fundamentals_display"
  | "options_expirations"
  | "options_chain"
  | "screener_descriptive"
  | "screener_technical"
  | "screener_universe_daily"
  | "screener_movers"
  | "events_market"
  | "news_symbol"
  | "macro_series"
  | "sec_filings_direct"
  | "fmp_profile"
  | "fmp_estimates"
  | "fmp_financials"
  | "fmp_executives"
  | "fmp_sec_filings_search"
  | "market_context"
  | "derived_metrics"
  | "chart_indicators"
  | "account_summary"
  | "positions"
  | "orders"
  | "executions_fills"
  | "account_pnl"
  | "pre_trade_quote"
  | "order_intents"
  | "broker_ledger_ingest"
  | "journal_trades"
  | "watchlist_library"
  | "screener_library"
  | "chart_workspaces"
  | "chart_templates"
  | "script_library"
  | "research_notes"
  | "account_snapshots"
  | "pattern_library"
  | "risk_settings"
  | "market_data_warmup"
  | "market_data_health"
  | "tws_recovery"
  | "tws_ibkr_probes";

export type DatasetFamily =
  | "equity"
  | "options"
  | "screener"
  | "research"
  | "brokerage"
  | "trading"
  | "persistence"
  | "derived"
  | "infrastructure";

export type DatasetLifecycle = "active" | "legacy" | "deferred" | "excluded";

export type HealthVisibility =
  | "chart"
  | "watchlist"
  | "options"
  | "account"
  | "provider"
  | "none"
  | "excluded";

export type FreshnessPolicyRef =
  | { kind: "dataset_policy"; policyKind: DatasetKind }
  | { kind: "ttl"; namespace: string }
  | { kind: "inherits"; datasetId: DatasetId }
  | { kind: "gap"; reason: string };

export type DatasetDefinition = {
  datasetId: DatasetId;
  family: DatasetFamily;
  lifecycle: DatasetLifecycle;
  owner: string;
  routeOrder: readonly string[];
  trustUsage: readonly DataUsage[];
  healthVisibility: HealthVisibility;
  freshnessPolicy: FreshnessPolicyRef;
  /** Policy-bearing kind when registered in DATASET_POLICIES. */
  policyKind?: DatasetKind;
};

export const DATASET_CATALOG: readonly DatasetDefinition[] = [
  {
    datasetId: "chart_candles",
    family: "equity",
    lifecycle: "active",
    owner: "MarketDataService.getCandles",
    routeOrder: ["tws", "ibkr", "yahoo"],
    trustUsage: ["display", "analysis"],
    healthVisibility: "chart",
    freshnessPolicy: { kind: "dataset_policy", policyKind: "chart_candles" },
    policyKind: "chart_candles",
  },
  {
    datasetId: "watchlist_quotes",
    family: "equity",
    lifecycle: "active",
    owner: "getQuotes / streams",
    routeOrder: ["tws", "ibkr", "yahoo"],
    trustUsage: ["display", "analysis"],
    healthVisibility: "watchlist",
    freshnessPolicy: { kind: "dataset_policy", policyKind: "watchlist_quotes" },
    policyKind: "watchlist_quotes",
  },
  {
    datasetId: "instrument_search",
    family: "equity",
    lifecycle: "active",
    owner: "searchInstruments",
    routeOrder: ["yahoo"],
    trustUsage: ["display"],
    healthVisibility: "excluded",
    freshnessPolicy: { kind: "gap", reason: "on-demand" },
  },
  {
    datasetId: "fundamentals_display",
    family: "equity",
    lifecycle: "active",
    owner: "getFundamentals",
    routeOrder: ["yahoo"],
    trustUsage: ["display"],
    healthVisibility: "excluded",
    freshnessPolicy: { kind: "ttl", namespace: "fundamentals" },
  },
  {
    datasetId: "options_expirations",
    family: "options",
    lifecycle: "active",
    owner: "getOptionExpirations",
    routeOrder: ["massive", "tws", "ibkr"],
    trustUsage: ["analysis"],
    healthVisibility: "options",
    freshnessPolicy: { kind: "dataset_policy", policyKind: "options_expirations" },
    policyKind: "options_expirations",
  },
  {
    datasetId: "options_chain",
    family: "options",
    lifecycle: "active",
    owner: "getOptionsChain",
    routeOrder: ["massive", "tws", "ibkr"],
    trustUsage: ["analysis"],
    healthVisibility: "options",
    freshnessPolicy: { kind: "dataset_policy", policyKind: "options_chain" },
    policyKind: "options_chain",
  },
  {
    datasetId: "screener_descriptive",
    family: "screener",
    lifecycle: "active",
    owner: "getScreenerResults",
    routeOrder: ["fmp"],
    trustUsage: ["analysis"],
    healthVisibility: "excluded",
    freshnessPolicy: { kind: "ttl", namespace: "screener" },
  },
  {
    datasetId: "screener_technical",
    family: "screener",
    lifecycle: "active",
    owner: "getScreenerResults + technicalFilter",
    routeOrder: ["massive", "fmp", "yahoo"],
    trustUsage: ["analysis"],
    healthVisibility: "excluded",
    freshnessPolicy: { kind: "gap", reason: "partial via skippedSymbols" },
  },
  {
    datasetId: "screener_universe_daily",
    family: "screener",
    lifecycle: "active",
    owner: "universeDailyStore",
    routeOrder: ["massive"],
    trustUsage: ["analysis"],
    healthVisibility: "excluded",
    freshnessPolicy: { kind: "ttl", namespace: "universe_daily" },
  },
  {
    datasetId: "screener_movers",
    family: "screener",
    lifecycle: "active",
    owner: "getFmpMarketMovers",
    routeOrder: ["fmp"],
    trustUsage: ["analysis"],
    healthVisibility: "excluded",
    freshnessPolicy: { kind: "ttl", namespace: "movers" },
  },
  {
    datasetId: "events_market",
    family: "research",
    lifecycle: "active",
    owner: "getMarketEvents",
    routeOrder: ["fmp", "sec", "fred"],
    trustUsage: ["display", "analysis"],
    healthVisibility: "excluded",
    freshnessPolicy: { kind: "ttl", namespace: "events" },
  },
  {
    datasetId: "news_symbol",
    family: "research",
    lifecycle: "active",
    owner: "getNews",
    routeOrder: ["fmp"],
    trustUsage: ["display", "analysis"],
    healthVisibility: "excluded",
    freshnessPolicy: { kind: "ttl", namespace: "news" },
  },
  {
    datasetId: "macro_series",
    family: "research",
    lifecycle: "active",
    owner: "getMacroSeries",
    routeOrder: ["fred"],
    trustUsage: ["analysis"],
    healthVisibility: "excluded",
    freshnessPolicy: { kind: "ttl", namespace: "macro" },
  },
  {
    datasetId: "sec_filings_direct",
    family: "research",
    lifecycle: "active",
    owner: "getSecFilings",
    routeOrder: ["sec"],
    trustUsage: ["analysis"],
    healthVisibility: "excluded",
    freshnessPolicy: { kind: "ttl", namespace: "sec" },
  },
  {
    datasetId: "fmp_profile",
    family: "research",
    lifecycle: "active",
    owner: "getFmpCompanyProfile",
    routeOrder: ["fmp"],
    trustUsage: ["analysis"],
    healthVisibility: "excluded",
    freshnessPolicy: { kind: "ttl", namespace: "fmp_profile" },
  },
  {
    datasetId: "fmp_estimates",
    family: "research",
    lifecycle: "active",
    owner: "getFmpAnalystEstimates",
    routeOrder: ["fmp"],
    trustUsage: ["analysis"],
    healthVisibility: "excluded",
    freshnessPolicy: { kind: "ttl", namespace: "fmp_estimates" },
  },
  {
    datasetId: "fmp_financials",
    family: "research",
    lifecycle: "active",
    owner: "getFmpFinancials",
    routeOrder: ["fmp"],
    trustUsage: ["analysis"],
    healthVisibility: "excluded",
    freshnessPolicy: { kind: "ttl", namespace: "fmp_financials" },
  },
  {
    datasetId: "fmp_executives",
    family: "research",
    lifecycle: "active",
    owner: "getFmpExecutives",
    routeOrder: ["fmp"],
    trustUsage: ["analysis"],
    healthVisibility: "excluded",
    freshnessPolicy: { kind: "gap", reason: "no TTL registered" },
  },
  {
    datasetId: "fmp_sec_filings_search",
    family: "research",
    lifecycle: "active",
    owner: "getFmpSecFilings",
    routeOrder: ["fmp"],
    trustUsage: ["analysis"],
    healthVisibility: "excluded",
    freshnessPolicy: { kind: "gap", reason: "no TTL registered" },
  },
  {
    datasetId: "market_context",
    family: "research",
    lifecycle: "active",
    owner: "getMarketContext",
    routeOrder: ["tws", "ibkr", "fmp", "yahoo"],
    trustUsage: ["display"],
    healthVisibility: "excluded",
    freshnessPolicy: { kind: "ttl", namespace: "market_context" },
  },
  {
    datasetId: "derived_metrics",
    family: "derived",
    lifecycle: "active",
    owner: "getDerivedMetric",
    routeOrder: ["composed"],
    trustUsage: ["analysis"],
    healthVisibility: "excluded",
    freshnessPolicy: { kind: "gap", reason: "inherits upstream" },
  },
  {
    datasetId: "chart_indicators",
    family: "derived",
    lifecycle: "active",
    owner: "chart-core math",
    routeOrder: ["chart_candles"],
    trustUsage: ["analysis"],
    healthVisibility: "excluded",
    freshnessPolicy: { kind: "inherits", datasetId: "chart_candles" },
  },
  {
    datasetId: "account_summary",
    family: "brokerage",
    lifecycle: "active",
    owner: "BrokerageService / sidecar",
    routeOrder: ["tws"],
    trustUsage: ["brokerage_truth", "trading_decision"],
    healthVisibility: "account",
    freshnessPolicy: { kind: "dataset_policy", policyKind: "account_summary" },
    policyKind: "account_summary",
  },
  {
    datasetId: "positions",
    family: "brokerage",
    lifecycle: "active",
    owner: "snapshot / stream",
    routeOrder: ["tws"],
    trustUsage: ["brokerage_truth", "trading_decision"],
    healthVisibility: "account",
    freshnessPolicy: { kind: "dataset_policy", policyKind: "positions" },
    policyKind: "positions",
  },
  {
    datasetId: "orders",
    family: "brokerage",
    lifecycle: "active",
    owner: "/brokerage/orders",
    routeOrder: ["tws"],
    trustUsage: ["brokerage_truth"],
    healthVisibility: "excluded",
    freshnessPolicy: { kind: "dataset_policy", policyKind: "orders" },
    policyKind: "orders",
  },
  {
    datasetId: "executions_fills",
    family: "brokerage",
    lifecycle: "active",
    owner: "/brokerage/trades, ingest",
    routeOrder: ["tws"],
    trustUsage: ["brokerage_truth"],
    healthVisibility: "excluded",
    freshnessPolicy: { kind: "dataset_policy", policyKind: "fills" },
    policyKind: "fills",
  },
  {
    datasetId: "account_pnl",
    family: "brokerage",
    lifecycle: "active",
    owner: "/brokerage/pnl",
    routeOrder: ["tws"],
    trustUsage: ["brokerage_truth"],
    healthVisibility: "excluded",
    freshnessPolicy: { kind: "gap", reason: "no policy row" },
  },
  {
    datasetId: "pre_trade_quote",
    family: "trading",
    lifecycle: "active",
    owner: "TradingService.assertPreTrade",
    routeOrder: ["tws", "ibkr"],
    trustUsage: ["trading_decision"],
    healthVisibility: "excluded",
    freshnessPolicy: { kind: "dataset_policy", policyKind: "pre_trade_quote" },
    policyKind: "pre_trade_quote",
  },
  {
    datasetId: "order_intents",
    family: "trading",
    lifecycle: "active",
    owner: "TradingService + Postgres",
    routeOrder: ["server"],
    trustUsage: ["trading_decision"],
    healthVisibility: "excluded",
    freshnessPolicy: { kind: "gap", reason: "intent store" },
  },
  {
    datasetId: "broker_ledger_ingest",
    family: "brokerage",
    lifecycle: "active",
    owner: "runBrokerageIngest",
    routeOrder: ["tws", "postgres"],
    trustUsage: ["brokerage_truth"],
    healthVisibility: "account",
    freshnessPolicy: { kind: "gap", reason: "ingest cursor" },
  },
  {
    datasetId: "journal_trades",
    family: "persistence",
    lifecycle: "active",
    owner: "/api/me/journal/*",
    routeOrder: ["postgres", "localStorage"],
    trustUsage: ["brokerage_truth"],
    healthVisibility: "excluded",
    freshnessPolicy: { kind: "gap", reason: "sync revision" },
  },
  {
    datasetId: "watchlist_library",
    family: "persistence",
    lifecycle: "active",
    owner: "/api/me/watchlist-library",
    routeOrder: ["postgres", "localStorage"],
    trustUsage: [],
    healthVisibility: "excluded",
    freshnessPolicy: { kind: "gap", reason: "sync readiness" },
  },
  {
    datasetId: "screener_library",
    family: "persistence",
    lifecycle: "active",
    owner: "/api/me/screener-library",
    routeOrder: ["postgres", "localStorage"],
    trustUsage: [],
    healthVisibility: "excluded",
    freshnessPolicy: { kind: "gap", reason: "sync readiness" },
  },
  {
    datasetId: "chart_workspaces",
    family: "persistence",
    lifecycle: "active",
    owner: "/api/me/chart-workspaces/*",
    routeOrder: ["postgres", "localStorage"],
    trustUsage: [],
    healthVisibility: "excluded",
    freshnessPolicy: { kind: "gap", reason: "sync readiness" },
  },
  {
    datasetId: "chart_templates",
    family: "persistence",
    lifecycle: "active",
    owner: "/api/me/chart-template-library",
    routeOrder: ["postgres", "localStorage"],
    trustUsage: [],
    healthVisibility: "excluded",
    freshnessPolicy: { kind: "gap", reason: "sync readiness" },
  },
  {
    datasetId: "script_library",
    family: "persistence",
    lifecycle: "active",
    owner: "/api/me/scripts",
    routeOrder: ["postgres"],
    trustUsage: [],
    healthVisibility: "excluded",
    freshnessPolicy: { kind: "gap", reason: "sync readiness" },
  },
  {
    datasetId: "research_notes",
    family: "persistence",
    lifecycle: "active",
    owner: "/api/me/market-research-notes",
    routeOrder: ["postgres", "localStorage"],
    trustUsage: [],
    healthVisibility: "excluded",
    freshnessPolicy: { kind: "gap", reason: "sync readiness" },
  },
  {
    datasetId: "account_snapshots",
    family: "persistence",
    lifecycle: "active",
    owner: "/api/me/account-snapshots",
    routeOrder: ["postgres"],
    trustUsage: ["brokerage_truth"],
    healthVisibility: "excluded",
    freshnessPolicy: { kind: "gap", reason: "no policy row" },
  },
  {
    datasetId: "pattern_library",
    family: "persistence",
    lifecycle: "active",
    owner: "/api/me/pattern-library/*",
    routeOrder: ["postgres", "local"],
    trustUsage: [],
    healthVisibility: "excluded",
    freshnessPolicy: { kind: "gap", reason: "user content" },
  },
  {
    datasetId: "risk_settings",
    family: "persistence",
    lifecycle: "active",
    owner: "/api/me/user-preferences",
    routeOrder: ["postgres", "localStorage"],
    trustUsage: [],
    healthVisibility: "excluded",
    freshnessPolicy: { kind: "gap", reason: "sync readiness" },
  },
  {
    datasetId: "market_data_warmup",
    family: "infrastructure",
    lifecycle: "active",
    owner: "/api/market-data/warmup",
    routeOrder: ["best-effort"],
    trustUsage: [],
    healthVisibility: "excluded",
    freshnessPolicy: { kind: "gap", reason: "control plane" },
  },
  {
    datasetId: "market_data_health",
    family: "infrastructure",
    lifecycle: "active",
    owner: "/api/market-data/health",
    routeOrder: ["probes"],
    trustUsage: [],
    healthVisibility: "provider",
    freshnessPolicy: { kind: "gap", reason: "snapshot generatedAt" },
  },
  {
    datasetId: "tws_recovery",
    family: "infrastructure",
    lifecycle: "active",
    owner: "recover routes + client",
    routeOrder: ["sidecar"],
    trustUsage: [],
    healthVisibility: "none",
    freshnessPolicy: { kind: "gap", reason: "phase messages" },
  },
  {
    datasetId: "tws_ibkr_probes",
    family: "infrastructure",
    lifecycle: "excluded",
    owner: "probe routes",
    routeOrder: ["diagnostics"],
    trustUsage: [],
    healthVisibility: "excluded",
    freshnessPolicy: { kind: "gap", reason: "on-demand" },
  },
] as const;

const catalogById = new Map<DatasetId, DatasetDefinition>(
  DATASET_CATALOG.map((row) => [row.datasetId, row]),
);

export function getDatasetDefinition(datasetId: DatasetId): DatasetDefinition {
  const row = catalogById.get(datasetId);
  if (!row) {
    throw new Error(`Unknown datasetId: ${datasetId}`);
  }
  return row;
}

export function lookupDataset(datasetId: string): DatasetDefinition | undefined {
  return catalogById.get(datasetId as DatasetId);
}

export function listDatasetsByFamily(family: DatasetFamily): DatasetDefinition[] {
  return DATASET_CATALOG.filter((row) => row.family === family);
}

export function listActiveDatasets(): DatasetDefinition[] {
  return DATASET_CATALOG.filter((row) => row.lifecycle === "active");
}

export function listPolicyRegisteredDatasetIds(): DatasetId[] {
  return DATASET_CATALOG.filter((row) => row.policyKind != null).map(
    (row) => row.datasetId,
  );
}

export function datasetIdToPolicyKind(datasetId: DatasetId): DatasetKind | undefined {
  return getDatasetDefinition(datasetId).policyKind;
}

/** Phase 1 catalog count for harness evidence. */
export const CATALOG_DATASET_COUNT = DATASET_CATALOG.length;
