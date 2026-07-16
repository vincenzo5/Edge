# Context Menu Reference — TradingView vs Edge

Inventory of TradingView Supercharts context menus (right-click / long-press), organized by **what you clicked**. Use this when scoping blank-chart menu work, drawing menus, or axis menus.

**Edge implementation status** is tracked per item. “Capability elsewhere” means the behavior exists outside the context menu (toolbar, Object Tree, keyboard, etc.) but is not wired to that menu yet.

For live Edge status summaries, see [features.md](./features.md). For the broader TradingView feature set, see [tradingview-reference.md](./tradingview-reference.md).

**Sources:** TradingView Supercharts UX (June 2025–2026), [Advanced Charts context menu docs](https://www.tradingview.com/charting-library-docs/latest/ui_elements/context-menu), [Supercharts configuration guide](https://www.tradingview.com/support/solutions/43000748166-how-to-configure-your-supercharts/), user screenshot (blank chart, BRUN @ 46.18), Edge codebase audit.

---

## Menu variants (by click target)

TradingView exposes different menus depending on hit target. The charting library identifies menus for **series**, **drawings**, **indicators**, **orders**, and **positions** (`CreateContextMenuParams`).

| Click target | Typical menu purpose |
|--------------|----------------------|
| Blank chart plot area | Viewport, clipboard, cursor, navigation panels, bulk remove, settings |
| Drawing / annotation | Edit, style, z-order, clipboard, alerts, remove |
| Indicator legend / pane header | Settings, hide, remove, move pane |
| Price scale (Y-axis) | Scale mode, reset, invert, “scale price only” |
| Time scale (X-axis) | Bar spacing reset, go to date |
| Candle / price series | Copy price, alert, order shortcuts (when trading enabled) |
| Order / position on chart | Modify, close, bracket edit (broker-connected) |

Edge today implements **blank chart**, **drawing overlay**, and **price-axis** context menus.

---

## 1. Blank chart plot area

Right-click on empty canvas (not on a drawing, legend, or axis). TradingView **always** shows this menu; counts and prices are dynamic.

### 1.1 Chart view

| Item | Shortcut | Description | Edge status | Edge notes |
|------|----------|-------------|-------------|------------|
| **Reset chart view** | ⌥ R (Alt+R) | Reset pan, zoom, and scales to default fit | **Done** | Blank menu + global ⌥R shortcut via `buildShortcutCommands`; disabled when viewport default |
| **Reset scale** | — | Reset price/time scales (subset of full reset) | **Partial** | Double-click price axis → auto scale per pane; not in blank menu |
| **Clear chart cache** | — | Fix display glitches without changing layout | **None** | N/A for custom canvas engine |

### 1.2 Clipboard

| Item | Shortcut | Description | Edge status | Edge notes |
|------|----------|-------------|-------------|------------|
| **Copy price** *N.NN* | — | Copy Y-axis price at cursor to clipboard | **Done** | Crosshair `valueLabel` → blank menu → `navigator.clipboard.writeText` |
| **Paste** | ⌘ V | Paste copied drawing(s) or config from clipboard | **Done** | In-memory `chartClipboard.ts`; paste at crosshair via `EdgeChart.pasteDrawings`; blank + drawing menus |

### 1.3 Alerts & trading (symbol @ price)

Shown when a broker is connected and/or alerts are enabled. Labels include symbol and price at cursor.

| Item | Shortcut | Description | Edge status | Edge notes |
|------|----------|-------------|-------------|------------|
| **Add alert on {SYMBOL} at {price}…** | ⌥ A | Create price alert at crosshair level | **Out of scope** | Deferred in [features.md §14](./features.md); no alerts platform |
| **Sell {qty} {SYMBOL} @ {price} limit** | ⌥ ⇧ S | Quick limit sell at price | **Out of scope** | Platform / broker integration |
| **Buy {qty} {SYMBOL} @ {price} stop** | — | Quick stop buy at price | **Out of scope** | Platform / broker integration |
| **Add order on {SYMBOL} at {price}…** | ⇧ T | Open order ticket at price | **Out of scope** | Platform / broker integration |

### 1.4 Cursor

| Item | Shortcut | Description | Edge status | Edge notes |
|------|----------|-------------|-------------|------------|
| **Lock vertical cursor line by time** | — | Toggle: freeze the vertical crosshair line at its current X position vs free cursor follow | **Done** | Blank menu toggle → `chartSettings.canvas.lockCrosshairToTime`; default off; locked X stored in `lockedCrosshairPlotX`; menu hover suppresses crosshair updates |

### 1.5 View & organization

| Item | Shortcut | Description | Edge status | Edge notes |
|------|----------|-------------|-------------|------------|
| **Table view** | — | Tabular OHLC / study values | **None** | Object Tree data window is related but not TV table view |
| **Object tree** | — | Open Object Tree panel | **Done** | Blank menu + toolbar “Tree” toggle → `ObjectTree` panel |
| **Chart template** → submenu | — | Save / apply / manage chart templates | **Partial** | Flat menu items: Save / Apply → `presetStorage.ts` + `TemplatePickerModal`; no rename/export |

**Chart template submenu (TradingView):**

| Sub-item | Description | Edge status |
|----------|-------------|-------------|
| Save chart template | Save indicators, chart type, scales, appearance as preset | **Done** | Blank menu → `chartTemplateFromCell` → `tv-ai:presets:v1` |
| Apply chart template | Load saved preset | **Done** | Blank menu → `TemplatePickerModal` (chart tab) |
| Apply defaults | Reset to factory chart settings | **None** | Use `ChartSettingsModal` reset |
| Manage templates | List / rename / delete templates | **Partial** | Delete in picker modal; no rename in v1 |

### 1.6 Bulk remove

Dynamic labels reflect counts on the chart.

| Item | Shortcut | Description | Edge status | Edge notes |
|------|----------|-------------|-------------|------------|
| **Remove {N} drawings** | — | Delete all drawings on chart | **Done** | Blank menu → `clearDrawings()` when count > 0 |
| **Remove {N} indicators** | — | Remove all indicators | **Done** | Blank menu → `update({ indicators: [] })` when count > 0 |
| **Remove drawings and indicators** | — | Clear both | **Done** | Blank menu when both counts > 0 |

### 1.7 Settings

| Item | Shortcut | Description | Edge status | Edge notes |
|------|----------|-------------|-------------|------------|
| **Settings…** | — | Full chart settings dialog (Symbol, Status line, Scales, Canvas, Trading, Template) | **Partial** | Blank menu + cell toolbar gear → `ChartSettingsModal` (Symbol, Status line, Scales, Canvas, Trading, Template; excludes Alerts/Events); indicator/drawing modals separate |

**Settings dialog sections (TradingView — opened from blank menu or gear):**

| Section | Key options | Edge status |
|---------|-------------|-------------|
| Symbol | Candle colors, precision, timezone, previous-close coloring | **Partial** — body/border/wick colors, precision, timezone; no dividend adjustment |
| Status line | Logo, title, OHLC values visibility | **Partial** — granular toggles in `ChartSettingsModal`; legend bar |
| Scales and lines | Price scale mode, labels, countdown, time format | **Partial** — log/percent/indexed, labels, countdown, axis text size |
| Canvas | Background, grid, crosshair style, watermark | **Partial** — background, grid orientation/style/opacity, crosshair mode/style, margins, button visibility prefs |
| Trading | Buy/sell buttons, order display, P&L labels | **Partial** — display-only toggles + header Trade ticket (`TradeTicketModal`); no in-chart broker overlays yet |
| Alerts | Alert line appearance on chart | **None** |
| Events | Dividends, earnings, news markers | **None** |
| Template | Save/apply (duplicate of submenu) | **Partial** — Template section + blank menu items |

---

## 2. Drawing / overlay context menu

Right-click on a selected or hit-tested drawing. Edge implements this via `buildOverlayContextMenuItems()` in `ChartCell.tsx` (same items as `OverlayContextMenu.tsx`).

### 2.1 TradingView drawing menu (full)

| Item | Shortcut | Description | Edge status | Edge notes |
|------|----------|-------------|-------------|------------|
| **Settings…** | — | Drawing style dialog (color, line, extend, labels, visibility intervals) | **Partial** | `DrawingSettingsModal` — line color/width/dash, extend, fill, text (tool-aware); no visibility intervals |
| **Rename** | F2 | Edit drawing label | **Done** | Context menu + Object Tree inline rename |
| **Lock** / **Unlock** | ⌘ L | Prevent move/edit | **Done** | Per-drawing + toolbar lock-all |
| **Hide** / **Show** | — | Toggle visibility | **Done** | Per-drawing + toolbar hide-all |
| **Bring to Front** | — | Max z-order | **Done** | `bringForward()` (single step; TV also has explicit front) |
| **Send to Back** | — | Min z-order | **Done** | `sendBackward()` |
| **Bring Forward** | — | One z-level up | **Done** | Menu label “Bring to Front” maps to `bringForward` |
| **Send Backward** | — | One z-level down | **Done** | Menu label “Send to Back” maps to `sendBackward` |
| **Clone** | Ctrl/Cmd+drag | Duplicate in place | **Partial** | **Duplicate** menu item (`⌘D`); no drag-clone |
| **Copy** | ⌘ C | Copy drawing to clipboard | **Done** | `chartClipboard.ts` + active-cell ⌘C |
| **Paste** | ⌘ V | Paste at cursor | **Done** | Crosshair anchor via `drawingClone.ts` |
| **Add alert on drawing…** | — | Alert on drawing geometry / levels | **Out of scope** | — |
| **Create a group** | — | Object Tree grouping | **None** | — |
| **Save as template** | — | Save drawing preset | **None** | — |
| **Remove** | ⌫ / Delete | Delete drawing | **Done** | Context menu + toolbar delete when selected |

### 2.2 Edge overlay menu today

Current items (when right-click hits a drawing on the price pane):

0. **Trade setup…** — long/short position drawings only; opens Trade sidebar panel bound to that drawing
1. Rename (F2)
2. Settings…
3. Copy (⌘C)
4. Paste (⌘V) — when clipboard has drawings
5. Lock / Unlock (⌘L)
6. Hide / Show
7. Bring to Front
8. Send to Back
9. Duplicate (⌘D)
10. Remove (⌫)

**Gaps vs TradingView:** Clone-via-drag, alerts, groups, named drawing templates, visibility intervals, explicit Bring Forward / Send Backward labels.

---

## 3. Price scale (Y-axis) context menu

Right-click the price axis strip.

| Item | Shortcut | Description | Edge status | Edge notes |
|------|----------|-------------|-------------|------------|
| **Reset price scale** | Double-click axis | Return to auto-fit for pane | **Done** | Double-click price axis → `resetPanePriceScale()` |
| **Scale price chart only** | — | Indicators don’t affect Y range | **Done** | Price axis context menu toggle → `scales.scalePriceChartOnly` |
| **Invert scale** | ⌥ I | Flip price axis | **Done** | Price axis menu toggle; shortcut label shown (global binding deferred) |
| **Auto** | — | Linear auto scale | **Done** | Default `priceScaleType: 'linear'` |
| **Logarithmic** | — | Log scale | **Done** | Price axis menu + Settings → Scales |
| **Percent** | — | % from first visible bar | **Done** | Price axis menu + Settings → Scales |
| **Indexed to 100** | — | Rebase to 100 | **Done** | Price axis menu + Settings → Scales |
| **Merge all scales to left** / **to right** | — | Multi-pane scale alignment | **None** | — |
| **More settings…** | — | Opens chart settings → Scales | **Done** | Price axis menu → `ChartSettingsModal` Scales section |

---

## 4. Time scale (X-axis) context menu

Right-click the time axis strip.

| Item | Shortcut | Description | Edge status | Edge notes |
|------|----------|-------------|-------------|------------|
| **Reset bar spacing** | Double-click time axis | Default zoom / bar width | **Partial** | `resetChartView()` resets time window; no axis-only menu |
| **Go to date…** | ⌥ G | Jump viewport to date | **Done** | Chart context menu + range-bar calendar; `ChartHandle.goTo` |
| **Lock/unlock time scale** | — | Prevent horizontal zoom/pan | **None** | — |
| **More settings…** | — | Time format, weekdays, pin to left | **None** | — |

---

## 5. Indicator legend / pane context menu

Right-click indicator name in legend or pane header area.

| Item | Shortcut | Description | Edge status | Edge notes |
|------|----------|-------------|-------------|------------|
| **Settings…** | — | Indicator inputs (period, etc.) | **Done** | Legend gear → `IndicatorSettingsModal` |
| **Hide** / **Show** | — | Toggle indicator visibility | **Done** | Object Tree eye; `visible` on `IndicatorConfig` |
| **Remove** | — | Remove indicator from chart | **Done** | Object Tree ×; pane controls; picker toggle |
| **Move pane up** / **Move pane down** | — | Reorder sub-panes | **Done** | `PaneControls` on hover (not legend menu) |
| **Collapse pane** / **Maximize pane** | — | Pane layout | **Done** | `PaneControls` (not legend menu) |
| **Add alert on {indicator}…** | — | Alert on indicator condition | **Out of scope** | — |
| **Copy source** | — | Copy Pine source (community scripts) | **Out of scope** | No Pine |

---

## 6. Series / candle context menu

Right-click directly on candles or the price series (TradingView treats this separately from blank area).

| Item | Description | Edge status |
|------|-------------|-------------|
| **Copy price** | Price at clicked bar | **None** |
| **Add alert…** | Alert on bar close / OHLC | **Out of scope** |
| **Buy / Sell / Add order** | Trading shortcuts | **Out of scope** |
| **Settings…** (double-click) | Symbol / chart type settings | **Partial** — cell toolbar selects |

Edge does not distinguish series hit-test from blank plot for context menu purposes today.

---

## 7. Orders, positions & executions (broker-connected)

Only when paper/live trading is enabled. Not applicable to Edge chart engine scope.

| Item | Description | Edge status |
|------|-------------|-------------|
| Modify order | Drag/edit from chart | **Out of scope** |
| Cancel order | Remove pending order | **Out of scope** |
| Close position | Flatten at market | **Out of scope** |
| Reverse position | Flip long/short | **Out of scope** |
| Protect position | Add bracket TP/SL | **Out of scope** |

---

## 8. Edge implementation map

| Menu | File(s) | Behavior |
|------|---------|----------|
| Blank chart | `chartContextMenu.ts` → `buildChartContextMenuItems`; `ChartCell.tsx` → `handleChartContextMenu` | Fallback when price-pane context menu is not consumed: reset (disabled when default), copy price, object tree, bulk remove when counts > 0 |
| Drawing overlay | `canvas.tsx` hit-test → `handleDrawingContextMenu`; `chart-cell/overlayContextMenu.ts` → `buildOverlayContextMenuItems` | Full overlay menu (§2.2); position drawings add Trade setup… |
| Price axis | `canvas.tsx` right-click on price strip | Scale type menu (Auto/Log/Percent/Indexed), reset, More settings…; double-click → reset auto |
| Indicator settings | `PaneLegendBar` gear → `onLegendAction` | Modal, not context menu |
| Object Tree | `ChartCell.tsx` toolbar toggle + blank menu | Panel |

---

## 9. Recommended implementation order (blank chart menu)

Prioritized to close parity with TradingView’s blank-chart panel without platform features:

| Priority | Item | Effort |
|----------|------|--------|
| ~~P0~~ | ~~Always show blank menu~~ | **Done** |
| ~~P1~~ | ~~Copy price at cursor~~ | **Done** |
| ~~P1~~ | ~~Object tree~~ | **Done** |
| ~~P1~~ | ~~Remove *N* drawings / Remove *N* indicators~~ | **Done** |
| ~~P2~~ | ~~Settings… (minimal chart settings modal)~~ | **Done** |
| ~~P2~~ | ~~Reset chart view shortcut ⌥R~~ | **Done** |
| ~~P2~~ | ~~Lock vertical cursor by time (toggle)~~ | **Done** |
| ~~P3~~ | ~~Paste / Copy drawings~~ | **Done** |
| ~~P3~~ | ~~Chart template save/apply~~ | **Done** — study templates via indicator settings |
| P3 | Table view | Large |
| — | Alerts, trading, orders | Out of scope |

---

## Related docs

- [Edge feature inventory](./features.md) — implementation status by subsystem
- [TradingView reference](./tradingview-reference.md) — full Supercharts benchmark
- [Gesture bible](./prereqs/gesture-bible.md) — Edge interaction targets (crosshair snap, drawing hit-test)
- [Drawing engine design](./drawing-engine-design.md) — overlay selection and context menu wiring

When adding or wiring a context menu item, update the relevant row in **this file** and the summary rows in [features.md](./features.md) in the same PR.
