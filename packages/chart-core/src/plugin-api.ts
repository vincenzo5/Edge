// src/lib/chart/plugin-api.ts
// Minimal plugin interfaces for indicators and drawings

import type { Candle, VisibleRange, Theme, SerializedDrawing, LineStyleOverride, IndicatorConfig, Interval } from './contracts';
import type { DrawingPoint } from './drawingCoords';
import type { LegendValueEntry, SeriesOutput } from './legend/types';
import type { PriceAxisAnnotation } from './priceAxisTypes';

export type IndicatorCategory = 'Trend' | 'Momentum' | 'Volume' | 'Volatility' | 'Other';

export type PriceSource = 'close' | 'open' | 'high' | 'low' | 'hlc3' | 'ohlcv';
export type InputValue = number | string | boolean;
export type ResolvedInputs = Record<string, InputValue>;

export type ParamDef =
  | { kind: 'number'; label: string; default: number; min?: number; max?: number; step?: number }
  | { kind: 'enum'; label: string; default: string; options: { value: string; label: string }[] }
  | { kind: 'boolean'; label: string; default: boolean }
  | { kind: 'source'; label: string; default: PriceSource };

/** @deprecated Use discriminated ParamDef with kind: 'number'. */
export type LegacyParamDef = {
  label: string;
  default: number;
  min?: number;
  max?: number;
  step?: number;
};

export type ResolvedSeriesStyle = {
  color: string;
  lineWidth: number;
  visible: boolean;
};

export type IndicatorDrawOptions = {
  instance: IndicatorConfig;
  resolvedStyles: Map<string, ResolvedSeriesStyle>;
  data: Record<string, number[]> | null;
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
  /** @deprecated Prefer defaultInputs. */
  defaultParams?: Record<string, number>;
  defaultInputs?: Record<string, InputValue>;
  inputSchema?: Record<string, ParamDef>;
  /** @deprecated Prefer inputSchema. */
  paramSchema?: Record<string, LegacyParamDef>;
  defaultStyles?: Record<string, LineStyleOverride>;
  /** Single source of truth for all output series data. */
  compute?: (candles: Candle[], inputs: ResolvedInputs) => Record<string, number[]>;
  /** Declarative series metadata — drives default legend when compute is present. */
  outputs?: SeriesOutput[];
  /** Custom draw override; omit when outputs + declarative path suffice. */
  draw?: (
    ctx: CanvasRenderingContext2D,
    candles: Candle[],
    vp: VisibleRange,
    theme: Theme,
    inputs: ResolvedInputs,
    options?: IndicatorDrawOptions,
  ) => void;
  valueAt?: (index: number, candles: Candle[], inputs: ResolvedInputs) => number | null;
  legendAt?: (
    index: number,
    candles: Candle[],
    inputs: ResolvedInputs,
    theme?: Theme,
  ) => LegendValueEntry[] | null;
  valueRangeForViewport?: (
    candles: Candle[],
    vp: VisibleRange,
    inputs: ResolvedInputs,
  ) => { min: number; max: number } | null;
}

export type DrawingPlacement = 'one-point' | 'two-point' | 'multi-point' | 'instant';

export type DrawingDrawOptions = {
  preview?: boolean;
  hovered?: boolean;
  showTimeAxis?: boolean;
  interval?: Interval;
};

export interface DrawingPlugin {
  name: string;
  defaultLabel?: string;
  placement: DrawingPlacement;
  maxControlPoints?: number;
  /** Variable-N tools: signal placement complete (e.g. polylines). */
  isPlacementComplete?: (draft: SerializedDrawing) => boolean;
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
    opts?: DrawingDrawOptions
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
  /** Optional price-axis labels for horizontal / price-level drawings. */
  axisAnnotations?: (
    drawing: SerializedDrawing,
    vp: VisibleRange,
    candles: Candle[],
    theme: Theme,
    showTimeAxis?: boolean,
  ) => PriceAxisAnnotation[];
}
