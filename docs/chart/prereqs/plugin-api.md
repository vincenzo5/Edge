# Plugin API Surface — Minimal Interfaces

## IndicatorPlugin

```ts
export type IndicatorCategory = 'Trend' | 'Momentum' | 'Volume' | 'Volatility' | 'Other';

export type ParamDef = {
  label: string;
  default: number;
  min?: number;
  max?: number;
  step?: number;
};

export interface IndicatorPlugin {
  name: string;
  category: IndicatorCategory;
  description: string;
  pane: 'main' | 'sub';
  defaultParams?: Record<string, number>;
  paramSchema?: Record<string, ParamDef>;
  compute?: (candles: Candle[], params?: Record<string, number>) => Record<string, number[]>;
  outputs?: SeriesOutput[];
  draw: (
    ctx: CanvasRenderingContext2D,
    candles: Candle[],
    viewport: VisibleRange,
    theme: Theme,
    params?: Record<string, number>
  ) => void;
  valueAt?: (index: number, candles: Candle[], params?: Record<string, number>) => number | null;
  legendAt?: (
    index: number,
    candles: Candle[],
    params?: Record<string, number>,
    theme?: Theme,
  ) => LegendValueEntry[] | null;
  valueRangeForViewport?: (
    candles: Candle[],
    vp: VisibleRange,
    params?: Record<string, number>
  ) => { min: number; max: number } | null;
}
```

**Canonical pattern:** `compute` → `outputs` → `draw`. MACD is the reference implementation.

Catalog metadata lives in `src/lib/chart/indicators/catalog.ts`. Plugins register in `registry.ts`. The picker reads `getCatalog()` which merges catalog entries with registered plugins.

All 27 catalog indicators must eventually be implemented as plugins. Unimplemented entries show as disabled in the picker. V1 ships six named plugins (MA, EMA, BOLL, MACD, RSI, VOL).

## IndicatorConfig (instance)

```ts
export type IndicatorConfig = {
  id: string;
  name: string;
  pane: 'main' | 'sub';
  params?: Record<string, number>;
  visible?: boolean;
};
```

Use `createIndicatorInstance(name, pane)` in `chartConfig.ts` when adding from the picker.

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

## Registry Usage

- `registerIndicator(plugin)` — `src/lib/chart/indicators/registry.ts`
- `getCatalog()` / `getCatalogEntry(name)` — merged catalog + implementation status
- `IndicatorRegistry.get(name)` — render path lookup via `pluginHost.ts`
- `DrawingRegistry.register(plugin)` — drawings registry

This API allows future extension without touching core render loop.
