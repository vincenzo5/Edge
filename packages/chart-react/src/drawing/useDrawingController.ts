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
import { plotLeftOffset } from '@edge/chart-core/layout';
import { PRICE_PANE_KEY } from '@edge/chart-core';
import {
  hitTestAll,
  hitTestControlPoint,
  restoreAll,
  serializeAll,
  DrawingStore,
  pointsEqual,
} from '@edge/chart-core';
import { plotToPoint, translateDrawingPoints } from '@edge/chart-core/drawingCoords';
import {
  type DrawingControllerState,
  type DrawingPointerEvent,
  initialDrawingState,
  armTool,
  disarmTool,
  selectDrawing as selectDrawingState,
  cancelPlacing,
  startPlacing,
  commitDrawing,
  createDraftFromPoint,
  isOnePointTool,
  isTwoPointTool,
  isMultiPointTool,
  advancePlacing,
  supportsDoubleClickFinish,
  isDoubleClickFinish,
  finishPlacingIfComplete,
  startDraggingCp,
  stopDraggingCp,
  startDraggingDrawing,
  stopDraggingDrawing,
  drawingModeFromState,
  shouldHideCrosshair,
  newDrawingId,
  getPluginForTool,
} from '@edge/chart-core/drawingController';
import {
  cloneDrawingPayload,
  cloneDrawingsForPaste,
  DUPLICATE_ANCHOR,
  type DrawingClipboardItem,
  type PasteAnchor,
} from '@edge/chart-core/drawingClone';
import { mergeMetadata } from '@edge/chart-core/annotationMetadata';
import type { DrawingStyles, DrawingMetadata } from '@edge/chart-core';
import type { ChartPaneHandle } from '../engine/paneHandle';
import { mergeChartSettings, resolvePriceScaleSide } from '../engine/chartSettings';
import { indicatorKey } from '../indicatorKey';

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
  } = deps;

  const drawingsRef = useRef<SerializedDrawing[]>([]);
  const drawingStoreRef = useRef(new DrawingStore());
  const cpDragPointsSnapshotRef = useRef<SerializedDrawing['points'] | null>(null);
  const drawingDragStartRef = useRef<{ plotX: number; plotY: number } | null>(null);
  const activePlacingPaneRef = useRef<string>('price');
  const trackedRef = useRef<Map<string, TrackedOverlay>>(new Map());
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
  const drawingsSignatureRef = useRef<string>('');

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

  const notifyOverlayChange = useCallback(() => {
    overlayChangeCbsRef.current.forEach((cb) => cb());
    setDrawTick((n) => n + 1);
  }, [overlayChangeCbsRef]);

  const syncTrackedFromDrawings = useCallback((drawings: SerializedDrawing[]) => {
    const ids = new Set(
      drawings.map((d) => d.id).filter((id): id is string => id != null),
    );
    for (const id of [...trackedRef.current.keys()]) {
      if (!ids.has(id)) trackedRef.current.delete(id);
    }
    for (const d of drawings) {
      if (!d.id) continue;
      const existing = trackedRef.current.get(d.id);
      if (existing) {
        existing.visible = d.visible;
        existing.locked = d.locked;
        existing.label = d.label;
        existing.zLevel = d.zLevel;
      } else {
        trackedRef.current.set(d.id, restoreAll([d])[0]);
      }
    }
  }, []);

  const hydrateDrawings = useCallback(
    (data: SerializedDrawing[]) => {
      const withIds = data.map((d, i) => ({ ...d, id: d.id ?? `d${i}` }));
      drawingStoreRef.current.hydrate(withIds);
      drawingsRef.current = drawingStoreRef.current.getDrawings();
      trackedRef.current.clear();
      restoreAll(withIds).forEach((overlay) => {
        trackedRef.current.set(overlay.id, overlay);
      });
      notifyOverlayChange();
    },
    [notifyOverlayChange],
  );

  const addCommittedDrawing = useCallback((drawing: SerializedDrawing) => {
    const id = drawing.id ?? newDrawingId();
    const full: SerializedDrawing = {
      ...drawing,
      id,
      paneId: drawing.paneId ?? activePlacingPaneRef.current,
    };
    drawingStoreRef.current.execute({ type: 'add', drawing: full });
    const overlay = restoreAll([full])[0];
    trackedRef.current.set(id, overlay);
    return id;
  }, []);

  useEffect(() => {
    return drawingStoreRef.current.subscribe(() => {
      const next = drawingStoreRef.current.getDrawings();
      drawingsRef.current = next;
      syncTrackedFromDrawings(next);
      overlayChangeCbsRef.current.forEach((cb) => cb());
      setDrawTick((n) => n + 1);
    });
  }, [syncTrackedFromDrawings, overlayChangeCbsRef]);

  const finishAfterCommit = useCallback((state: DrawingControllerState): DrawingControllerState => {
    if (!keepDrawingRef.current && state.activeTool) {
      return disarmTool(state);
    }
    return state;
  }, []);

  useEffect(() => {
    if (loading || error || displayCandlesLength === 0) return;
    const signature = JSON.stringify(stateDrawings ?? []);
    if (trackedRef.current.size === 0) {
      if (stateDrawings?.length) hydrateDrawings(stateDrawings);
      drawingsSignatureRef.current = signature;
      return;
    }
    if (signature === drawingsSignatureRef.current) return;
    drawingsSignatureRef.current = signature;
    hydrateDrawings(stateDrawings ?? []);
  }, [loading, error, displayCandlesLength, stateDrawings, hydrateDrawings]);

  const getPaneShowTimeAxis = useCallback((paneId: string) => {
    const segment = paneSegmentsRef.current?.find((s) => s.paneId === paneId);
    return segment?.showTimeAxis ?? true;
  }, [paneSegmentsRef]);

  const getPaneIndicators = useCallback(
    (paneId: string) => {
      const indicators = stateRef.current.indicators.filter((i) => i.visible !== false);
      if (paneId === 'price') return indicators.filter((i) => i.pane === 'main');
      return indicators.filter((i) => indicatorKey(i) === paneId);
    },
    [stateRef],
  );

  const stampPaneId = useCallback(
    (draft: SerializedDrawing, paneId: string) => ({ ...draft, paneId }),
    [],
  );

  const handleDrawingPointer = useCallback(
    (event: DrawingPointerEvent) => {
      const paneId = event.paneId ?? 'price';
      activePlacingPaneRef.current = paneId;
      const vp =
        paneHandlesRef.current?.get(paneId)?.getViewport() ??
        (paneId === 'price' ? latestVpRef.current : null);
      if (!vp || candlesRef.current.length === 0) return false;
      const showTimeAxis = getPaneShowTimeAxis(paneId);
      const paneIndicators = getPaneIndicators(paneId);
      const plotOpts = {
        magnet: magnetEnabledRef.current,
        showTimeAxis,
        paneId,
        indicators: paneIndicators,
      };
      let point: ReturnType<typeof plotToPoint> | null = null;
      const getPoint = () => {
        point ??= plotToPoint(event.plotX, event.plotY, vp, candlesRef.current, plotOpts);
        return point;
      };
      const translateSnapshotPoints = (points: SerializedDrawing['points']) => {
        const start = drawingDragStartRef.current;
        if (!start) return points.map((p) => ({ ...p }));
        return translateDrawingPoints(
          points,
          { x: start.plotX, y: start.plotY },
          { x: event.plotX, y: event.plotY },
          vp,
          candlesRef.current,
          plotOpts,
        );
      };
      const paneDrawings = drawingsRef.current.filter((d) => (d.paneId ?? 'price') === paneId);
      let state = drawingStateRef.current;

      if (state.fsm === 'dragging_drawing' && event.phase === 'move' && state.draggingDrawingId != null) {
        const drawing = paneDrawings.find((d) => d.id === state.draggingDrawingId);
        const before = cpDragPointsSnapshotRef.current;
        if (drawing && before && !drawing.locked) {
          drawingStoreRef.current.replaceDrawing(drawing.id!, {
            ...drawing,
            points: translateSnapshotPoints(before),
          });
        }
        return true;
      }

      if (state.fsm === 'dragging_cp' && event.phase === 'move' && state.draggingDrawingId != null) {
        const drawing = paneDrawings.find((d) => d.id === state.draggingDrawingId);
        const plugin = drawing ? getPluginForTool(drawing.name) : undefined;
        if (drawing && plugin?.updateFromControl && !drawing.locked) {
          const pt = getPoint();
          const updated = plugin.updateFromControl(
            drawing,
            state.draggingCpIndex,
            event.plotX,
            event.plotY,
            vp,
            candlesRef.current,
            showTimeAxis,
          );
          updated.points[state.draggingCpIndex] = {
            ...updated.points[state.draggingCpIndex],
            timestamp: pt.timestamp,
            value: pt.value,
            dataIndex: pt.dataIndex,
          };
          drawingStoreRef.current.replaceDrawing(drawing.id!, updated);
        }
        return true;
      }

      if (event.phase === 'down') {
        if (event.shiftKey && event.button === 0 && paneId === 'price') {
          const fsm = state.fsm;
          if (fsm === 'idle' || fsm === 'selected' || fsm === 'tool_armed') {
            const shiftHitId = hitTestAll(
              event.plotX,
              event.plotY,
              paneDrawings,
              vp,
              candlesRef.current,
              showTimeAxis,
            );
            const selectedDrawing = state.selectedId
              ? paneDrawings.find((d) => d.id === state.selectedId)
              : null;
            const selectedCpIdx =
              selectedDrawing && !selectedDrawing.locked
                ? hitTestControlPoint(
                    event.plotX,
                    event.plotY,
                    selectedDrawing,
                    vp,
                    candlesRef.current,
                    showTimeAxis,
                  )
                : -1;
            if (!shiftHitId && selectedCpIdx < 0) {
              const tool = 'ruler';
              const draft = createDraftFromPoint(tool, getPoint(), vp, candlesRef.current);
              if (draft) {
                const paneDraft = stampPaneId(draft, paneId);
                state = startPlacing(armTool(state, tool), paneDraft);
                syncDrawingState(state);
                setPreviewDrawing(paneDraft);
                placingAnchorRef.current = { plotX: event.plotX, plotY: event.plotY };
                return true;
              }
            }
          }
        }

        if (state.fsm === 'selected' && state.selectedId) {
          const drawing = paneDrawings.find((d) => d.id === state.selectedId);
          if (drawing && !drawing.locked) {
            const cpIdx = hitTestControlPoint(
              event.plotX,
              event.plotY,
              drawing,
              vp,
              candlesRef.current,
              showTimeAxis,
            );
            if (cpIdx >= 0) {
              cpDragPointsSnapshotRef.current = drawing.points.map((p) => ({ ...p }));
              state = startDraggingCp(state, state.selectedId, cpIdx);
              syncDrawingState(state);
              return true;
            }
          }
        }

        const hitId =
          state.fsm === 'idle' || state.fsm === 'selected' || state.fsm === 'tool_armed'
            ? hitTestAll(
                event.plotX,
                event.plotY,
                paneDrawings,
                vp,
                candlesRef.current,
                showTimeAxis,
              )
            : null;

        if (hitId && (state.fsm === 'idle' || state.fsm === 'selected' || state.fsm === 'tool_armed')) {
          const drawing = paneDrawings.find((d) => d.id === hitId);
          if (drawing && !drawing.locked) {
            cpDragPointsSnapshotRef.current = drawing.points.map((p) => ({ ...p }));
            drawingDragStartRef.current = { plotX: event.plotX, plotY: event.plotY };
            state = startDraggingDrawing(state, hitId);
          } else {
            state = selectDrawingState(state, hitId);
          }
          syncDrawingState(state);
          notifySelectionChange(hitId);
          return true;
        }

        if (state.fsm === 'placing' && state.placingDraft && state.activeTool) {
          const plugin = getPluginForTool(state.activeTool);
          if (!plugin) return true;

          if (isDoubleClickFinish(event) && supportsDoubleClickFinish(plugin)) {
            const result = finishPlacingIfComplete(
              state,
              plugin,
              state.placingDraft,
              drawingsRef.current,
              { vp, candles: candlesRef.current },
            );
            if (result) {
              addCommittedDrawing(result.drawing);
              syncDrawingState(finishAfterCommit(result.state));
              setPreviewDrawing(null);
              placingAnchorRef.current = null;
            }
            return true;
          }

          let draft = state.placingDraft;
          if (plugin.updatePreview) {
            draft = plugin.updatePreview(draft, getPoint(), vp, candlesRef.current);
          }
          const committed = finishPlacingIfComplete(
            state,
            plugin,
            draft,
            drawingsRef.current,
            { vp, candles: candlesRef.current },
          );
          if (committed) {
            addCommittedDrawing(committed.drawing);
            syncDrawingState(finishAfterCommit(committed.state));
            setPreviewDrawing(null);
            placingAnchorRef.current = null;
            return true;
          }
          state = advancePlacing(state, draft);
          syncDrawingState(state);
          setPreviewDrawing(draft);
          placingAnchorRef.current = { plotX: event.plotX, plotY: event.plotY };
          return true;
        }

        if (state.fsm === 'selected') {
          state = selectDrawingState(state, null);
          syncDrawingState(state);
          notifySelectionChange(null);
        }

        if (state.fsm === 'tool_armed' && state.activeTool) {
          const tool = state.activeTool;
          if (isOnePointTool(tool)) {
            const draft = createDraftFromPoint(tool, getPoint(), vp, candlesRef.current);
            if (!draft) return true;
            const plugin = getPluginForTool(tool);
            const finalized = plugin?.finalize
              ? plugin.finalize(draft, vp, candlesRef.current)
              : draft;
            const { state: nextState, drawing } = commitDrawing(
              state,
              finalized,
              drawingsRef.current,
            );
            addCommittedDrawing(drawing);
            syncDrawingState(finishAfterCommit(nextState));
            return true;
          }
          if (isTwoPointTool(tool) || isMultiPointTool(tool)) {
            const draft = createDraftFromPoint(tool, getPoint(), vp, candlesRef.current);
            if (!draft) return true;
            const paneDraft = stampPaneId(draft, paneId);
            state = startPlacing(state, paneDraft);
            syncDrawingState(state);
            setPreviewDrawing(paneDraft);
            placingAnchorRef.current = { plotX: event.plotX, plotY: event.plotY };
            return true;
          }
        }
      }

      if (event.phase === 'move') {
        if (state.fsm === 'placing' && state.placingDraft && state.activeTool) {
          const plugin = getPluginForTool(state.activeTool);
          const updated =
            plugin?.updatePreview?.(state.placingDraft, getPoint(), vp, candlesRef.current) ??
            state.placingDraft;
          drawingStateRef.current = { ...state, placingDraft: updated };
          setPreviewDrawing(updated);
        }
        return state.fsm === 'placing' || state.fsm === 'dragging_cp' || state.fsm === 'dragging_drawing';
      }

      if (event.phase === 'up') {
        if (state.fsm === 'dragging_drawing') {
          const id = state.draggingDrawingId;
          const drawing = id ? drawingsRef.current.find((d) => d.id === id) : undefined;
          const before = cpDragPointsSnapshotRef.current;
          cpDragPointsSnapshotRef.current = null;
          drawingDragStartRef.current = null;
          if (drawing && before && id && !pointsEqual(before, drawing.points)) {
            drawingStoreRef.current.execute({
              type: 'updatePoints',
              id,
              before,
              after: drawing.points.map((p) => ({ ...p })),
            });
          }
          state = stopDraggingDrawing(state);
          syncDrawingState(state);
          return true;
        }

        if (state.fsm === 'dragging_cp') {
          const id = state.draggingDrawingId;
          const drawing = id ? drawingsRef.current.find((d) => d.id === id) : undefined;
          const before = cpDragPointsSnapshotRef.current;
          cpDragPointsSnapshotRef.current = null;
          drawingDragStartRef.current = null;
          if (drawing && before && id && !pointsEqual(before, drawing.points)) {
            drawingStoreRef.current.execute({
              type: 'updatePoints',
              id,
              before,
              after: drawing.points.map((p) => ({ ...p })),
            });
          }
          state = stopDraggingCp(state);
          syncDrawingState(state);
          return true;
        }

        if (state.fsm === 'placing' && state.placingDraft && state.activeTool) {
          const anchor = placingAnchorRef.current;
          const moved =
            anchor &&
            Math.hypot(event.plotX - anchor.plotX, event.plotY - anchor.plotY) > 5;
          if (moved) {
            const plugin = getPluginForTool(state.activeTool);
            if (!plugin) return true;
            let draft = state.placingDraft;
            if (plugin.updatePreview) {
              draft = plugin.updatePreview(draft, getPoint(), vp, candlesRef.current);
            }
            const committed = finishPlacingIfComplete(
              state,
              plugin,
              draft,
              drawingsRef.current,
              { vp, candles: candlesRef.current },
            );
            if (committed) {
              addCommittedDrawing(committed.drawing);
              syncDrawingState(finishAfterCommit(committed.state));
              setPreviewDrawing(null);
              placingAnchorRef.current = null;
            }
          }
        }
      }
      return false;
    },
    [
      paneHandlesRef,
      candlesRef,
      latestVpRef,
      getPaneShowTimeAxis,
      getPaneIndicators,
      stampPaneId,
      finishAfterCommit,
      syncDrawingState,
      notifySelectionChange,
      addCommittedDrawing,
    ],
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
    [paneHandlesRef, candlesRef, latestVpRef, getPaneShowTimeAxis, syncDrawingState, notifySelectionChange],
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
  }, [drawTick]);

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
    [selectedDrawingId, drawTick],
  );

  const activeTool = activeDrawingTool ?? '__cursor__';
  const drawingMode = drawingModeFromState(drawingFsm);
  const hideCrosshair = shouldHideCrosshair(drawingFsm);

  const drawingHandleSlice: DrawingHandleSlice = useMemo(
    () => ({
      startDrawing: (name: string) => {
        const next = armTool(drawingStateRef.current, name);
        syncDrawingState(next);
        setPreviewDrawing(null);
      },
      stopDrawing: () => {
        const next = disarmTool(drawingStateRef.current);
        syncDrawingState(next);
        setPreviewDrawing(null);
        notifySelectionChange(null);
      },
      clearDrawings: () => {
        const snapshot = drawingsRef.current.map((d) => ({
          ...d,
          points: d.points.map((p) => ({ ...p })),
          styles: d.styles ? { ...d.styles } : undefined,
        }));
        if (snapshot.length > 0) {
          drawingStoreRef.current.execute({
            type: 'batch',
            commands: snapshot.map((d) => ({
              type: 'remove' as const,
              id: d.id!,
              drawing: d,
            })),
          });
        } else {
          drawingStoreRef.current.setDrawings([], true);
        }
        trackedRef.current.clear();
        const next = disarmTool(drawingStateRef.current);
        syncDrawingState(next);
        setPreviewDrawing(null);
        notifySelectionChange(null);
      },
      setMagnet: (on: boolean) => {
        magnetEnabledRef.current = on;
      },
      getMagnetEnabled: () => magnetEnabledRef.current,
      setKeepDrawingMode: (on: boolean) => {
        keepDrawingRef.current = on;
      },
      getKeepDrawingMode: () => keepDrawingRef.current,
      lockAllDrawings: (locked: boolean) => {
        const commands = drawingsRef.current
          .filter((d) => d.id && d.locked !== locked)
          .map((d) => ({
            type: 'updateMeta' as const,
            id: d.id!,
            before: { locked: d.locked },
            after: { locked },
          }));
        if (commands.length === 0) return;
        drawingStoreRef.current.execute(
          commands.length === 1 ? commands[0] : { type: 'batch', commands },
        );
      },
      areAllDrawingsLocked: () => {
        const list = Array.from(trackedRef.current.values());
        return list.length > 0 && list.every((o) => o.locked);
      },
      setAllDrawingsVisible: (visible: boolean) => {
        const commands = drawingsRef.current
          .filter((d) => d.id && d.visible !== visible)
          .map((d) => ({
            type: 'updateMeta' as const,
            id: d.id!,
            before: { visible: d.visible },
            after: { visible },
          }));
        if (commands.length === 0) return;
        drawingStoreRef.current.execute(
          commands.length === 1 ? commands[0] : { type: 'batch', commands },
        );
      },
      areAllDrawingsHidden: () => {
        const list = Array.from(trackedRef.current.values());
        return list.length > 0 && list.every((o) => !o.visible);
      },
      getSelectedDrawingId: () => drawingStateRef.current.selectedId,
      selectDrawing: (id: string | null) => {
        const next = selectDrawingState(drawingStateRef.current, id);
        syncDrawingState(next);
        notifySelectionChange(id);
      },
      onSelectionChange: (cb) => {
        selectionChangeCbsRef.current.add(cb);
        return () => selectionChangeCbsRef.current.delete(cb);
      },
      serializeDrawings: () => serializeAll(drawingsRef.current),
      restoreDrawings: (data) => {
        hydrateDrawings(data);
      },
      getTrackedOverlays: () => Array.from(trackedRef.current.values()),
      removeOverlay: (id) => {
        const d = drawingsRef.current.find((x) => x.id === id);
        if (d) {
          drawingStoreRef.current.execute({ type: 'remove', id, drawing: d });
        }
        trackedRef.current.delete(id);
        if (drawingStateRef.current.selectedId === id) {
          const next = selectDrawingState(drawingStateRef.current, null);
          syncDrawingState(next);
          notifySelectionChange(null);
        }
      },
      setOverlayVisible: (id, visible) => {
        const d = drawingsRef.current.find((x) => x.id === id);
        if (!d || d.visible === visible) return;
        drawingStoreRef.current.execute({
          type: 'updateMeta',
          id,
          before: { visible: d.visible },
          after: { visible },
        });
      },
      setOverlayLocked: (id, locked) => {
        const d = drawingsRef.current.find((x) => x.id === id);
        if (!d || d.locked === locked) return;
        drawingStoreRef.current.execute({
          type: 'updateMeta',
          id,
          before: { locked: d.locked },
          after: { locked },
        });
      },
      renameOverlay: (id, label) => {
        const d = drawingsRef.current.find((x) => x.id === id);
        if (!d || d.label === label) return;
        drawingStoreRef.current.execute({
          type: 'updateMeta',
          id,
          before: { label: d.label },
          after: { label },
        });
      },
      duplicateOverlay: (id) => {
        const src = drawingsRef.current.find((d) => d.id === id);
        if (!src) return null;
        const maxZ = drawingsRef.current.reduce((m, d) => Math.max(m, d.zLevel), -1);
        const clone = cloneDrawingPayload(src, {
          newId: newDrawingId(),
          anchor: DUPLICATE_ANCHOR,
          zLevel: maxZ + 1,
          labelSuffix: ' copy',
        });
        addCommittedDrawing(clone);
        return clone.id ?? null;
      },
      pasteDrawings: (items, anchor) => {
        if (items.length === 0) return [];
        const maxZ = drawingsRef.current.reduce((m, d) => Math.max(m, d.zLevel), -1);
        const clones = cloneDrawingsForPaste(items, anchor, maxZ + 1, newDrawingId);
        drawingStoreRef.current.execute({
          type: 'batch',
          commands: clones.map((drawing) => ({ type: 'add' as const, drawing })),
        });
        for (const d of clones) {
          if (!d.id) continue;
          trackedRef.current.set(d.id, restoreAll([d])[0]);
        }
        return clones.map((d) => d.id!).filter(Boolean);
      },
      bringForward: (id) => {
        const previousOrder = [...drawingsRef.current]
          .sort((a, b) => a.zLevel - b.zLevel)
          .map((d) => d.id!)
          .filter(Boolean);
        const idx = previousOrder.indexOf(id);
        if (idx < 0 || idx >= previousOrder.length - 1) return;
        const order = [...previousOrder];
        [order[idx], order[idx + 1]] = [order[idx + 1], order[idx]];
        drawingStoreRef.current.execute({ type: 'reorderZ', order, previousOrder });
      },
      sendBackward: (id) => {
        const previousOrder = [...drawingsRef.current]
          .sort((a, b) => a.zLevel - b.zLevel)
          .map((d) => d.id!)
          .filter(Boolean);
        const idx = previousOrder.indexOf(id);
        if (idx <= 0) return;
        const order = [...previousOrder];
        [order[idx], order[idx - 1]] = [order[idx - 1], order[idx]];
        drawingStoreRef.current.execute({ type: 'reorderZ', order, previousOrder });
      },
      subscribeOverlayChange: (cb) => {
        overlayChangeCbsRef.current.add(cb);
        return () => overlayChangeCbsRef.current.delete(cb);
      },
      updateDrawingStyles: (id, patch) => {
        const d = drawingsRef.current.find((x) => x.id === id);
        if (!d) return;
        const before = d.styles ? { ...d.styles } : {};
        const after = { ...before, ...patch };
        drawingStoreRef.current.execute({
          type: 'updateMeta',
          id,
          before: { styles: before },
          after: { styles: after },
        });
      },
      updateDrawingMetadata: (id, patch) => {
        const d = drawingsRef.current.find((x) => x.id === id);
        if (!d) return;
        const before = d.metadata ? { ...d.metadata } : undefined;
        const after = mergeMetadata(d.metadata, patch);
        drawingStoreRef.current.execute({
          type: 'updateMeta',
          id,
          before: { metadata: before },
          after: { metadata: after },
        });
      },
      undo: () => drawingStoreRef.current.undo(),
      redo: () => drawingStoreRef.current.redo(),
      canUndo: () => drawingStoreRef.current.canUndo(),
      canRedo: () => drawingStoreRef.current.canRedo(),
      getDrawingScreenBounds: (id: string) => {
        const drawing = drawingsRef.current.find((d) => d.id === id);
        if (!drawing?.id) return null;
        const paneId = drawing.paneId ?? 'price';
        const vp =
          paneHandlesRef.current?.get(paneId)?.getViewport() ??
          (paneId === 'price' ? latestVpRef.current : null);
        if (!vp || candlesRef.current.length === 0) return null;
        const plugin = getPluginForTool(drawing.name);
        if (!plugin?.getControlPoints) return null;
        const segment = paneSegmentsRef.current?.find((s) => s.paneId === paneId);
        if (!segment) return null;
        const showTimeAxis = segment.showTimeAxis ?? true;
        const cps = plugin.getControlPoints(drawing, vp, candlesRef.current, showTimeAxis);
        if (cps.length === 0) return null;
        const settings = mergeChartSettings(stateRef.current.chartSettings);
        const plotOffset = paneId === 'price' ? plotLeftOffset(resolvePriceScaleSide(settings.scales.priceScalePlacement)) : 0;
        const xs = cps.map((p) => p.x + plotOffset);
        const ys = cps.map((p) => p.y + segment.top);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        return {
          x: minX,
          y: minY,
          width: Math.max(maxX - minX, 1),
          height: Math.max(maxY - minY, 1),
        };
      },
    }),
    [
      syncDrawingState,
      notifySelectionChange,
      hydrateDrawings,
      addCommittedDrawing,
      overlayChangeCbsRef,
      paneHandlesRef,
      candlesRef,
      latestVpRef,
      paneSegmentsRef,
      stateRef,
    ],
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
