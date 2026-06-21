import type { Range, Interval } from "./yahoo";

export type { Range, Interval };

export type ChartType =
  | "candle_solid"
  | "candle_stroke"
  | "ohlc"
  | "area"
  | "heikin_ashi";

export type Theme = "light" | "dark";

export type GridMode = "1x1" | "2x1" | "2x2" | "3x1" | "1x2";

export type IndicatorConfig = {
  name: string;
  pane: "main" | "sub";
};

/** Sentinel key representing the price (main candle) pane in paneOrder / collapsedPanes / maximizedPane. */
export const PRICE_PANE_KEY = "price";

export type OverlayMeta = {
  id: string;
  name: string;
  label: string;
  visible: boolean;
  locked: boolean;
  zLevel: number;
};

export type TrackedOverlay = OverlayMeta & {
  paneId: string;
};

export type SerializedDrawing = {
  id?: string;
  name: string;
  label: string;
  points: Array<{
    dataIndex?: number;
    timestamp?: number;
    value?: number;
  }>;
  mode?: string;
  styles?: unknown;
  visible: boolean;
  locked: boolean;
  zLevel: number;
  paneId?: string;
};

export type CellConfig = {
  symbol: string;
  symbolName?: string;
  exchange?: string;
  range: Range;
  interval: Interval;
  chartType: ChartType;
  indicators: IndicatorConfig[];
  drawings: SerializedDrawing[];
  /** Ordered list of pane keys (IndicatorKey | PRICE_PANE_KEY) determining visual stacking and creation order. */
  paneOrder?: string[];
  /** Keys of panes that are currently collapsed (height 0 but header controls visible). */
  collapsedPanes?: string[];
  /** Key of the pane currently maximized (others collapsed). */
  maximizedPane?: string | null;
  /** User-resized sub-pane heights keyed by indicator key (price pane height is derived). */
  paneHeights?: Record<string, number>;
};

export type ChartLayout = {
  version: 1;
  gridMode: GridMode;
  linked: boolean;
  /** Index of the chart cell that receives drawing tools and focus ring. */
  activeCellIndex: number;
  theme: Theme;
  cells: CellConfig[];
};

/** Fields propagated to all cells when layout.linked is true. */
export type LinkFields = Pick<
  CellConfig,
  "symbol" | "symbolName" | "exchange" | "range" | "interval"
>;

export function pickLinkFields(cell: CellConfig): LinkFields {
  return {
    symbol: cell.symbol,
    symbolName: cell.symbolName,
    exchange: cell.exchange,
    range: cell.range,
    interval: cell.interval,
  };
}

export const DEFAULT_CELL: CellConfig = {
  symbol: "AAPL",
  range: "1y",
  interval: "1d",
  chartType: "candle_solid",
  indicators: [],
  drawings: [],
  paneOrder: undefined,
  collapsedPanes: undefined,
  maximizedPane: null,
  paneHeights: undefined,
};

export const DEFAULT_LAYOUT: ChartLayout = {
  version: 1,
  gridMode: "1x1",
  linked: false,
  activeCellIndex: 0,
  theme: "light",
  cells: [DEFAULT_CELL],
};

export const RANGES: Array<{ label: string; value: Range }> = [
  { label: "1D", value: "1d" },
  { label: "5D", value: "5d" },
  { label: "1M", value: "1mo" },
  { label: "3M", value: "3mo" },
  { label: "6M", value: "6mo" },
  { label: "YTD", value: "ytd" },
  { label: "1Y", value: "1y" },
  { label: "5Y", value: "5y" },
  { label: "MAX", value: "max" },
];

export const INTERVALS: Array<{ label: string; value: Interval }> = [
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "30m", value: "30m" },
  { label: "1h", value: "1h" },
  { label: "1D", value: "1d" },
  { label: "1W", value: "1wk" },
  { label: "1M", value: "1mo" },
];

export const CHART_TYPES: Array<{ label: string; value: ChartType }> = [
  { label: "Candles", value: "candle_solid" },
  { label: "Candles (hollow)", value: "candle_stroke" },
  { label: "OHLC", value: "ohlc" },
  { label: "Area", value: "area" },
  { label: "Heikin Ashi", value: "heikin_ashi" },
];

export const GRID_MODES: Array<{ label: string; value: GridMode }> = [
  { label: "1", value: "1x1" },
  { label: "2", value: "2x1" },
  { label: "1+2", value: "1x2" },
  { label: "3", value: "3x1" },
  { label: "2x2", value: "2x2" },
];

export function cellCountFor(mode: GridMode): number {
  switch (mode) {
    case "1x1":
      return 1;
    case "2x1":
      return 2;
    case "1x2":
      return 2;
    case "3x1":
      return 3;
    case "2x2":
      return 4;
  }
}
