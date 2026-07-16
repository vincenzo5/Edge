export const PRICE_AXIS_WIDTH = 50;
/** Bottom date strip — TV-like: ~11px labels with ~6px equal top/bottom margin. */
export const TIME_AXIS_HEIGHT = 24;
/** Reserved strip between plot area and time axis for event badges. */
export const EVENT_RAIL_HEIGHT = 24;

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
  /** Shift held on price pane — hints ruler shortcut. */
  shiftHeld?: boolean;
  /** Pointer is over a drawing control point. */
  overControlPoint?: boolean;
  /** Selected/hovered drawing is locked — CP drag rejected. */
  controlPointLocked?: boolean;
  /** Pointer is over a drawing body (hit-test), even if not selected. */
  overDrawing?: boolean;
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

  if (ctx.overControlPoint) {
    return ctx.controlPointLocked ? 'not-allowed' : 'grab';
  }

  if (ctx.overDrawing && !isDrawingToolActive(ctx.activeTool)) {
    return 'grab';
  }

  if (ctx.shiftHeld && zone === 'body') return 'crosshair';

  if (isDrawingToolActive(ctx.activeTool)) return 'crosshair';
  return 'crosshair';
}

export function plotWidth(width: number, side: PriceScaleSide = 'right') {
  void side;
  return width - PRICE_AXIS_WIDTH;
}

export function plotHeight(
  height: number,
  reserveTimeAxis = true,
  reserveEventRail = false,
) {
  let h = height;
  if (reserveTimeAxis) h -= TIME_AXIS_HEIGHT;
  if (reserveEventRail) h -= EVENT_RAIL_HEIGHT;
  return h;
}

/** Y center of the event badge rail (between plot bottom and time axis). */
export function eventRailCenterY(
  height: number,
  reserveTimeAxis = true,
): number {
  const plotBottom = plotHeight(height, reserveTimeAxis, true);
  return plotBottom + EVENT_RAIL_HEIGHT / 2;
}
