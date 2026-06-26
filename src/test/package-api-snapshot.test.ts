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
        "DrawingRegistry",
        "DrawingStore",
        "EDGE_FETCH_BAR_COUNT",
        "IndicatorRegistry",
        "PANE_SEPARATOR_HEIGHT",
        "PREFETCH_START_INDEX_THRESHOLD",
        "PRICE_PANE_KEY",
        "SUPPORTED_INTERVALS",
        "applyBoundaryResize",
        "applyCandleAppend",
        "applyCandleReplaceLatest",
        "applyCandleSnapshot",
        "applyCandleStreamEvent",
        "applyVisibleSlice",
        "computePaneBoundaries",
        "createDefaultChartState",
        "createInitialLayout",
        "drawingAliases",
        "ensureCandlesCover",
        "formatChange",
        "formatPrice",
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
        "mergeCandlesByTimestamp",
        "mergeCandlesPrepend",
        "migrateChartState",
        "pointsEqual",
        "resolvePaneLabel",
        "restoreAll",
        "restoreChartState",
        "serializeAll",
        "serializeChartState",
        "shouldPrefetchEdge",
        "toHeikinAshi",
        "transformCandlesForChartType",
        "validateChartState",
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
