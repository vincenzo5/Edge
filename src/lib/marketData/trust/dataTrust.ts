import type { DataCacheTier, DataResult } from "../contracts/result";

/** What the consumer is allowed to use the data for. */
export type DataUsage =
  | "display"
  | "analysis"
  | "brokerage_truth"
  | "trading_decision";

/** Dataset kinds with explicit source/fallback policy. */
export type DatasetKind =
  | "chart_candles"
  | "watchlist_quotes"
  | "options_expirations"
  | "options_chain"
  | "account_summary"
  | "positions"
  | "orders"
  | "fills"
  | "pre_trade_quote";

export type DataProvenance = {
  source: string;
  asOf?: number;
  receivedAt: number;
  stale: boolean;
  warnings: string[];
  cacheTier?: DataCacheTier;
  /** True when source is a convenience fallback (Yahoo/mixed or explicit warning). */
  isFallback: boolean;
};

export type DataReadinessStatus = "ok" | "blocked";

export type DataReadiness = {
  status: DataReadinessStatus;
  usage: DataUsage;
  dataset: DatasetKind;
  reasons: string[];
  /** Whether this dataset+provenance may inform a future trade gate. */
  allowedForTradingDecision: boolean;
};

export type DatasetPolicy = {
  dataset: DatasetKind;
  allowedUsages: readonly DataUsage[];
  fallbackAllowed: boolean;
  tradingDecisionAllowed: boolean;
  /** When set, only these sources may pass trading_decision checks. */
  tradingSources?: readonly string[];
  /** Max quote age for trading_decision when tradingDecisionAllowed. */
  maxAgeMs?: number;
};

const FALLBACK_SOURCES = new Set(["yahoo", "mixed"]);

const FALLBACK_WARNING = /fallback|fill|skipped|trying next provider/i;

/** Central policy table — single source of truth for dataset usage rules. */
export const DATASET_POLICIES: Record<DatasetKind, DatasetPolicy> = {
  chart_candles: {
    dataset: "chart_candles",
    allowedUsages: ["display", "analysis"],
    fallbackAllowed: true,
    tradingDecisionAllowed: false,
  },
  watchlist_quotes: {
    dataset: "watchlist_quotes",
    allowedUsages: ["display", "analysis"],
    fallbackAllowed: true,
    tradingDecisionAllowed: false,
  },
  options_expirations: {
    dataset: "options_expirations",
    allowedUsages: ["analysis"],
    fallbackAllowed: false,
    tradingDecisionAllowed: false,
  },
  options_chain: {
    dataset: "options_chain",
    allowedUsages: ["analysis"],
    fallbackAllowed: false,
    tradingDecisionAllowed: false,
  },
  account_summary: {
    dataset: "account_summary",
    allowedUsages: ["brokerage_truth", "trading_decision"],
    fallbackAllowed: false,
    tradingDecisionAllowed: true,
    tradingSources: ["tws"],
  },
  positions: {
    dataset: "positions",
    allowedUsages: ["brokerage_truth", "trading_decision"],
    fallbackAllowed: false,
    tradingDecisionAllowed: true,
    tradingSources: ["tws"],
  },
  orders: {
    dataset: "orders",
    allowedUsages: ["brokerage_truth"],
    fallbackAllowed: false,
    tradingDecisionAllowed: false,
  },
  fills: {
    dataset: "fills",
    allowedUsages: ["brokerage_truth"],
    fallbackAllowed: false,
    tradingDecisionAllowed: false,
  },
  pre_trade_quote: {
    dataset: "pre_trade_quote",
    allowedUsages: ["trading_decision"],
    fallbackAllowed: false,
    tradingDecisionAllowed: true,
    tradingSources: ["tws", "ibkr"],
    maxAgeMs: 5_000,
  },
};

export function getDatasetPolicy(dataset: DatasetKind): DatasetPolicy {
  return DATASET_POLICIES[dataset];
}

export function isFallbackSource(
  source: string | undefined,
  warnings: string[] = [],
): boolean {
  const normalized = (source ?? "").toLowerCase();
  if (FALLBACK_SOURCES.has(normalized)) return true;
  if (normalized === "mixed") return true;
  return warnings.some((w) => FALLBACK_WARNING.test(w));
}

export function provenanceFromDataResult<T>(result: DataResult<T>): DataProvenance {
  return {
    source: result.source,
    asOf: result.asOf,
    receivedAt: result.receivedAt,
    stale: result.stale,
    warnings: result.warnings,
    cacheTier: result.cacheTier,
    isFallback: isFallbackSource(result.source, result.warnings),
  };
}

