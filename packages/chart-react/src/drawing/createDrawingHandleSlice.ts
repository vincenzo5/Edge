'use client';

import type {
  Candle,
  PaneSegment,
  SerializedChartState,
  SerializedDrawing,
  TrackedOverlay,
  VisibleRange,
} from '@edge/chart-core';
import { plotLeftOffset } from '@edge/chart-core/layout';
import {
  hitTestAll,
  hitTestControlPoint,
  restoreAll,
  serializeAll,
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
import type { DrawingHandleSlice } from './useDrawingController';

export type DrawingHandleSliceContext = {
  drawingsRef: { current: SerializedDrawing[] };
  drawingStoreRef: { current: DrawingStore };
  trackedRef: { current: Map<string, TrackedOverlay> };
  drawingStateRef: { current: DrawingControllerState };
  magnetEnabledRef: { current: boolean };
  keepDrawingRef: { current: boolean };
  selectionChangeCbsRef: { current: Set<(id: string | null) => void> };
  paneHandlesRef: { current: Map<string, ChartPaneHandle> | null };
  candlesRef: { current: Candle[] };
  latestVpRef: { current: VisibleRange | null };
  paneSegmentsRef: { current: PaneSegment[] };
  stateRef: { current: SerializedChartState };
  overlayChangeCbsRef: { current: Set<() => void> };
  syncDrawingState: (next: DrawingControllerState) => void;
  notifySelectionChange: (id: string | null) => void;
  hydrateDrawings: (data: SerializedDrawing[]) => void;
  addCommittedDrawing: (drawing: SerializedDrawing) => string;
  stampPaneId: (draft: SerializedDrawing, paneId: string) => SerializedDrawing;
  setPreviewDrawing: (preview: SerializedDrawing | null) => void;
};

export function createDrawingHandleSlice(ctx: DrawingHandleSliceContext): DrawingHandleSlice {
  const {
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
  } = ctx;

  return {
    startDrawing: (name: string) => {
      if (isInstantTool(name)) {
        const candles = candlesRef.current;
        const vp =
          paneHandlesRef.current?.get('price')?.getViewport() ?? latestVpRef.current;
        if (candles.length > 0 && vp) {
          const lastIdx = candles.length - 1;
          const last = candles[lastIdx]!;
          const start = {
            timestamp: last.t,
            value: last.c,
            dataIndex: lastIdx,
          };
          const draft = createDraftFromPoint(name, start, vp, candles);
          if (draft) {
            const plugin = getPluginForTool(name);
            const paneDraft = stampPaneId(draft, 'price');
            const finalized = plugin?.finalize
              ? plugin.finalize(paneDraft, vp, candles)
              : paneDraft;
            const armed = armTool(drawingStateRef.current, name);
            syncDrawingState(armed);
            const { drawing } = commitDrawing(armed, finalized, drawingsRef.current);
            const id = addCommittedDrawing(drawing);
            const next = selectDrawingState(disarmTool(drawingStateRef.current), id);
            syncDrawingState(next);
            notifySelectionChange(id);
            setPreviewDrawing(null);
            return;
          }
        }
      }
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
      const plotOffset =
        paneId === 'price'
          ? plotLeftOffset(resolvePriceScaleSide(settings.scales.priceScalePlacement))
          : 0;
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
  };
}
