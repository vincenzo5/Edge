# Edge Chart — Feature Inventory

Living record of what the custom chart engine (`EdgeChart` + `src/lib/chart/`) supports today, what is partial, and what remains planned. **V1 chart contract closed June 2025** — see [v1-scope.md](./prereqs/v1-scope.md) and §13 post-V1 backlog below.

**Status key**

| Status | Meaning |
|--------|---------|
| **Done** | Works end-to-end in the app |
| **Partial** | Core path exists; gaps noted |
| **Stub** | Wired in UI/API but engine logic incomplete |
| **Planned** | Spec'd in prereqs; not implemented |
| **Legacy removed** | Former klinecharts path; deleted in Phase 4 |

For V1 targets and gesture specs, see [v1-scope.md](./prereqs/v1-scope.md) and [gesture-bible.md](./prereqs/gesture-bible.md).

---

## Architecture (current)

```
StockApp → ChartGrid → ChartCell → EdgeChart
              │ ChartSyncProvider (linked → crosshair broadcast)
              └─ per-cell wrapper (min-h-0, viewport-fitting grid)
                                      ├─ ChartLegendBar (OHLCV overlay, price pane)
                                      ├─ PaneLegendBar (indicator legend overlays, sub-panes)
                                      ├─ ChartCanvas (price pane)
                                      ├─ ChartCanvas (sub-panes, one per sub indicator)
                                      ├─ PaneSeparators (drag-resize between panes)
                                      ├─ PaneControlBar (move / remove / collapse / maximize on hover)
                                      └─ CrosshairOverlay (unified crosshair)
```

- **Engine**: Canvas 2D (`src/lib/chart/canvas.tsx`); `ChartCell` → `EdgeChart` only (legacy klinecharts removed June 2025).
- **Data**: Yahoo OHLCV via `POST /api/candles` (range load + optional `before` for edge prepend) → `series.ts` normalization.
- **Input**: Wheel + pinch on `[data-edge-chart]`, rAF-batched (`wheel.ts`, `pinch.ts`); pan momentum in `canvas.tsx`.
- **Plugins**: Indicators and drawings register through `pluginHost.ts` / registries; toolbar names are aliased to registry keys.
- **Multi-pane sync**: Imperative `ChartPaneHandle` registration (`paneHandle.ts`); time window synced across panes without React state on every wheel tick.
- **Multi-chart sync**: `ChartSyncProvider` in `ChartGrid`; source chart fires `onCrosshairTimestamp` → `broadcast`; peers receive via `ChartSyncBridge` → `setCrosshairFromSync`. Crosshair broadcast gated on `ChartLayout.linkCrosshair`; symbol/range/interval propagation gated on `linkSymbol` / `linkInterval`.
- **Persistence**: `ChartLayout` + per-cell `CellConfig` in `localStorage` via `layoutStorage.ts` (debounced 500 ms).

---

## Configuration reference

### `CellConfig` (per chart cell)

| Field | Purpose |
|-------|---------|
| `symbol`, `symbolName?`, `exchange?` | Ticker and display metadata (name/exchange set by symbol search) |
| `range` | History window: `1d`, `5d`, `1mo`, `3mo`, `6mo`, `ytd`, `1y`, `5y`, `max` |
| `interval` | Bar size: `1m`, `5m`, `15m`, `30m`, `1h`, `2h`, `1d`, `1wk`, `1mo` |
| `rangePreset?` | Active bottom-bar preset (`Range \| null`); `null` on default landing view |
| `chartType` | `candle_solid`, `candle_stroke`, `ohlc`, `area`, `heikin_ashi` |
| `indicators` | `{ id, name, pane, params?, visible? }[]` — UUID instance ids |
| `drawings` | Serialized overlay array |
| `paneOrder?` | Visual stacking order (`PRICE_PANE_KEY` + indicator keys) |
| `collapsedPanes?` | Pane keys collapsed to 28 px header height |
| `maximizedPane?` | Single pane expanded; others collapsed |
| `paneHeights?` | User-resized sub-pane heights (px), keyed by indicator key |
| `chartSettings?` | Grouped chart display settings (symbol, status line, scales, canvas, trading) — see `ChartSettingsModal` |

### `ChartLayout` (app-wide)

