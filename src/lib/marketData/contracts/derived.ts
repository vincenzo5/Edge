export type DerivedMetricKind =
  | "rvol"
  | "atr"
  | "gap_percent"
  | "trend"
  | "regime"
  | "iv_rank"
  | "iv_percentile"
  | "options_liquidity";

export type DerivedUpstreamRef = {
  datasetId: string;
  source: string;
  receivedAt?: number;
  asOf?: number;
  stale?: boolean;
  displayFresh?: boolean;
};

export type DerivedMetric = {
  symbol: string;
  kind: DerivedMetricKind;
  value: number | string;
  asOf: number;
  source: string;
  metadata?: Record<string, unknown>;
  /** Bounded upstream dependency summary for diagnostics/trust. */
  upstream?: readonly DerivedUpstreamRef[];
};
