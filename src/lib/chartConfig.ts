import type { Range } from "./yahoo";
import type { Interval } from "./chart/contracts";
import type { IndicatorConfig, SerializedDrawing } from "./chart/contracts";
import type { ChartSettings } from "./chart/chartSettings";
import {
  DEFAULT_CHART_SETTINGS,
  mergeChartSettings,
  migrateChartSettings,
  patchChartSettings,
  serializeChartSettings,
} from "./chart/chartSettings";

export type { Range, Interval };
export type { IndicatorConfig, SerializedDrawing, DrawingStyles, TrackedOverlay, LineStyleOverride } from "./chart/contracts";
export type {
  ChartSettings,
  GroupedChartSettings,
  RequiredChartSettings,
  CrosshairMode,
  PriceScaleType,
  SymbolPriceLabelMode,
  IndicatorPriceLabelMode,
  DrawingPriceLabelMode,
  PriceScalePlacement,
  StatusLineTitleMode,
  ChartLineStyle,
  GridLineMode,
  ButtonVisibility,
  PricePrecision,
} from "./chart/chartSettings";
export {
  DEFAULT_CHART_SETTINGS,
  mergeChartSettings,
  migrateChartSettings,
  patchChartSettings,
  serializeChartSettings,
};
import { defaultInputsFromSchema } from "./chart/indicatorInputs";
import { getIndicator } from "./chart/indicators/registry";

export type ChartType =
  | "candle_solid"
  | "candle_stroke"
  | "ohlc"
  | "area"
  | "heikin_ashi";

export type Theme = "light" | "dark";

export const THEMES = ["light", "dark"] as const satisfies readonly Theme[];

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

import type { LayoutTemplateId } from "./chart/layoutTemplates";
import {
  cellCountForLayout,
  DEFAULT_LAYOUT_ID,
  migrateLegacyGridMode,
  normalizeLayoutId,
} from "./chart/layoutTemplates";

/** @deprecated Use LayoutTemplateId from layoutTemplates. */
export type GridMode = LayoutTemplateId;

export type { LayoutTemplateId };
export {
  DEFAULT_LAYOUT_ID,
  LAYOUT_MENU_ROWS,
  LAYOUT_TEMPLATES,
  LAYOUT_TEMPLATE_IDS,
  cellCountForLayout,
  getLayoutTemplate,
  isLayoutTemplateId,
  migrateLegacyGridMode,
  normalizeLayoutId,
  resolveLayoutIdForSnapshot,
  templatesForPaneCount,
} from "./chart/layoutTemplates";

/** Sentinel key representing the price (main candle) pane in paneOrder / collapsedPanes / maximizedPane. */
export const PRICE_PANE_KEY = "price";

export type OverlayMeta = {
  id: string;
  name: string;
  label: string;
  visible: boolean;
  locked: boolean;
  zLevel: number;
};

export type ToolbarPrefs = {
  /** Last-selected tool per flyout group id (lines, shapes, annotation). */
  groupSelections?: Record<string, string>;
  /** Stay in active tool after placing a drawing. Default false (TV parity). */
  keepDrawing?: boolean;
  /** Snap drawing points to OHLC. */
  magnet?: boolean;
};

export const DEFAULT_TOOLBAR_PREFS: ToolbarPrefs = {
  keepDrawing: false,
  magnet: false,
};

/** Right sidebar panel identifiers — extend as new panels ship. */
export type SidebarPanelId =
  | "object-tree"
  | "watchlist"
  | "account"
  | "settings"
  | "options"
  | "screener"
  | "trade"
  | "patterns";

/** Legacy persisted panel ids migrated on load. */
export type LegacySidebarPanelId = SidebarPanelId | "risk";

export type PanelPresentation = "docked" | "floating";

export type FloatingPanelGeometry = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SidebarPrefs = {
  activePanel: SidebarPanelId | null;
  /** User-resized sidebar width in pixels (shared across all panels). */
  width?: number;
  /** Per-panel docked vs floating presentation; missing entry defaults to docked. */
  presentation?: Partial<Record<SidebarPanelId, PanelPresentation>>;
  /** Persisted position/size for floating panels. */
  floatingGeometry?: Partial<Record<SidebarPanelId, FloatingPanelGeometry>>;
};

