import { describe, expect, it } from "vitest";
import * as chartCore from "@edge/chart-core";
import * as chartContracts from "@edge/chart-core/contracts";
import * as chartFormat from "@edge/chart-core/format";
import * as chartIndicators from "@edge/chart-core/indicators";
import * as chartDrawings from "@edge/chart-core/drawings";
import * as chartPluginApi from "@edge/chart-core/plugin-api";
import * as chartDataSource from "@edge/chart-core/data-source";
import * as chartReact from "@edge/chart-react";
import * as aiToolsCore from "@edge/ai-tools-core";
import * as aiToolsChart from "@edge/ai-tools-chart";

function exportNames(mod: Record<string, unknown>): string[] {
  return Object.keys(mod)
    .filter((key) => key !== "default")
    .sort();
}

describe("package API snapshots", () => {
  it("@edge/chart-core main entrypoint exports", () => {
    expect(exportNames(chartCore)).toMatchInlineSnapshot(`
      [
        "ANNOTATION_KINDS",
        "ANNOTATION_KIND_FULL_LABELS",
        "ANNOTATION_KIND_LABELS",
        "CANDLE_TIMESTAMP_UNIT",
        "CANDLE_TRANSFER_ENCODING",
        "CANDLE_TRANSFER_F64_STRIDE",
        "CHART_EVENT_OVERLAY_KINDS",
        "CHART_STATE_VERSION",
        "CHART_TYPE_VALUES",
        "DEFAULT_PALETTE",
        "DEFAULT_POSITION_TARGET_R_MULTIPLE",
        "DEFAULT_RISK_ACCOUNT",
        "DEFAULT_R_MULTIPLES",
        "DEFAULT_SCRIPT_RUNTIME_BUDGETS",
        "DrawingRegistry",
        "DrawingStore",
        "EDGE_FETCH_BAR_COUNT",
        "GOLDEN_SCRIPT_FIXTURE_IDS",
        "GOLDEN_SCRIPT_FIXTURE_REVISION",
        "HEIKIN_ASHI_CACHE_MAX_ENTRIES",
        "HISTORY_BACKGROUND_PREFETCH_PAGES",
        "HISTORY_FETCH_BAR_COUNT",
        "HISTORY_PREFETCH_DEBOUNCE_MS",
        "HISTORY_PREFETCH_LOOKAHEAD_RATIO",
        "HISTORY_PREFETCH_MIN_THRESHOLD",
        "HISTORY_URGENT_LOOKAHEAD_RATIO",
        "HISTORY_URGENT_MIN_THRESHOLD",
        "IndicatorRegistry",
        "MAX_SCRIPT_ALERT_CONDITIONS",
        "MAX_SCRIPT_ALERT_ID_LENGTH",
        "MAX_SCRIPT_BGCOLOR_SEGMENTS",
        "MAX_SCRIPT_LABEL_TEXT_LENGTH",
        "MAX_SCRIPT_MARKERS_PER_SERIES",
        "MAX_SCRIPT_OBJECTS",
        "OPTION_SETUP_DISPLAY_NAMES",
        "OPTION_SETUP_TYPES",
        "PALETTES",
        "PANE_SEPARATOR_HEIGHT",
        "PREFETCH_START_INDEX_THRESHOLD",
        "PRICE_PANE_KEY",
        "RESERVED_SCRIPT_DEPTH_FIXTURE_SLOTS",
        "RESIDENT_BAR_SOFT_MAX",
        "RiskValidationError",
        "SCRIPT_CALCULATE_OBJECTS_KEY",
        "SCRIPT_FIXTURES",
        "SCRIPT_LANGUAGE_VERSION",
        "SCRIPT_RUNTIME_ABI",
        "SCRIPT_SDK_VERSION",
        "STARTER_INDICATOR_NAMES",
        "SUPPORTED_INTERVALS",
        "advanceCandleSeriesIdentity",
        "alignSeriesToPrimary",
        "applyBoundaryResize",
        "applyCandleAppend",
        "applyCandleReplaceLatest",
        "applyCandleSnapshot",
        "applyCandleStreamEvent",
        "applyIntervalResample",
        "applyPositionOrderLevels",
        "applyStickEntryPrice",
        "applyVisibleSlice",
        "boundsFromCandles",
        "boxFromPoints",
        "buildDefaultTargets",
        "buildSecondarySeriesFingerprint",
        "clampMinLevelDistance",
        "clampPositionPoints",
        "classifyAppendAdvanceKind",
        "classifyUsEquitySession",
        "clearHeikinAshiCache",
        "compactScriptBgcolorSegments",
        "computePaneBoundaries",
        "computePrefetchThreshold",
        "computeRiskMetrics",
        "computeUrgentThreshold",
        "consumePendingPositionPlacementOptions",
        "countScriptMarkers",
        "createCandleSeriesIdentity",
        "createDefaultChartState",
        "createInitialLayout",
        "dedupeCandlesByIntervalBucket",
        "dedupeScriptSeriesKeys",
        "directionFromPositionDrawing",
        "drawScriptObjects",
        "drawingAliases",
        "ensureCandlesCover",
        "entryValueChanged",
        "evaluateScriptColorRules",
        "formatChange",
        "formatOptionLeg",
        "formatOptionLegsSummary",
        "formatOptionLineLabel",
        "formatOptionRiskSummary",
        "formatOptionSetupExplanation",
        "formatOptionSetupHeader",
        "formatOptionTargetLabel",
        "formatPositionPrice",
        "formatPrice",
        "formatRiskSummary",
        "formatScriptError",
        "formatTargetLabel",
        "formatVolume",
        "getActiveChartPalette",
        "getAllDrawings",
        "getAllIndicators",
        "getCatalog",
        "getCatalogEntry",
        "getChartColors",
        "getDrawing",
        "getHitTestCandidates",
        "getIndicator",
        "getScriptFixture",
        "getVisibleDrawingsSorted",
        "hitTestAll",
        "hitTestControlPoint",
        "inferDirection",
        "inferPositionTickSize",
        "intervalToMs",
        "isExtendedSessionBar",
        "isGoldenScriptFixtureId",
        "isLiteralScriptColor",
        "isOptionTradeSetup",
        "isPrimaryScriptSeriesKey",
        "isTruthyScriptSignal",
        "isUrgentPrefetch",
        "levelsAfterEntryChange",
        "makeSyntheticCandles",
        "manifestPlotToSeriesOutput",
        "matchesScriptColorRule",
        "mergeCandlesByTimestamp",
        "mergeCandlesPrepend",
        "mergeCandlesPrependWithIdentity",
        "mergeChartHistoryExtent",
        "migrateChartState",
        "normalizeScriptBoxBounds",
        "normalizeScriptCandles",
        "normalizeScriptSeriesInterval",
        "normalizeScriptSeriesSymbol",
        "normalizeTargetAllocations",
        "packCandlesToTransferBuffer",
        "parseFiniteNumber",
        "parseProviderMarketState",
        "parseScriptSeriesKey",
        "parseTradeSetup",
        "peelScriptCalculateOutput",
        "plotYForPrice",
        "pointsEqual",
        "positionPointsFromClick",
        "priceFromEntryTicks",
        "readPositionSettingsDraft",
        "readTradeSetupFromDrawing",
        "resampleCandlesTo2h",
        "resetCandleSeriesIdentitySeqForTests",
        "resetPendingPositionPlacementOptions",
        "resolveFetchInterval",
        "resolveMagnetDragAxisForCp",
        "resolveMarketSession",
        "resolvePaneLabel",
        "resolveScriptBarColors",
        "resolveScriptFixtureSource",
        "resolveScriptSource",
        "restoreAll",
        "restoreChartState",
        "riskComputedPayload",
        "scriptInstanceNameForFixture",
        "scriptPlotKindToPlotKind",
        "serializeAll",
        "serializeChartState",
        "serializeScriptSeriesKey",
        "seriesOutputExcludesFromScale",
        "sessionPriceLabelPrefix",
        "sessionStatusLabel",
        "setActiveChartPalette",
        "setPendingPositionPlacementOptions",
        "shouldBackgroundPrefetch",
        "shouldPrefetchEdge",
        "shouldPrefetchHistory",
        "stableScriptInputsFingerprint",
        "stickEntryToLastPriceEnabled",
        "targetPriceForRMultiple",
        "ticksBetweenPrices",
        "toHeikinAshi",
        "tradeSetupFromPoints",
        "tradeSetupSchema",
        "transformCandlesForChartType",
        "trimResidentBars",
        "trimResidentBarsAfterPrepend",
        "trimResidentBarsWithIdentity",
        "unpackCandlesFromTransferBuffer",
        "validateChartState",
        "validateParamDef",
        "validateScriptAlertSeries",
        "validateScriptExecutionResult",
        "validateScriptManifest",
        "validateScriptObjects",
        "validateTradeSetup",
        "visibleWindowMs",
        "withStickEntryDisabled",
      ]
    `);
  });

  it("@edge/chart-core/contracts exports", () => {
    expect(exportNames(chartContracts)).toMatchInlineSnapshot(`
      [
        "DEFAULT_PALETTE",
        "PALETTES",
        "PRICE_PANE_KEY",
      ]
    `);
  });

  it("@edge/chart-core/format exports", () => {
    expect(exportNames(chartFormat)).toMatchInlineSnapshot(`
      [
        "formatChange",
        "formatPrice",
        "formatVolume",
      ]
    `);
  });

  it("@edge/chart-core/indicators exports", () => {
    expect(exportNames(chartIndicators)).toMatchInlineSnapshot(`
      [
        "INDICATOR_CATALOG",
        "INDICATOR_CATEGORIES",
        "getAllIndicators",
        "getCatalog",
        "getCatalogEntry",
        "getCatalogMeta",
        "getIndicator",
        "isIndicatorImplemented",
        "isMainPane",
        "registerIndicator",
      ]
    `);
  });

  it("@edge/chart-core/drawings exports", () => {
    expect(exportNames(chartDrawings)).toMatchInlineSnapshot(`
      [
        "getAllDrawings",
        "getDrawing",
        "registerDrawing",
      ]
    `);
  });

  it("@edge/chart-core/plugin-api has no runtime value exports", () => {
    expect(exportNames(chartPluginApi)).toEqual([]);
  });

  it("@edge/chart-core/data-source exports", () => {
    expect(exportNames(chartDataSource)).toMatchInlineSnapshot(`
      [
        "CANDLE_TIMESTAMP_UNIT",
        "CHART_EVENT_OVERLAY_KINDS",
        "SUPPORTED_INTERVALS",
      ]
    `);
  });

  it("@edge/chart-react exports", () => {
    expect(exportNames(chartReact)).toMatchInlineSnapshot(`
      [
        "EdgeChart",
        "chartStateToProps",
        "indicatorKey",
        "legacyParseIndicatorKey",
        "parseIndicatorKey",
        "propsToChartState",
      ]
    `);
  });

  it("@edge/ai-tools-core exports", () => {
    expect(exportNames(aiToolsCore)).toMatchInlineSnapshot(`
      [
        "ToolRegistry",
        "createInAppAiTools",
        "createToolRegistry",
        "defineTool",
        "executeTool",
        "executeTools",
        "formatZodErrors",
        "parseToolInput",
        "schemaToJsonSchema",
        "toToolDefinition",
      ]
    `);
  });

  it("@edge/ai-tools-chart exports", () => {
    expect(exportNames(aiToolsChart)).toMatchInlineSnapshot(`
      [
        "addIndicatorTool",
        "chartSessionTools",
        "clearDrawingsTool",
        "createChartSessionTools",
        "createInMemoryChartSession",
        "getChartStateTool",
        "listSupportedIndicatorsTool",
        "setChartTypeTool",
        "summarizeChartTool",
      ]
    `);
  });
});
