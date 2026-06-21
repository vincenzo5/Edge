# Edge Chart — Feature Inventory

Living record of what the custom chart engine (`EdgeChart` + `src/lib/chart/`) supports today, what is partial, and what remains planned. Updated as implementation progresses.

**Status key**

| Status | Meaning |
|--------|---------|
| **Done** | Works end-to-end in the app |
| **Partial** | Core path exists; gaps noted |
| **Stub** | Wired in UI/API but engine logic incomplete |
| **Planned** | Spec'd in prereqs; not implemented |
| **Legacy** | Old klinecharts path; superseded but file may remain |

For V1 targets and gesture specs, see [v1-scope.md](./prereqs/v1-scope.md) and [gesture-bible.md](./prereqs/gesture-bible.md).

---

## Architecture (current)

```
StockApp → ChartGrid → ChartCell → EdgeChart
              │ ChartSyncProvider (linked → crosshair broadcast)
              └─ per-cell wrapper (min-h-0, viewport-fitting grid)
                                      ├─ ChartLegendBar (OHLCV overlay, price pane)
                                      ├─ ChartCanvas (price pane)
                                      ├─ ChartCanvas (sub-panes, one per sub indicator)
                                      ├─ PaneSeparators (drag-resize between panes)
                                      └─ CrosshairOverlay (unified crosshair)
```

- **Engine**: Canvas 2D (`src/lib/chart/canvas.tsx`); active path uses `EdgeChart` (`ChartCell` import). Legacy klinecharts wrapper remains in `Chart.tsx`.
- **Data**: Yahoo OHLCV via `/api/candles` → `series.ts` normalization.
- **Plugins**: Indicators and drawings register through `pluginHost.ts` / registries; toolbar names are aliased to registry keys.
- **Multi-pane sync**: Imperative `ChartPaneHandle` registration (`paneHandle.ts`); time window synced across panes without React state on every wheel tick.
- **Multi-chart sync**: `ChartSyncProvider` in `ChartGrid`; source chart fires `onCrosshairTimestamp` → `broadcast`; peers receive via `ChartSyncBridge` → `setCrosshairFromSync`. Gated on `ChartLayout.linked` (symbol link checkbox enables both symbol propagation and crosshair sync in V1).
- **Wheel input**: Single container listener on `[data-edge-chart]`, rAF-batched (`wheel.ts`).
- **Persistence**: `ChartLayout` + per-cell `CellConfig` in `localStorage` via `layoutStorage.ts` (debounced 500 ms).

---

## Configuration reference

### `CellConfig` (per chart cell)

| Field | Purpose |
|-------|---------|
| `symbol`, `symbolName?`, `exchange?` | Ticker and display metadata (name/exchange set by symbol search) |
| `range` | History window: `1d`, `5d`, `1mo`, `3mo`, `6mo`, `ytd`, `1y`, `5y`, `max` |
| `interval` | Bar size: `5m`, `15m`, `30m`, `1h`, `1d`, `1wk`, `1mo` |
| `chartType` | `candle_solid`, `candle_stroke`, `ohlc`, `area`, `heikin_ashi` |
| `indicators` | `{ name, pane: 'main' \| 'sub' }[]` |
| `drawings` | Serialized overlay array |
| `paneOrder?` | Visual stacking order (`PRICE_PANE_KEY` + indicator keys) |
| `collapsedPanes?` | Pane keys collapsed to 24 px header height |
| `maximizedPane?` | Single pane expanded; others collapsed |
| `paneHeights?` | User-resized sub-pane heights (px), keyed by indicator key |

### `ChartLayout` (app-wide)

| Field | Purpose |
|-------|---------|
| `version` | Schema version (`1`) |
| `gridMode` | `1x1`, `2x1`, `1x2`, `3x1`, `2x2` |
| `linked` | When checked: atomic symbol/range/interval propagation **and** multi-chart crosshair sync |
| `activeCellIndex` | Focused cell (0…N−1); drawing tools apply here; persisted |
| `theme` | `light` \| `dark` (applied to `<html>` class) |
| `cells` | Array of `CellConfig` (length matches grid mode) |

