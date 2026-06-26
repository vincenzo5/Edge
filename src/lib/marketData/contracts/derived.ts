export type DerivedMetricKind =
  | "rvol"
  | "atr"
  | "gap_percent"
  | "trend"
  | "regime"
  | "iv_rank"
  | "iv_percentile"
  | "options_liquidity";

export type DerivedMetric = {
  symbol: string;
  kind: DerivedMetricKind;
  value: number | string;
  asOf: number;
  source: string;
  metadata?: Record<string, unknown>;
};
