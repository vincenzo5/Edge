'use client';

import type { Candle, PaneSegment, SerializedChartState, SerializedDrawing } from '@edge/chart-core';
import {
  hitTestAll,
  hitTestControlPoint,
  DrawingStore,
  pointsEqual,
  entryValueChanged,
  withStickEntryDisabled,
} from '@edge/chart-core';
import { plotToPoint, translateDrawingPoints } from '@edge/chart-core/drawingCoords';
import {
  type DrawingControllerState,
  type DrawingPointerEvent,
  armTool,
  disarmTool,
  selectDrawing as selectDrawingState,
  startPlacing,
  commitDrawing,
  createDraftFromPoint,
  isOnePointTool,
  isTwoPointTool,
  isInstantTool,
  isMultiPointTool,
  advancePlacing,
  supportsDoubleClickFinish,
  isDoubleClickFinish,
  finishPlacingIfComplete,
  startDraggingCp,
  stopDraggingCp,
  startDraggingDrawing,
  stopDraggingDrawing,
  getPluginForTool,
} from '@edge/chart-core/drawingController';
import type { VisibleRange } from '@edge/chart-core';
import type { ChartPaneHandle } from '../engine/paneHandle';
import { indicatorKey } from '../indicatorKey';

export type DrawingPointerContext = {
  paneHandlesRef: { current: Map<string, ChartPaneHandle> | null };
  candlesRef: { current: Candle[] };
  latestVpRef: { current: VisibleRange | null };
  paneSegmentsRef: { current: PaneSegment[] };
  stateRef: { current: SerializedChartState };
  drawingsRef: { current: SerializedDrawing[] };
  drawingStoreRef: { current: DrawingStore };
  drawingStateRef: { current: DrawingControllerState };
  magnetEnabledRef: { current: boolean };
  keepDrawingRef: { current: boolean };
  cpDragPointsSnapshotRef: { current: SerializedDrawing['points'] | null };
  drawingDragStartRef: { current: { plotX: number; plotY: number } | null };
  activePlacingPaneRef: { current: string };
  placingAnchorRef: { current: { plotX: number; plotY: number } | null };
  syncDrawingState: (next: DrawingControllerState) => void;
  notifySelectionChange: (id: string | null) => void;
  addCommittedDrawing: (drawing: SerializedDrawing) => string;
  stampPaneId: (draft: SerializedDrawing, paneId: string) => SerializedDrawing;
  finishAfterCommit: (state: DrawingControllerState) => DrawingControllerState;
  setPreviewDrawing: (preview: SerializedDrawing | null) => void;
  setPlacingDraftOnMove: (state: DrawingControllerState, draft: SerializedDrawing) => void;
  getPaneShowTimeAxis: (paneId: string) => boolean;
  getPaneIndicators: (paneId: string) => SerializedChartState['indicators'];
};

export function applyDrawingPointerTransition(
  ctx: DrawingPointerContext,
  event: DrawingPointerEvent,
): boolean {
  const {
    paneHandlesRef,
    candlesRef,
    latestVpRef,
    drawingsRef,
    drawingStoreRef,
    drawingStateRef,
    magnetEnabledRef,
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
  } = ctx;

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
      const nextPoints = translateSnapshotPoints(before);
      drawingStoreRef.current.replaceDrawing(drawing.id!, {
        ...drawing,
        points: nextPoints,
      });
    }
    return true;
  }

  if (state.fsm === 'dragging_cp' && event.phase === 'move' && state.draggingDrawingId != null) {
    const drawing = paneDrawings.find((d) => d.id === state.draggingDrawingId);
    const plugin = drawing ? getPluginForTool(drawing.name) : undefined;
    if (drawing && plugin?.updateFromControl && !drawing.locked) {
      const updated = plugin.updateFromControl(
        drawing,
        state.draggingCpIndex,
        event.plotX,
        event.plotY,
        vp,
        candlesRef.current,
        showTimeAxis,
      );
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
      if (isOnePointTool(tool) || isInstantTool(tool)) {
        const draft = createDraftFromPoint(tool, getPoint(), vp, candlesRef.current);
        if (!draft) return true;
        const plugin = getPluginForTool(tool);
        const paneDraft = stampPaneId(draft, paneId);
        const finalized = plugin?.finalize
          ? plugin.finalize(paneDraft, vp, candlesRef.current)
          : paneDraft;
        const { state: nextState, drawing } = commitDrawing(
          state,
          finalized,
          drawingsRef.current,
        );
        const id = addCommittedDrawing(drawing);
        const after = finishAfterCommit(nextState);
        const selected = isInstantTool(tool)
          ? selectDrawingState(disarmTool(after), id)
          : after;
        syncDrawingState(selected);
        if (isInstantTool(tool)) notifySelectionChange(id);
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
      setPlacingDraftOnMove(state, updated);
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
        const disableStick = entryValueChanged(before, drawing.points);
        const pinned = disableStick ? withStickEntryDisabled(drawing) : drawing;
        const commands: Array<
          | {
              type: 'updatePoints';
              id: string;
              before: SerializedDrawing['points'];
              after: SerializedDrawing['points'];
            }
          | {
              type: 'updateMeta';
              id: string;
              before: { styles?: SerializedDrawing['styles'] };
              after: { styles?: SerializedDrawing['styles'] };
            }
        > = [
          {
            type: 'updatePoints',
            id,
            before,
            after: pinned.points.map((p) => ({ ...p })),
          },
        ];
        if (disableStick && pinned.styles?.stickEntryToLastPrice === false) {
          commands.push({
            type: 'updateMeta',
            id,
            before: { styles: drawing.styles },
            after: { styles: pinned.styles },
          });
        }
        drawingStoreRef.current.execute(
          commands.length === 1 ? commands[0]! : { type: 'batch', commands },
        );
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
        const disableStick = entryValueChanged(before, drawing.points);
        const pinned = disableStick ? withStickEntryDisabled(drawing) : drawing;
        const commands: Array<
          | {
              type: 'updatePoints';
              id: string;
              before: SerializedDrawing['points'];
              after: SerializedDrawing['points'];
            }
          | {
              type: 'updateMeta';
              id: string;
              before: { styles?: SerializedDrawing['styles'] };
              after: { styles?: SerializedDrawing['styles'] };
            }
        > = [
          {
            type: 'updatePoints',
            id,
            before,
            after: pinned.points.map((p) => ({ ...p })),
          },
        ];
        if (disableStick && pinned.styles?.stickEntryToLastPrice === false) {
          commands.push({
            type: 'updateMeta',
            id,
            before: { styles: drawing.styles },
            after: { styles: pinned.styles },
          });
        }
        drawingStoreRef.current.execute(
          commands.length === 1 ? commands[0]! : { type: 'batch', commands },
        );
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
}

export function createPaneIndicatorHelpers(
  paneSegmentsRef: { current: PaneSegment[] },
  stateRef: { current: SerializedChartState },
) {
  const getPaneShowTimeAxis = (paneId: string) => {
    const segment = paneSegmentsRef.current?.find((s) => s.paneId === paneId);
    return segment?.showTimeAxis ?? true;
  };

  const getPaneIndicators = (paneId: string) => {
    const indicators = stateRef.current.indicators.filter((i) => i.visible !== false);
    if (paneId === 'price') return indicators.filter((i) => i.pane === 'main');
    return indicators.filter((i) => indicatorKey(i) === paneId);
  };

  return { getPaneShowTimeAxis, getPaneIndicators };
}
