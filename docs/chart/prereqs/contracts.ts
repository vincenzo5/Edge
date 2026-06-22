// docs/chart/prereqs/contracts.ts
// Core data contracts for Edge Custom Chart V1. Single source of truth.

export type Candle = {
  t: number; // timestamp ms
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number;
};

export type Range = '1d' | '5d' | '1mo' | '3mo' | '6mo' | 'ytd' | '1y' | '2y' | '5y' | 'max';
export type Interval = '1m' | '5m' | '15m' | '30m' | '1h' | '2h' | '1d' | '1wk' | '1mo';

export type IndicatorConfig = {
  name: string;
  pane: 'main' | 'sub';
  params?: Record<string, number>;
};

export type SerializedDrawing = {
  name: string;
  label: string;
  points: Array<{ dataIndex?: number; timestamp?: number; value?: number }>;
  mode?: string;
  styles?: unknown;
  visible: boolean;
  locked: boolean;
  zLevel: number;
};

export type TrackedOverlay = {
  id: string;
  name: string;
  label: string;
  visible: boolean;
  locked: boolean;
  zLevel: number;
  paneId: string;
};

export type CellConfig = {
  symbol: string;
  range: Range;
  interval: Interval;
  chartType: 'candle_solid' | 'candle_stroke' | 'ohlc' | 'area' | 'heikin_ashi';
  indicators: IndicatorConfig[];
  drawings: SerializedDrawing[];
  paneOrder?: string[];
  collapsedPanes?: string[];
  maximizedPane?: string | null;
};

export type Theme = 'light' | 'dark';

export type GridMode = '1x1' | '2x1' | '2x2' | '3x1' | '1x2';

export const PRICE_PANE_KEY = 'price';

// VisibleRange used internally by viewport
export type VisibleRange = {
  startIndex: number;
  endIndex: number;
  priceMin: number;
  priceMax: number;
  // pixel mapping helpers
  xForIndex: (i: number) => number;
  yForPrice: (p: number) => number;
  indexForX: (x: number) => number;
  priceForY: (y: number) => number;
};
