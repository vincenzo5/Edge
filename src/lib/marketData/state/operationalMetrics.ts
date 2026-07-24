import type { DatasetId } from "./catalog";
import type { DeliveryObservation } from "./observation";

const DEFAULT_MAX_SAMPLES = 512;
const DEFAULT_WINDOW_MS = 30 * 60_000;

export type OperationalDeliverySample = {
  kind: "delivery";
  at: number;
  datasetId: DatasetId;
  success: boolean;
  fresh?: boolean;
  fallback?: boolean;
  partial?: boolean;
};

export type OperationalRecoverySample = {
  kind: "recovery";
  at: number;
  durationMs: number;
  success: boolean;
};

export type OperationalSample =
  | OperationalDeliverySample
  | OperationalRecoverySample;

export type RatioMeasure = {
  status: "ok" | "no_samples";
  samples: number;
  matching: number;
  ratio: number | null;
};

export type DurationMeasure = {
  status: "ok" | "no_samples";
  samples: number;
  active: number;
  p50Ms: number | null;
  p95Ms: number | null;
  maxMs: number | null;
};

export type OperationalReliabilityReport = {
  generatedAt: number;
  window: {
    startedAt: number;
    endedAt: number;
    durationMs: number;
    retainedSamples: number;
    maxSamples: number;
  };
  deliverySuccess: RatioMeasure;
  freshnessCompliance: RatioMeasure;
  partialCoverage: RatioMeasure;
  fallbackDuration: DurationMeasure;
  recoverySuccess: RatioMeasure;
  recoveryTime: DurationMeasure;
};

type FallbackEpisode = {
  datasetId: DatasetId;
  startedAt: number;
  endedAt?: number;
};

function ratio(samples: number, matching: number): RatioMeasure {
  return {
    status: samples === 0 ? "no_samples" : "ok",
    samples,
    matching,
    ratio: samples === 0 ? null : matching / samples,
  };
}

function percentile(sorted: number[], percentileValue: number): number | null {
  if (sorted.length === 0) return null;
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(percentileValue * sorted.length) - 1),
  );
  return sorted[index] ?? null;
}

function durations(values: number[], active = 0): DurationMeasure {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    status: sorted.length === 0 ? "no_samples" : "ok",
    samples: sorted.length,
    active,
    p50Ms: percentile(sorted, 0.5),
    p95Ms: percentile(sorted, 0.95),
    maxMs: sorted.at(-1) ?? null,
  };
}

export function deliverySampleFromObservation(
  observation: DeliveryObservation,
): OperationalDeliverySample {
  return {
    kind: "delivery",
    at:
      observation.timestamps.receivedAt ??
      observation.timestamps.lastSuccessAt ??
      Date.now(),
    datasetId: observation.datasetId,
    success:
      observation.dimensions.lifecycle !== "error" &&
      observation.dimensions.availability !== "unavailable",
    fresh:
      observation.dimensions.freshness == null
        ? undefined
        : observation.dimensions.freshness === "current",
    fallback:
      observation.dimensions.provenance === "fallback" ||
      observation.dimensions.provenance === "mixed",
    partial:
      observation.coverage === "partial" ||
      observation.dimensions.availability === "partial",
  };
}

/** Process-local, bounded operational sample window. */
export class OperationalMetricsWindow {
  private samples: OperationalSample[] = [];
  private fallbackEpisodes: FallbackEpisode[] = [];
  private activeFallbacks = new Map<DatasetId, number>();

  constructor(
    private readonly maxSamples = DEFAULT_MAX_SAMPLES,
    private readonly windowMs = DEFAULT_WINDOW_MS,
  ) {}

  record(sample: OperationalSample): void {
    this.samples.push(sample);
    if (sample.kind === "delivery") {
      this.updateFallbackEpisode(sample);
    }
    this.prune(sample.at);
  }

  report(now = Date.now()): OperationalReliabilityReport {
    this.prune(now);
    const deliveries = this.samples.filter(
      (sample): sample is OperationalDeliverySample => sample.kind === "delivery",
    );
    const freshness = deliveries.filter((sample) => sample.fresh != null);
    const fallbackDurations = this.fallbackEpisodes
      .map((episode) => (episode.endedAt ?? now) - episode.startedAt)
      .filter((duration) => duration >= 0);
    const recoveries = this.samples.filter(
      (sample): sample is OperationalRecoverySample => sample.kind === "recovery",
    );
    const successfulRecoveries = recoveries.filter(
      (sample): sample is OperationalRecoverySample =>
        sample.success,
    );
    const startedAt = Math.max(0, now - this.windowMs);

    return {
      generatedAt: now,
      window: {
        startedAt,
        endedAt: now,
        durationMs: this.windowMs,
        retainedSamples: this.samples.length,
        maxSamples: this.maxSamples,
      },
      deliverySuccess: ratio(
        deliveries.length,
        deliveries.filter((sample) => sample.success).length,
      ),
      freshnessCompliance: ratio(
        freshness.length,
        freshness.filter((sample) => sample.fresh).length,
      ),
      partialCoverage: ratio(
        deliveries.length,
        deliveries.filter((sample) => sample.partial).length,
      ),
      fallbackDuration: durations(
        fallbackDurations,
        this.fallbackEpisodes.filter((episode) => episode.endedAt == null).length,
      ),
      recoverySuccess: ratio(
        recoveries.length,
        successfulRecoveries.length,
      ),
      recoveryTime: durations(successfulRecoveries.map((sample) => sample.durationMs)),
    };
  }

  reset(): void {
    this.samples = [];
    this.fallbackEpisodes = [];
    this.activeFallbacks.clear();
  }

  private updateFallbackEpisode(sample: OperationalDeliverySample): void {
    const activeStartedAt = this.activeFallbacks.get(sample.datasetId);
    if (sample.fallback) {
      if (activeStartedAt == null) {
        this.activeFallbacks.set(sample.datasetId, sample.at);
        this.fallbackEpisodes.push({
          datasetId: sample.datasetId,
          startedAt: sample.at,
        });
      }
      return;
    }
    if (activeStartedAt == null) return;
    const episode = [...this.fallbackEpisodes]
      .reverse()
      .find(
        (candidate) =>
          candidate.datasetId === sample.datasetId &&
          candidate.endedAt == null,
      );
    if (episode) episode.endedAt = sample.at;
    this.activeFallbacks.delete(sample.datasetId);
  }

  private prune(now: number): void {
    const cutoff = now - this.windowMs;
    this.samples = this.samples
      .filter((sample) => sample.at >= cutoff)
      .slice(-this.maxSamples);
    this.fallbackEpisodes = this.fallbackEpisodes.filter(
      (episode) => (episode.endedAt ?? now) >= cutoff,
    ).slice(-this.maxSamples);
    this.activeFallbacks = new Map(
      this.fallbackEpisodes
        .filter((episode) => episode.endedAt == null)
        .map((episode) => [episode.datasetId, episode.startedAt]),
    );
    for (const [datasetId, startedAt] of this.activeFallbacks) {
      if (startedAt < cutoff) {
        this.activeFallbacks.set(datasetId, cutoff);
        const episode = [...this.fallbackEpisodes]
          .reverse()
          .find(
            (candidate) =>
              candidate.datasetId === datasetId &&
              candidate.endedAt == null,
          );
        if (episode) episode.startedAt = cutoff;
      }
    }
  }
}

export const OPERATIONAL_RETENTION = {
  maxSamples: DEFAULT_MAX_SAMPLES,
  windowMs: DEFAULT_WINDOW_MS,
} as const;