**Multi-chart layout shell** (implemented): `StockApp` uses `h-screen overflow-hidden`; `ChartGrid` uses `flex-1 min-h-0 overflow-hidden` plus `chart-grid-rows-*` utilities in `globals.css` so all grid modes fit the viewport without page scroll. When `cellCount > 1`, cells use **compact chrome** (symbol + range/interval only; no per-cell Bar Replay).

---

## 1. Data & symbols

| Feature | Status | Notes |
|---------|--------|-------|
| Symbol search | **Done** | `SearchBar` in `ChartCell`; Yahoo lookup via `/api/search` |
| Symbol metadata persistence | **Done** | `symbolName`, `exchange` stored in `CellConfig` on select |
| Range selector | **Done** | 1D, 5D, 1M, 3M, 6M, YTD, 1Y, 5Y, MAX — persisted in `CellConfig.range` |
| Interval selector | **Done** | 5m, 15m, 30m, 1h, 1D, 1W, 1M — persisted in `CellConfig.interval` |
| Chart type selector | **Done** | Cell toolbar; 5 types from `CHART_TYPES` |
| Yahoo candle fetch | **Done** | `fetchYahooCandles()` in `series.ts` |
| Candle validation / normalization | **Done** | Short-form `{ t,o,h,l,c,v }`; ms timestamps |
| Heikin Ashi transform | **Done** | Applied when `chartType === 'heikin_ashi'` |
| Bar Replay data slice | **Partial** | `applyVisibleSlice()` + `visibleCount` prop work; `candleCount` in `ChartCell` never updated from loaded data (replay slider shows `total={0}`) |
| Infinite scroll / edge fetch | **Planned** | Virtual scroll buffer exists (`SCROLL_BUFFER_CANDLES`); no fetch-on-pan-left |
| Loading / error states | **Done** | Overlay text in `EdgeChart` while fetching or on failure |

---

## 2. Chart types & rendering

| Feature | Status | Notes |
|---------|--------|-------|
| Solid candles | **Done** | `drawCandles()` in `renderer.ts` |
| Hollow (stroke) candles | **Done** | `candle_stroke` |
| OHLC bars | **Done** | `ohlc` |
| Area chart | **Done** | `area` |
| Heikin Ashi display | **Done** | Data transformed before render |
| Price grid | **Done** | Horizontal + vertical grid lines |
| Price / time axes | **Done** | Right price strip (50 px), bottom time strip (30 px) on bottom pane only |
| Last price line | **Done** | Blue horizontal line + label on price pane |
| Light / dark theme | **Done** | `Theme` tokens in `renderer.ts`; `StockApp` toggles `<html>` class |
| Last-price / axis guards | **Done** | Finite checks before draw (no `toFixed` on NaN) |
| Sub-pane candle body | **N/A** | Candles drawn on price pane only; sub-panes show indicators |

---

## 3. Legend & OHLCV readout

| Feature | Status | Notes |
|---------|--------|-------|
| Chart legend overlay | **Done** | `ChartLegendBar` on price pane (`EdgeChart`) |
| Crosshair bar values | **Done** | When crosshair is on price pane, legend shows that bar's OHLCV |
| Last-bar fallback | **Done** | When crosshair absent or on sub-pane, legend shows last candle |
| Change / change % | **Done** | vs previous close; `resolveLegendBar()` in `legend.ts` |
| Price / volume formatting | **Done** | `formatPrice`, `formatVolume`, `formatChange` in `format.ts` |
| Symbol display name | **Done** | Uses `symbolName` from config or fetches via `/api/search` |
| Interval / exchange labels | **Done** | Shown in legend header |

---

## 4. Viewport, pan, zoom, scale

