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
        "DEFAULT_RISK_ACCOUNT",
        "DEFAULT_R_MULTIPLES",
        "DrawingRegistry",
        "DrawingStore",
        "EDGE_FETCH_BAR_COUNT",
        "HISTORY_BACKGROUND_PREFETCH_PAGES",
        "HISTORY_FETCH_BAR_COUNT",
        "HISTORY_PREFETCH_DEBOUNCE_MS",
        "HISTORY_PREFETCH_LOOKAHEAD_RATIO",
        "HISTORY_PREFETCH_MIN_THRESHOLD",
        "HISTORY_URGENT_LOOKAHEAD_RATIO",
        "HISTORY_URGENT_MIN_THRESHOLD",
        "IndicatorRegistry",
        "OPTION_SETUP_DISPLAY_NAMES",
        "OPTION_SETUP_TYPES",
        "PANE_SEPARATOR_HEIGHT",
        "PREFETCH_START_INDEX_THRESHOLD",
        "PRICE_PANE_KEY",
        "RiskValidationError",
        "SUPPORTED_INTERVALS",
        "applyBoundaryResize",
        "applyCandleAppend",
        "applyCandleReplaceLatest",
        "applyCandleSnapshot",
        "applyCandleStreamEvent",
        "applyStickEntryPrice",
        "applyVisibleSlice",
        "boxFromPoints",
        "buildDefaultTargets",
        "classifyUsEquitySession",
        "computePaneBoundaries",
        "computePrefetchThreshold",
        "computeRiskMetrics",
        "computeUrgentThreshold",
        "createDefaultChartState",
        "createInitialLayout",
        "drawingAliases",
        "ensureCandlesCover",
        "entryValueChanged",
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
        "formatTargetLabel",
        "formatVolume",
        "getAllDrawings",
        "getAllIndicators",
        "getCatalog",
        "getCatalogEntry",
        "getChartColors",
        "getDrawing",
        "getIndicator",
        "hitTestAll",
        "hitTestControlPoint",
        "inferDirection",
        "isExtendedSessionBar",
        "isOptionTradeSetup",
        "isUrgentPrefetch",
        "mergeCandlesByTimestamp",
        "mergeCandlesPrepend",
        "migrateChartState",
        "normalizeTargetAllocations",
        "parseProviderMarketState",
        "parseTradeSetup",
        "plotYForPrice",
        "pointsEqual",
        "readTradeSetupFromDrawing",
        "resolveMarketSession",
        "resolvePaneLabel",
        "restoreAll",
        "restoreChartState",
        "riskComputedPayload",
        "serializeAll",
        "serializeChartState",
        "sessionPriceLabelPrefix",
        "sessionStatusLabel",
        "shouldBackgroundPrefetch",
        "shouldPrefetchEdge",
        "shouldPrefetchHistory",
        "stickEntryToLastPriceEnabled",
        "targetPriceForRMultiple",
        "toHeikinAshi",
        "tradeSetupFromPoints",
        "tradeSetupSchema",
        "transformCandlesForChartType",
        "validateChartState",
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
