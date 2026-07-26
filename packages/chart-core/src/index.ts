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
  PaletteId,
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

export {
  IndicatorRegistry,
  DrawingRegistry,
  drawingAliases,
  serializeAll,
  restoreAll,
  getHitTestCandidates,
  getVisibleDrawingsSorted,
  hitTestAll,
  hitTestControlPoint,
} from './pluginHost';

export { createInitialLayout, applyBoundaryResize, computePaneBoundaries, PANE_SEPARATOR_HEIGHT } from './panes';
export type { Pane, PaneLayout } from './panes';

export { resolvePaneLabel } from './paneLabels';

export { DrawingStore, pointsEqual } from './drawingStore';

export { getAllIndicators, getIndicator, getCatalog, getCatalogEntry } from './indicators/registry';

export { resolveScriptBarColors } from './indicators/draw';

export { getAllDrawings, getDrawing } from './drawings/registry';

export { DEFAULT_PALETTE, PALETTES } from './contracts';
export {
  getChartColors,
  getActiveChartPalette,
  setActiveChartPalette,
} from './themeTokens';

export { formatPrice, formatVolume, formatChange } from './format';

export type { ChartType } from './series';
export { CHART_TYPE_VALUES, STARTER_INDICATOR_NAMES } from './toolConstants';
export type { StarterIndicatorName } from './toolConstants';
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
  trimResidentBars,
  trimResidentBarsAfterPrepend,
  trimResidentBarsWithIdentity,
  mergeCandlesPrependWithIdentity,
  RESIDENT_BAR_SOFT_MAX,
  EDGE_FETCH_BAR_COUNT,
  PREFETCH_START_INDEX_THRESHOLD,
} from './series';
export { clearHeikinAshiCache, HEIKIN_ASHI_CACHE_MAX_ENTRIES } from './heikinAshiCache';
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
export type {
  ApplyCandleStreamResult,
  EnsureCandlesCoverResult,
  TrimResidentBarsResult,
} from './series';
export type {
  CandleSeriesAdvanceKind,
  CandleSeriesIdentity,
} from './candleSeriesIdentity';
export {
  advanceCandleSeriesIdentity,
  boundsFromCandles,
  classifyAppendAdvanceKind,
  createCandleSeriesIdentity,
  resetCandleSeriesIdentitySeqForTests,
} from './candleSeriesIdentity';

export type { FetchIntervalResolution, ProviderInterval } from './interval';
export {
  intervalToMs,
  resolveFetchInterval,
  resampleCandlesTo2h,
  applyIntervalResample,
} from './interval';

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

export {
  CANDLE_TIMESTAMP_UNIT,
  SUPPORTED_INTERVALS,
  CHART_EVENT_OVERLAY_KINDS,
  type ChartHistoryExtent,
  type ChartHistoryExtentCompleteness,
} from './dataSource';
export { mergeChartHistoryExtent, visibleWindowMs } from './historyExtent';

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
export {
  boxFromPoints,
  stickEntryToLastPriceEnabled,
  applyStickEntryPrice,
  withStickEntryDisabled,
  entryValueChanged,
} from './drawings/positionGeometry';
export type { PositionBox } from './drawings/positionGeometry';
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

export type {
  ScriptDiagnostic,
  ScriptDiagnosticSeverity,
  ScriptCompileResult,
  ScriptExecutionResult,
  ScriptExecutionStatus,
  ScriptExecutionFingerprints,
  ScriptExecutionErrorCode,
  ScriptAlertDef,
  ScriptManifest,
  ScriptPlotDef,
  ScriptPlotKind,
  ScriptSeriesStyle,
  ScriptMarkerShape,
  ScriptMarkerLocation,
  ScriptColorRule,
  ScriptColorRuleWhen,
  ScriptInputSchema,
  ScriptIdentity,
  ScriptRuntimeBudgets,
  ScriptIndicatorInstanceRef,
  BuiltinIndicatorInstanceRef,
  IndicatorInstanceRef,
  ScriptIndicatorConfigExtension,
  NormalizedScriptCandle,
  ScriptSeriesRequest,
  ScriptSeriesContext,
  ScriptSeriesResolver,
  ScriptResolvedInputs,
  ScriptObjectKind,
  ScriptObjectDef,
  ScriptBoxObjectDef,
  ScriptLabelObjectDef,
  ScriptLevelObjectDef,
  ScriptLabelAlign,
} from './scriptContracts';

export {
  SCRIPT_LANGUAGE_VERSION,
  SCRIPT_SDK_VERSION,
  SCRIPT_RUNTIME_ABI,
  MAX_SCRIPT_ALERT_CONDITIONS,
  MAX_SCRIPT_ALERT_ID_LENGTH,
  MAX_SCRIPT_MARKERS_PER_SERIES,
  MAX_SCRIPT_BGCOLOR_SEGMENTS,
  MAX_SCRIPT_OBJECTS,
  MAX_SCRIPT_LABEL_TEXT_LENGTH,
  SCRIPT_CALCULATE_OBJECTS_KEY,
  DEFAULT_SCRIPT_RUNTIME_BUDGETS,
  normalizeScriptCandles,
  scriptPlotKindToPlotKind,
  manifestPlotToSeriesOutput,
  validateScriptManifest,
  validateScriptAlertSeries,
  validateScriptExecutionResult,
  validateScriptObjects,
  peelScriptCalculateOutput,
  normalizeScriptBoxBounds,
  validateParamDef,
  stableScriptInputsFingerprint,
  isLiteralScriptColor,
  formatScriptError,
  evaluateScriptColorRules,
  matchesScriptColorRule,
  countScriptMarkers,
  compactScriptBgcolorSegments,
  isTruthyScriptSignal,
  seriesOutputExcludesFromScale,
} from './scriptContracts';

export { drawScriptObjects } from './scriptObjectsDraw';
export type { ScriptObjectDrawEntry } from './scriptObjectsDraw';

export type { ScriptFixture, ScriptFixtureId } from './scriptFixtures';
export {
  RESERVED_SCRIPT_DEPTH_FIXTURE_SLOTS,
  SCRIPT_FIXTURES,
  getScriptFixture,
  makeSyntheticCandles,
} from './scriptFixtures';
export type { GoldenScriptFixtureId, ResolvedScriptFixtureSource } from './scriptFixtureCatalog';
export {
  GOLDEN_SCRIPT_FIXTURE_REVISION,
  GOLDEN_SCRIPT_FIXTURE_IDS,
  isGoldenScriptFixtureId,
  resolveScriptFixtureSource,
  scriptInstanceNameForFixture,
} from './scriptFixtureCatalog';
export {
  CANDLE_TRANSFER_ENCODING,
  CANDLE_TRANSFER_F64_STRIDE,
  packCandlesToTransferBuffer,
  unpackCandlesFromTransferBuffer,
} from './candleTransferBuffer';
export type { CandleTransferEncoding, PackedCandleTransferBuffer } from './candleTransferBuffer';

export {
  serializeScriptSeriesKey,
  isPrimaryScriptSeriesKey,
  dedupeScriptSeriesKeys,
  parseScriptSeriesKey,
  normalizeScriptSeriesSymbol,
  normalizeScriptSeriesInterval,
} from './scriptSeriesRequest';
export type { ScriptSeriesKeyContext } from './scriptSeriesRequest';
export { alignSeriesToPrimary } from './scriptSeriesAlign';
export { buildSecondarySeriesFingerprint } from './scriptSeriesFingerprint';
export type { ResolvedScriptSource, ScriptSourceResolver } from './scriptSourceResolver';
export { resolveScriptSource } from './scriptSourceResolver';
