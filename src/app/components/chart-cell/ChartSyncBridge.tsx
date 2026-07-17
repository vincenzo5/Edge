"use client";

import { useEffect, type RefObject } from "react";
import type { ChartHandle } from "../EdgeChart";
import { useChartSync } from "../ChartSyncContext";

type Props = {
  chartRef: RefObject<ChartHandle | null>;
  chartId: string;
  suppressDrawingPersistRef: React.MutableRefObject<boolean>;
  lastAppliedDrawingsRef: React.MutableRefObject<string>;
};

/** Subscribes to crosshair timestamps and drawing sync from peer charts via ChartSyncContext. */
export default function ChartSyncBridge({
  chartRef,
  chartId,
  suppressDrawingPersistRef,
  lastAppliedDrawingsRef,
}: Props) {
  const sync = useChartSync();

  useEffect(() => {
    if (!sync) return;
    return sync.subscribe(chartId, (ts) => {
      chartRef.current?.setCrosshairFromSync(ts);
    });
  }, [sync, chartId, chartRef]);

  useEffect(() => {
    if (!sync) return;
    return sync.subscribeDrawings(chartId, (drawings) => {
      const serialized = JSON.stringify(drawings);
      if (serialized === lastAppliedDrawingsRef.current) return;
      lastAppliedDrawingsRef.current = serialized;
      suppressDrawingPersistRef.current = true;
      chartRef.current?.restoreDrawings(drawings);
    });
  }, [sync, chartId, chartRef, suppressDrawingPersistRef, lastAppliedDrawingsRef]);

  return null;
}
