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
        "CHART_EVENT_OVERLAY_KINDS",
        "CHART_STATE_VERSION",
        "CHART_TYPE_VALUES",
        "DEFAULT_RISK_ACCOUNT",
        "DEFAULT_R_MULTIPLES",
        "DEFAULT_SCRIPT_RUNTIME_BUDGETS",
        "DrawingRegistry",
        "DrawingStore",
        "EDGE_FETCH_BAR_COUNT",
        "GOLDEN_SCRIPT_FIXTURE_IDS",
        "GOLDEN_SCRIPT_FIXTURE_REVISION",
        "HISTORY_BACKGROUND_PREFETCH_PAGES",
        "HISTORY_FETCH_BAR_COUNT",
        "HISTORY_PREFETCH_DEBOUNCE_MS",
        "HISTORY_PREFETCH_LOOKAHEAD_RATIO",
        "HISTORY_PREFETCH_MIN_THRESHOLD",
        "HISTORY_URGENT_LOOKAHEAD_RATIO",
        "HISTORY_URGENT_MIN_THRESHOLD",
        "IndicatorRegistry",
        "MAX_SCRIPT_BGCOLOR_SEGMENTS",
        "MAX_SCRIPT_COLOR_RULES",
        "MAX_SCRIPT_MARKERS_PER_SERIES",
        "OPTION_SETUP_DISPLAY_NAMES",
        "OPTION_SETUP_TYPES",
        "PANE_SEPARATOR_HEIGHT",
        "PREFETCH_START_INDEX_THRESHOLD",
        "PRICE_PANE_KEY",
        "RESERVED_SCRIPT_DEPTH_FIXTURE_SLOTS",
        "RiskValidationError",
        "SCRIPT_FIXTURES",
        "SCRIPT_LANGUAGE_VERSION",
        "SCRIPT_RUNTIME_ABI",
        "SCRIPT_SDK_VERSION",
        "STARTER_INDICATOR_NAMES",
        "SUPPORTED_INTERVALS",
        "applyBoundaryResize",
        "applyCandleAppend",
        "applyCandleReplaceLatest",
        "applyCandleSnapshot",
        "applyCandleStreamEvent",
        "applyIntervalResample",
        "applyStickEntryPrice",
        "applyVisibleSlice",
        "boxFromPoints",
        "buildDefaultTargets",
        "classifyUsEquitySession",
        "compactScriptBgcolorSegments",
        "computePaneBoundaries",
        "computePrefetchThreshold",
        "computeRiskMetrics",
        "computeUrgentThreshold",
        "countScriptMarkers",
        "createDefaultChartState",
        "createInitialLayout",
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
        "formatPrice",
        "formatRiskSummary",
        "formatScriptError",
        "formatTargetLabel",
        "formatVolume",
        "getAllDrawings",
        "getAllIndicators",
        "getCatalog",
        "getCatalogEntry",
        "getChartColors",
        "getDrawing",
        "getIndicator",
        "getScriptFixture",
        "hitTestAll",
        "hitTestControlPoint",
        "inferDirection",
        "intervalToMs",
        "isExtendedSessionBar",
        "isGoldenScriptFixtureId",
        "isLiteralScriptColor",
        "isOptionTradeSetup",
        "isTruthyScriptSignal",
        "isUrgentPrefetch",
        "makeSyntheticCandles",
        "manifestPlotToSeriesOutput",
        "matchesScriptColorRule",
        "mergeCandlesByTimestamp",
        "mergeCandlesPrepend",
        "migrateChartState",
        "normalizeScriptCandles",
        "normalizeTargetAllocations",
        "parseProviderMarketState",
        "parseTradeSetup",
        "plotYForPrice",
        "pointsEqual",
        "readTradeSetupFromDrawing",
        "resampleCandlesTo2h",
        "resolveFetchInterval",
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
        "seriesOutputExcludesFromScale",
        "sessionPriceLabelPrefix",
        "sessionStatusLabel",
        "shouldBackgroundPrefetch",
        "shouldPrefetchEdge",
        "shouldPrefetchHistory",
        "stableScriptInputsFingerprint",
        "stickEntryToLastPriceEnabled",
        "targetPriceForRMultiple",
        "toHeikinAshi",
        "tradeSetupFromPoints",
        "tradeSetupSchema",
        "transformCandlesForChartType",
        "validateChartState",
        "validateParamDef",
        "validateScriptExecutionResult",
        "validateScriptManifest",
        "validateTradeSetup",
        "withStickEntryDisabled",
      ]
    `);
  });

  it("@edge/chart-core/contracts exports", () => {
    expect(exportNames(chartContracts)).toMatchInlineSnapshot(`
      [
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
