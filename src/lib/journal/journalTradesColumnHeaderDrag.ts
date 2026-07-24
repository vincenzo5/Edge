export const JOURNAL_TRADES_HEADER_DRAG_HOLD_MS = 180;
export const JOURNAL_TRADES_HEADER_DRAG_MOVE_PX = 6;

export function resolveHeaderDropIndex(
  clientX: number,
  headers: ReadonlyArray<{ left: number; width: number }>,
): number {
  if (headers.length === 0) return 0;
  for (let index = 0; index < headers.length; index += 1) {
    const header = headers[index]!;
    if (clientX < header.left + header.width / 2) return index;
  }
  return headers.length - 1;
}

export function shouldActivateHeaderDrag(
  deltaX: number,
  deltaY: number,
  elapsedMs: number,
): boolean {
  return (
    elapsedMs >= JOURNAL_TRADES_HEADER_DRAG_HOLD_MS ||
    Math.hypot(deltaX, deltaY) >= JOURNAL_TRADES_HEADER_DRAG_MOVE_PX
  );
}
