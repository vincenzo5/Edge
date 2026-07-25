# Chart Engine Architecture

Custom Canvas 2D chart engine for Edge. Not TradingView, not klinecharts.

## Responsibility

Render OHLCV candles, indicators, and drawings; handle viewport pan/zoom/scale; serialize state to `CellConfig`.

## Component Flow

```
StockApp → PrimaryChartBrowserTabQuote (document title + favicon)
         → ChartGrid ── ChartDrawingRail (multi-pane; targets active cell)
              └─ ChartCell → EdgeChart
                                ├─ ChartCanvas (price + sub-panes)
                                ├─ CrosshairOverlay
                                ├─ PriceLegendLayout / PaneLegendBar
                                └─ DrawingStore (undo/redo)
```

In-chart workspace tab strip is removed; layout persistence still uses a single active workspace tab (`pruneToSingleActiveTab`). Multi-module tiling lives under `/workspace` (`src/lib/appWorkspace/`).

`ChartCell` is a thin wiring shell; responsibility hooks live in `src/app/components/chart-cell/` (`usePatternCapture`, `usePaneLayoutActions`, `useDrawingToolbarCommands`, `useChartCellContextMenus`, etc.).

**Components root policy (code-org Phase 3):** `src/app/components/*` root holds app-wide providers, contexts, and thin re-exports only. Feature bodies belong in feature folders (`chart-cell/`, `chart-chrome/`, `drawing/`, `stock-app/`, etc.) — do not add new feature implementations at root.

Data path: `POST /api/candles` → `series.ts` → `@edge/chart-react` `EdgeChart` → `packages/chart-react/src/engine/canvas.tsx` render loop. App `EdgeChart.tsx` passes `resolveCellFetchRange(config)` so weekly/monthly intervals fetch enough history (1wk→5y, 1mo→max when no bottom-bar preset). History pagination uses `historyPrefetchController.ts` (50% visible lookahead, 500-bar pages, pipelined fetch) with thresholds from `@edge/chart-core` `historyPrefetch.ts`.

**Memory retention:** Chart sessions page distant bars out of RAM per [Memory Efficiency Phase 1+](../../../docs/roadmaps/memory-efficiency-roadmap.md) (`RESIDENT_BAR_SOFT_MAX` 5_000; refetch on pan/go-to). Multi-cell Desk layouts mount all visible chart engines simultaneously; identical symbol/range/interval tuples share one candle stream transport via `sharedCandleStreamRegistry`. The active cell alone owns drawing tools, symbol navigation, and Data Health chrome; inactive peers remain fully rendered and live-updated on the primary chart tile. Research UX Phase 4 and journal trade forks keep their resource-gated mount exceptions (`MAX_LIVE_BOARD_CHART_CARDS = 1`; journal explicit `live` override — see [research/ARCHITECTURE.md](../research/ARCHITECTURE.md)). Phase 5 ships tip-stable builtin/script result caches (`computeTipStableCacheKey` + `tipRevision` overwrite; coordinator `dispose` clears maps). Phase 6 ships series layer retain + geometry recycle. Phase 8 ships Heikin Ashi LRU cache (`heikinAshiCache.ts`, max 8 entries by length + OHLCV fingerprint) and lazy workspace tile loading via `SurfaceHost` dynamic imports. Phase 13 ships transferable `f64x6` candle buffers on the script worker bus (`candleTransferBuffer.ts` + `scriptRuntimeWorkerClient` transfer list; `Candle[]` fallback). Client cache and clone rules live in [chartDataFeed/ARCHITECTURE.md](../chartDataFeed/ARCHITECTURE.md) and [marketData/ARCHITECTURE.md](../marketData/ARCHITECTURE.md). Phase 0 baselines: [docs/perf/memory-baseline-latest.json](../../../docs/perf/memory-baseline-latest.json).

**Range & viewport session:** Manual interval picks use `rangeForManualInterval()`. Initial visible window comes from `getSessionViewport()` — active bottom-bar presets use calendar cutoffs; no preset + daily interval shows ~270 calendar days (`getCalendarWindowViewport`); weekly/monthly show the full fetched window. When the candle session changes (symbol/range/interval), `viewportRevision` triggers `resetAllPaneViewports()` so pan/zoom does not carry stale state across bar sizes. Within the same session, true history prepends keep shifted indices; if candle length grows while the viewport is no longer at the live edge (typical cache→fresh replace), the price pane rebuilds via `getSessionViewport()` instead of keeping stale indices. When the user leaves the default fit, optional `CellConfig.viewport` is debounced into the chart workspace snapshot and restored after candles load for the same session; **Reset chart view** and session-field changes clear the snapshot (`useViewportPersistSync`).

