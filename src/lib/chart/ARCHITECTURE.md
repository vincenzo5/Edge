# Chart Engine Architecture

Custom Canvas 2D chart engine for Edge. Not TradingView, not klinecharts.

## Responsibility

Render OHLCV candles, indicators, and drawings; handle viewport pan/zoom/scale; serialize state to `CellConfig`.

## Component Flow

```
StockApp → ChartGrid → ChartCell → EdgeChart
                                      ├─ ChartCanvas (price + sub-panes)
                                      ├─ CrosshairOverlay
                                      ├─ ChartLegendBar / PaneLegendBar
                                      └─ DrawingStore (undo/redo)
```

Data path: `POST /api/candles` → `series.ts` → `@edge/chart-react` `EdgeChart` → `packages/chart-react/src/engine/canvas.tsx` render loop.

## Canonical vs compatibility paths

| Layer | Canonical location | App compatibility shim |
|-------|-------------------|------------------------|
| Pure chart logic | `packages/chart-core/src/` | `src/lib/chart/*` re-exports to `@edge/chart-core` |
| React chart runtime | `packages/chart-react/src/` | `src/lib/chart/{canvas,viewport,renderer,chartSettings,legend,goTo,...}.ts` re-export to `@edge/chart-react/engine/*` |
| App-only helpers | `src/lib/chart/{series,chartSnapshot,chartClipboard,stateMapping,...}.ts` | — |

Runtime chart rendering uses `@edge/chart-react` only. Do not edit duplicate implementations under `src/lib/chart/` — change package sources and keep shims as re-exports.

## Key Modules

| Module | Role |
|--------|------|
| `packages/chart-react/src/engine/canvas.tsx` | Render loop, pointer input, crosshair, pane registration |
| `packages/chart-react/src/engine/layers.ts` | Layer contract + registry; ordered draw phases with invalidation metadata |
| `packages/chart-react/src/engine/renderScheduler.ts` | RAF draw coalescing, invalidation reasons, phase timings |
| `packages/chart-react/src/engine/layerCache.ts` | Offscreen cache for static background layer |
| `packages/chart-react/src/engine/viewport.ts` | Pan, zoom, momentum, price/time scale modes |
| `packages/chart-react/src/engine/renderer.ts` | Grid, candles, axes, annotations draw primitives |
| `packages/chart-core/src/pluginHost.ts` | Indicator/drawing registries, hit-test, serialize/restore |
| `packages/chart-core/src/drawingStore.ts` | Command-based undo/redo (max 50 history) |
| `packages/chart-core/src/drawingController.ts` | Multi-point placement FSM |
| `packages/chart-core/src/drawingCoords.ts` | Plot ↔ data coordinate transforms |
| `packages/chart-react/src/engine/paneHandle.ts` | Imperative pane registration for multi-pane sync |
| `packages/chart-core/src/contracts.ts` | Core types: `Candle`, `SerializedDrawing`, `IndicatorConfig` |

## Plugin System

- **Indicators**: register in `indicators/registry.ts`; implement compute + draw via `plugin-api.ts`.
- **Drawings**: register in `drawings/registry.ts`; toolbar names aliased in `pluginHost.ts`.
- New plugins MUST follow existing patterns (`ma.ts`, `trend_line.ts`).

## Invariants

- Viewport updates are imperative — no React state on every wheel tick.
- Time window is shared across panes; price scale is per-pane.
- Price-axis labels and horizontal grid lines are generated from the same screen-space-aware anchored "nice tick" coordinates so vertical panning translates labels instead of recomputing arbitrary decimals.
- Axis drags use explicit gesture intent: price/time axes start scale gestures, and may convert to body pan only within the same pointer drag.
- Drawings mutate only through `DrawingStore` commands (add/remove/updatePoints/updateMeta/reorderZ).
- Serialized drawings persist in `CellConfig.drawings` via debounced save (500 ms).
- Hit-test respects z-order, visibility, and lock state.
- Pane routing: drawings have `paneId` (default `'price'`); sub-pane tools use pane-aware coords.

## Renderer Layers

Package path: `packages/chart-react/src/engine/`.

The chart pane draw loop is split into ordered layers registered in `LayerRegistry`:

| Layer | z | Backend | Draw primitives |
|-------|---|---------|-----------------|
| `background` | 0 | canvas | `drawPlotBackground` via `BackgroundLayerCache` |
| `grid` | 10 | canvas | `drawGrid` |
| `candles` | 20 | canvas / webgl | `drawCandles` or WebGL OHLC blit; event markers + reference lines (Canvas) |
| `indicators` | 30 | canvas | indicator plugin `draw()` |
| `drawings` | 40 | canvas | drawing plugin `draw()`, annotation badges, control points |
| `axes` | 50 | canvas | `drawAxes`, price-axis annotations |

Crosshair rendering stays in the separate `CrosshairOverlay.tsx` DOM/canvas overlay — not part of the pane layer stack.