export const DEFAULT_SIDEBAR_PREFS: SidebarPrefs = {
  activePanel: null,
};

export type CellConfig = {
  symbol: string;
  symbolName?: string;
  exchange?: string;
  range: Range;
  interval: Interval;
  /** Active bottom-bar preset, or null when deselected (default landing view). */
  rangePreset?: Range | null;
  chartType: ChartType;
  indicators: IndicatorConfig[];
  drawings: SerializedDrawing[];
  /** Ordered list of pane keys (IndicatorKey | PRICE_PANE_KEY) determining visual stacking and creation order. */
  paneOrder?: string[];
  /** Keys of panes that are currently collapsed (height 0 but header controls visible). */
  collapsedPanes?: string[];
  /** Key of the pane currently maximized (others collapsed). */
  maximizedPane?: string | null;
  /** User-resized sub-pane heights keyed by indicator key (price pane height is derived). */
  paneHeights?: Record<string, number>;
  /** Chart display settings (status line, scales, canvas). */
  chartSettings?: ChartSettings;
  /** When false, main candle series is hidden on the price pane. Default visible. */
  mainSeriesVisible?: boolean;
};

export type LayoutSyncPrefs = {
  /** Propagate symbol / symbolName / exchange to peer cells. */
  linkSymbol: boolean;
  /** Propagate range / interval / rangePreset to peer cells. */
  linkInterval: boolean;
  /** Broadcast crosshair position across visible cells. */
  linkCrosshair: boolean;
  /** Propagate drawings across linked layout cells with shared IDs. */
  linkDrawings: boolean;
};

export type ChartLayout = {
  version: 1;
  layoutId: LayoutTemplateId;
  /** @deprecated Use layoutId. Kept for migration only. */
  gridMode?: GridMode;
  /** @deprecated Use linkSymbol / linkInterval / linkCrosshair. Kept for migration only. */
  linked?: boolean;
  linkSymbol: boolean;
  linkInterval: boolean;
  linkCrosshair: boolean;
  linkDrawings: boolean;
  /** Index of the chart cell that receives drawing tools and focus ring. */
  activeCellIndex: number;
  theme: Theme;
  /** Drawing toolbar preferences (group selections, magnet, keep-drawing). */
  toolbarPrefs?: ToolbarPrefs;
  /** Right sidebar panel state. */
  sidebar?: SidebarPrefs;
  cells: CellConfig[];
};

/** Symbol fields propagated when linkSymbol is enabled. */
export type LinkSymbolFields = Pick<
  CellConfig,
  "symbol" | "symbolName" | "exchange"
>;

/** Range/interval fields propagated when linkInterval is enabled. */
export type LinkIntervalFields = Pick<
  CellConfig,
  "range" | "interval" | "rangePreset"
>;

/** Drawings propagated when linkDrawings is enabled. */
export type LinkDrawingFields = Pick<CellConfig, "drawings">;

/** @deprecated Use pickLinkSymbolFields + pickLinkIntervalFields. */
export type LinkFields = LinkSymbolFields & LinkIntervalFields;

export function pickLinkSymbolFields(cell: CellConfig): LinkSymbolFields {
  return {
    symbol: cell.symbol,
    symbolName: cell.symbolName,
    exchange: cell.exchange,
  };
}

export function pickLinkIntervalFields(cell: CellConfig): LinkIntervalFields {
  return {
    range: cell.range,
    interval: cell.interval,
    rangePreset: cell.rangePreset ?? null,
  };
}

export function pickLinkDrawingFields(cell: CellConfig): LinkDrawingFields {
  return {
    drawings: structuredClone(cell.drawings),
  };
}