| Feature | Status | Notes |
|---------|--------|-------|
| Initial viewport | **Done** | ~150 bars visible; auto price fit |
| Horizontal pan (drag body) | **Done** | `pan()`; preserves visible count |
| Pan momentum | **Done** | Decay 0.9/frame after release (`applyMomentum`) |
| Vertical wheel zoom | **Done** | Zoom anchored to cursor X; 10–5000 candle clamp |
| Horizontal wheel pan | **Done** | Dominant-axis routing in `wheel.ts` |
| rAF wheel batching | **Done** | One update per frame; no React re-render per tick |
| Virtual scroll margin | **Done** | ±100 candles past first/last bar |
| Auto Y-scale (default) | **Done** | `priceScaleMode: 'auto'`; refits to visible OHLC + 5% pad |
| Manual Y-scale (price-axis drag) | **Done** | `scalePriceFromInitial()` sets manual |
| Manual Y lock (time-axis drag) | **Done** | `scaleTimeFromInitial()` sets manual |
| Manual Y pan (body drag, manual only) | **Done** | `panPrice()` when mode is manual |
| Double-click price axis → reset auto | **Done** | `resetPanePriceScale()` per pane |
| Reset chart view (context menu) | **Done** | Right-click chart when modified → resets all panes via `resetChartView()` |
| Viewport modified detection | **Done** | `isViewportModified()` compares pan/zoom/scale to defaults |
| Hover cursors | **Done** | `resolveHoverCursor()` — crosshair, grab/grabbing, ns/ew-resize on axes |
| Drawing-tool cursor mode | **Done** | Active drawing tool shows crosshair cursor on canvas |
| Pinch zoom | **Planned** | Not implemented |
| Per-pane independent time | **N/A** | Time is shared; price scale is per-pane |

---

## 5. Multi-pane layout

| Feature | Status | Notes |
|---------|--------|-------|
| Price pane fills cell when no subs | **Done** | `createInitialLayout()` |
| Sub-pane per sub indicator | **Done** | e.g. MACD gets own `ChartCanvas` |
| Fixed default sub height (100 px) | **Done** | `SUB_DEFAULT` in `panes.ts` |
| Collapsed sub height (24 px) | **Done** | When in `collapsedPanes` |
| Min price pane height (80 px) | **Done** | Clamps + shrinks subs in short cells |
| Maximize one pane | **Partial** | Layout math in `panes.ts`; config persisted from `ChartCell`; no in-chart header UI |
| Collapse pane | **Partial** | Same as above |
| Pane reorder (`paneOrder`) | **Partial** | Config + handlers in `ChartCell`; **EdgeChart does not yet reorder/stack by `paneOrder`** |
| Drag-resize pane separator | **Done** | `PaneSeparators` + `applyBoundaryResize()`; persists `paneHeights` on drag end |
| Separator disabled states | **Done** | Disabled when adjacent pane collapsed or maximized |
| Pane header controls (hover) | **Planned** | Callbacks passed to `EdgeChart` but no overlay UI yet (existed on old `Chart.tsx`) |
| 1 px border between sub-panes | **Done** | CSS `borderTop`; accounted in crosshair segment offsets |

---

## 6. Crosshair

| Feature | Status | Notes |
|---------|--------|-------|
| Unified crosshair overlay | **Done** | Single `CrosshairOverlay` spans all panes |
| Vertical line (all panes) | **Done** | `drawUnifiedCrosshair()` |
| Horizontal line (active pane) | **Done** | Clamped to active pane plot area |
| Candle snap (10 px) | **Done** | Snaps vertical line to nearest candle center |
| Price badge (Y-axis) | **Done** | `formatCrosshairValue()` + `priceForPlotY()` |
| Time badge (X-axis) | **Done** | Bottom pane only; `formatAxisTime()` |
| Indicator value at cursor | **Partial** | `valueAt` on MACD; other indicators lack it |
| Clear on container leave | **Done** | |
| No clear during wheel | **Done** | `wheelingRef` suppresses flicker |
| Clear when leaving chart (not sibling pane) | **Done** | `shouldClearCrosshairOnLeave()` |
| Hide crosshair while drawing | **Planned** | Not implemented |
| Multi-chart crosshair sync | **Done** | `onCrosshairTimestamp` on source chart → `ChartSyncContext.broadcast` (when `linked`) → peer `setCrosshairFromSync(ts)` via `findDataIndexForTimestamp` + `buildSyncedCrosshairState`; feedback loop guarded by `syncingCrosshairRef` |

