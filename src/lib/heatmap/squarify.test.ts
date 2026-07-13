import { describe, expect, it } from "vitest";
import { DEFAULT_HEAT_MAP_CONFIG } from "./defaults";
import {
  buildLayoutNodes,
  layoutHeatMap,
  leafRects,
  totalLeafArea,
} from "./squarify";
import type { HeatMapItem } from "./types";

const sampleItems: HeatMapItem[] = [
  {
    id: "AAPL",
    label: "AAPL",
    sizeValue: 3_000_000_000_000,
    colorValue: 1.2,
    groupPath: ["Technology", "Consumer Electronics"],
  },
  {
    id: "MSFT",
    label: "MSFT",
    sizeValue: 2_800_000_000_000,
    colorValue: -0.4,
    groupPath: ["Technology", "Software"],
  },
  {
    id: "XOM",
    label: "XOM",
    sizeValue: 400_000_000_000,
    colorValue: -1.1,
    groupPath: ["Energy", "Oil & Gas"],
  },
];

describe("squarify", () => {
  it("builds flat nodes when groupBy is none", () => {
    const nodes = buildLayoutNodes(sampleItems, {
      ...DEFAULT_HEAT_MAP_CONFIG,
      groupBy: "none",
    });
    expect(nodes).toHaveLength(3);
    expect(nodes.every((node) => node.kind === "leaf")).toBe(true);
  });

  it("builds grouped nodes by sector", () => {
    const nodes = buildLayoutNodes(sampleItems, DEFAULT_HEAT_MAP_CONFIG);
    expect(nodes).toHaveLength(2);
    expect(nodes.map((node) => node.label).sort()).toEqual(["Energy", "Technology"]);
    expect(nodes.find((node) => node.label === "Technology")?.children).toHaveLength(2);
  });

  it("lays out leaf rects that fill most of the viewport", () => {
    const rects = layoutHeatMap(sampleItems, {
      ...DEFAULT_HEAT_MAP_CONFIG,
      groupBy: "none",
    }, 400, 300);
    const leaves = leafRects(rects);
    expect(leaves.length).toBe(3);
    const area = totalLeafArea(rects);
    expect(area).toBeGreaterThan(400 * 300 * 0.5);
  });

  it("gives larger market-cap symbols more area when grouped", () => {
    const rects = layoutHeatMap(sampleItems, DEFAULT_HEAT_MAP_CONFIG, 600, 400);
    const aapl = leafRects(rects).find((rect) => rect.id === "AAPL");
    const xom = leafRects(rects).find((rect) => rect.id === "XOM");
    expect(aapl).toBeTruthy();
    expect(xom).toBeTruthy();
    expect((aapl!.width * aapl!.height)).toBeGreaterThan(xom!.width * xom!.height);
  });

  it("linear scale produces stronger size contrast than log for market cap", () => {
    const linearConfig = {
      ...DEFAULT_HEAT_MAP_CONFIG,
      groupBy: "none" as const,
      sizeBy: { ...DEFAULT_HEAT_MAP_CONFIG.sizeBy, scale: "linear" as const },
    };
    const logConfig = {
      ...linearConfig,
      sizeBy: { ...linearConfig.sizeBy, scale: "log" as const },
    };

    const linearRects = layoutHeatMap(sampleItems, linearConfig, 600, 400);
    const logRects = layoutHeatMap(sampleItems, logConfig, 600, 400);

    const area = (rects: ReturnType<typeof layoutHeatMap>, id: string) => {
      const leaf = leafRects(rects).find((rect) => rect.id === id);
      expect(leaf).toBeTruthy();
      return leaf!.width * leaf!.height;
    };

    const linearRatio = area(linearRects, "AAPL") / area(linearRects, "XOM");
    const logRatio = area(logRects, "AAPL") / area(logRects, "XOM");

    expect(linearRatio).toBeGreaterThan(2);
    expect(linearRatio).toBeGreaterThan(logRatio);
  });

  it("uses equal weights when size metric is equal", () => {
    const config = {
      ...DEFAULT_HEAT_MAP_CONFIG,
      groupBy: "none" as const,
      sizeBy: { ...DEFAULT_HEAT_MAP_CONFIG.sizeBy, metric: "equal" as const },
    };
    const rects = layoutHeatMap(sampleItems, config, 300, 200);
    const leaves = leafRects(rects);
    const areas = leaves.map((rect) => rect.width * rect.height);
    const max = Math.max(...areas);
    const min = Math.min(...areas);
    expect(max / min).toBeLessThan(1.5);
  });
});
