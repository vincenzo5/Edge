"use client";

import { useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import type { ChartHandle } from "../EdgeChart";
import type { CellConfig, TrackedOverlay } from "@/lib/chartConfig";
import type { useChartSync } from "../ChartSyncContext";

type Params = {
  chartRef: RefObject<ChartHandle | null>;
  config: CellConfig;
  onConfigChange: (next: CellConfig) => void;
  chartId: string;
  isActive: boolean;
  sync: ReturnType<typeof useChartSync>;
  setSelectedOverlayId: Dispatch<SetStateAction<string | null>>;
  setHistoryRevision: Dispatch<SetStateAction<number>>;
};

export function useDrawingLayoutSync({
  chartRef,
  config,
  onConfigChange,
  chartId,
  isActive,
  sync,
  setSelectedOverlayId,
  setHistoryRevision,
}: Params) {
  const [overlays, setOverlays] = useState<TrackedOverlay[]>([]);
  const overlaysDirtyRef = useRef(false);
  const suppressDrawingPersistRef = useRef(false);
  const lastAppliedDrawingsRef = useRef("");

  // Subscribe to overlay changes from the Chart ref.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const unsub = chart.subscribeOverlayChange(() => {
      if (suppressDrawingPersistRef.current) {
        suppressDrawingPersistRef.current = false;
        setOverlays(chart.getTrackedOverlays());
        setHistoryRevision((r) => r + 1);
        return;
      }
      setOverlays(chart.getTrackedOverlays());
      overlaysDirtyRef.current = true;
      setHistoryRevision((r) => r + 1);
      if (sync?.linkDrawings && isActive) {
        const drawings = chart.serializeDrawings();
        if (drawings) {
          sync.broadcastDrawings(chartId, drawings);
        }
      }
    });
    const unsubSel = chart.onSelectionChange?.((id) => {
      setSelectedOverlayId(id);
    });
    setOverlays(chart.getTrackedOverlays());
    return () => {
      unsub();
      unsubSel?.();
    };
  }, [sync, chartId, isActive, chartRef, setSelectedOverlayId, setHistoryRevision]);

  // Apply peer or layout-propagated drawings without echoing back to layout/sync bus.
  useEffect(() => {
    const serialized = JSON.stringify(config.drawings ?? []);
    if (serialized === lastAppliedDrawingsRef.current) return;

    const current = chartRef.current?.serializeDrawings();
    if (current && JSON.stringify(current) === serialized) {
      lastAppliedDrawingsRef.current = serialized;
      return;
    }

    lastAppliedDrawingsRef.current = serialized;
    suppressDrawingPersistRef.current = true;
    chartRef.current?.restoreDrawings(config.drawings ?? []);
  }, [config.drawings, chartRef]);

  // Persist drawings to config when overlays change.
  useEffect(() => {
    if (!overlaysDirtyRef.current) return;
    overlaysDirtyRef.current = false;
    const timer = setTimeout(() => {
      const drawings = chartRef.current?.serializeDrawings();
      if (drawings) {
        lastAppliedDrawingsRef.current = JSON.stringify(drawings);
        onConfigChange({ ...config, drawings: drawings ?? [] });
        if (sync?.linkDrawings && isActive) {
          sync.broadcastDrawings(chartId, drawings);
        }
      }
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlays]);

  return {
    overlays,
    overlaysDirtyRef,
    suppressDrawingPersistRef,
    lastAppliedDrawingsRef,
  };
}
