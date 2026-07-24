/** Independent state dimensions — do not collapse until projection time. */

export type LifecycleDimension = "idle" | "loading" | "ready" | "recovering" | "error";

export type FreshnessDimension = "current" | "aging" | "stale" | "unknown";

export type AvailabilityDimension =
  | "available"
  | "partial"
  | "unavailable"
  | "not_requested";

export type ProvenanceDimension =
  | "preferred"
  | "fallback"
  | "mixed"
  | "derived"
  | "unknown";

export type ConnectionDimension =
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "unknown"
  | "not_applicable";

export type TransportDimension =
  | "streaming"
  | "polling"
  | "request"
  | "cache"
  | "idle";

export type TrustDimension =
  | "display"
  | "analysis"
  | "brokerage_truth"
  | "trading_decision";

export type TradingReadinessDimension = "allowed" | "blocked" | "not_applicable";

export type ObservationConfidence = "observed" | "last_known" | "inferred" | "unknown";

export type CoverageDimension = "complete" | "partial" | "empty" | "unknown";

/** Snapshot of independent dimensions before UI/API projection. */
export type DimensionSnapshot = {
  lifecycle?: LifecycleDimension;
  freshness?: FreshnessDimension;
  availability?: AvailabilityDimension;
  provenance?: ProvenanceDimension;
  connection?: ConnectionDimension;
  transport?: TransportDimension;
  trust?: TrustDimension;
  tradingReadiness?: TradingReadinessDimension;
  observationConfidence?: ObservationConfidence;
};
