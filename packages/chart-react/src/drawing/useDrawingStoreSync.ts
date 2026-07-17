'use client';

import {
  useCallback,
  useEffect,
  useRef,
  type MutableRefObject,
} from 'react';
import type { SerializedDrawing, TrackedOverlay } from '@edge/chart-core';
import { DrawingStore, restoreAll } from '@edge/chart-core';
import { newDrawingId } from '@edge/chart-core/drawingController';

type UseDrawingStoreSyncParams = {
  overlayChangeCbsRef: MutableRefObject<Set<() => void>>;
  loading: boolean;
  error: string | null;
  displayCandlesLength: number;
  stateDrawings: SerializedDrawing[] | undefined;
  activePlacingPaneRef: MutableRefObject<string>;
  bumpDrawTick: () => void;
};

export function useDrawingStoreSync({
  overlayChangeCbsRef,
  loading,
  error,
  displayCandlesLength,
  stateDrawings,
  activePlacingPaneRef,
  bumpDrawTick,
}: UseDrawingStoreSyncParams) {
  const drawingsRef = useRef<SerializedDrawing[]>([]);
  const drawingStoreRef = useRef(new DrawingStore());
  const trackedRef = useRef<Map<string, TrackedOverlay>>(new Map());
  const drawingsSignatureRef = useRef<string>('');

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

  const notifyOverlayChange = useCallback(() => {
    overlayChangeCbsRef.current.forEach((cb) => cb());
    bumpDrawTick();
  }, [overlayChangeCbsRef, bumpDrawTick]);

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

  const addCommittedDrawing = useCallback(
    (drawing: SerializedDrawing) => {
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
    },
    [activePlacingPaneRef],
  );

  useEffect(() => {
    return drawingStoreRef.current.subscribe(() => {
      const next = drawingStoreRef.current.getDrawings();
      drawingsRef.current = next;
      syncTrackedFromDrawings(next);
      overlayChangeCbsRef.current.forEach((cb) => cb());
      bumpDrawTick();
    });
  }, [syncTrackedFromDrawings, overlayChangeCbsRef, bumpDrawTick]);

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

  return {
    drawingsRef,
    drawingStoreRef,
    trackedRef,
    hydrateDrawings,
    addCommittedDrawing,
    syncTrackedFromDrawings,
    notifyOverlayChange,
  };
}