## Canonical vs app adapter paths

| Layer | Canonical location | App adapters (`src/lib/chart/`) |
|-------|-------------------|----------------------------------|
| Pure chart logic | `packages/chart-core/src/` — import `@edge/chart-core` or subpaths (`/contracts`, `/drawings`, …) | **None** — pure re-export shims removed (code-org Phase 5, 2026-07-24) |
| React chart runtime | `packages/chart-react/src/` — import `@edge/chart-react` or `@edge/chart-react/engine/*` | **None** — engine shims removed |
| App-only glue | — | `series.ts` (Yahoo `/api/candles`), `chartSnapshot.ts`, `chartClipboard.ts`, `stateMapping.ts`, `layoutTemplates.ts`, `presets/*`, `activeChartTypes.ts`, `objectTreeModel.ts`, … — see [code-org-phase-5 evidence](../../../docs/evidence/code-org-phase-5.txt) |

**Import policy:** New code imports `@edge/chart-core` / `@edge/chart-react` directly. Do not add pure `export * from '@edge/…'` files under `src/lib/chart/` — `npm run lint:chart-shims` fails closed.

Runtime chart rendering uses `@edge/chart-react` only. Edit package sources under `packages/chart-*`; keep app-specific fetch/persistence/UI mapping in the adapter list above.

## Key Modules

| Module | Role |
|--------|------|
| `packages/chart-react/src/engine/canvas.tsx` | Composition shell: pane registration, hook wiring |
| `packages/chart-react/src/engine/useViewportLifecycle.ts` | Session viewport, candle replace/prepend, size |
| `packages/chart-react/src/engine/useCanvasRenderer.ts` | Scheduler, layer draw coalescing, WebGL refs |
| `packages/chart-react/src/engine/useCanvasGestures.ts` | Pointer pan/zoom/drag, momentum, drawing bridge |
| `packages/chart-react/src/engine/useCanvasCursor.ts` | Cursor policy + event badge interaction |
| `packages/chart-react/src/EdgeChart.tsx` | Package API shell: props → coordinator hooks → JSX |
| `packages/chart-react/src/useCandleSession.ts` | Candle session key, history prefetch binding |
| `packages/chart-react/src/useCrosshairCoordinator.ts` | Crosshair sync, RAF flush, sibling callbacks |
| `packages/chart-react/src/useChartWheelPinch.ts` | Wheel/pinch → price pane viewport |
| `packages/chart-react/src/usePaneLayoutController.ts` | Pane layout, separator resize, sibling sync |
| `packages/chart-react/src/useEventDetailController.ts` | Event badge selection + detail card |
| `packages/chart-react/src/drawing/useDrawingController.ts` | Thin orchestrator for drawing FSM + facade |
| `packages/chart-react/src/drawing/createDrawingHandleSlice.ts` | Imperative drawing command facade |
| `packages/chart-react/src/drawing/applyDrawingPointerTransition.ts` | Pure pointer/FSM transition phases |
| `src/app/components/chart-cell/` | ChartCell responsibility hooks (capture, menus, toolbar, sync) |
| `packages/chart-react/src/engine/layers.ts` | Layer contract + registry; ordered draw phases with invalidation metadata |
| `packages/chart-react/src/engine/renderScheduler.ts` | RAF draw coalescing, invalidation reasons, phase timings |
| `packages/chart-react/src/engine/layerCache.ts` | Offscreen cache for static background layer |
| `packages/chart-react/src/engine/viewport.ts` | Pan, zoom, momentum, price/time scale modes |
| `packages/chart-react/src/engine/rangeInterval.ts` | Interval↔range pairing; `resolveCellFetchRange`, `rangeForManualInterval` |
| `packages/chart-react/src/engine/rangePresets.ts` | Session viewport (`getSessionViewport`), calendar daily window, range cutoffs |
| `packages/chart-core/src/drawings/position_tool.ts` | Shared long/short position plugin factory; geometry in `positionGeometry.ts`; profit-zone 1R yard lines; labels via `risk/positionLabels.ts`; `styles.stickEntryToLastPrice` (default ON) sticks entry to live last price |
| `packages/chart-react/src/engine/renderer.ts` | Grid, candles, axes, annotations draw primitives |
| `packages/chart-core/src/pluginHost.ts` | Indicator/drawing registries, hit-test, serialize/restore |
| `packages/chart-core/src/drawingStore.ts` | Command-based undo/redo (max 50 history) |
| `packages/chart-core/src/drawingController.ts` | Multi-point placement FSM |
| `packages/chart-core/src/drawingCoords.ts` | Plot ↔ data coordinate transforms |
| `packages/chart-react/src/engine/paneHandle.ts` | Imperative pane registration for multi-pane sync |
| `packages/chart-core/src/contracts.ts` | Core types: `Candle`, `SerializedDrawing`, `IndicatorConfig` |
| `packages/chart-core/src/interval.ts` | Domain interval helpers: `intervalToMs`, `resolveFetchInterval`, 2h resample |
| `packages/chart-core/src/series.ts` | Pure series transforms: Heikin Ashi, merge prepend, `ensureCandlesCover`, stream apply |
| `packages/chart-core/src/historyPrefetch.ts` | Lookahead thresholds, debounce constants, background prefetch gate |
| `packages/chart-react/src/engine/historyPrefetchController.ts` | Pipelined `loadMore` (1 in-flight + 1 queued), urgent debounce bypass |
| `src/lib/chart/layoutTemplates.ts` | Layout template catalog, CSS grid classes, pane counts (1–16) |
| `src/lib/chart/objectTreeModel.ts` | Multi-pane object tree sections from layout + active chart snapshot |

