'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from 'react';
import type {
  Candle,
  PaneSegment,
  SerializedDrawing,
  SerializedChartState,
  TrackedOverlay,
  VisibleRange,
} from '@edge/chart-core';
import { PRICE_PANE_KEY } from '@edge/chart-core';
import { hitTestAll } from '@edge/chart-core';
import {
  type DrawingControllerState,
  type DrawingPointerEvent,
  initialDrawingState,
  disarmTool,
  selectDrawing as selectDrawingState,
  cancelPlacing,
  drawingModeFromState,
  shouldHideCrosshair,
} from '@edge/chart-core/drawingController';
import {
  type DrawingClipboardItem,
  type PasteAnchor,
} from '@edge/chart-core/drawingClone';
import type { DrawingStyles, DrawingMetadata } from '@edge/chart-core';
import type { ChartPaneHandle } from '../engine/paneHandle';
import {
  applyDrawingPointerTransition,
  createPaneIndicatorHelpers,
} from './applyDrawingPointerTransition';
import { createDrawingHandleSlice } from './createDrawingHandleSlice';
import { useDrawingStoreSync } from './useDrawingStoreSync';
import { useLivePriceStickEntry } from './useLivePriceStickEntry';

export type DrawingControllerDeps = {
  paneHandlesRef: RefObject<Map<string, ChartPaneHandle>>;
  candlesRef: RefObject<Candle[]>;
  latestVpRef: RefObject<VisibleRange | null>;
  paneSegmentsRef: RefObject<PaneSegment[]>;
  stateRef: RefObject<SerializedChartState>;
  overlayChangeCbsRef: MutableRefObject<Set<() => void>>;
  onDrawingDisarmed?: () => void;
  onOverlayRightClick?: (overlay: TrackedOverlay, pos: { x: number; y: number }) => void;
  /** Restore drawings after data load and when parent state changes externally. */
  loading: boolean;
  error: string | null;
  displayCandlesLength: number;
  stateDrawings: SerializedDrawing[] | undefined;
  /** Live last price for stick-entry-to-last-price on long/short positions. */
  livePrice?: number | null;
};