/** @deprecated Use pickLinkSymbolFields + pickLinkIntervalFields. */
export function pickLinkFields(cell: CellConfig): LinkFields {
  return {
    ...pickLinkSymbolFields(cell),
    ...pickLinkIntervalFields(cell),
  };
}

export const DEFAULT_LAYOUT_SYNC: LayoutSyncPrefs = {
  linkSymbol: false,
  linkInterval: false,
  linkCrosshair: false,
  linkDrawings: false,
};

export function migrateLayoutSync(
  layout: Partial<ChartLayout> & Pick<ChartLayout, "version" | "cells">,
): LayoutSyncPrefs {
  if (
    typeof layout.linkSymbol === "boolean" ||
    typeof layout.linkInterval === "boolean" ||
    typeof layout.linkCrosshair === "boolean" ||
    typeof layout.linkDrawings === "boolean"
  ) {
    return {
      linkSymbol: layout.linkSymbol ?? false,
      linkInterval: layout.linkInterval ?? false,
      linkCrosshair: layout.linkCrosshair ?? false,
      linkDrawings: layout.linkDrawings ?? false,
    };
  }
  const legacyLinked = layout.linked ?? false;
  return {
    linkSymbol: legacyLinked,
    linkInterval: legacyLinked,
    linkCrosshair: legacyLinked,
    linkDrawings: false,
  };
}

export function migrateChartLayout(
  layout: Partial<ChartLayout> & Pick<ChartLayout, "version" | "cells">,
): ChartLayout {
  const record = layout as Record<string, unknown>;
  const layoutId = normalizeLayoutId(record);
  const sync = migrateLayoutSync(layout);
  return {
    ...DEFAULT_LAYOUT,
    ...layout,
    ...sync,
    layoutId,
    gridMode: undefined,
  };
}

export function applyLinkPropagation(
  layout: ChartLayout,
  index: number,
  next: CellConfig,
): ChartLayout {
  const count = cellCountFor(layout.layoutId);
  const cells = [...layout.cells];
  cells[index] = next;

  const symbolFields = layout.linkSymbol ? pickLinkSymbolFields(next) : null;
  const intervalFields = layout.linkInterval ? pickLinkIntervalFields(next) : null;
  const drawingFields = layout.linkDrawings ? pickLinkDrawingFields(next) : null;

  if (!symbolFields && !intervalFields && !drawingFields) {
    return { ...layout, cells };
  }

  for (let i = 0; i < count; i++) {
    if (i === index) continue;
    cells[i] = {
      ...cells[i],
      ...(symbolFields ?? {}),
      ...(intervalFields ?? {}),
      ...(drawingFields ?? {}),
    };
  }

  return { ...layout, cells };
}

export const DEFAULT_CHART_RANGE = { range: "1y" as Range, interval: "1d" as Interval };

export const DEFAULT_CELL: CellConfig = {
  symbol: "AAPL",
  ...DEFAULT_CHART_RANGE,
  rangePreset: null,
  chartType: "candle_solid",
  indicators: [],
  drawings: [],
  paneOrder: undefined,
  collapsedPanes: undefined,
  maximizedPane: null,
  paneHeights: undefined,
};

export const DEFAULT_LAYOUT: ChartLayout = {
  version: 1,
  layoutId: DEFAULT_LAYOUT_ID,
  ...DEFAULT_LAYOUT_SYNC,
  activeCellIndex: 0,
  theme: "dark",
  sidebar: DEFAULT_SIDEBAR_PREFS,
  cells: [DEFAULT_CELL],
};

export function coerceTheme(
  value: unknown,
  fallback: Theme = DEFAULT_LAYOUT.theme,
): Theme {
  return isTheme(value) ? value : fallback;
}

/** Toggle light/dark on `<html>` without clobbering unrelated root classes. */
export function applyThemeToRoot(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(theme);
}

export const RANGES: Array<{ label: string; value: Range }> = [
  { label: "1D", value: "1d" },
  { label: "5D", value: "5d" },
  { label: "1M", value: "1mo" },
  { label: "3M", value: "3mo" },
  { label: "6M", value: "6mo" },
  { label: "YTD", value: "ytd" },
  { label: "1Y", value: "1y" },
  { label: "5Y", value: "5y" },
  { label: "MAX", value: "max" },
];