## Plugin System

- **Indicators**: register in `indicators/registry.ts`; implement compute + draw via `plugin-api.ts`.
- **User scripts (Phase 0–4 / V1):** private TypeScript indicators compile/execute in `@edge/indicator-runtime` (QuickJS guest WASM). Browser-local script library (`src/lib/scriptLibrary/`), My scripts picker + editor, and `resolveScriptSource` injection into `ScriptResultCoordinator`. V1 adds full input kinds (number/boolean/enum/source), bounded serializable `colorRules`, typed error codes (`formatScriptError`), TA starter helpers (`ta.source`, `highest`, `lowest`, `atr`, `roc`), 150ms debounced scheduling, worker crash recovery (3 attempts), and editor keyboard shortcuts. Validated series reach the chart through `packages/chart-react/src/engine/indicatorResultProvider.ts`. Script plugins register per instance via `registerScriptIndicatorPlugin` — they do **not** join the static built-in registry. See `docs/roadmaps/typescript-indicator-scripting-roadmap.md` and `docs/chart/script-examples.md`.
- **Drawings**: register in `drawings/registry.ts`; toolbar names aliased in `pluginHost.ts`. Utility tools include `measure` (bar/price line), `ruler` (shaded Δtime/Δprice band; ⇧+click shortcut on price pane), and `risk_ruler`. Forecasting tools `long_position` / `short_position` use `createPositionPlugin()` — instant place on toolbar select at last-bar close with left edge on the last bar (default stop/TP/width; still resizable via TradingView-style 4 handles: target/stop vertical-only; entry-left moves entry + left edge; right edge width-only), profit/loss zones, left-edge 1R yard lines with in-box NR labels, and TV-style target/entry/stop labels backed by `risk/*` helpers.
- New plugins MUST follow existing patterns (`ma.ts`, `trend_line.ts`).

## Invariants

- Viewport updates are imperative — no React state on every wheel tick.
- Time window is shared across panes; price scale is per-pane.
- Price-axis labels and horizontal grid lines are generated from the same screen-space-aware anchored "nice tick" coordinates so vertical panning translates labels instead of recomputing arbitrary decimals. Between labeled prices, three short axis-border dashes partition each interval into quarters (`scaleAxisMinorTicks`).
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

**Crosshair input (`canvas.tsx`):** Hover emits `onCrosshairMove` via `emitCrosshairMove`. In navigate mode, body pan captures a drag anchor at mousedown (`dataIndex`, `timestamp`, `price`) and re-emits crosshair events at that anchored bar/price while the viewport scrolls so legend/OHLC labels stay fixed under the cursor. Time-lock mode (`lockCrosshairToTime` + `lockedCrosshairPlotX`) keeps the vertical line at the captured plot X instead. Drawing drags and context-menu hover suppress crosshair updates.

