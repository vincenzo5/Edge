export const PRICE_AXIS_WIDTH = 50;
export const TIME_AXIS_HEIGHT = 30;

export type DragMode = 'body' | 'price' | 'timeAxis';

export type ChartCursor =
  | 'default'
  | 'crosshair'
  | 'grab'
  | 'grabbing'
  | 'ns-resize'
  | 'ew-resize'
  | 'pointer'
  | 'not-allowed';

export type CursorContext = {
  showTimeAxis: boolean;
  /** `'__cursor__'` for navigate mode; any other value is an active drawing tool. */
  activeTool: string;
  isDragging: boolean;
  dragMode: DragMode | null;
};

export function resolveDragMode(
  x: number,
  y: number,
  width: number,
  height: number,
  reserveTimeAxis = true
): DragMode {
  if (x >= width - PRICE_AXIS_WIDTH) return 'price';
  if (reserveTimeAxis && y >= height - TIME_AXIS_HEIGHT) return 'timeAxis';
  return 'body';
}

export function isDrawingToolActive(activeTool: string): boolean {
  return activeTool !== '__cursor__';
}

/** Resolve the CSS cursor for a chart canvas at `(x, y)` given interaction context. */
export function resolveHoverCursor(
  x: number,
  y: number,
  width: number,
  height: number,
  ctx: CursorContext
): ChartCursor {
  if (ctx.isDragging) {
    if (ctx.dragMode === 'price') return 'ns-resize';
    if (ctx.dragMode === 'timeAxis') return 'ew-resize';
    return 'grabbing';
  }

  const zone = resolveDragMode(x, y, width, height, ctx.showTimeAxis);
  if (zone === 'price') return 'ns-resize';
  if (zone === 'timeAxis') return 'ew-resize';

  if (isDrawingToolActive(ctx.activeTool)) return 'crosshair';
  return 'crosshair';
}

export function plotWidth(width: number) {
  return width - PRICE_AXIS_WIDTH;
}

export function plotHeight(height: number, reserveTimeAxis = true) {
  return reserveTimeAxis ? height - TIME_AXIS_HEIGHT : height;
}