---

## 7. Indicators

**Picker UI**: 28 names in `src/lib/indicators.ts` across Trend (7), Momentum (16), and Volume (4) categories. Volatility and Other categories exist in the type system but have no entries yet.

**Engine registry** (`indicators/registry.ts`): only registered plugins render.

| Indicator | Pane | Status | Notes |
|-----------|------|--------|-------|
| MA | main | **Done** | Simple moving average line |
| BOLL | main | **Stub** | Plugin registered; band math incomplete (middle band only) |
| MACD | sub | **Done** | Lines + histogram; `valueAt`, `valueRangeForViewport`, EMA math in `indicators/math.ts` |
| RSI | sub | **Stub** | Flat placeholder line at pane midline |
| EMA, SMA, BBI, SAR, AVP | main | **Planned** | Listed in picker only |
| KDJ, CCI, BIAS, … (momentum) | sub | **Planned** | Listed in picker only |
| VOL, OBV, VR, PVT | sub | **Planned** | Listed in picker only |

| Feature | Status | Notes |
|---------|--------|-------|
| Toggle indicator in picker | **Done** | Adds/removes from `CellConfig.indicators` |
| Picker grouped by category | **Done** | Trend / Momentum / Volume with descriptions |
| Main-pane overlay draw | **Done** | Filtered to price `ChartCanvas` |
| Sub-pane auto Y-scale | **Done** | `applyPanePriceScale()` uses `valueRangeForViewport` when available |
| Indicator params UI | **Planned** | Defaults only (`defaultParams` on plugins) |
| Remove via Object Tree | **Done** | Per-indicator × button |

---

## 8. Drawings

**Design:** [drawing-engine-design.md](./drawing-engine-design.md) — V1 drawing engine architecture, FSM, coordinate model, phased plan, and test oracles.

**Toolbar**: 12 tools in `DrawingToolbar.tsx` (cursor, hline, vline, trend, ray, channels, rect, circle, fib, price line, annotation).

**Registry aliases** (`pluginHost.ts`): all 12 toolbar names mapped to registry keys.

**Engine registry** (`drawings/registry.ts`): 12 plugins registered.

| Tool (toolbar name) | Registry name | Status |
|---------------------|---------------|--------|
| Trend Line (`straightLine`) | `trend_line` | **Done** |
| Horizontal Line | `horizontal_line` | **Done** |
| Vertical Line | `vertical_line` | **Done** |
| Rectangle (`rect`) | `rectangle` | **Done** |
| Ray | `ray` | **Done** |
| Parallel Channel | `parallel_channel` | **Done** (2-line baseline; 3rd offset point optional) |
| Price Channel | `price_channel` | **Done** |
| Circle | `circle` | **Done** |
| Fib Retracement | `fib_retracement` | **Done** |
| Price Line | `price_line` | **Done** |
| Annotation | `annotation` | **Done** |

| Feature | Status | Notes |
|---------|--------|-------|
| Start/stop drawing tool | **Done** | FSM: stay in tool after create |
| Two-point create + preview | **Done** | Click-click or drag-release; dashed ghost |
| Click select + CP edit | **Done** | `hitTestAll` + control-point drag |
| Draw on chart | **Done** | Price pane; z-sorted render |
| Serialize to `CellConfig.drawings` | **Done** | `timestamp`+`value` points; debounced 500 ms |
| Hit test / select | **Done** | 4px tolerance; topmost z-order |
| Edit control points | **Done** | Magnet applies on CP drag |
| Delete selected drawing | **Done** | Toolbar ⌫ + `onSelectionChange` sync |
| Magnet (snap OHLC) | **Done** | 5px strong magnet |
| Context menu (rename/lock/hide/z) | **Done** | Canvas right-click hit-test → menu |
| Z-order / duplicate | **Done** | `bringForward`/`sendBackward`/`duplicateOverlay` |
| Object Tree drawings section | **Done** | Lists tracked overlays; reorder via z-level |