Each layer declares `invalidatingReasons` (`data`, `viewport`, `size`, `theme`, `settings`, `drawings`, `selection`, `crosshair`). `RenderScheduler` coalesces reasons per frame; `canvas.tsx` builds a `LayerDrawState` and iterates `defaultLayerRegistry.getOrderedLayers()`.

Cache reuse helpers (`canReuseBackgroundCache`, `canReuseSeriesCache`) derive from shared invalidation sets exported by `renderScheduler.ts` and mirrored on layer metadata in `layers.ts`. Background blits on pan (viewport-independent cache key). Series composite (`candles` + `indicators` + `scriptObjects`) blits via `SeriesLayerCache` on crosshair-only invalidation; viewport pans rebuild pixel-space geometry. `BackgroundLayerCache`, `SeriesLayerCache`, and `RenderScheduler` dispose on chart unmount. WebGL candle/indicator renderers recycle `Float32Array` slots via `GeometryBufferPool`.

Future WebGL backends plug in behind the same `ChartLayer` contract by registering alternate implementations for heavy series layers (`candles`, `indicators`) while keeping drawings, labels, and menus on Canvas/DOM.

### WebGL Candle Backend (Stage 5)

Package path: `packages/chart-react/src/engine/webgl/`.

- **Scope:** Main-pane OHLC geometry only (`candle_solid`, `heikin_ashi`, `ohlc`, `area`). Event markers, reference lines, and annotation channel markers stay on Canvas 2D in the `candles` layer draw path.
- **Compositing:** WebGL2 renders to an offscreen canvas, then `drawImage` blits into the pane's 2D context during the `candles` layer phase. Other layers remain Canvas/DOM.
- **Activation:** Set `NEXT_PUBLIC_WEBGL_CANDLES=1` (or `true`). `ChartCanvas` initializes `CandleWebGLRenderer` on the price pane when GL is available; otherwise the existing `drawCandles` Canvas path runs unchanged.
- **Browser validation:** `webglBrowserValidation.ts` builds a dev report (`buildWebGLCandleValidationReport`) logged once per price-pane mount when the flag is enabled.
- **Registry:** `createCandlesLayer('webgl')` + `registerWebGLCandlesLayer(defaultLayerRegistry)` swap the candles layer backend metadata; draw always falls back to Canvas when WebGL is unavailable or chart type is unsupported (e.g. `candle_stroke`).
- **Invalidation:** Reuses `SERIES_INVALIDATING`; viewport pans rebuild visible geometry each frame (CPU-side typed arrays → GPU buffer upload).

**Lab memory (L5):** `npm run perf:memory` records DOM-attached `canvasCount`, live `webglContextCount` via `globalThis.__edgeWebGLLiveContextCount` (incremented in `createWebGL2Context`, decremented in `releaseWebGL2Context` on dispose), and best-effort `gpuMemoryMb` from a throwaway WebGL2 probe (`WEBGL_memory_info` when present). Detached WebGL backend canvases (`candleWebGL.ts`, `indicatorWebGL.ts`) are not in the DOM — the live counter is the authoritative WebGL inventory. **Not measurable in lab:** OffscreenCanvas layer caches (`BackgroundLayerCache`, `SeriesLayerCache`), full VRAM in headless Chromium — those fields are `null` + `gpuMemoryNote`, never zero-filled. See [memory-metrics-roadmap.md](../../../docs/roadmaps/memory-metrics-roadmap.md) Phase 3.

### WebGL Indicator Backend (Stage 5 extension)

- **Scope:** Declarative indicator outputs with `plot: 'line' | 'histogram'` only (e.g. MA, EMA, MACD histogram). Custom `draw()` plugins and band/fill outputs (e.g. BOLL) remain on Canvas.
- **Activation:** `NEXT_PUBLIC_WEBGL_INDICATORS=1`. Mixed panes render WebGL-compatible series first, then Canvas-only indicators on top.
- **Geometry:** Shared typed-array builders in `seriesGeometry.ts` / `indicatorGeometry.ts`.

### Overlay Channels (Stage 6)

