'use client';

import {
  useCallback,
  useEffect,
  useRef,
  type MutableRefObject,
} from 'react';
import type { SerializedDrawing, TrackedOverlay } from '@edge/chart-core';
import { DrawingStore, restoreAll, serializeAll } from '@edge/chart-core';
import { newDrawingId } from '@edge/chart-core/drawingController';

type UseDrawingStoreSyncParams = {
  overlayChangeCbsRef: MutableRefObject<Set<() => void>>;
  loading: boolean;
  error: string | null;
  displayCandlesLength: number;
  stateDrawings: SerializedDrawing[] | undefined;
  stateDrawingsRevision?: number;
  activePlacingPaneRef: MutableRefObject<string>;
  bumpDrawTick: () => void;
};

export function useDrawingStoreSync({
  overlayChangeCbsRef,
  loading,
  error,
  displayCandlesLength,
  stateDrawings,
  stateDrawingsRevision,
  activePlacingPaneRef,
  bumpDrawTick,
}: UseDrawingStoreSyncParams) {
  const drawingsRef = useRef<SerializedDrawing[]>([]);
  const drawingStoreRef = useRef(new DrawingStore());
  const trackedRef = useRef<Map<string, TrackedOverlay>>(new Map());
  const lastExternalRevisionRef = useRef<number | undefined>(undefined);
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

    const incoming = stateDrawings ?? [];
    const signature = JSON.stringify(incoming);

    // Local persist echo: layout wrote serializeAll(store) back as props.
    // Compare against the same serialization so undo/redo history is preserved.
    const alreadyInStore =
      trackedRef.current.size > 0 &&
      signature === JSON.stringify(serializeAll(drawingsRef.current));

    if (stateDrawingsRevision != null) {
      if (trackedRef.current.size === 0) {
        if (incoming.length) hydrateDrawings(incoming);
        lastExternalRevisionRef.current = stateDrawingsRevision;
        drawingsSignatureRef.current = signature;
        return;
      }
      if (stateDrawingsRevision === lastExternalRevisionRef.current) return;
      lastExternalRevisionRef.current = stateDrawingsRevision;
      drawingsSignatureRef.current = signature;
      if (alreadyInStore) return;
      hydrateDrawings(incoming);
      return;
    }

    if (trackedRef.current.size === 0) {
      if (incoming.length) hydrateDrawings(incoming);
      drawingsSignatureRef.current = signature;
      return;
    }
    if (signature === drawingsSignatureRef.current) return;
    drawingsSignatureRef.current = signature;
    if (alreadyInStore) return;
    hydrateDrawings(incoming);
  }, [loading, error, displayCandlesLength, stateDrawings, stateDrawingsRevision, hydrateDrawings]);

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