---

## 9. App shell & layout

| Feature | Status | Notes |
|---------|--------|-------|
| Grid modes (1×1, 2×1, 1×2, 3×1, 2×2) | **Done** | Viewport-fitting grid (`min-h-0` chain + `chart-grid-rows-*`); compact cell chrome when N>1 |
| Link symbols (range/interval/symbol) | **Done** | Atomic propagation via `applyCellUpdate` in `StockApp`; includes `symbolName`/`exchange` |
| Active cell focus | **Done** | `activeCellIndex` persisted; focus ring; drawing tools disabled on inactive cells |
| Per-cell config | **Done** | `CellConfig` per grid cell |
| Layout persistence (localStorage) | **Done** | `loadLayout` / `saveLayout` in `layoutStorage.ts` |
| Theme persistence | **Done** | Part of `ChartLayout`; live switch via toolbar |
| Reset layout | **Done** | Toolbar confirm → defaults (clears saved drawings) |
| Drawing toolbar rail | **Done** | Left column in `ChartCell` |
| Object Tree panel | **Done** | Toggle per cell; section collapse persisted per `chartId` |
| Object Tree — symbol section | **Done** | Shows symbol, range, interval |
| Object Tree — data window | **Partial** | Placeholder text only (“Hover over the chart…”) |
| Indicator picker modal | **Done** | |
| Bar Replay panel | **Partial** | UI + speeds (0.5×–5×) work; candle total not fed from chart |
| Chart context menu | **Done** | “Reset chart view” when viewport modified |
| Overlay context menu | **Done** | Rename, lock, hide, z-order, duplicate (latter two stubbed) |
| Old Chart (`Chart.tsx`) | **Legacy** | klinecharts-based; not used by `ChartCell` |

---

## 10. ChartHandle API (`EdgeChart`)

Imperative API consumed by `ChartCell`, Object Tree, and sync bridge.

| Method | Status | Notes |
|--------|--------|-------|
| `startDrawing` / `stopDrawing` | **Done** | |
| `clearDrawings` | **Done** | |
| `serializeDrawings` / `restoreDrawings` | **Done** | |
| `resize` | **Done** | Reads container `clientWidth/Height` |
| `onCrosshair` | **Done** | Fires timestamp on move (imperative subscribe) |
| `setCrosshairFromSync` | **Done** | Applies peer crosshair at timestamp; no re-broadcast |
| `getTrackedOverlays` | **Done** | |
| `removeOverlay` | **Done** | |
| `setOverlayVisible` / `setOverlayLocked` | **Done** | |
| `renameOverlay` | **Done** | |
| `duplicateOverlay` | **Done** | Clone with offset timestamp/value |
| `bringForward` / `sendBackward` | **Done** | zLevel swap |
| `subscribeOverlayChange` | **Done** | |
| `getSubPaneId` | **Stub** | Returns key unchanged |
| `applyPaneHeights` | **Stub** | No-op; pane resize uses `onPaneHeightsChange` callback instead |
| `resetChartView` | **Done** | Resets price viewport + syncs time; resets sub-pane price scales |
| `isViewportModified` | **Done** | Aggregates across registered pane handles |
| `setMagnet` | **Done** | OHLC snap during create + CP edit |
| `getMagnetEnabled` | **Done** | |
| `getSelectedDrawingId` | **Done** | |
| `selectDrawing` | **Done** | |
| `onSelectionChange` | **Done** | Syncs ChartCell toolbar delete |

---

## 11. Test coverage

Chart engine tests live under `src/lib/chart/` (Vitest). App/layout tests under `src/app/components/` and `src/lib/chartConfig.link.test.ts`.

