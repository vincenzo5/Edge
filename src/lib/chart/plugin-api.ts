// src/lib/chart/plugin-api.ts
// Minimal plugin interfaces for indicators and drawings

import type { Candle, VisibleRange, Theme, SerializedDrawing } from './contracts';

export interface IndicatorPlugin {
  name: string;
  pane: 'main' | 'sub';
  defaultParams?: Record<string, number>;
  draw: (
    ctx: CanvasRenderingContext2D,
    candles: Candle[],
    vp: VisibleRange,
    theme: Theme,
    params?: Record<string, number>
  ) => void;
  valueAt?: (index: number, candles: Candle[], params?: Record<string, number>) => number | null;
}

export interface DrawingPlugin {
  name: string;
  create: (startPoint: { x: number; y: number }, vp: VisibleRange) => SerializedDrawing;
  draw: (
    ctx: CanvasRenderingContext2D,
    drawing: SerializedDrawing,
    vp: VisibleRange,
    theme: Theme,
    selected: boolean
  ) => void;
  hitTest: (x: number, y: number, drawing: SerializedDrawing, vp: VisibleRange) => boolean;
  getControlPoints?: (drawing: SerializedDrawing, vp: VisibleRange) => Array<{ x: number; y: number }>;
  updateFromControl?: (
    drawing: SerializedDrawing,
    cpIndex: number,
    newX: number,
    newY: number,
    vp: VisibleRange
  ) => SerializedDrawing;
}
