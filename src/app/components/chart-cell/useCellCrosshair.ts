"use client";

import { useCallback, useEffect, useRef } from "react";
import { setCellCrosshair } from "@/lib/chart/cellCrosshairStore";

type Params = {
  chartId: string;
  captureActive: boolean;
  refreshCaptureViewport: () => void;
  setVisibleRangeTick: React.Dispatch<React.SetStateAction<number>>;
  setCaptureHoverBar: React.Dispatch<React.SetStateAction<number | null>>;
};

export function useCellCrosshair({
  chartId,
  captureActive,
  refreshCaptureViewport,
  setVisibleRangeTick,
  setCaptureHoverBar,
}: Params) {
  const crosshairRafRef = useRef<number | null>(null);
  const latestCrosshairPlotXRef = useRef<number | null>(null);
  const pendingCrosshairRef = useRef<{
    dataIndex: number | null;
    timestamp: number | null;
    valueLabel: string | null;
    plotX: number | null;
  } | null>(null);

  const handleCrosshairMove = useCallback(
    (ev: {
      timestamp: number | null;
      dataIndex: number | null;
      valueLabel: string | null;
      plotX?: number | null;
    }) => {
      if (captureActive && ev.dataIndex != null) {
        setCaptureHoverBar(ev.dataIndex);
      }
      if (captureActive) {
        refreshCaptureViewport();
        setVisibleRangeTick((tick) => tick + 1);
      }
      const next = { ...ev, plotX: ev.plotX ?? null };
      latestCrosshairPlotXRef.current = next.plotX;
      pendingCrosshairRef.current = next;
      if (crosshairRafRef.current != null) return;
      crosshairRafRef.current = requestAnimationFrame(() => {
        crosshairRafRef.current = null;
        if (pendingCrosshairRef.current) {
          setCellCrosshair(chartId, pendingCrosshairRef.current);
        }
      });
    },
    [chartId, captureActive, refreshCaptureViewport, setCaptureHoverBar, setVisibleRangeTick],
  );

  useEffect(() => {
    return () => {
      if (crosshairRafRef.current != null) {
        cancelAnimationFrame(crosshairRafRef.current);
      }
    };
  }, []);

  return {
    latestCrosshairPlotXRef,
    handleCrosshairMove,
  };
}

export type { CellCrosshairData } from "@/lib/chart/cellCrosshairStore";
