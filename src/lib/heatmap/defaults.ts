import type { HeatMapConfig } from "./types";

export const DEFAULT_HEAT_MAP_CONFIG: HeatMapConfig = {
  sizeBy: {
    metric: "marketCap",
    scale: "linear",
    missing: "floor",
  },
  colorBy: {
    metric: "changePercent",
    scale: {
      kind: "diverging",
      domain: "fixed",
      min: -3,
      mid: 0,
      max: 3,
    },
    missing: "neutral",
  },
  groupBy: "sector",
};

export const DEFAULT_HEAT_MAP_LABEL_THRESHOLDS = {
  showSymbolMinPx: 40,
  showValueMinPx: 64,
} as const;
