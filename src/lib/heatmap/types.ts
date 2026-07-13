export type HeatMapSizeMetric = "marketCap" | "volume" | "equal";

export type HeatMapColorMetric = "changePercent" | "volume" | "beta";

export type HeatMapGroupBy = "none" | "sector" | "industry";

export type HeatMapSizeScale = "linear" | "log";

export type HeatMapColorScaleKind = "diverging" | "sequential";

export type HeatMapColorDomainKind = "fixed" | "data" | "percentile";

export type HeatMapSizeConfig = {
  metric: HeatMapSizeMetric;
  scale: HeatMapSizeScale;
  missing: "drop" | "floor";
};

export type HeatMapColorScaleConfig = {
  kind: HeatMapColorScaleKind;
  domain: HeatMapColorDomainKind;
  min?: number;
  mid?: number;
  max?: number;
  lowPct?: number;
  highPct?: number;
};

export type HeatMapColorConfig = {
  metric: HeatMapColorMetric;
  scale: HeatMapColorScaleConfig;
  missing: "neutral" | "hide";
};

export type HeatMapConfig = {
  sizeBy: HeatMapSizeConfig;
  colorBy: HeatMapColorConfig;
  groupBy: HeatMapGroupBy;
};

export type HeatMapItem = {
  id: string;
  label: string;
  sizeValue: number | null;
  colorValue: number | null;
  groupPath?: string[];
  meta?: unknown;
};

export type HeatMapRect = {
  id: string;
  label: string;
  kind: "leaf" | "group";
  x: number;
  y: number;
  width: number;
  height: number;
  colorValue: number | null;
  item?: HeatMapItem;
};

export type HeatMapPalette = {
  positive: string;
  negative: string;
  neutral: string;
};

export type HeatMapLabelThresholds = {
  showSymbolMinPx: number;
  showValueMinPx: number;
};