| Field | Purpose |
|-------|---------|
| `version` | Schema version (`1`) |
| `gridMode` | `1x1`, `2x1`, `1x2`, `3x1`, `2x2` |
| `linkSymbol` | When on: symbol / symbolName / exchange propagate to peer cells on active-cell update |
| `linkInterval` | When on: range / interval / rangePreset propagate to peer cells |
| `linkCrosshair` | When on: crosshair timestamp broadcast across visible cells |
| `activeCellIndex` | Focused cell (0…N−1); drawing tools apply here; persisted |
| `theme` | `light` \| `dark` (applied to `<html>` class) |
| `cells` | Array of `CellConfig` (length matches grid mode) |

**Multi-chart layout shell** (implemented): `StockApp` uses `h-screen overflow-hidden`; `ChartGrid` uses `flex-1 min-h-0 overflow-hidden` plus `chart-grid-rows-*` utilities in `globals.css` so all grid modes fit the viewport without page scroll. When `cellCount > 1`, cells use **compact chrome** (symbol + interval only; no per-cell Bar Replay).

---

## 1. Data & symbols

| Feature | Status | Notes |
|---------|--------|-------|
| Symbol search | **Done** | `SearchBar` in `ChartCell`; Yahoo lookup via `/api/search` |
| Symbol metadata persistence | **Done** | `symbolName`, `exchange` stored in `CellConfig` on select |
| Range selector (bottom bar) | **Done** | 1D, 5D, 1M, 3M, 6M, YTD, 1Y, 5Y, All — sets visible window **and** default interval (1D→1m, 5D→5m, 1M→30m, 3M→1h, 6M→2h, YTD/1Y→1d, 5Y→1wk, All→1mo). Click active preset again to deselect and restore default 1Y/1D landing view. Top interval dropdown overrides bar size and clears preset highlight. Calendar icon opens **Go to** modal (date or custom range) |
| Interval selector | **Done** | 1m, 5m, 15m, 30m, 1h, 2h, 1D, 1W, 1M — candle/bar resolution only; top toolbar dropdown |
| Chart type selector | **Done** | Cell toolbar; 5 types from `CHART_TYPES` |
| Yahoo candle fetch | **Done** | `fetchYahooCandles()` in `series.ts` |
| Candle validation / normalization | **Done** | Short-form `{ t,o,h,l,c,v }`; ms timestamps |
| Heikin Ashi transform | **Done** | Applied when `chartType === 'heikin_ashi'` |
| Bar Replay data slice | **Done** | `onDataLoaded` → `candleCount`; `baseCandles` + `applyVisibleSlice` (no refetch on scrub) |
| Infinite scroll / edge fetch | **Done** | Pan-left (`startIndex < 30`, 150 ms throttle) prepends via `POST /api/candles` `{ before }`; `adjustViewportForPrepend` keeps window stable |
| Event badge overlays | **Done** | Corporate, filing, macro, news, and options expiration events render in a reserved bottom event rail as grouped badges (count glyph when overlapping); click opens grouped detail card; full-height guides on hover/selection only. Chart settings default to earnings/dividends/splits/filings plus macro for benchmark symbols; news and options expirations are opt-in. |
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
| Price / time axes | **Done** | Right price strip (50 px), bottom time strip (30 px) on bottom pane only; price labels and horizontal grid use screen-space-aware anchored "nice" increments; time labels abstracted by visible span (month/year on daily zoom-out) |
| Last price line | **Done** | Blue horizontal line + label on price pane |
| Light / dark theme | **Done** | `Theme` tokens in `renderer.ts`; `StockApp` toggles `<html>` class |
| Last-price / axis guards | **Done** | Finite checks before draw (no `toFixed` on NaN) |
| Sub-pane candle body | **N/A** | Candles drawn on price pane only; sub-panes show indicators |

---

## 3. Legend & OHLCV readout

