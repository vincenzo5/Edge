"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type CrosshairData = {
  dataIndex: number | null;
  timestamp: number | null;
  valueLabel: string | null;
  plotX: number | null;
};

type Params = {
  captureActive: boolean;
  refreshCaptureViewport: () => void;
  setVisibleRangeTick: React.Dispatch<React.SetStateAction<number>>;
  setCaptureHoverBar: React.Dispatch<React.SetStateAction<number | null>>;
};

export function useCellCrosshair({
  captureActive,
  refreshCaptureViewport,
  setVisibleRangeTick,
  setCaptureHoverBar,
}: Params) {
  const [crosshairData, setCrosshairData] = useState<CrosshairData>({
    dataIndex: null,
    timestamp: null,
    valueLabel: null,
    plotX: null,
  });
  const crosshairRafRef = useRef<number | null>(null);
  const latestCrosshairPlotXRef = useRef<number | null>(null);
  const pendingCrosshairRef = useRef<CrosshairData | null>(null);

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
          setCrosshairData(pendingCrosshairRef.current);
        }
      });
    },
    [captureActive, refreshCaptureViewport, setCaptureHoverBar, setVisibleRangeTick],
  );

  useEffect(() => {
    return () => {
      if (crosshairRafRef.current != null) {
        cancelAnimationFrame(crosshairRafRef.current);
      }
    };
  }, []);

  return {
    crosshairData,
    latestCrosshairPlotXRef,
    handleCrosshairMove,
  };
}
