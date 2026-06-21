export const PRICE_AXIS_WIDTH = 50;
export const TIME_AXIS_HEIGHT = 30;

export type DragMode = 'body' | 'price' | 'timeAxis';

export function resolveDragMode(x: number, y: number, width: number, height: number): DragMode {
  if (x >= width - PRICE_AXIS_WIDTH) return 'price';
  if (y >= height - TIME_AXIS_HEIGHT) return 'timeAxis';
  return 'body';
}

export function plotWidth(width: number) {
  return width - PRICE_AXIS_WIDTH;
}

export function plotHeight(height: number) {
  return height - TIME_AXIS_HEIGHT;
}
