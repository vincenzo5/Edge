"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import type { ChartHandle } from "../EdgeChart";
import type { CellConfig, TrackedOverlay } from "@/lib/chartConfig";
import type { SerializedDrawing } from "@/lib/chart/contracts";
import { syncAlertsWithDrawingChanges } from "@/lib/alerts/drawingAlertSync";
import { syncPlaybookStopOnDrawingChange } from "@/lib/trading/playbook/playbookStopSync";
import type { PlaybookInstance } from "@/lib/trading/playbook/types";
import type { TradingEnvironment } from "@/lib/trading/types";
import type { useChartSync } from "../ChartSyncContext";

const DRAWING_PERSIST_DEBOUNCE_MS = 500;

type Params = {
  chartRef: RefObject<ChartHandle | null>;
  config: CellConfig;
  onConfigChange: (next: CellConfig) => void;
  chartId: string;
  isActive: boolean;
  sync: ReturnType<typeof useChartSync>;
  setSelectedOverlayId: Dispatch<SetStateAction<string | null>>;
  setHistoryRevision: Dispatch<SetStateAction<number>>;
  /** Bumps when the chart engine remounts so overlay subscriptions reattach. */
  chartEngineGeneration?: number;
  playbookSync?: {
    symbol: string;
    accountId: string;
    environment: TradingEnvironment;
    instances: PlaybookInstance[];
  } | null;
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
  chartEngineGeneration = 0,
  playbookSync = null,
}: Params) {
  const [overlays, setOverlays] = useState<TrackedOverlay[]>([]);
  const overlaysDirtyRef = useRef(false);
  const suppressDrawingPersistRef = useRef(false);
  const lastAppliedDrawingsRef = useRef("");
  const lastSyncedDrawingsRef = useRef<SerializedDrawing[]>([]);
  const drawingPersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const configRef = useRef(config);
  configRef.current = config;
  const playbookSyncRef = useRef(playbookSync);
  playbookSyncRef.current = playbookSync;

  const writeDrawingsPersist = useCallback((chartOverride?: ChartHandle | null) => {
    const chart = chartOverride ?? chartRef.current;
    const current = configRef.current;
    if (!chart) return;

    const drawings = chart.serializeDrawings();
    if (!drawings) {
      overlaysDirtyRef.current = false;
      return;
    }

    const serialized = JSON.stringify(drawings);
    if (serialized === lastAppliedDrawingsRef.current) {
      overlaysDirtyRef.current = false;
      return;
    }

    overlaysDirtyRef.current = false;
    lastAppliedDrawingsRef.current = serialized;
    onConfigChange({ ...current, drawings: drawings ?? [] });
    if (sync?.linkDrawings && isActive) {
      sync.broadcastDrawings(chartId, drawings);
    }
    const previousDrawings = lastSyncedDrawingsRef.current;
    void syncAlertsWithDrawingChanges(previousDrawings, drawings).then(() => {
      lastSyncedDrawingsRef.current = drawings;
    });
    const playbook = playbookSyncRef.current;
    if (playbook?.accountId) {
      void syncPlaybookStopOnDrawingChange({
        previousDrawings,
        nextDrawings: drawings,
        symbol: playbook.symbol,
        accountId: playbook.accountId,
        environment: playbook.environment,
        instances: playbook.instances,
      });
    }
  }, [chartRef, chartId, isActive, onConfigChange, sync]);

  const flushDrawingsPersist = useCallback((chartOverride?: ChartHandle | null) => {
    if (drawingPersistTimerRef.current) {
      clearTimeout(drawingPersistTimerRef.current);
      drawingPersistTimerRef.current = null;
    }
    writeDrawingsPersist(chartOverride);
  }, [writeDrawingsPersist]);

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
  }, [sync, chartId, isActive, chartRef, chartEngineGeneration, setSelectedOverlayId, setHistoryRevision]);

  const lastRestoreGenerationRef = useRef(-1);

  // Apply peer or layout-propagated drawings without echoing back to layout/sync bus.
  useEffect(() => {
    const serialized = JSON.stringify(config.drawings ?? []);
    const sameGeneration = chartEngineGeneration === lastRestoreGenerationRef.current;
    if (serialized === lastAppliedDrawingsRef.current && sameGeneration) return;

    const current = chartRef.current?.serializeDrawings();
    if (current && JSON.stringify(current) === serialized && sameGeneration) {
      lastAppliedDrawingsRef.current = serialized;
      return;
    }

    lastAppliedDrawingsRef.current = serialized;
    lastRestoreGenerationRef.current = chartEngineGeneration;
    suppressDrawingPersistRef.current = true;
    chartRef.current?.restoreDrawings(config.drawings ?? []);
  }, [config.drawings, chartRef, chartEngineGeneration]);

  // Persist drawings to config when overlays change.
  useEffect(() => {
    if (!overlaysDirtyRef.current) return;
    overlaysDirtyRef.current = false;
    if (drawingPersistTimerRef.current) clearTimeout(drawingPersistTimerRef.current);
    drawingPersistTimerRef.current = setTimeout(() => {
      drawingPersistTimerRef.current = null;
      writeDrawingsPersist();
    }, DRAWING_PERSIST_DEBOUNCE_MS);
    return () => {
      if (drawingPersistTimerRef.current) {
        clearTimeout(drawingPersistTimerRef.current);
        drawingPersistTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlays]);

  useEffect(
    () => () => {
      if (drawingPersistTimerRef.current) clearTimeout(drawingPersistTimerRef.current);
    },
    [],
  );

  return {
    overlays,
    overlaysDirtyRef,
    suppressDrawingPersistRef,
    lastAppliedDrawingsRef,
    flushDrawingsPersist,
  };
}