- **Contract:** `ChartDataFeed.loadOverlays` serves typed channels: `events`, `referenceLines`, `annotations`.
- **App adapter:** `createApiChartDataFeed` merges registry events (`/api/events`), news (`/api/news`), and options expirations (`/api/options/expirations`) into the events channel; `eventKindsFromChartSettings` filters dense feeds from per-cell settings before requests are made; derives priced reference lines from events; annotations merge feed + local drawing metadata via `useChartOverlays`.
- **Rendering:** Event overlays render in a reserved bottom event rail (between plot and time axis) as compact badges grouped by calendar day and screen proximity. The rail itself is transparent so the plot background (including user canvas background overrides) shows through. Full-height guides appear only on hover/selection. Reference overlays and annotation channel markers still render on Canvas 2D in the `candles` layer regardless of WebGL candle backend.

## Persistence Contract

| Field | Storage |
|-------|---------|
| Workspace tabs (storage) | `tv-ai:workspace-tabs:v1` via `workspaceTabsStorage.ts`; hydrate prunes to one active tab; legacy `tv-ai:layout:v1` migrates on load |
| `ChartLayout` (active tab) | Embedded in the single active workspace tab; optional Postgres sync via `useWorkspaceTabsRemoteSync` |
| Per-cell `drawings`, `indicators`, `paneOrder`, optional `viewport`, etc. | Inside `ChartLayout.cells[]` |
| Undo history | In-memory only — cleared on hydrate |
| Multi Chart tiles / prefs gaps | Phase 4 viewport restore **Done**; Phase 5 workflow resume pending — [workspace-state-persistence-roadmap.md](../../../docs/roadmaps/workspace-state-persistence-roadmap.md) |

## Boundaries

- **UI layer** (`src/app/components/EdgeChart.tsx`, `ChartCell.tsx`): wires React state, toolbars, context menus.
- **Engine layer** (`packages/chart-react/`, `packages/chart-core/`): pure chart logic; import `@edge/chart-*` directly.
- **App adapters** (`src/lib/chart/`): feed glue, persistence mapping, layout templates — not re-exports (Phase 5).
- **Config layer** (`src/lib/chartConfig.ts`): layout schema, defaults, link propagation.

## Runtime interaction metrics

Interaction smoothness is tracked separately from memory retention and market-data serving. See [Runtime Interaction Performance Roadmap](../../../docs/roadmaps/runtime-performance-roadmap.md) for phased work; Phase 0 freezes definitions and baselines only (no behavior change).

| Metric | Meaning | Resident-typical target (~1–5k bars) |
|--------|---------|----------------------------------------|
| **Frame time p50 / p95** | One chart update while panning / scrubbing / ticking | p50 **< 16 ms**; p95 **< 33 ms** (crosshair + tip-tick) |
| **Crosshair cost** | Extra work when only the crosshair moves | Series layers blit/skip; no `'data'` full rebuild |
| **Drawing interaction** | Hover/select/drag on drawings | Series layers blit/skip; `'drawings'` / `'selection'` do not bust series cache (Phase 1) |
| **Tip tick cost** | Work when the latest bar updates | Fingerprint/lookup ≪ compute; tip path O(period)-class for builtins |
| **React wakeups / quote** | Components re-rendering per quote frame | Inactive chart cells **0**; active cell only if it needs that symbol |
| **Cold load time** | First useful candles | Out of scope for interaction gates (provider-bound) |

**Baselines:** `npm run perf:chart` writes [docs/perf/chart-baseline-latest.json](../../../docs/perf/chart-baseline-latest.json) (full harness) and [docs/perf/runtime-interaction-baseline-latest.json](../../../docs/perf/runtime-interaction-baseline-latest.json) (tagged interaction scenarios). Stress scenarios use 100k bars; resident-typical scenarios use ~5k.

**Invalidation (Phase 1):** `SERIES_INVALIDATING` in `packages/chart-react/src/engine/renderScheduler.ts` covers `data|size|theme|settings` only. Drawing hover/select/drag requests `'drawings'` / `'selection'`; crosshair requests `'crosshair'`. Those overlay reasons redraw the drawings/axes layers but reuse the series OffscreenCanvas via `canReuseSeriesCache`.

