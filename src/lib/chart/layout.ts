export const PRICE_AXIS_WIDTH = 50;
export const TIME_AXIS_HEIGHT = 30;

export type PriceScaleSide = 'left' | 'right';

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

export function plotLeftOffset(side: PriceScaleSide = 'right'): number {
  return side === 'left' ? PRICE_AXIS_WIDTH : 0;
}

export function axisStripX(width: number, side: PriceScaleSide = 'right'): number {
  return side === 'left' ? 0 : width - PRICE_AXIS_WIDTH;
}

export function isPriceAxisHit(x: number, width: number, side: PriceScaleSide = 'right'): boolean {
  const axisX = axisStripX(width, side);
  return side === 'left'
    ? x >= axisX && x < axisX + PRICE_AXIS_WIDTH
    : x >= axisX;
}

export function resolveDragMode(
  x: number,
  y: number,
  width: number,
  height: number,
  reserveTimeAxis = true,
  priceScaleSide: PriceScaleSide = 'right',
): DragMode {
  if (isPriceAxisHit(x, width, priceScaleSide)) return 'price';
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
  ctx: CursorContext & { priceScaleSide?: PriceScaleSide },
): ChartCursor {
  if (ctx.isDragging) {
    if (ctx.dragMode === 'price') return 'ns-resize';
    if (ctx.dragMode === 'timeAxis') return 'ew-resize';
    return 'grabbing';
  }

  const zone = resolveDragMode(
    x,
    y,
    width,
    height,
    ctx.showTimeAxis,
    ctx.priceScaleSide ?? 'right',
  );
  if (zone === 'price') return 'ns-resize';
  if (zone === 'timeAxis') return 'crosshair';

  if (isDrawingToolActive(ctx.activeTool)) return 'crosshair';
  return 'crosshair';
}

export function plotWidth(width: number, side: PriceScaleSide = 'right') {
  void side;
  return width - PRICE_AXIS_WIDTH;
}

export function plotHeight(height: number, reserveTimeAxis = true) {
  return reserveTimeAxis ? height - TIME_AXIS_HEIGHT : height;
}