Each layer declares `invalidatingReasons` (`data`, `viewport`, `size`, `theme`, `settings`, `drawings`, `selection`, `crosshair`). `RenderScheduler` coalesces reasons per frame; `canvas.tsx` builds a `LayerDrawState` and iterates `defaultLayerRegistry.getOrderedLayers()`.

Cache reuse helpers (`canReuseBackgroundCache`, `canReuseSeriesCache`) derive from shared invalidation sets exported by `renderScheduler.ts` and mirrored on layer metadata in `layers.ts`.

Future WebGL backends plug in behind the same `ChartLayer` contract by registering alternate implementations for heavy series layers (`candles`, `indicators`) while keeping drawings, labels, and menus on Canvas/DOM.

### WebGL Candle Backend (Stage 5)

Package path: `packages/chart-react/src/engine/webgl/`.

- **Scope:** Main-pane OHLC geometry only (`candle_solid`, `heikin_ashi`, `ohlc`, `area`). Event markers, reference lines, and annotation channel markers stay on Canvas 2D in the `candles` layer draw path.
- **Compositing:** WebGL2 renders to an offscreen canvas, then `drawImage` blits into the pane's 2D context during the `candles` layer phase. Other layers remain Canvas/DOM.
- **Activation:** Set `NEXT_PUBLIC_WEBGL_CANDLES=1` (or `true`). `ChartCanvas` initializes `CandleWebGLRenderer` on the price pane when GL is available; otherwise the existing `drawCandles` Canvas path runs unchanged.
- **Browser validation:** `webglBrowserValidation.ts` builds a dev report (`buildWebGLCandleValidationReport`) logged once per price-pane mount when the flag is enabled.
- **Registry:** `createCandlesLayer('webgl')` + `registerWebGLCandlesLayer(defaultLayerRegistry)` swap the candles layer backend metadata; draw always falls back to Canvas when WebGL is unavailable or chart type is unsupported (e.g. `candle_stroke`).
- **Invalidation:** Reuses `SERIES_INVALIDATING`; viewport pans rebuild visible geometry each frame (CPU-side typed arrays → GPU buffer upload).

### WebGL Indicator Backend (Stage 5 extension)

- **Scope:** Declarative indicator outputs with `plot: 'line' | 'histogram'` only (e.g. MA, EMA, MACD histogram). Custom `draw()` plugins and band/fill outputs (e.g. BOLL) remain on Canvas.
- **Activation:** `NEXT_PUBLIC_WEBGL_INDICATORS=1`. Mixed panes render WebGL-compatible series first, then Canvas-only indicators on top.
- **Geometry:** Shared typed-array builders in `seriesGeometry.ts` / `indicatorGeometry.ts`.

### Overlay Channels (Stage 6)

- **Contract:** `ChartDataFeed.loadOverlays` serves typed channels: `events`, `referenceLines`, `annotations`.
- **App adapter:** `createApiChartDataFeed` merges registry events (`/api/events`), news (`/api/news`), and options expirations (`/api/options/expirations`) into the events channel; `eventKindsFromChartSettings` filters dense feeds from per-cell settings before requests are made; derives priced reference lines from events; annotations merge feed + local drawing metadata via `useChartOverlays`.
- **Rendering:** Event overlays render in a reserved bottom event rail (between plot and time axis) as compact badges grouped by calendar day and screen proximity. Full-height guides appear only on hover/selection. Reference overlays and annotation channel markers still render on Canvas 2D in the `candles` layer regardless of WebGL candle backend.

## Persistence Contract

| Field | Storage |
|-------|---------|
| `ChartLayout` | `localStorage` via `layoutStorage.ts`; optional Postgres sync |
| Per-cell `drawings`, `indicators`, `paneOrder`, etc. | Inside `ChartLayout.cells[]` |
| Undo history | In-memory only — cleared on hydrate |

## Boundaries

- **UI layer** (`src/app/components/EdgeChart.tsx`, `ChartCell.tsx`): wires React state, toolbars, context menus.
- **Engine layer** (`packages/chart-react/`, `packages/chart-core/`): pure chart logic; `src/lib/chart/` is compatibility re-exports only.
- **Config layer** (`src/lib/chartConfig.ts`): layout schema, defaults, link propagation.

## Verification

```bash
npm test -- --run src/lib/chart/
npm test -- --run packages/chart-react/src/engine/layers.test.ts
npm test -- --run packages/chart-react/src/engine/renderScheduler.test.ts
npm test -- --run src/app/components/EdgeChart.drawing.test.tsx
npm test -- --run src/app/components/ChartCell.paneActions.test.tsx
```

## Related Docs

- [docs/chart/features.md](../../../docs/chart/features.md) — feature inventory
- [docs/chart/prereqs/plugin-api.md](../../../docs/chart/prereqs/plugin-api.md) — plugin interfaces
- [docs/chart/drawing-engine-design.md](../../../docs/chart/drawing-engine-design.md) — drawing design
