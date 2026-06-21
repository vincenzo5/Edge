// src/lib/chart/contracts.ts
// Core data contracts for Edge Custom Chart V1 (minimal, self-contained)

export type Candle = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number;
};

export type Range = '1d' | '5d' | '1mo' | '3mo' | '6mo' | 'ytd' | '1y' | '2y' | '5y' | 'max';
export type Interval = '5m' | '15m' | '30m' | '1h' | '1d' | '1wk' | '1mo';

export type IndicatorConfig = {
  id: string;
  name: string;
  pane: 'main' | 'sub';
  params?: Record<string, number>;
  visible?: boolean;
};

export type SerializedDrawing = {
  id?: string;
  name: string;
  label: string;
  points: Array<{ dataIndex?: number; timestamp?: number; value?: number }>;
  mode?: string;
  styles?: unknown;
  visible: boolean;
  locked: boolean;
  zLevel: number;
  paneId?: string;
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
  symbolName?: string;
  exchange?: string;
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

export type VisibleRange = {
  startIndex: number;
  endIndex: number;
  priceMin: number;
  priceMax: number;
  width: number;
  height: number;
  xForIndex: (i: number) => number;
  yForPrice: (p: number) => number;
  indexForX: (x: number) => number;
  priceForY: (y: number) => number;
  /** Auto-fit Y to visible bars, or manual after price-axis drag. */
  priceScaleMode?: 'auto' | 'manual';
  /** When true, Y mapping excludes the bottom time-axis strip. */
  reserveTimeAxis?: boolean;
};

/** Shared horizontal window across panes; price scale stays per-pane. */
export type SyncedTimeWindow = {
  startIndex: number;
  endIndex: number;
};

export type CrosshairMoveEvent = {
  paneId: string;
  plotX: number;
  plotY: number;
  localY: number;
  timestamp: number | null;
  dataIndex: number;
  valueLabel: string;
  timeLabel: string;
};

export type CrosshairState = {
  plotX: number;
  globalY: number;
  activePaneId: string;
  paneTop: number;
  paneHeight: number;
  paneReserveTimeAxis: boolean;
  timestamp: number | null;
  dataIndex: number;
  valueLabel: string;
  timeLabel: string;
};

export type PaneSegment = {
  paneId: string;
  top: number;
  height: number;
  showTimeAxis: boolean;
};
