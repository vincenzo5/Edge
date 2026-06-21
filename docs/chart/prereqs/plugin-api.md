# Plugin API Surface — Minimal Interfaces

## IndicatorPlugin
```ts
export interface IndicatorPlugin {
  name: string;
  pane: 'main' | 'sub';
  defaultParams?: Record<string, number>;
  draw: (
    ctx: CanvasRenderingContext2D,
    candles: Candle[],
    viewport: VisibleRange,
    theme: Theme,
    params?: Record<string, number>
  ) => void;
  // Optional for hit testing values on crosshair
  valueAt?: (index: number, candles: Candle[], params?: Record<string, number>) => number | null;
}
```

All 28 indicators from current INDICATORS list must be implemented as plugins and registered.

## DrawingPlugin
```ts
export interface DrawingPlugin {
  name: string; // e.g. 'trend_line'
  create: (startPoint: {x: number, y: number}, vp: VisibleRange) => SerializedDrawing;
  draw: (
    ctx: CanvasRenderingContext2D,
    drawing: SerializedDrawing,
    vp: VisibleRange,
    theme: Theme,
    selected: boolean
  ) => void;
  hitTest: (x: number, y: number, drawing: SerializedDrawing, vp: VisibleRange) => boolean; // 4px tol
  // For editing
  getControlPoints?: (drawing: SerializedDrawing, vp: VisibleRange) => Array<{x:number,y:number}>;
  updateFromControl?: (drawing: SerializedDrawing, cpIndex: number, newX: number, newY: number, vp: VisibleRange) => SerializedDrawing;
  serialize?: (d: SerializedDrawing) => SerializedDrawing;
}
```

Magnet mode: when creating, snap y to nearest candle price if within 5px.

## Registry Usage
- IndicatorRegistry.register(plugin)
- DrawingRegistry.register(plugin)
- pluginHost.getIndicatorsForPane(pane)
- pluginHost.hitTestDrawings(x, y) -> selected id

This API allows future extension without touching core render loop.