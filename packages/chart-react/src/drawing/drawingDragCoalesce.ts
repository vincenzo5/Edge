import type { SerializedDrawing } from '@edge/chart-core';
import type { DrawingStore } from '@edge/chart-core';

type PendingDragReplace = {
  store: DrawingStore;
  id: string;
  drawing: SerializedDrawing;
};

let dragRafId: number | null = null;
let pendingDragReplace: PendingDragReplace | null = null;

/** Coalesce replaceDrawing during drag to at most one store write per animation frame. */
export function scheduleDragReplace(
  store: DrawingStore,
  id: string,
  drawing: SerializedDrawing,
): void {
  pendingDragReplace = { store, id, drawing };
  if (dragRafId != null) return;
  dragRafId = requestAnimationFrame(() => {
    dragRafId = null;
    const pending = pendingDragReplace;
    pendingDragReplace = null;
    if (pending) pending.store.replaceDrawing(pending.id, pending.drawing);
  });
}

/** Flush any staged drag geometry before pointer-up execute. */
export function flushDragReplace(): void {
  if (dragRafId != null) {
    cancelAnimationFrame(dragRafId);
    dragRafId = null;
  }
  const pending = pendingDragReplace;
  pendingDragReplace = null;
  if (pending) pending.store.replaceDrawing(pending.id, pending.drawing);
}