**React wakeups (Phase 2):** Quotes live in `src/lib/marketData/quotesStore.ts` with per-symbol `useQuote` selectors (`useSyncExternalStore`). `MarketDataProvider` context carries meta/transport/reload only; warmup/SSE keys are primitive strings (not layout array identity). Copilot thread state is split from stable actions (`useCopilotActions` for chart cells). Account position overlays use `useAccountPositionForSymbol`. Crosshair scrub state is stored in `cellCrosshairStore` per `chartId`; subscribers use `useCellCrosshairSnapshot` instead of re-rendering `ChartCell`.

**React wakeups protocol (Phase 0+):** Use React DevTools Profiler on multi-cell layouts during quote ticks for another symbol, or wrap components with `createRenderCounter` from `src/test/reactRenderCounter.ts` in Vitest. Passing criterion for Phase 2: inactive `ChartCell` render count **0** per foreign-symbol quote frame.

**Revision identity + tip compute (Phase 3):** `CandleSeriesIdentity` (`bodyRevision`, `tipRevision`, bounds) is advanced at candle ingestion in `applyCandleStreamEvent`, prepend/trim helpers, and `useChartDataFeed` (`seriesIdentity` prop into `@edge/chart-react`). Hot-path cache keys use `bodyRevision` instead of `candleBodyFingerprint`. Builtin tip-only updates use incremental updaters in `indicatorTipUpdate.ts` (EMA, MA, RSI, ATR, VWAP; MACD recompute on tip while retaining tip-stable slot); scripts keep full re-run on tip dirty.

**Drawing interaction hot path (Phase 4):** `pointToPlot` resolves timestamps via O(1) matching `dataIndex` or binary search (`lowerBoundCandleIndex` / `resolveDataIndexFromTimestamp` in `packages/chart-core/src/drawingCoords.ts`). Hover hit-test is RAF-coalesced in `useCanvasGestures` with shared cursor state via `computeDrawingHoverHit`; `getHitTestCandidates` caches z-sorted visible lists and AABB-culls before plugin `hitTest`. Drag moves coalesce `DrawingStore.replaceDrawing` to one write per frame (`drawingDragCoalesce.ts`); undo still commits on pointer-up via `execute`.

**Pan/zoom scale + frame resolve (Phase 5):** Auto-scale bounds cache by quantized index window + candle/indicator identity in `indicatorScale.ts` (`clearVisibleScaleCache` for tests/session resets). `IndicatorResultProvider.prepareFrame` resolves each visible indicator once per draw; `resolveSeriesForFrame` feeds bar colors, indicator plots, WebGL batches, and price-axis annotations from the same map (`paneRenderer.ts` entry).

**List virtualization (Phase 6):** Heavy desk lists use `@tanstack/react-virtual` with memoized rows — watchlist (`WatchlistTable` + `WatchlistRow`), options chain strikes (`OptionsChainTable` + `OptionsChainRow`), and Copilot history bubbles (`CopilotMessageList` + `CopilotMessageBubble`). Streaming assistant messages stay mounted outside the recycled window; greeks popover panels lazy-mount on hover only.

**Layout persistence fan-out (Phase 7):** Per-cell layout slices live in `cellLayoutStore` (`useCellLayoutConfig` / `useSyncExternalStore` per `chartId`). Drawing/viewport-only edits write the keyed store + debounced flush into `workspaceTabs` without waking sibling `ChartCell`s. `DrawingStore.revision` and `layoutRevisionFingerprint` replace hot-path `JSON.stringify` equality for drawing persist and dirty keys.

## Verification

```bash
npm test -- --run src/lib/chart/
npm test -- --run packages/chart-react/src/engine/layers.test.ts
npm test -- --run packages/chart-react/src/engine/renderScheduler.test.ts
npm test -- --run src/app/components/EdgeChart.drawing.test.tsx
npm test -- --run src/app/components/ChartCell.paneActions.test.tsx
```

## Related Docs

- [Runtime Interaction Performance Roadmap](../../../docs/roadmaps/runtime-performance-roadmap.md) — interaction smoothness track
- [docs/perf/runtime-interaction-baseline-latest.json](../../../docs/perf/runtime-interaction-baseline-latest.json) — interaction harness baseline
- [docs/chart/prereqs/plugin-api.md](../../../docs/chart/prereqs/plugin-api.md) — plugin interfaces
- [docs/chart/drawing-engine-design.md](../../../docs/chart/drawing-engine-design.md) — drawing design