export const INTERVALS: Array<{ label: string; value: Interval }> = [
  { label: "1m", value: "1m" },
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "30m", value: "30m" },
  { label: "1h", value: "1h" },
  { label: "2h", value: "2h" },
  { label: "1D", value: "1d" },
  { label: "1W", value: "1wk" },
  { label: "1M", value: "1mo" },
];

export const CHART_TYPES: Array<{ label: string; value: ChartType }> = [
  { label: "Candles", value: "candle_solid" },
  { label: "Candles (hollow)", value: "candle_stroke" },
  { label: "OHLC", value: "ohlc" },
  { label: "Area", value: "area" },
  { label: "Heikin Ashi", value: "heikin_ashi" },
];

export function cellCountFor(layoutId: LayoutTemplateId | string): number {
  return cellCountForLayout(layoutId);
}

/** @deprecated Use LAYOUT_TEMPLATES / templatesForPaneCount. */
export const GRID_MODES = [
  { label: "1", value: "n1" as LayoutTemplateId },
  { label: "2 cols", value: "n2-cols" as LayoutTemplateId },
  { label: "2 rows", value: "n2-rows" as LayoutTemplateId },
  { label: "3 rows", value: "n3-rows" as LayoutTemplateId },
  { label: "2x2", value: "n4-grid-2x2" as LayoutTemplateId },
] as const;

export function generateIndicatorId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `ind_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function generateDrawingId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `d_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function legacyIndicatorKey(name: string, pane: "main" | "sub"): string {
  return `${name}::${pane}`;
}

export function createIndicatorInstance(
  name: string,
  pane: "main" | "sub",
): IndicatorConfig {
  const plugin = getIndicator(name);
  const inputs = plugin ? defaultInputsFromSchema(plugin) : undefined;
  return {
    id: generateIndicatorId(),
    name,
    pane,
    inputs,
    visible: true,
  };
}

export function migrateCellIndicators(cell: CellConfig): CellConfig {
  const keyRemap = new Map<string, string>();

  const indicators: IndicatorConfig[] = cell.indicators.map((ind) => {
    const existing = ind as IndicatorConfig & { id?: string };
    const id = existing.id ?? generateIndicatorId();
    keyRemap.set(legacyIndicatorKey(ind.name, ind.pane), id);
    if (ind.id) keyRemap.set(ind.id, id);
    return {
      ...ind,
      id,
      visible: ind.visible ?? true,
    };
  });

  const remapKey = (key: string) => {
    if (keyRemap.has(key)) return keyRemap.get(key)!;
    if (key.includes("::")) {
      for (const ind of indicators) {
        if (legacyIndicatorKey(ind.name, ind.pane) === key) return ind.id;
      }
    }
    return key;
  };

  return {
    ...cell,
    indicators,
    paneOrder: cell.paneOrder?.map(remapKey),
    collapsedPanes: cell.collapsedPanes?.map(remapKey),
    maximizedPane:
      cell.maximizedPane != null ? remapKey(cell.maximizedPane) : cell.maximizedPane,
    paneHeights: cell.paneHeights
      ? Object.fromEntries(
          Object.entries(cell.paneHeights).map(([k, v]) => [remapKey(k), v]),
        )
      : undefined,
  };
}

function remapCellPaneKeys(
  cell: Pick<
    CellConfig,
    "paneOrder" | "collapsedPanes" | "maximizedPane" | "paneHeights"
  >,
  remapKey: (key: string) => string,
): Pick<
  CellConfig,
  "paneOrder" | "collapsedPanes" | "maximizedPane" | "paneHeights"
> {
  return {
    paneOrder: cell.paneOrder?.map(remapKey),
    collapsedPanes: cell.collapsedPanes?.map(remapKey),
    maximizedPane:
      cell.maximizedPane != null ? remapKey(cell.maximizedPane) : cell.maximizedPane,
    paneHeights: cell.paneHeights
      ? Object.fromEntries(
          Object.entries(cell.paneHeights).map(([k, v]) => [remapKey(k), v]),
        )
      : undefined,
  };
}

