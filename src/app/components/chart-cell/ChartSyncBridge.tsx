"use client";

import { useEffect, type RefObject } from "react";
import type { ChartHandle } from "./EdgeChart";
import { useChartSync } from "../ChartSyncContext";

type Props = {
  chartRef: RefObject<ChartHandle | null>;
  chartId: string;
  suppressDrawingPersistRef: React.MutableRefObject<boolean>;
  lastAppliedDrawingRevisionRef: React.MutableRefObject<number>;
};

/** Subscribes to crosshair timestamps and drawing sync from peer charts via ChartSyncContext. */
export default function ChartSyncBridge({
  chartRef,
  chartId,
  suppressDrawingPersistRef,
  lastAppliedDrawingRevisionRef,
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
      const chart = chartRef.current;
      if (!chart) return;
      suppressDrawingPersistRef.current = true;
      chart.restoreDrawings(drawings);
      lastAppliedDrawingRevisionRef.current = chart.getDrawingRevision?.() ?? 0;
    });
  }, [sync, chartId, chartRef, suppressDrawingPersistRef, lastAppliedDrawingRevisionRef]);

  return null;
}