| Feature | Status | Notes |
|---------|--------|-------|
| Chart legend overlay | **Done** | `ChartLegendBar` → `PaneLegendBar` on price pane (`EdgeChart`) |
| Indicator pane legend | **Done** | `PaneLegendBar` on each sub-pane; `resolveIndicatorLegend()` + plugin `legendAt` |
| Crosshair bar values | **Done** | Global sync: all legends use crosshair `dataIndex` when crosshair is active |
| Last-bar fallback | **Done** | When crosshair absent, legends show last candle / last bar values |
| Change / change % | **Done** | vs previous close; `resolveLegendBar()` in `legend.ts` |
| Legend hover chrome | **Done** | Gray rounded background on legend hover (`PaneLegendBar`) |
| Per-section tooltips | **Done** | Reusable `Tooltip` component with hover/focus delay and `role="tooltip"` |
| Legend action slots | **Done** | Settings gear opens `IndicatorSettingsModal`; eye/delete still planned |
| Price / volume formatting | **Done** | `formatPrice`, `formatVolume`, `formatChange` in `format.ts` |
| Symbol display name | **Done** | Uses `symbolName` from config or fetches via `/api/search` |
| Interval / exchange labels | **Done** | Shown in legend header |

---

## 4. Viewport, pan, zoom, scale

