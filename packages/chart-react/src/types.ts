/**
 * Public React chart surface for @edge/chart-react.
 *
 * Excluded from this package (closed product):
 * - Yahoo / production market data fetching
 * - Workspace layout, account sync, persistence
 * - App sidebars, templates, snapshots, watchlists
 * - Product command palettes and branded workflows
 */

import type {
  Candle,
  CrosshairMoveEvent,
  CrosshairState,
  DrawingMetadata,
  DrawingStyles,
  Interval,
  Range,
  SerializedDrawing,
  Theme,
  TrackedOverlay,
  VisibleRange,
} from '@edge/chart-core';
import type { SerializedChartState } from '@edge/chart-core';
import type { GoToRequest, GoToResult } from './engine/goTo';
import type { DrawingClipboardItem, PasteAnchor } from '@edge/chart-core/drawingClone';
import type { ChartSettings } from './engine/chartSettings';
import type { EventBadgeGroup } from './engine/eventBadges';

export type { GoToRequest, GoToResult };

export type DrawingScreenBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type IndicatorKey = string;

export type DrawPhaseTimings = {
  backgroundMs: number;
  gridMs: number;
  candlesMs: number;
  indicatorsMs: number;
  drawingsMs: number;
  axesMs: number;
  totalMs: number;
};

export type EdgeChartHandle = {
  resize: () => void;
  getState: () => SerializedChartState;
  setState: (state: SerializedChartState) => void;
  startDrawing: (overlayName: string) => void;
  stopDrawing: () => void;
  clearDrawings: () => void;
  setMagnet: (on: boolean) => void;
  serializeDrawings: () => SerializedDrawing[];
  restoreDrawings: (data: SerializedDrawing[]) => void;
  getVisibleRange: () => VisibleRange | null;
  setVisibleRange: (startIndex: number, endIndex: number) => void;
  onCrosshair: (cb: (timestamp: number | null) => void) => () => void;
  setCrosshairFromSync: (timestamp: number | null) => void;
  getTrackedOverlays: () => TrackedOverlay[];
  removeOverlay: (id: string) => void;
  setOverlayVisible: (id: string, visible: boolean) => void;
  setOverlayLocked: (id: string, locked: boolean) => void;
  renameOverlay: (id: string, label: string) => void;
  duplicateOverlay: (id: string) => string | null;
  pasteDrawings: (items: DrawingClipboardItem[], anchor: PasteAnchor) => string[];
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  subscribeOverlayChange: (cb: () => void) => () => void;
  getSubPaneId: (key: IndicatorKey) => string | undefined;
  applyPaneHeights: (heights: Map<IndicatorKey, number | null>) => void;
  resetChartView: () => void;
  resetPriceScaleWindow: (settingsOverride?: ChartSettings) => void;
  isViewportModified: () => boolean;
  getSelectedDrawingId: () => string | null;
  selectDrawing: (id: string | null) => void;
  onSelectionChange: (cb: (id: string | null) => void) => () => void;
  getMagnetEnabled: () => boolean;
  setKeepDrawingMode: (on: boolean) => void;
  getKeepDrawingMode: () => boolean;
  zoomIn: () => void;
  lockAllDrawings: (locked: boolean) => void;
  areAllDrawingsLocked: () => boolean;
  setAllDrawingsVisible: (visible: boolean) => void;
  areAllDrawingsHidden: () => boolean;
  updateDrawingStyles: (id: string, patch: Partial<DrawingStyles>) => void;
  updateDrawingMetadata: (id: string, patch: DrawingMetadata) => void;
  undo: () => boolean;
  redo: () => boolean;
  canUndo: () => boolean;
  canRedo: () => boolean;
  getRawCandleCount: () => number;
  getCandles: () => Candle[];
  goTo: (req: GoToRequest) => Promise<GoToResult>;
  getLastCandleTimestamp: () => number | null;
  getDrawingScreenBounds: (id: string) => DrawingScreenBounds | null;
  /** Latest draw-phase timings from the price pane (perf diagnostics). */
  getLastDrawPhases?: () => DrawPhaseTimings | null;
};

/** @deprecated Use EdgeChartHandle */
export type ChartHandle = EdgeChartHandle;

export type EdgeChartProps = {
  /** Caller-provided OHLCV series — no network fetch inside the public component. */
  candles: Candle[];
  /** Serializable chart state (indicators, drawings, panes, settings). */
  state: SerializedChartState;
  theme: Theme;
  chartId?: string;
  visibleCount?: number | null;
  loading?: boolean;
  error?: string | null;
  /** Display metadata for legends (optional). */
  symbol?: string;
  symbolName?: string;
  exchange?: string;
  interval?: Interval;
  range?: Range;
  rangePreset?: Range | null;
  /** Session key for viewport resets when the candle series identity changes. */
  sessionKey?: string;
  collapsedKeys?: Set<IndicatorKey>;
  maximizedKey?: IndicatorKey | null;
  paneOrder?: string[];
  onStateChange?: (state: SerializedChartState) => void;
  onOverlayRightClick?: (overlay: TrackedOverlay, pos: { x: number; y: number }) => void;
  onChartContextMenu?: (pos: { x: number; y: number }) => void;
  onPriceScaleContextMenu?: (pos: {
    clientX: number;
    clientY: number;
    priceScaleMode: 'auto' | 'manual';
  }) => void;
  onRemoveIndicator?: (id: string) => void;
  onCollapseIndicator?: (key: IndicatorKey) => void;
  onMaximizeIndicator?: (key: IndicatorKey) => void;
  onMoveIndicatorUp?: (key: IndicatorKey) => void;
  onMoveIndicatorDown?: (key: IndicatorKey) => void;
  onPaneHeightsChange?: (heights: Record<string, number>) => void;
  onCrosshairTimestamp?: (timestamp: number | null) => void;
  onDrawingDisarmed?: () => void;
  onCandlesChange?: (candles: Candle[]) => void;
  onCrosshairMove?: (ev: {
    timestamp: number | null;
    dataIndex: number | null;
    valueLabel: string | null;
    plotX?: number | null;
  }) => void;
  onLegendAction?: (actionId: string) => void;
  compact?: boolean;
  /** Freeze chart crosshair updates while host UI such as context menus is open. */
  suppressCrosshair?: boolean;
  /** Optional edge-history loader injected by the host app. */
  onLoadOlderCandles?: (beforeTimestampMs: number) => Promise<Candle[]>;
  /** Clears an active range preset after go-to navigation (host updates symbol/range props). */
  onRangePresetClear?: () => void;
  /** Data-driven event markers (earnings, filings, etc.). */
  eventMarkers?: import('@edge/chart-core').ChartEventMarker[];
  /** Declarative horizontal reference levels. */
  referenceLines?: import('@edge/chart-core').ChartReferenceLine[];
  /** Semantic annotation channel markers (thesis, invalidation, target, etc.). */
  annotationMarkers?: import('@edge/chart-core').ChartAnnotationChannelMarker[];
  /** Selected bottom-axis event badge (shows guide line + detail card). */
  selectedEventBadgeId?: string | null;
  /** Fired when user clicks an event badge on the price pane. */
  onEventBadgeClick?: (
    group: EventBadgeGroup,
    pos: { clientX: number; clientY: number; plotX: number; plotY: number },
  ) => void;
  /** Fired when hover moves between event badges. */
  onEventBadgeHover?: (group: EventBadgeGroup | null) => void;
  /** Fired when user clicks "More events" in the detail card. */
  onEventBadgeMore?: (group: EventBadgeGroup) => void;
};

export type { CrosshairMoveEvent, CrosshairState, SerializedChartState, Theme, Candle };