function cloneCellIndicatorsWithNewIds(
  source: CellConfig,
): Pick<CellConfig, "indicators"> &
  Pick<CellConfig, "paneOrder" | "collapsedPanes" | "maximizedPane" | "paneHeights"> {
  const keyRemap = new Map<string, string>();

  const indicators: IndicatorConfig[] = source.indicators.map((ind) => {
    const id = generateIndicatorId();
    keyRemap.set(legacyIndicatorKey(ind.name, ind.pane), id);
    if (ind.id) keyRemap.set(ind.id, id);
    return {
      ...ind,
      id,
      inputs: ind.inputs ? structuredClone(ind.inputs) : ind.inputs,
      visible: ind.visible ?? true,
    };
  });

  const remapKey = (key: string) => {
    if (keyRemap.has(key)) return keyRemap.get(key)!;
    if (key.includes("::")) {
      for (const ind of indicators) {
        if (legacyIndicatorKey(ind.name, ind.pane) === key) return ind.id;
      }
    }
    return key;
  };

  return {
    indicators,
    ...remapCellPaneKeys(source, remapKey),
  };
}

function cloneCellDrawings(
  source: CellConfig,
  sharedDrawingIds: boolean,
): SerializedDrawing[] {
  if (sharedDrawingIds) {
    return structuredClone(source.drawings);
  }
  return source.drawings.map((drawing) => ({
    ...structuredClone(drawing),
    id: generateDrawingId(),
    points: drawing.points.map((p) => ({ ...p })),
    styles: drawing.styles ? { ...drawing.styles } : undefined,
  }));
}

/** Deep copy of one chart cell for a new layout pane. */
export function cloneCellConfig(
  source: CellConfig,
  opts?: { sharedDrawingIds?: boolean },
): CellConfig {
  const sharedDrawingIds = opts?.sharedDrawingIds ?? false;
  const { indicators, paneOrder, collapsedPanes, maximizedPane, paneHeights } =
    cloneCellIndicatorsWithNewIds(source);

  return {
    symbol: source.symbol,
    symbolName: source.symbolName,
    exchange: source.exchange,
    range: source.range,
    interval: source.interval,
    rangePreset: source.rangePreset ?? null,
    chartType: source.chartType,
    indicators,
    drawings: cloneCellDrawings(source, sharedDrawingIds),
    paneOrder,
    collapsedPanes,
    maximizedPane,
    paneHeights,
    chartSettings: mergeChartSettings(source.chartSettings),
    mainSeriesVisible: source.mainSeriesVisible,
  };
}

/** Resize layout template: clone active cell into new panes; promote active when shrinking to single. */
export function applyLayoutTemplateChange(
  layout: ChartLayout,
  nextLayoutId: LayoutTemplateId,
): ChartLayout {
  if (layout.layoutId === nextLayoutId) return layout;

  const needed = cellCountFor(nextLayoutId);
  const activeIndex = layout.activeCellIndex ?? 0;
  const activeCell = layout.cells[activeIndex] ?? layout.cells[0] ?? DEFAULT_CELL;

  if (needed === 1) {
    return {
      ...layout,
      layoutId: nextLayoutId,
      cells: [activeCell],
      activeCellIndex: 0,
    };
  }

  const cells = [...layout.cells];
  while (cells.length < needed) {
    cells.push(
      cloneCellConfig(activeCell, { sharedDrawingIds: layout.linkDrawings }),
    );
  }
  const trimmed = cells.slice(0, needed);
  const maxIndex = Math.max(0, needed - 1);
  const nextActiveCellIndex = Math.min(activeIndex, maxIndex);

  return {
    ...layout,
    layoutId: nextLayoutId,
    cells: trimmed,
    activeCellIndex: nextActiveCellIndex,
  };
}
