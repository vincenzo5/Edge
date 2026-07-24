/** Canonical delivery and observation timestamps (Phase 1 glossary). */

export type DeliveryTimestamps = {
  /** Delivery or probe started. */
  attemptedAt?: number;
  /** Successful normalize or refresh received. */
  receivedAt?: number;
  /** Provider/content timestamp. */
  providerAsOf?: number;
  /** Last confirmed successful delivery (even unchanged). */
  lastSuccessAt?: number;
  /** Direct connection or sidecar probe time. */
  observedAt?: number;
  /** Health snapshot revision time. */
  generatedAt?: number;
  /** Persistence optimistic concurrency. */
  syncRevision?: number;
};

export function pickLatestTimestamp(
  ...values: Array<number | undefined>
): number | undefined {
  const finite = values.filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );
  if (finite.length === 0) return undefined;
  return Math.max(...finite);
}