| Module | File | Covers |
|--------|------|--------|
| Viewport | `viewport.test.ts` | Pan, zoom, scale, auto/manual price, scroll buffer, `isViewportModified` |
| Layout | `layout.test.ts` | Plot width/height, drag mode, cursor resolution |
| Panes | `panes.test.ts` | Height allocation, clamping, `applyBoundaryResize`, `computePaneBoundaries` |
| Crosshair | `crosshair.test.ts` | Plot Y mapping, leave logic, `findDataIndexForTimestamp`, `clampIndexToViewport` |
| Wheel | `wheel.test.ts` | Delta normalization, axis routing |
| Renderer | `renderer.test.ts` | Draw helpers |
| Series | `series.test.ts` | Heikin Ashi, slice, validation |
| Time | `time.test.ts` | Axis time formatting |
| Legend | `legend.test.ts` | Crosshair vs last-bar resolution, change calc |
| Canvas | `canvas.test.tsx` | Pane handle registration smoke |
| MACD math | `indicators/math.test.ts` | EMA, MACD histogram |
| Plugin host | `pluginHost.test.ts`, `pluginHost.hitTest.test.ts` | Registry aliases, hitTest z-order |
| Drawing coords | `drawingCoords.test.ts` | Plot space, magnet |
| Drawing FSM | `drawingFsm.test.ts` | Arm, place, cancel |
| Drawing plugins | `drawings/trend_line.test.ts`, `drawings/fib_retracement.test.ts`, `drawings/primitives.test.ts` | hitTest, fib levels |
| EdgeChart drawing | `EdgeChart.drawing.test.tsx` | Handle API smoke |
| Grid layout shell | `ChartGrid.layout.test.tsx` | All 5 `GridMode`s; `min-h-0` / `overflow-hidden` classes |
| Link propagation | `chartConfig.link.test.ts` | `pickLinkFields`, linked/unlinked patches, `activeCellIndex` persistence |
| Crosshair sync bus | `ChartSyncContext.test.tsx` | Broadcast when linked; no-op when unlinked |
| App smoke | `StockApp.test.tsx` | Render, theme hydration |

Run engine tests: `npm test -- --run src/lib/chart/`  
Run layout/sync tests: `npm test -- --run src/app/components/ChartGrid.layout.test.tsx src/lib/chartConfig.link.test.ts src/app/components/ChartSyncContext.test.tsx`

---

## 12. Key source files

| Area | Path |
|------|------|
| React chart host | `src/app/components/EdgeChart.tsx` |
| OHLCV legend overlay | `src/app/components/ChartLegendBar.tsx` |
| Pane drag-resize UI | `src/app/components/PaneSeparators.tsx` |
| Per-pane canvas | `src/lib/chart/canvas.tsx` |
| Crosshair overlay | `src/lib/chart/CrosshairOverlay.tsx` |
| Viewport math | `src/lib/chart/viewport.ts` |
| Wheel input | `src/lib/chart/wheel.ts` |
| Pane sync handles | `src/lib/chart/paneHandle.ts` |
| Pane layout | `src/lib/chart/panes.ts` |
| Price scaling | `src/lib/chart/indicatorScale.ts` |
| Crosshair labels | `src/lib/chart/crosshair.ts` |
| Legend resolution | `src/lib/chart/legend.ts` |
| Number formatting | `src/lib/chart/format.ts` |
| Hit zones / cursors | `src/lib/chart/layout.ts` |
| Drawing primitives | `src/lib/chart/renderer.ts` |
| Data pipeline | `src/lib/chart/series.ts` |
| Contracts | `src/lib/chart/contracts.ts` |
| Cell UI shell | `src/app/components/ChartCell.tsx` |
| Multi-chart grid | `src/app/components/ChartGrid.tsx` |
| Layout controller | `src/app/components/StockApp.tsx` |
| Crosshair sync bus | `src/app/components/ChartSyncContext.tsx` |
| Config types | `src/lib/chartConfig.ts` |
| Indicator catalog | `src/lib/indicators.ts` |
| Layout persistence | `src/lib/layoutStorage.ts` |

---

## 13. Known gaps (priority hints)

