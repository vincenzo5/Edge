import type { DatasetId } from "../state/catalog";
import type { DeliveryObservation } from "../state/observation";
import { createSnapshotRevision } from "../state/revision";

export type DataFaultKind =
  | "timeout"
  | "authentication"
  | "rate_limit"
  | "empty_valid"
  | "empty_invalid"
  | "partial"
  | "stale_cache"
  | "fallback"
  | "recovered"
  | "late_observation";

export type DataFaultFixture = {
  kind: DataFaultKind;
  observation: DeliveryObservation;
};

export function createDataFaultFixture(
  kind: DataFaultKind,
  options: { datasetId?: DatasetId; at?: number } = {},
): DataFaultFixture {
  const datasetId = options.datasetId ?? "chart_candles";
  const at = options.at ?? 10_000;
  const failed =
    kind === "timeout" ||
    kind === "authentication" ||
    kind === "rate_limit" ||
    kind === "empty_invalid";
  const partial = kind === "partial";
  const stale = kind === "stale_cache";
  const fallback = kind === "fallback";
  const warning =
    kind === "authentication"
      ? "authentication_failed"
      : kind === "rate_limit"
        ? "rate_limited"
        : kind === "timeout"
          ? "provider_timeout"
          : kind === "recovered"
            ? "recovered"
            : undefined;

  return {
    kind,
    observation: {
      id: `fixture-${kind}-${at}`,
      datasetId,
      revision: createSnapshotRevision(
        kind === "late_observation" ? 1 : 2,
        kind === "late_observation" ? at - 1_000 : at,
        1,
      ),
      dimensions: {
        lifecycle: failed ? "error" : "ready",
        freshness: stale || failed ? "stale" : "current",
        availability: failed
          ? "unavailable"
          : partial
            ? "partial"
            : "available",
        provenance: fallback ? "fallback" : "preferred",
        transport: stale ? "cache" : "request",
      },
      timestamps: {
        attemptedAt: at - 50,
        receivedAt: at,
        lastSuccessAt: failed ? undefined : at,
      },
      route: {
        attempted: fallback ? ["tws", "yahoo"] : ["tws"],
        selected: fallback ? "yahoo" : "tws",
        fallbackReason: fallback ? "provider_timeout" : undefined,
      },
      coverage:
        kind === "empty_valid" || kind === "empty_invalid"
          ? "empty"
          : partial
            ? "partial"
            : "complete",
      source: fallback ? "yahoo" : "tws",
      stale,
      warnings: warning ? [warning] : [],
      failureCategory: failed ? kind : undefined,
    },
  };
}

export function createDataFaultMatrix(
  datasetId: DatasetId = "chart_candles",
): DataFaultFixture[] {
  return (
    [
      "timeout",
      "authentication",
      "rate_limit",
      "empty_valid",
      "empty_invalid",
      "partial",
      "stale_cache",
      "fallback",
      "recovered",
      "late_observation",
    ] as const
  ).map((kind, index) =>
    createDataFaultFixture(kind, {
      datasetId,
      at: 10_000 + index * 1_000,
    }),
  );
}
