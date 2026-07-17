'use client';

import { useEffect, type RefObject } from 'react';
import type { SerializedDrawing } from '@edge/chart-core';
import {
  DrawingStore,
  applyStickEntryPrice,
} from '@edge/chart-core';
import type { DrawingControllerState } from '@edge/chart-core/drawingController';

export function useLivePriceStickEntry(
  drawingStoreRef: RefObject<DrawingStore>,
  drawingStateRef: RefObject<DrawingControllerState>,
  livePrice: number | null | undefined,
) {
  useEffect(() => {
    if (livePrice == null || !Number.isFinite(livePrice)) return;
    const fsm = drawingStateRef.current.fsm;
    const draggingId =
      fsm === 'dragging_cp' || fsm === 'dragging_drawing'
        ? drawingStateRef.current.draggingDrawingId
        : null;
    const drawings = drawingStoreRef.current.getDrawings();
    const commands: Array<{
      type: 'updatePoints';
      id: string;
      before: SerializedDrawing['points'];
      after: SerializedDrawing['points'];
    }> = [];
    for (const d of drawings) {
      if (!d.id || d.id === draggingId) continue;
      const next = applyStickEntryPrice(d, livePrice);
      if (!next) continue;
      commands.push({
        type: 'updatePoints',
        id: d.id,
        before: d.points.map((p) => ({ ...p })),
        after: next.points.map((p) => ({ ...p })),
      });
    }
    if (commands.length === 0) return;
    drawingStoreRef.current.execute(
      commands.length === 1 ? commands[0]! : { type: 'batch', commands },
      false,
    );
  }, [livePrice, drawingStoreRef, drawingStateRef]);
}