| Feature | Status | Notes |
|---------|--------|-------|
| Initial viewport | **Done** | Range preset aligns left/right to selected window anchored on latest bar |
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
| Reset chart view (context menu) | **Done** | Blank menu + ⌥R shortcut; disabled when viewport default — [context-menu-reference.md §1.1](./context-menu-reference.md#11-chart-view) |
| Viewport modified detection | **Done** | `isViewportModified()` compares pan/zoom/scale to defaults |
| Hover cursors | **Done** | `resolveHoverCursor()` — crosshair, grab/grabbing, ns/ew-resize on axes |
| Drawing-tool cursor mode | **Done** | Active drawing tool shows crosshair cursor on canvas |
| Pinch zoom | **Done** | Two-pointer pinch on `[data-edge-chart]`; reuses `applyWheelAction` zoom |
| Per-pane independent time | **N/A** | Time is shared; price scale is per-pane |

---

## 5. Multi-pane layout

| Feature | Status | Notes |
|---------|--------|-------|
| Price pane fills cell when no subs | **Done** | `createInitialLayout()` |
| Sub-pane per sub indicator | **Done** | e.g. MACD gets own `ChartCanvas` |
| Fixed default sub height (100 px) | **Done** | `SUB_DEFAULT` in `panes.ts` |
| Collapsed sub height (28 px) | **Done** | When in `collapsedPanes` |
| Min price pane height (80 px) | **Done** | Clamps + shrinks subs in short cells |
| Maximize one pane | **Done** | `PaneControlBar` + `panes.ts`; persisted `maximizedPane` |
| Collapse pane | **Done** | Same; 28 px collapsed height |
| Pane reorder (`paneOrder`) | **Done** | `resolvePaneStackOrder` in `panes.ts`; move up/down in `PaneControlBar` |
| Drag-resize pane separator | **Done** | `PaneSeparators` + `applyBoundaryResize()`; persists `paneHeights` on drag end |
| Separator disabled states | **Done** | Disabled when adjacent pane collapsed or maximized |
| Pane header controls (hover) | **Done** | `PaneControlBar.tsx` inline per pane; shown only when `stack.length > 1` |
| 1 px border between sub-panes | **Done** | CSS `borderTop`; accounted in crosshair segment offsets |

---

## 6. Crosshair

| Feature | Status | Notes |
|---------|--------|-------|
| Unified crosshair overlay | **Done** | Single `CrosshairOverlay` spans all panes |
| Vertical line (all panes) | **Done** | `drawUnifiedCrosshair()` |
| Horizontal line (active pane) | **Done** | Clamped to active pane plot area |
| Free crosshair X default | **Done** | Vertical line follows cursor X freely between bars by default |
| Lock vertical cursor line | **Done** | Blank-menu toggle freezes the vertical line at the captured plot X until unlocked; menu hover suppresses crosshair updates |
| Price badge (Y-axis) | **Done** | `formatCrosshairValue()` + `priceForPlotY()` |
| Time badge (X-axis) | **Done** | Bottom pane only; `formatAxisTime()` |
| Indicator value at cursor | **Partial** | `valueAt` on MACD; other indicators lack it |
| Clear on container leave | **Done** | |
| No clear during wheel | **Done** | `wheelingRef` suppresses flicker |
| Clear when leaving chart (not sibling pane) | **Done** | `shouldClearCrosshairOnLeave()` |
| Hide crosshair while drawing | **Done** | `shouldHideCrosshair()` suppresses overlay + price pane crosshair during draw |
| Multi-chart crosshair sync | **Done** | `onCrosshairTimestamp` on source chart → `ChartSyncContext.broadcast` (when `linkCrosshair`) → peer `setCrosshairFromSync(ts)` via `findDataIndexForTimestamp` + `buildSyncedCrosshairState`; feedback loop guarded by `syncingCrosshairRef` |

---

## 7. Indicators

**TradingView reference:** Full indicator taxonomy (script kinds, placement, visuals, lifecycle) and a concise TV-vs-Edge comparison live in [tradingview-reference.md §5](./tradingview-reference.md#58-tradingview-vs-edge--indicators-summary).

**Foundation plan:** Scaling gaps (multiple instances, typed inputs, instance styles, declarative draw) and Tier 1 / Tier 2 rollout are documented in [indicator-foundation-plan.md](./indicator-foundation-plan.md).

**Architecture:** Unified catalog in `src/lib/chart/indicators/catalog.ts` + plugin registry in `registry.ts`. Picker reads `getCatalog()` — only `implemented: true` entries are clickable. MACD is the reference plugin pattern: `compute` → `outputs` → `draw`, with shared helpers in `indicators/math.ts` and `indicators/draw.ts`.

**Picker UI:** 30 catalog names across Trend (8), Momentum (16), Volume (5), and Volatility (1). Other categories exist in the type system but have no entries yet.

**Engine registry** (`indicators/registry.ts`): **15 implemented** plugins (MA, EMA, BOLL, MACD, RSI, VOL, VWAP, ATR, KDJ, CCI, OBV, DMI, WR, ROC, Supertrend); 15 catalog entries remain picker-disabled.

| Indicator | Pane | Status | Notes |
|-----------|------|--------|-------|
| MA | main | **Done** | `compute` + `sma`; paramSchema for period |
| EMA | main | **Done** | Exponential MA; settings modal |
| BOLL | main | **Done** | Upper/middle/lower bands via `computeBollinger` |
| VWAP | main | **Done** | Cumulative volume-weighted average price |
| MACD | sub | **Done** | Reference plugin: `compute` + `outputs`; shared draw helpers |
| RSI | sub | **Done** | Wilder RSI; fixed 0–100 Y-scale; 30/70 guides |
| VOL | sub | **Done** | Volume bars colored by candle direction |
| ATR | sub | **Done** | Wilder-smoothed true range |
| KDJ | sub | **Done** | Stochastic %K/%D + KDJ %J; 20/80 guides |
| CCI | sub | **Done** | Commodity Channel Index; ±100 guides |
| OBV | sub | **Done** | Cumulative on-balance volume line |
| DMI | sub | **Done** | +DI, -DI, ADX; Wilder method; 25 ADX guide |
| WR | sub | **Done** | Williams %R; -20/-80 guides |
| ROC | sub | **Done** | Rate of change (%); zero-centered Y-scale |
| Supertrend | main | **Done** | ATR-based trend line overlay; configurable period/multiplier |
| SMA, BBI, SAR, AVP | main | **Planned** | In catalog; picker disabled |
| BIAS, BRAR, … (momentum) | sub | **Planned** | In catalog; picker disabled (DMI, WR, ROC now **Done**) |
| VR, PVT | sub | **Planned** | In catalog; picker disabled |

| Feature | Status | Notes |
|---------|--------|-------|
| Toggle indicator in picker | **Done** | Add-only list; remove via Object Tree / pane controls |
| Multiple instances per name | **Done** | Picker always adds; lifecycle keyed by `id` |
| Typed indicator inputs | **Done** | `inputSchema` union (`number`, `enum`, `boolean`, `source`); `resolveIndicatorInputs` |
| Per-instance styles | **Done** | `styles` on `IndicatorConfig`; Settings modal Inputs + Style |
| Declarative plot draw | **Done** | `drawFromOutputs`; optional `draw` on plugins; `fillBetween` for BOLL bands |
| Picker grouped by category | **Done** | Trend / Momentum / Volume with descriptions |
| Indicator instance ids | **Done** | UUID per instance in `CellConfig.indicators`; `indicatorKey()` returns id |
| Param schema on plugins | **Done** | `paramSchema` + `defaultParams`; persisted via `createIndicatorInstance` |
| Main-pane overlay draw | **Done** | Filtered to price `ChartCanvas` |
| Sub-pane auto Y-scale | **Done** | `applyPanePriceScale()` uses `valueRangeForViewport` when available |
| Sub-pane legend overlay | **Done** | `PaneLegendBar` + declarative `compute`/`outputs`; MACD shows MACD/Signal/Hist |
| Declarative legend contract | **Done** | `compute` + `outputs` auto-build legend; optional `legendAt` override |
| Memoized indicator compute | **Done** | `getComputedSeries()` cache in `indicatorCompute.ts` (64 entries, keyed by params + candle bounds) |
| Default crosshair value | **Done** | `defaultValueAt()` uses first `outputs` entry when `valueAt` not defined |
| Indicator params UI | **Done** | Settings gear on sub-pane + main overlay legends → `IndicatorSettingsModal` |
| Indicator visibility toggle | **Done** | `visible` on `IndicatorConfig`; Object Tree eye toggle; hidden subs omitted from pane stack |
| Remove via Object Tree | **Done** | Per-indicator × button |

**Adding a new indicator**

1. Add catalog entry in `indicators/catalog.ts` (if not already listed)
2. Create plugin file following MACD pattern in `indicators/`
3. Register in `indicators/registry.ts`
4. Plugin must include: `category`, `description`, `paramSchema`, `compute`, `outputs`, `draw`
5. Use shared helpers from `math.ts` and `draw.ts`
6. Optionally override `valueAt`, `legendAt`, or `valueRangeForViewport`

Optional overrides: `legendAt` beats declarative outputs; `valueAt` beats `defaultValueAt` (first output).

---

## 8. Drawings

**Design:** [drawing-engine-design.md](./drawing-engine-design.md) — V1 drawing engine architecture, FSM, coordinate model, phased plan, and test oracles.

**Product vision:** [rich-annotations-vision.md](./rich-annotations-vision.md) — co-pilot annotation layer (semantic kinds, live payloads, chart↔chat linkage, phased roadmap).

**Foundation assessment:** [drawing-foundation.md](./drawing-foundation.md) — architecture readiness for scaling to the full TV toolset; UX shell alignment; platform gaps (multi-point loop, styles, undo, pane routing).

**Implementation plan:** [drawing-platform-plan.md](./drawing-platform-plan.md) — phased workstreams for multi-point FSM, typed styles, undo/redo, and pane routing.

**Toolbar design:** [drawing-toolbar-design.md](./drawing-toolbar-design.md) — grouped flyouts, utilities rail, icon system, persistence, phased TV parity.

**Toolbar layout:** Left rail in `ChartCell` — cursor + 3 grouped flyouts (Lines, Channels & Shapes, Annotation) + utilities (zoom, measure, ruler, magnet, keep-drawing, lock-all, hide-all, delete, clear).

**Registry aliases** (`pluginHost.ts`): 13 drawing tool names mapped to registry keys (12 grouped + measure utility).

**Engine registry** (`drawings/registry.ts`): 13 plugins registered.

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
| Measure (utility §6.9) | `measure` | **Done** (persisted; ephemeral in Phase 2) |
| Ruler (utility §6.9) | `ruler` | **Done** — shaded Δtime/Δprice band; bar count + cumulative volume; ⇧+click on price pane or toolbar |

| Feature | Status | Notes |
|---------|--------|-------|
| Grouped toolbar flyouts | **Done** | Lines, Channels & Shapes, Annotation; hover (desktop) / pin (touch) |
| Toolbar utilities rail | **Done** | Zoom, measure, ruler, magnet, keep-drawing, lock-all, hide-all, delete, clear |
| Toolbar prefs persistence | **Done** | `ChartLayout.toolbarPrefs` — group selections, magnet, keep-drawing |
| Start/stop drawing tool | **Done** | FSM: return to cursor after create unless keep-drawing ON |
| Two-point create + preview | **Done** | Click-click or drag-release; dashed ghost |
| Click select + CP edit | **Done** | `hitTestAll` + control-point drag |
| Draw on chart | **Done** | Price + sub-panes; z-sorted render per pane |
| Sub-pane drawing routing (platform 4.1) | **Done** | Pane-scoped input, coords, render; trend/hline on RSI |
| Full sub-pane tool parity (platform 4.2) | **Done** | All 13 tools; pane-scoped hit-test + selection |
| Object Tree pane labels (platform 4.2) | **Done** | Data window section headers; object tree uses flat labels |
| Serialize to `CellConfig.drawings` | **Done** | `timestamp`+`value` points; debounced 500 ms |
| Hit test / select | **Done** | 4px tolerance; topmost z-order |
| Edit control points | **Done** | Magnet applies on CP drag |
| Delete selected drawing | **Done** | Toolbar ⌫ + `onSelectionChange` sync |
| Magnet (snap OHLC) | **Done** | 5px strong magnet |
| Drawing context menu (rename/lock/hide/z) | **Done** | Canvas right-click hit-test → overlay menu — see [context-menu-reference.md §2](./context-menu-reference.md#2-drawing--overlay-context-menu) |
| Z-order / duplicate | **Done** | `bringForward`/`sendBackward`/`duplicateOverlay` |
| Object Tree drawings section | **Done** | Flat tracked overlay list; reorder via z-level drag |

---

## 9. App shell & layout

| Feature | Status | Notes |
|---------|--------|-------|
| Grid modes (1×1, 2×1, 1×2, 3×1, 2×2) | **Done** | Viewport-fitting grid (`min-h-0` chain + `chart-grid-rows-*`); compact cell chrome when N>1 |
| Link symbols (range/interval/symbol) | **Done** | Atomic propagation via `applyCellUpdate` in `StockApp`; includes `symbolName`/`exchange` |
| Active cell focus | **Done** | `activeCellIndex` persisted; focus ring; drawing tools disabled on inactive cells |
| Per-cell config | **Done** | `CellConfig` per grid cell |
| Layout persistence (localStorage) | **Done** | `loadLayout` / `saveLayout` in `layoutStorage.ts`; includes `sidebar.activePanel` |
| Theme persistence | **Done** | Part of `ChartLayout`; live switch via toolbar |
| Reset layout | **Done** | Toolbar confirm → defaults (clears saved drawings) |
| Drawing toolbar rail | **Done** | Left column in `ChartCell` |
| Right sidebar shell | **Done** | App-level icon rail + content panel in `StockApp`; registry in `sidebar/registry.ts` for watchlist, account, and object-tree panels |
| Account sidebar panel | **Partial** | App-level `account` panel via `AccountProvider` + `/api/brokerage/*`; overhauled layout with color-coded PnL, metric help tooltips, tabbed open orders/today's fills, icon refresh, day-trades in net-liq card, and computed leverage; live positions/PnL/summary/fills when TWS sidecar + IB Gateway connected; open orders require `TWS_READONLY=false`; what-if preview UI removed |
| Chart position overlay (`showPositions`) | **Partial** | Settings → Trading → Positions toggles avg-cost reference line on the active symbol from held position (`positionOverlays.ts`); buy/sell buttons, orders, executions, and PnL chart overlays not yet wired |
| Object Tree panel | **Done** | Right sidebar panel (`object-tree`); follows active chart via `ActiveChartContext`; Object tree / Data window tabs persisted per `chartId` |
| Object Tree — symbol row | **Done** | Flat list: symbol · exchange · interval |
| Object Tree — data window tab | **Done** | Crosshair date, collapsible price/indicator sections with hover eye toggles; indicator sections always show their value rows in the panel; Volume appears only for added `VOL`; price eye syncs `mainSeriesVisible` and hides the on-chart price legend |
| Object Tree — drawing rows | **Done** | z-sorted flat list; select, hover eye/lock/trash, rename, drag reorder |
| Indicator picker modal | **Done** | |
| Bar Replay panel | **Done** | Slider driven by `onDataLoaded`; slice via `visibleCount` without refetch |
| Blank chart context menu | **Done** | Reset, copy price, paste, object tree, crosshair lock toggle, templates, bulk remove (incl. combined), settings — [context-menu-reference.md §1](./context-menu-reference.md#1-blank-chart-plot-area) |
| Drawing overlay context menu | **Done** | Rename, settings, copy, paste, lock, hide, z-order, duplicate, remove — [context-menu-reference.md §2.2](./context-menu-reference.md#22-edge-overlay-menu-today) |
| Chart / study templates | **Done** | `presetStorage.ts` (`tv-ai:presets:v1`); save chart from blank menu; apply via `TemplatePickerModal`; save study from indicator settings |
| Price / time axis context menus | **Partial** | Price axis right-click → scale type, invert, scale-price-only, labels/lines submenus, more settings; double-click reset; time axis dedicated menu deferred — [context-menu-reference.md §3–4](./context-menu-reference.md#3-price-scale-y-axis-context-menu) |
| Old Chart (`Chart.tsx`) | **Legacy removed** | klinecharts wrapper deleted; `ChartCell` uses `EdgeChart` only |

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
| `onCrosshairMove` (prop) | **Done** | `{ timestamp, dataIndex, valueLabel, plotX }` for Object Tree, blank menu copy price, and crosshair lock capture |
| `getRawCandleCount` / `getCandles` | **Done** | Full base dataset length and display candles |
| `setCrosshairFromSync` | **Done** | Applies peer crosshair at timestamp; no re-broadcast |
| `getTrackedOverlays` | **Done** | |
| `removeOverlay` | **Done** | |
| `setOverlayVisible` / `setOverlayLocked` | **Done** | |
| `renameOverlay` | **Done** | |
| `duplicateOverlay` | **Done** | Clone via `drawingClone.ts` (offset anchor) |
| `pasteDrawings` | **Done** | Batch add from clipboard at crosshair anchor |
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
| Viewport | `viewport.test.ts` | Pan, zoom, scale, scroll buffer, `adjustViewportForPrepend`, `isViewportModified` |
| Layout | `layout.test.ts` | Plot width/height, drag mode, cursor resolution |
| Panes | `panes.test.ts` | Height allocation, clamping, `applyBoundaryResize`, `computePaneBoundaries` |
| Crosshair | `crosshair.test.ts` | Plot Y mapping, leave logic, `findDataIndexForTimestamp`, `clampIndexToViewport` |
| Wheel | `wheel.test.ts` | Delta normalization, axis routing |
| Pinch | `pinch.test.ts` | Distance ratio → zoom factor |
| Renderer | `renderer.test.ts` | Draw helpers |
| Series | `series.test.ts` | Heikin Ashi, slice, validation, `mergeCandlesPrepend`, `shouldPrefetchEdge` |
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
| Link propagation | `chartConfig.link.test.ts` | `pickLinkSymbolFields`, `pickLinkIntervalFields`, per-flag propagation, legacy `linked` migration, `activeCellIndex` persistence |
| Crosshair sync bus | `ChartSyncContext.test.tsx` | Broadcast when `linkCrosshair`; no-op when off |
| Blank chart context menu | `chartContextMenu.test.ts` | Menu builder items, disabled reset, counts, actions |
| Context menu UI | `ContextMenu.test.tsx` | Viewport clamping; disabled items |
| App smoke | `StockApp.test.tsx` | Render, theme hydration |

Run engine tests: `npm test -- --run src/lib/chart/`  
Run layout/sync tests: `npm test -- --run src/app/components/ChartGrid.layout.test.tsx src/lib/chartConfig.link.test.ts src/app/components/ChartSyncContext.test.tsx`

---

## 12. Key source files

| Area | Path |
|------|------|
| React chart host | `src/app/components/EdgeChart.tsx` |
| Pane header controls | `src/app/components/PaneControlBar.tsx` |
| Indicator settings modal | `src/app/components/IndicatorSettingsModal.tsx` |
| Context menu | `src/app/components/chartContextMenu.ts`, `ContextMenu.tsx` |
| OHLCV legend overlay | `src/app/components/ChartLegendBar.tsx` |
| Pane drag-resize UI | `src/app/components/PaneSeparators.tsx` |
| Per-pane canvas | `src/lib/chart/canvas.tsx` |
| Crosshair overlay | `src/lib/chart/CrosshairOverlay.tsx` |
| Viewport math | `src/lib/chart/viewport.ts` |
| Wheel input | `src/lib/chart/wheel.ts` |
| Pinch input | `src/lib/chart/pinch.ts` |
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
| Indicator catalog | `src/lib/chart/indicators/catalog.ts` |
| Layout persistence | `src/lib/layoutStorage.ts` |
| Template library | `src/lib/presetStorage.ts`, `src/lib/chart/presets/` |
| Drawing clipboard | `src/lib/chart/chartClipboard.ts`, `src/lib/chart/drawingClone.ts` |
| Template picker UI | `src/app/components/TemplatePickerModal.tsx` |

---

## 13. Post-V1 backlog (not blockers)

V1 chart contract closed June 2025 (Phases 0–4). Remaining work is polish and catalog expansion — not V1 must-ship.

| Area | Notes |
|------|-------|
| **Indicator platform (Tier 1 + 2)** | [indicator-foundation-plan.md](./indicator-foundation-plan.md) — id lifecycle, typed inputs, styles, declarative draw; blocks catalog batch |
| **Catalog indicators** | 15 of 30 catalog entries implemented (batches 1–2); further batches deferred |
| **`valueAt` on all plugins** | MACD + defaults cover crosshair; explicit overrides optional for remaining plugins |
| **Legend eye/delete actions** | Settings gear done; per-legend visibility/delete still deferred |
| **Granular layout sync** | **Done** | Independent `linkSymbol`, `linkInterval`, `linkCrosshair`, `linkDrawings` toggles in layout setup menu; legacy `linked` migrated on load |
| **Drawing sync across cells** | **Done** | `linkDrawings` propagates drawings via layout state + runtime sync bus |
| **Named drawing templates** | Copy/paste only; no “Save as template” on drawings |
| **Drawing visibility intervals** | Deferred — show drawing only on selected timeframes |
| **Template export/import** | localStorage only; no JSON download |
| **Undo/redo drawings** | **Done** — `DrawingStore` + keyboard shortcuts; kept here as recently closed context |
| **Log / percent / indexed scale modes** | **Done** | `priceScaleType` in `chartSettings`; price-axis context menu + Settings modal |
| **Go to date** | **Done** | Range-bar calendar icon + chart context menu (⌥G); centers single date or fits custom range; fetches older bars when needed |
| **Replay position persist** | Bar Replay state not saved to `CellConfig` |

**Recently closed (V1 contract):** EMA + VOL plugins; Bar Replay wiring; pane controls (`PaneControlBar`); edge fetch on pan-left; Object Tree data window; indicator params modal; pinch zoom; klinecharts removal.

---

## 14. Recommended next work (post-V1)

Prioritized against [tradingview-reference.md](./tradingview-reference.md). Edge is a chart engine, not a full TV platform — defer alerts, Pine, screeners, and cross-device sync.

### Tier A — High ROI polish

| Priority | Edge work | Notes |
|----------|-----------|-------|
| A0 | ~~**Blank chart context menu — remaining**~~ | **Done** — `ChartSettingsModal`, blank-menu **Settings…**, ⌥R reset, crosshair lock toggle, combined bulk remove |
| A1 | ~~**Batch indicator plugins** — next 5–10 catalog entries~~ | **Deferred** — batches 1–2 shipped (15 studies); further expansion not near-term |
| A2 | ~~**Granular layout sync toggles**~~ | **Done** — separate symbol / interval / crosshair / drawings toggles in `ChartLayoutMenu` |
| A3 | ~~**Undo/redo for drawings**~~ | **Done** — `DrawingStore` + ⌘Z / ⌘⇧Z in active cell |

### Tier B — TV parity (lower urgency)

| Priority | Edge work | Notes |
|----------|-----------|-------|
| B1 | ~~**Drawing sync across layout cells**~~ | **Done** — `linkDrawings` + stable IDs + layout/runtime propagation |
| B2 | ~~**Log / percent / indexed-to-100** price scale modes~~ | **Done** — `priceScaleTransform` + axis menu + settings |
| B3 | ~~**Go to date** / jump viewport~~ | **Done** — `ChartGoToModal`, `goTo.ts`, range-bar icon |
| B4 | **Persist Bar Replay position** | Optional `CellConfig` field |

### Tier C — Explicit deferrals

- Pine Script / community indicators
- Alerts on price or drawings
- Non-time charts: Renko, P&F, Kagi
- Volume footprint, TPO, session profile
- 16-chart layouts, watchlists, cloud sync

---

## Related docs

- [Context menu reference](./context-menu-reference.md) — TradingView context menus by click target; Edge parity per item
- [TradingView reference](./tradingview-reference.md) — External benchmark inventory (Supercharts feature set)
- [V1 scope lock](./prereqs/v1-scope.md) — Original must-ship list
- [Gesture bible](./prereqs/gesture-bible.md) — Interaction spec (target behavior)
- [Integration map](./prereqs/integration-map.md) — How EdgeChart slots into the app
- [Plugin API](./prereqs/plugin-api.md) — Indicator/drawing interfaces
- [Performance targets](./prereqs/perf-targets.md)
- [Risk matrix](./prereqs/risk-matrix.md)

When adding a feature, update the relevant row in this file in the same PR.
