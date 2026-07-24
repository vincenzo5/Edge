import type { ChartDataMeta } from "@edge/chart-core";

/** Slim market-data provenance exposed to the agent (distinct from annotation source). */
export type SlimDataProvenance = {
  source: ChartDataMeta["source"];
  asOf: number;
  stale?: boolean;
  warnings?: string[];
  cacheTier?: ChartDataMeta["cacheTier"];
};

export function slimDataProvenance(
  meta: ChartDataMeta | null | undefined,
): SlimDataProvenance | null {
  if (!meta?.source) return null;
  return {
    source: meta.source,
    asOf: meta.asOf,
    ...(meta.stale !== undefined ? { stale: meta.stale } : {}),
    ...(meta.warnings?.length ? { warnings: meta.warnings } : {}),
    ...(meta.cacheTier ? { cacheTier: meta.cacheTier } : {}),
  };
}
