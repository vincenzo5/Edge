# Plugin API Surface — Minimal Interfaces

See [indicator-foundation-plan.md](../indicator-foundation-plan.md) for Tier 1 + Tier 2 architecture.

## IndicatorPlugin

```ts
export type InputValue = number | string | boolean;
export type ResolvedInputs = Record<string, InputValue>;

export type ParamDef =
  | { kind: 'number'; label: string; default: number; min?; max?; step? }
  | { kind: 'enum'; label: string; default: string; options: { value: string; label: string }[] }
  | { kind: 'boolean'; label: string; default: boolean }
  | { kind: 'source'; label: string; default: PriceSource };

export interface IndicatorPlugin {
  name: string;
  category: IndicatorCategory;
  description: string;
  pane: 'main' | 'sub';
  inputSchema?: Record<string, ParamDef>;
  defaultInputs?: Record<string, InputValue>;
  defaultStyles?: Record<string, LineStyleOverride>;
  compute?: (candles: Candle[], inputs: ResolvedInputs) => Record<string, number[]>;
  outputs?: SeriesOutput[]; // plot: 'line' | 'histogram' | 'hline' | 'columns'; fillBetween for bands
  draw?: (ctx, candles, vp, theme, inputs, options?) => void; // omit for declarative-only plugins
  valueAt?: (index, candles, inputs) => number | null;
  legendAt?: (index, candles, inputs, theme?) => LegendValueEntry[] | null;
  valueRangeForViewport?: (candles, vp, inputs) => { min; max } | null;
}
```

**Canonical pattern:** `resolveIndicatorInputs` → `compute` → `outputs` → `drawIndicator` (declarative `drawFromOutputs` when `draw` is omitted). MACD is the reference plugin. BOLL uses `fillBetween` for band fill.

Use `getInputSchema(plugin)` and `resolveIndicatorInputs(plugin, instance)` from `indicatorInputs.ts`.

## IndicatorConfig (instance)

```ts
export type IndicatorConfig = {
  id: string;
  name: string;
  pane: 'main' | 'sub';
  params?: Record<string, number>;   // legacy read fallback
  inputs?: Record<string, InputValue>;
  styles?: Record<string, LineStyleOverride>;
  visible?: boolean;
};
```

Use `createIndicatorInstance(name, pane)` in `chartConfig.ts` when adding from the picker (always creates a new id).

## DrawingPlugin

```ts
export interface DrawingPlugin {
  name: string; // e.g. 'trend_line'
  placement: 'one-point' | 'two-point' | 'multi-point';
  create: (start: DrawingPoint, vp: VisibleRange, candles: Candle[]) => SerializedDrawing;
  draw: (
    ctx: CanvasRenderingContext2D,
    drawing: SerializedDrawing,
    vp: VisibleRange,
    theme: Theme,
    selected: boolean,
    candles: Candle[],
    opts?: { preview?: boolean; showTimeAxis?: boolean }
  ) => void;
  hitTest: (plotX, plotY, drawing, vp, candles, showTimeAxis?) => boolean;
  getControlPoints?: (drawing, vp, candles, showTimeAxis?) => Array<{ x: number; y: number }>;
  updateFromControl?: (drawing, cpIndex, plotX, plotY, vp, candles, showTimeAxis?) => SerializedDrawing;
}
```

Magnet mode: when creating, snap y to nearest candle price if within 5px.

### DrawingStyles

Persisted on `SerializedDrawing.styles`. Resolved at draw time via `resolveDrawingStyles(drawing, theme, selected)` and applied with `strokeFromStyles` in each plugin's `draw`.

```ts
export type DrawingStyles = {
  lineColor?: string;
  lineWidth?: number;
  lineDash?: number[];
  fillColor?: string;
  fillOpacity?: number;
  extendLeft?: boolean;
  extendRight?: boolean;
  text?: string;
  fontSize?: number;
};
```

Defaults live in `drawingStyles.ts` (`defaultStylesForTool`, `mergeStyles`). Chart handle: `updateDrawingStyles(id, patch)` merges a partial style patch onto the selected drawing.

Context menu **Settings…** on overlays opens a minimal style editor (line color + width) in `ChartCell`.

## Registry Usage

- `registerIndicator(plugin)` — `src/lib/chart/indicators/registry.ts`
- `getCatalog()` / `getCatalogEntry(name)` — merged catalog + implementation status
- `IndicatorRegistry.get(name)` — render path lookup via `pluginHost.ts`
- `DrawingRegistry.register(plugin)` — drawings registry

This API allows future extension without touching core render loop.