1. **V1 must-ship — indicators** — BOLL, RSI, VOL, EMA still stub or missing; 24 of 28 picker entries have no engine plugin (TradingView §5).
2. **V1 must-ship — Bar Replay** — Wire `candleCount` from loaded candles (or expose count via `ChartHandle`) (TradingView §7).
3. **V1 must-ship — pane controls UI** — Collapse/maximize/reorder persisted but no in-chart header controls on `EdgeChart` (TradingView multi-pane workflow).
4. **`paneOrder` stacking** — Config exists; layout always price-then-subs.
5. **Object Tree data window** — Placeholder only; no live crosshair values in panel (TradingView §4 readout).
6. **Edge fetch on pan-left** — Virtual scroll buffer exists; no fetch-on-scroll (V1 scope item 1).
7. **Delete klinecharts** — After parity verification (`Chart.tsx` still in repo).

**Recently closed:** drawing engine V1 (12 tools, FSM, selection, magnet, persist); multi-chart layout + crosshair sync (June 2025).

---

## 14. Recommended next work (TradingView-aligned)

Prioritized against [v1-scope.md](./prereqs/v1-scope.md) must-ship list and [tradingview-reference.md](./tradingview-reference.md). Edge is a chart engine, not a full TV platform — defer alerts, Pine, screeners, and cross-device sync.

### Tier A — Finish V1 contract (highest ROI)

| Priority | Edge work | TradingView reference | Why now |
|----------|-----------|----------------------|---------|
| A1 | **Indicator plugins**: EMA + BOLL (main), RSI + VOL (sub) | §5 Indicators | V1 items 6–7; picker already lists them |
| A2 | **Bar Replay fix**: expose candle count from `EdgeChart`, drive slider + slice | §7 Bar Replay | UI exists; one wiring fix unlocks replay |
| A3 | **Pane header UI** on `EdgeChart` (collapse / maximize / move up-down) | Multi-pane layout (implicit in TV) | Config already persists; users can't reach it |

### Tier B — TV parity polish (post-V1 or late V1 if time)

| Priority | Edge work | TradingView reference | Notes |
|----------|-----------|----------------------|-------|
| B1 | **Granular layout sync toggles** — separate symbol / interval / crosshair (not one checkbox) | §2 Synchronized layouts | Better multi-chart UX; crosshair already works via `linked` |
| B2 | **Object Tree data window** — live OHLCV + indicator values at crosshair | §4 Crosshair & readout | Complements legend bar |
| B3 | **Drawing sync across layout cells** | §2 Sync drawings | Requires stable drawing IDs + link rules |
| B4 | **Hide drawings / indicators** (layout-level visibility) | §2 Hide options | Quick win for cluttered grids |
| B5 | **Keep drawing mode** + **Undo/redo** for drawings | §6.10, §3 Undo/redo | Standard TV drawing workflow |
| B6 | **Log / percent / indexed-to-100** price scale modes | §3 Viewport & scale | Scale mode selector |
| B7 | **Go to date** / jump viewport | §3 Go to date | Date picker + viewport pan |

### Tier C — Explicit deferrals (TV has; Edge should not chase yet)

- Pine Script / community indicators (§5)
- Alerts on price or drawings (§8)
- Non-time charts: Renko, P&F, Kagi (§1; already out of V1 scope)
- Volume footprint, TPO, session profile (§1 advanced volume)
- 16-chart layouts, watchlists, spreads, custom seconds intervals (§2 platform)
- Cross-device cloud sync (§13)

**Suggested sprint order:** A1 → A2 → A3, then B1–B2 if multi-chart polish is the theme.

---

## Related docs

- [TradingView reference](./tradingview-reference.md) — External benchmark inventory (Supercharts feature set)
- [V1 scope lock](./prereqs/v1-scope.md) — Original must-ship list
- [Gesture bible](./prereqs/gesture-bible.md) — Interaction spec (target behavior)
- [Integration map](./prereqs/integration-map.md) — How EdgeChart slots into the app
- [Plugin API](./prereqs/plugin-api.md) — Indicator/drawing interfaces
- [Performance targets](./prereqs/perf-targets.md)
- [Risk matrix](./prereqs/risk-matrix.md)

When adding a feature, update the relevant row in this file in the same PR.
