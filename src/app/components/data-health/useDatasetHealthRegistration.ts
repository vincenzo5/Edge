"use client";

import { useEffect, useMemo } from "react";
import type { ChartDataMeta } from "@edge/chart-core";
import type { DatasetId } from "@/lib/marketData/state/catalog";
import type { DatasetKind } from "@/lib/marketData/trust/dataTrust";
import type { DemandDatasetInput } from "@/lib/marketData/healthDatasets";
import { useDataHealth } from "./DataHealthProvider";
import { useScreenerStateOptional } from "../screener/ScreenerProvider";

type DatasetHealthMeta = Partial<ChartDataMeta> | null;

export function useRegisterDatasetDemand(
  datasetId: DatasetId,
  meta: DatasetHealthMeta,
  options?: {
    detail?: string;
    trustDataset?: DatasetKind;
    active?: boolean;
    warnings?: string[];
    status?: DemandDatasetInput["status"];
  },
): void {
  const { registerDatasetDemand } = useDataHealth();
  const active = options?.active ?? true;
  const warningsKey = options?.warnings?.join("\0") ?? "";
  useEffect(() => {
    registerDatasetDemand({
      datasetId,
      meta,
      detail: options?.detail,
      trustDataset: options?.trustDataset,
      active,
      warnings: options?.warnings,
      status: options?.status,
    });
    return () => registerDatasetDemand({ datasetId, active: false });
  }, [
    registerDatasetDemand,
    datasetId,
    meta?.source,
    meta?.asOf,
    meta?.stale,
    meta?.lastUpdateAt,
    meta?.cacheTier,
    options?.detail,
    options?.trustDataset,
    active,
    warningsKey,
    options?.status,
  ]);
}

export function useRegisterScreenerHealthDemand(): void {
  const screener = useScreenerStateOptional();
  const lastRun = screener?.session.lastRun;
  const meta = useMemo(() => {
    if (!lastRun?.meta) return null;
    return {
      source: lastRun.meta.source,
      stale: lastRun.meta.stale,
      warnings: lastRun.meta.warnings,
      asOf: lastRun.meta.asOf,
      lastUpdateAt: lastRun.meta.asOf,
    };
  }, [
    lastRun?.meta?.source,
    lastRun?.meta?.stale,
    lastRun?.meta?.asOf,
    lastRun?.meta?.warnings,
  ]);
  const skipped = lastRun?.meta?.skippedSymbols?.length ?? 0;
  const detail =
    lastRun != null
      ? `${lastRun.rows.length} results${skipped ? ` · ${skipped} skipped` : ""}`
      : undefined;
  useRegisterDatasetDemand(
    lastRun?.meta?.phases?.step2Count != null ? "screener_technical" : "screener_descriptive",
    meta,
    {
      active: lastRun != null,
      detail,
      status: lastRun ? "loaded" : "not_loaded",
      warnings: lastRun?.meta?.warnings,
    },
  );
}