export function provenanceFromMeta(meta: {
  source?: string;
  asOf?: number;
  stale?: boolean;
  warnings?: string[];
  cacheTier?: DataCacheTier;
  receivedAt?: number;
}): DataProvenance {
  const now = Date.now();
  return {
    source: meta.source ?? "unknown",
    asOf: meta.asOf,
    receivedAt: meta.receivedAt ?? meta.asOf ?? now,
    stale: meta.stale ?? false,
    warnings: meta.warnings ?? [],
    cacheTier: meta.cacheTier,
    isFallback: isFallbackSource(meta.source, meta.warnings),
  };
}

function quoteAgeMs(provenance: DataProvenance, now: number): number {
  const anchor = provenance.asOf ?? provenance.receivedAt;
  return Math.max(0, now - anchor);
}

function tradingDecisionReasons(
  policy: DatasetPolicy,
  provenance: DataProvenance,
  now: number,
): string[] {
  const reasons: string[] = [];
  if (!policy.tradingDecisionAllowed) {
    reasons.push(`${policy.dataset} cannot be used for trading decisions`);
    return reasons;
  }
  if (provenance.isFallback && !policy.fallbackAllowed) {
    reasons.push(`Fallback source ${provenance.source} is not allowed for ${policy.dataset}`);
  }
  if (policy.tradingSources) {
    const source = provenance.source.toLowerCase();
    if (!policy.tradingSources.includes(source)) {
      reasons.push(
        `Source ${provenance.source} is not approved for trading (allowed: ${policy.tradingSources.join(", ")})`,
      );
    }
  }
  if (policy.maxAgeMs != null) {
    const age = quoteAgeMs(provenance, now);
    if (age > policy.maxAgeMs) {
      reasons.push(`Quote age ${age}ms exceeds max ${policy.maxAgeMs}ms`);
    }
  }
  if (provenance.stale) {
    reasons.push("Data is marked stale");
  }
  return reasons;
}

/** Evaluate whether data may be used for the requested purpose. */
export function evaluateReadiness(
  dataset: DatasetKind,
  usage: DataUsage,
  provenance: DataProvenance,
  now = Date.now(),
): DataReadiness {
  const policy = getDatasetPolicy(dataset);
  const reasons: string[] = [];

  if (!policy.allowedUsages.includes(usage)) {
    reasons.push(`Dataset ${dataset} is not allowed for ${usage}`);
  }

  if (provenance.isFallback && !policy.fallbackAllowed) {
    reasons.push(`Fallback source ${provenance.source} is not allowed for ${dataset}`);
  }

  if (usage === "trading_decision") {
    reasons.push(...tradingDecisionReasons(policy, provenance, now));
  }

  const allowedForTradingDecision =
    policy.tradingDecisionAllowed &&
    tradingDecisionReasons(policy, provenance, now).length === 0;

  return {
    status: reasons.length === 0 ? "ok" : "blocked",
    usage,
    dataset,
    reasons,
    allowedForTradingDecision,
  };
}

export type TrustResponseMeta = {
  usage: DataUsage;
  readiness: Pick<DataReadiness, "status" | "reasons" | "allowedForTradingDecision">;
};

export function buildTrustMeta(
  dataset: DatasetKind,
  usage: DataUsage,
  provenance: DataProvenance,
  now = Date.now(),
): TrustResponseMeta {
  const readiness = evaluateReadiness(dataset, usage, provenance, now);
  return {
    usage,
    readiness: {
      status: readiness.status,
      reasons: readiness.reasons,
      allowedForTradingDecision: readiness.allowedForTradingDecision,
    },
  };
}

/** Map Data Health dataset kind to trust dataset kind. */
export function datasetKindFromHealthKind(
  kind: "chart" | "watchlist" | "options" | "account",
): DatasetKind {
  switch (kind) {
    case "chart":
      return "chart_candles";
    case "watchlist":
      return "watchlist_quotes";
    case "options":
      return "options_chain";
    case "account":
      return "account_summary";
  }
}

export function defaultUsageForDataset(dataset: DatasetKind): DataUsage {
  const policy = getDatasetPolicy(dataset);
  if (policy.allowedUsages.includes("display")) return "display";
  if (policy.allowedUsages.includes("brokerage_truth")) return "brokerage_truth";
  return policy.allowedUsages[0] ?? "analysis";
}
