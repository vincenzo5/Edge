import { getAllIndicators, getIndicator } from './indicators/registry';
import { getAllDrawings, getDrawing } from './drawings/registry';
import type { SerializedDrawing, TrackedOverlay, IndicatorConfig } from './contracts';

export const IndicatorRegistry = {
  getAll: getAllIndicators,
  get: getIndicator,
};

const drawingAliases: Record<string, string> = {
  straightLine: 'trend_line',
  horizontalStraightLine: 'horizontal_line',
  rect: 'rectangle',
  // add more as needed for V1
};

export const DrawingRegistry = {
  getAll: getAllDrawings,
  get: (name: string) => getDrawing(drawingAliases[name] ?? name),
};

export function serializeAll(drawings: SerializedDrawing[]): SerializedDrawing[] {
  return drawings; // pass-through for V1
}

export function restoreAll(data: SerializedDrawing[]): TrackedOverlay[] {
  return data.map((d, i) => ({
    id: `restored_${i}`,
    name: d.name,
    label: d.label,
    visible: d.visible,
    locked: d.locked,
    zLevel: d.zLevel,
    paneId: 'candle_pane',
  }));
}

export function hitTestAll(x: number, y: number, drawings: SerializedDrawing[], vp: any) {
  // delegate to each plugin's hitTest
  return null;
}
