// src/lib/chart/plugin-api.ts
// Minimal plugin interfaces for indicators and drawings

import type { Candle, VisibleRange, Theme, SerializedDrawing } from './contracts';
import type { DrawingPoint } from './drawingCoords';
import type { LegendValueEntry, SeriesOutput } from './legend/types';

export type IndicatorCategory = 'Trend' | 'Momentum' | 'Volume' | 'Volatility' | 'Other';

export type ParamDef = {
  label: string;
  default: number;
  min?: number;
  max?: number;
  step?: number;
};

/**
 * Sub-pane indicators: provide compute + outputs for automatic legends.
 * legendAt / valueAt are optional overrides for non-standard formatting or series selection.
 */
export interface IndicatorPlugin {
  name: string;
  category: IndicatorCategory;
  description: string;
  pane: 'main' | 'sub';
  defaultParams?: Record<string, number>;
  /** Drives future settings UI; keys match defaultParams. */
  paramSchema?: Record<string, ParamDef>;
  /** Single source of truth for all output series data. */
  compute?: (candles: Candle[], params?: Record<string, number>) => Record<string, number[]>;
  /** Declarative series metadata — drives default legend when compute is present. */
  outputs?: SeriesOutput[];
  draw: (
    ctx: CanvasRenderingContext2D,
    candles: Candle[],
    vp: VisibleRange,
    theme: Theme,
    params?: Record<string, number>
  ) => void;
  valueAt?: (index: number, candles: Candle[], params?: Record<string, number>) => number | null;
  legendAt?: (
    index: number,
    candles: Candle[],
    params?: Record<string, number>,
    theme?: Theme,
  ) => LegendValueEntry[] | null;
  valueRangeForViewport?: (
    candles: Candle[],
    vp: VisibleRange,
    params?: Record<string, number>
  ) => { min: number; max: number } | null;
}

export type DrawingPlacement = 'one-point' | 'two-point' | 'multi-point';

export interface DrawingPlugin {
  name: string;
  defaultLabel?: string;
  placement: DrawingPlacement;
  maxControlPoints?: number;
  create: (start: DrawingPoint, vp: VisibleRange, candles: Candle[]) => SerializedDrawing;
  updatePreview?: (
    draft: SerializedDrawing,
    cursor: DrawingPoint,
    vp: VisibleRange,
    candles: Candle[]
  ) => SerializedDrawing;
  finalize?: (draft: SerializedDrawing, vp: VisibleRange, candles: Candle[]) => SerializedDrawing;
  draw: (
    ctx: CanvasRenderingContext2D,
    drawing: SerializedDrawing,
    vp: VisibleRange,
    theme: Theme,
    selected: boolean,
    candles: Candle[],
    opts?: { preview?: boolean; showTimeAxis?: boolean }
  ) => void;
  hitTest: (
    plotX: number,
    plotY: number,
    drawing: SerializedDrawing,
    vp: VisibleRange,
    candles: Candle[],
    showTimeAxis?: boolean
  ) => boolean;
  getControlPoints?: (
    drawing: SerializedDrawing,
    vp: VisibleRange,
    candles: Candle[],
    showTimeAxis?: boolean
  ) => Array<{ x: number; y: number; role?: string }>;
  updateFromControl?: (
    drawing: SerializedDrawing,
    cpIndex: number,
    plotX: number,
    plotY: number,
    vp: VisibleRange,
    candles: Candle[],
    showTimeAxis?: boolean
  ) => SerializedDrawing;
}