export type DrawingHandleSlice = {
  startDrawing: (name: string) => void;
  stopDrawing: () => void;
  clearDrawings: () => void;
  setMagnet: (on: boolean) => void;
  getMagnetEnabled: () => boolean;
  setKeepDrawingMode: (on: boolean) => void;
  getKeepDrawingMode: () => boolean;
  lockAllDrawings: (locked: boolean) => void;
  areAllDrawingsLocked: () => boolean;
  setAllDrawingsVisible: (visible: boolean) => void;
  areAllDrawingsHidden: () => boolean;
  getSelectedDrawingId: () => string | null;
  selectDrawing: (id: string | null) => void;
  onSelectionChange: (cb: (id: string | null) => void) => () => void;
  serializeDrawings: () => SerializedDrawing[];
  restoreDrawings: (data: SerializedDrawing[]) => void;
  getTrackedOverlays: () => TrackedOverlay[];
  removeOverlay: (id: string) => void;
  setOverlayVisible: (id: string, visible: boolean) => void;
  setOverlayLocked: (id: string, locked: boolean) => void;
  renameOverlay: (id: string, label: string) => void;
  duplicateOverlay: (id: string) => string | null;
  pasteDrawings: (items: DrawingClipboardItem[], anchor: PasteAnchor) => string[];
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  subscribeOverlayChange: (cb: () => void) => () => void;
  updateDrawingStyles: (id: string, patch: Partial<DrawingStyles>) => void;
  updateDrawingMetadata: (id: string, patch: DrawingMetadata) => void;
  undo: () => boolean;
  redo: () => boolean;
  canUndo: () => boolean;
  canRedo: () => boolean;
  getDrawingScreenBounds: (id: string) => {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
};

export function useDrawingController(deps: DrawingControllerDeps) {
  const {
    paneHandlesRef,
    candlesRef,
    latestVpRef,
    paneSegmentsRef,
    stateRef,
    overlayChangeCbsRef,
    onDrawingDisarmed,
    onOverlayRightClick,
    loading,
    error,
    displayCandlesLength,
    stateDrawings,
    livePrice = null,
  } = deps;

  const cpDragPointsSnapshotRef = useRef<SerializedDrawing['points'] | null>(null);
  const drawingDragStartRef = useRef<{ plotX: number; plotY: number } | null>(null);
  const activePlacingPaneRef = useRef<string>('price');
  const [activeDrawingTool, setActiveDrawingTool] = useState<string | null>(null);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [previewDrawing, setPreviewDrawing] = useState<SerializedDrawing | null>(null);
  const [drawingFsm, setDrawingFsm] = useState<DrawingControllerState>(initialDrawingState());
  const [drawTick, setDrawTick] = useState(0);
  const drawingStateRef = useRef<DrawingControllerState>(initialDrawingState());
  const magnetEnabledRef = useRef(false);
  const keepDrawingRef = useRef(false);
  const onDrawingDisarmedRef = useRef(onDrawingDisarmed);
  onDrawingDisarmedRef.current = onDrawingDisarmed;
  const selectionChangeCbsRef = useRef<Set<(id: string | null) => void>>(new Set());
  const onOverlayRightClickRef = useRef(onOverlayRightClick);
  onOverlayRightClickRef.current = onOverlayRightClick;
  const placingAnchorRef = useRef<{ plotX: number; plotY: number } | null>(null);
  const drawingFsmRef = useRef(drawingFsm);
  drawingFsmRef.current = drawingFsm;

  const bumpDrawTick = useCallback(() => {
    setDrawTick((n) => n + 1);
  }, []);

  const {
    drawingsRef,
    drawingStoreRef,
    trackedRef,
    hydrateDrawings,
    addCommittedDrawing,
  } = useDrawingStoreSync({
    overlayChangeCbsRef,
    loading,
    error,
    displayCandlesLength,
    stateDrawings,
    activePlacingPaneRef,
    bumpDrawTick,
  });

  useLivePriceStickEntry(drawingStoreRef, drawingStateRef, livePrice);

  const syncDrawingState = useCallback((next: DrawingControllerState) => {
    const prev = drawingStateRef.current;
    if (prev.activeTool && !next.activeTool) {
      onDrawingDisarmedRef.current?.();
    }
    drawingStateRef.current = next;
    setDrawingFsm(next);
    setActiveDrawingTool(next.activeTool);
    setSelectedDrawingId(next.selectedId);
  }, []);

  const notifySelectionChange = useCallback((id: string | null) => {
    selectionChangeCbsRef.current.forEach((cb) => cb(id));
  }, []);

  const { getPaneShowTimeAxis, getPaneIndicators } = useMemo(
    () => createPaneIndicatorHelpers(paneSegmentsRef, stateRef),
    [paneSegmentsRef, stateRef],
  );

  const stampPaneId = useCallback(
    (draft: SerializedDrawing, paneId: string) => ({ ...draft, paneId }),
    [],
  );

  const finishAfterCommit = useCallback((state: DrawingControllerState): DrawingControllerState => {
    if (!keepDrawingRef.current && state.activeTool) {
      return disarmTool(state);
    }
    return state;
  }, []);

  const setPlacingDraftOnMove = useCallback(
    (state: DrawingControllerState, draft: SerializedDrawing) => {
      drawingStateRef.current = { ...state, placingDraft: draft };
    },
    [],
  );

  const pointerContext = useMemo(
    () => ({
      paneHandlesRef,
      candlesRef,
      latestVpRef,
      paneSegmentsRef,
      stateRef,
      drawingsRef,
      drawingStoreRef,
      drawingStateRef,
      magnetEnabledRef,
      keepDrawingRef,
      cpDragPointsSnapshotRef,
      drawingDragStartRef,
      activePlacingPaneRef,
      placingAnchorRef,
      syncDrawingState,
      notifySelectionChange,
      addCommittedDrawing,
      stampPaneId,
      finishAfterCommit,
      setPreviewDrawing,
      setPlacingDraftOnMove,
      getPaneShowTimeAxis,
      getPaneIndicators,
    }),
    [
      paneHandlesRef,
      candlesRef,
      latestVpRef,
      paneSegmentsRef,
      stateRef,
      drawingsRef,
      drawingStoreRef,
      syncDrawingState,
      notifySelectionChange,
      addCommittedDrawing,
      stampPaneId,
      finishAfterCommit,
      setPlacingDraftOnMove,
      getPaneShowTimeAxis,
      getPaneIndicators,
    ],
  );

  const handleDrawingPointer = useCallback(
    (event: DrawingPointerEvent) => applyDrawingPointerTransition(pointerContext, event),
    [pointerContext],
  );

  const handleDrawingContextMenu = useCallback(
    (event: DrawingPointerEvent & { clientX: number; clientY: number }): boolean => {
      const paneId = event.paneId ?? 'price';
      const vp =
        paneHandlesRef.current?.get(paneId)?.getViewport() ??
        (paneId === 'price' ? latestVpRef.current : null);
      if (!vp || candlesRef.current.length === 0) return false;
      const showTimeAxis = getPaneShowTimeAxis(paneId);
      const paneDrawings = drawingsRef.current.filter((d) => (d.paneId ?? 'price') === paneId);
      const hitId = hitTestAll(
        event.plotX,
        event.plotY,
        paneDrawings,
        vp,
        candlesRef.current,
        showTimeAxis,
      );
      if (!hitId) return false;
      const meta = trackedRef.current.get(hitId);
      if (meta && onOverlayRightClickRef.current) {
        const next = selectDrawingState(drawingStateRef.current, hitId);
        syncDrawingState(next);
        notifySelectionChange(hitId);
        onOverlayRightClickRef.current(meta, { x: event.clientX, y: event.clientY });
        return true;
      }
      return false;
    },
    [
      paneHandlesRef,
      candlesRef,
      latestVpRef,
      getPaneShowTimeAxis,
      drawingsRef,
      trackedRef,
      syncDrawingState,
      notifySelectionChange,
    ],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const state = drawingStateRef.current;
      if (state.fsm === 'placing') {
        const next = cancelPlacing(state);
        syncDrawingState(next);
        setPreviewDrawing(null);
        placingAnchorRef.current = null;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [syncDrawingState]);

  const paneDrawingsMap = useMemo(() => {
    const map = new Map<string, SerializedDrawing[]>();
    for (const d of drawingsRef.current) {
      const pid = d.paneId ?? 'price';
      const list = map.get(pid) ?? [];
      list.push(d);
      map.set(pid, list);
    }
    return map;
  }, [drawTick, drawingsRef]);

  const previewForPane = useCallback(
    (paneKey: string) => {
      if (!previewDrawing) return null;
      const pid = previewDrawing.paneId ?? activePlacingPaneRef.current;
      const key = paneKey === PRICE_PANE_KEY ? 'price' : paneKey;
      return pid === key ? previewDrawing : null;
    },
    [previewDrawing],
  );

  const selectedIdForPane = useCallback(
    (paneKey: string) => {
      if (!selectedDrawingId) return null;
      const pid = paneKey === PRICE_PANE_KEY ? 'price' : paneKey;
      const drawing = drawingsRef.current.find((d) => d.id === selectedDrawingId);
      if (!drawing) return null;
      return (drawing.paneId ?? 'price') === pid ? selectedDrawingId : null;
    },
    [selectedDrawingId, drawTick, drawingsRef],
  );

  const activeTool = activeDrawingTool ?? '__cursor__';
  const drawingMode = drawingModeFromState(drawingFsm);
  const hideCrosshair = shouldHideCrosshair(drawingFsm);

  const handleSliceContext = useMemo(
    () => ({
      drawingsRef,
      drawingStoreRef,
      trackedRef,
      drawingStateRef,
      magnetEnabledRef,
      keepDrawingRef,
      selectionChangeCbsRef,
      paneHandlesRef,
      candlesRef,
      latestVpRef,
      paneSegmentsRef,
      stateRef,
      overlayChangeCbsRef,
      syncDrawingState,
      notifySelectionChange,
      hydrateDrawings,
      addCommittedDrawing,
      stampPaneId,
      setPreviewDrawing,
    }),
    [
      drawingsRef,
      drawingStoreRef,
      trackedRef,
      syncDrawingState,
      notifySelectionChange,
      hydrateDrawings,
      addCommittedDrawing,
      stampPaneId,
      paneHandlesRef,
      candlesRef,
      latestVpRef,
      paneSegmentsRef,
      stateRef,
      overlayChangeCbsRef,
    ],
  );

  const drawingHandleSlice: DrawingHandleSlice = useMemo(
    () => createDrawingHandleSlice(handleSliceContext),
    [handleSliceContext],
  );

  return {
    drawingsRef,
    drawingFsmRef,
    selectedDrawingId,
    previewDrawing,
    drawTick,
    activeTool,
    drawingMode,
    hideCrosshair,
    handleDrawingPointer,
    handleDrawingContextMenu,
    paneDrawingsMap,
    previewForPane,
    selectedIdForPane,
    hydrateDrawings,
    drawingHandleSlice,
  };
}
