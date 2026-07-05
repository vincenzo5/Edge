/**
 * @edge/chart-core — headless chart engine primitives.
 * Public surface is intentionally small; deep imports remain available during migration.
 */

export type {
  Candle,
  Range,
  Interval,
  LineStyleOverride,
  IndicatorConfig,
  DrawingStyles,
  SerializedDrawing,
  TrackedOverlay,
  Theme,
  GridMode,
  VisibleRange,
  SyncedTimeWindow,
  CrosshairMoveEvent,
  CrosshairState,
  PaneSegment,
  DrawingMetadata,
} from './contracts';

export { PRICE_PANE_KEY } from './contracts';

export type {
  IndicatorPlugin,
  DrawingPlugin,
  IndicatorCategory,
  PriceSource,
  InputValue,
  ResolvedInputs,
  ParamDef,
  IndicatorDrawOptions,
  DrawingPlacement,
} from './plugin-api';

export { IndicatorRegistry, DrawingRegistry, drawingAliases, serializeAll, restoreAll, hitTestAll, hitTestControlPoint } from './pluginHost';

export { createInitialLayout, applyBoundaryResize, computePaneBoundaries, PANE_SEPARATOR_HEIGHT } from './panes';
export type { Pane, PaneLayout } from './panes';

export { resolvePaneLabel } from './paneLabels';

export { DrawingStore, pointsEqual } from './drawingStore';

export { getAllIndicators, getIndicator, getCatalog, getCatalogEntry } from './indicators/registry';

export { getAllDrawings, getDrawing } from './drawings/registry';

export { getChartColors } from './themeTokens';

export { formatPrice, formatVolume, formatChange } from './format';

export type { ChartType } from './series';
export {
  toHeikinAshi,
  applyVisibleSlice,
  transformCandlesForChartType,
  mergeCandlesByTimestamp,
  mergeCandlesPrepend,
  applyCandleSnapshot,
  applyCandleAppend,
  applyCandleReplaceLatest,
  applyCandleStreamEvent,
  shouldPrefetchEdge,
  ensureCandlesCover,
  EDGE_FETCH_BAR_COUNT,
  PREFETCH_START_INDEX_THRESHOLD,
} from './series';
export type { HistoryPrefetchInput } from './historyPrefetch';
export {
  HISTORY_FETCH_BAR_COUNT,
  HISTORY_PREFETCH_DEBOUNCE_MS,
  HISTORY_PREFETCH_LOOKAHEAD_RATIO,
  HISTORY_PREFETCH_MIN_THRESHOLD,
  HISTORY_URGENT_LOOKAHEAD_RATIO,
  HISTORY_URGENT_MIN_THRESHOLD,
  HISTORY_BACKGROUND_PREFETCH_PAGES,
  computePrefetchThreshold,
  computeUrgentThreshold,
  shouldPrefetchHistory,
  isUrgentPrefetch,
  shouldBackgroundPrefetch,
} from './historyPrefetch';
export type { ApplyCandleStreamResult } from './series';

export type { SerializedChartState, ChartStateValidationResult } from './chartState';
export {
  CHART_STATE_VERSION,
  createDefaultChartState,
  serializeChartState,
  migrateChartState,
  validateChartState,
  restoreChartState,
} from './chartState';

export type {
  CandleRequest,
  CandleResponse,
  InstrumentSearchRequest,
  InstrumentSearchResult,
  QuoteRequest,
  MarketQuote,
  InstrumentProfileRequest,
  InstrumentProfile,
  MarketDataSource,
  ChartDataSourceId,
  ChartDataMeta,
  ChartCandleRequest,
  ChartCandleResult,
  ChartHistoryRequest,
  ChartQuoteRequest,
  ChartQuoteResult,
  ChartEventKind,
  ChartEventMarker,
  ChartEventsRequest,
  ChartEventsResult,
  ChartReferenceLine,
  ChartAnnotationChannelMarker,
  ChartOverlayChannel,
  ChartOverlayRequest,
  ChartOverlayResult,
  ChartOverlayBundle,
  ChartCandleStreamEvent,
  ChartQuoteStreamEvent,
  ChartCandleStreamSink,
  ChartQuoteStreamSink,
  ChartStreamEvent,
  ChartStreamSink,
  ChartSubscriptionRequest,
  ChartQuoteSubscriptionRequest,
  ChartDataFeed,
} from './dataSource';

export { CANDLE_TIMESTAMP_UNIT, SUPPORTED_INTERVALS, CHART_EVENT_OVERLAY_KINDS } from './dataSource';

export {
  computeRiskMetrics,
  inferDirection,
  normalizeTargetAllocations,
  targetPriceForRMultiple,
  formatRiskSummary,
  formatTargetLabel,
} from './risk/riskCompute';
export {
  isOptionTradeSetup,
  formatOptionLeg,
  formatOptionLegsSummary,
  formatOptionRiskSummary,
  formatOptionTargetLabel,
  formatOptionLineLabel,
  formatOptionSetupHeader,
  formatOptionSetupExplanation,
  OPTION_SETUP_DISPLAY_NAMES,
} from './risk/optionRiskFormat';
export {
  validateTradeSetup,
  parseTradeSetup,
  tradeSetupSchema,
  RiskValidationError,
} from './risk/riskValidation';
export {
  tradeSetupFromPoints,
  readTradeSetupFromDrawing,
  plotYForPrice,
  buildDefaultTargets,
  riskComputedPayload,
} from './risk/riskDrawing';
export type {
  TradeSetup,
  RiskMetrics,
  RiskDirection,
  RiskAccount,
  RiskEntry,
  RiskStop,
  RiskTarget,
  TargetMetrics,
  OptionLeg,
  OptionLegAction,
  OptionLegType,
  OptionSetupType,
  RiskInstrument,
} from './risk/riskTypes';
export { DEFAULT_RISK_ACCOUNT, DEFAULT_R_MULTIPLES, OPTION_SETUP_TYPES } from './risk/riskTypes';

export {
  ANNOTATION_KINDS,
  ANNOTATION_KIND_LABELS,
  ANNOTATION_KIND_FULL_LABELS,
} from './annotationMetadata';
export type { AnnotationKind, AnnotationStatus, AnnotationSource } from './annotationMetadata';

export type { MarketSessionKind, MarketSessionMode } from './marketSession';
export {
  classifyUsEquitySession,
  isExtendedSessionBar,
  parseProviderMarketState,
  resolveMarketSession,
  sessionPriceLabelPrefix,
  sessionStatusLabel,
} from './marketSession';
