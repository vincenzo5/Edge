# Edge Chart — V1 Drawing Engine Design

Implementation-ready design for the custom-canvas drawing stack. **Planning only** — no code in this document.

**Benchmarks:** [tradingview-reference.md §6 / §6.10](./tradingview-reference.md), [v1-scope.md items 8–9](./prereqs/v1-scope.md), [gesture-bible.md §Drawing Tools](./prereqs/gesture-bible.md), [plugin-api.md](./prereqs/plugin-api.md).

**Related:** [features.md §8](./features.md) (live status).

---

## 1. Current-state audit

### 1.1 Call chain (today)

```
DrawingToolbar.onToolSelect(toolName)
  → ChartCell.handleToolSelect (gated: isActive cell only)
    → ChartHandle.startDrawing(toolName)          // EdgeChart: setActiveDrawingTool
      → activeTool prop → ChartCanvas (price pane)  // cursor only; no create/edit input

[data-edge-chart] onClick → EdgeChart.handleCanvasClick
  → DrawingRegistry.get(activeDrawingTool)        // alias map in pluginHost.ts
  → plugin.create({ x, y }, liveVp)               // container-local x/y, NOT plot coords
  → drawingsRef + trackedRef + notifyOverlayChange
  → setActiveDrawingTool(null)                    // auto-exit after one click

ChartCanvas.draw loop
  → for each drawing: DrawingRegistry.get(d.name).draw(..., selected: false)

ChartCell.subscribeOverlayChange
  → debounced serializeDrawings → CellConfig.drawings (500 ms)
```

**Input authority is split:** mouse down/move/up live on per-pane `ChartCanvas`; drawing create listens on the outer `[data-edge-chart]` container click. Selection, hit-test, and control-point drag exist nowhere.

### 1.2 Registry & aliases

| Toolbar name (`DrawingToolbar`) | Alias target (`pluginHost.ts`) | Registry plugin | Status |
|----------------------------------|--------------------------------|-----------------|--------|
| `__cursor__` | — | — | Navigate mode (not a plugin) |
| `horizontalStraightLine` | `horizontal_line` | `hline.ts` | **Stub** — empty points, no draw |
| `verticalStraightLine` | *(none)* | — | **Missing** — `create()` returns undefined |
| `straightLine` | `trend_line` | `trend_line.ts` | **Stub** — placeholder points, no line draw |
| `rayLine` | *(none)* | — | **Missing** |
| `parallelStraightLine` | *(none)* | — | **Missing** |
| `priceChannelLine` | *(none)* | — | **Missing** |
| `rect` | `rectangle` | `rect.ts` | **Stub** — fixed demo rect at (100,100) |
| `circle` | *(none)* | — | **Missing** |
| `fibonacciLine` | *(none)* | — | **Missing** |
| `priceLine` | *(none)* | — | **Missing** |
| `simpleAnnotation` | *(none)* | — | **Missing** |

Only three aliases exist; nine toolbar tools resolve to `undefined` in `DrawingRegistry.get()`.

### 1.3 Stub & gap inventory

| Area | Location | Gap vs V1 / TV §6 |
|------|----------|-------------------|
| Plugin `create` | `trend_line`, `hline`, `rect` | No x/y → `{ timestamp, value }` conversion; trend/rect need two points |
| Plugin `draw` | all three | No viewport mapping; rect draws hard-coded pixels |
| Plugin `hitTest` | all three | Always `false` |
| Control points | plugin API optional methods | Never implemented or called |
| `hitTestAll` | `pluginHost.ts` | Returns `null` always |
| Selection | — | No `selectedDrawingId` in engine; `ChartCell.selectedOverlayId` set only via context menu (never canvas click) |
| Two-point create | `handleCanvasClick` | Single click; no drag-to-second-point; auto-exits tool |
| Preview (ghost) | — | Not implemented |
| Magnet | `EdgeChart.setMagnet` | `console.log` only; toolbar toggle wired |
| Z-order | `bringForward` / `sendBackward` | No-ops; Object Tree drag calls stub `bringForward` |
| Duplicate | `duplicateOverlay` | Returns `null` |
| Right-click on drawing | `onOverlayRightClick` prop | Passed from `ChartCell` but **never invoked** in `EdgeChart` |
| Crosshair while drawing | gesture-bible | Crosshair still shown when tool armed |
| Coordinate space | `handleCanvasClick` | Container x/y includes legend overlay, sub-pane stack, separators; ignores `PRICE_AXIS_WIDTH` / `TIME_AXIS_HEIGHT` |
| Y mapping consistency | `viewport.ts` vs `canvas.tsx` | `priceAtY`/`yForPrice` use full `vp.height`; crosshair clamps Y to `plotHeight()` — drawings must use **plot space** consistently |
| Sub-pane drawings | `EdgeChart` | Sub `ChartCanvas` gets `drawings={[]}`; V1 price pane only |
| Persistence | `SerializedDrawing.points` | Schema exists; stubs write empty or zero points |
| Tests | — | **Zero** drawing-specific tests |

### 1.4 What already works

- Toolbar → `startDrawing` / `stopDrawing` / cursor tool exit
- Active-cell-only drawing (`DrawingToolbar disabled={!isActive}`)
- `drawingsRef` + `trackedRef` lifecycle; restore from `config.drawings` after data load
- Debounced persist to `CellConfig.drawings`
- Object Tree list, visibility, lock, rename, delete
- Drawings rendered on price pane canvas (when plugin `draw` is implemented)
- `visible` / `locked` flags honored at draw time (`visible` only today)

---

## 2. Target architecture

### 2.1 Module layers

```
┌─────────────────────────────────────────────────────────────┐
│ ChartCell / DrawingToolbar / ObjectTree  (shell — unchanged)│
└───────────────────────────┬─────────────────────────────────┘
                            │ ChartHandle (extended, §9)
┌───────────────────────────▼─────────────────────────────────┐
│ EdgeChart — DrawingController (new module or inline)        │
│  • interaction FSM (§3)                                     │
│  • selectedDrawingId, magnetEnabled, keepDrawing (defer)    │
│  • previewDrawing state                                     │
│  • delegates hit-test / z-order / duplicate                 │
└───────┬───────────────────────────────┬─────────────────────┘
        │ drawings + preview            │ input events
┌───────▼──────────┐          ┌─────────▼────────────────────┐
│ ChartCanvas       │          │ drawingCoords.ts (new)        │
│  • pass selectedId│          │  plot ↔ data point conversion │
│  • onDrawingInput │          │  magnet snap (OHLC 5px)       │
│  • suppress pan   │          └───────────────────────────────┘
│    when drawing   │
└───────┬───────────┘
        │
┌───────▼───────────────────────────────────────────────────┐
│ pluginHost.ts — aliases, hitTestAll, sortByZ, serializeAll  │
│ drawings/registry.ts + per-tool plugins                     │
│ drawings/primitives.ts (new) — segment distance, rects, CP │
└─────────────────────────────────────────────────────────────┘
```

**Principle:** `ChartCanvas` on the **price pane** owns all pointer input for drawings. Remove `onClick` create from the outer container. Sub-panes continue to receive empty `drawings` in V1.

### 2.2 State ownership

| State | Owner | Persisted? |
|-------|-------|------------|
| `drawings[]` (geometry + meta) | `EdgeChart` (`drawingsRef`) | Yes → `CellConfig.drawings` |
| `trackedOverlays` (id, label, zLevel, paneId) | `EdgeChart` (`trackedRef`) | Derived from drawings + ids |
| `selectedDrawingId` | `EdgeChart` (source of truth) | No |
| `activeDrawingTool` | `EdgeChart` | No |
| `magnetEnabled` | `EdgeChart` | No (toolbar local state today; optional future persist) |
| `placingPreview` (in-progress geometry) | `EdgeChart` | No |
| `selectedOverlayId` (UI) | `ChartCell` | Mirror via `ChartHandle.getSelectedDrawingId()` + callback |

**Recommendation:** Engine owns selection; `ChartCell` subscribes via new `onSelectionChange(id)` or polls `getSelectedDrawingId()` so delete key, context menu, and Object Tree highlight stay in sync.

### 2.3 Render order (z-order)

1. Grid + candles + indicators (existing)
2. Drawings sorted by `zLevel` ascending (lower = underneath)
3. Preview drawing (if placing) — dashed style, above committed drawings
4. Selected drawing control points (engine overlay or plugin `draw(..., selected: true)`)
5. Axes + last price (existing — drawings stay under axis labels)

`hitTestAll` iterates **reverse** z-order (topmost first).

---

## 3. Interaction finite-state machine

### 3.1 States

```
                    startDrawing(tool)
         ┌──────────────────────────────────────┐
         │                                      │
         ▼                                      │
      ┌──────┐  select cursor   ┌────────────┐  │
      │ IDLE │◄─────────────────│ TOOL_ARMED │──┘
      └──┬───┘                  └─────┬──────┘
         │                            │ click plot (1-point tools)
         │ click empty plot           │ click plot (start 2-point)
         │ (cursor mode)              ▼
         │                      ┌──────────┐
         │                      │ PLACING  │◄── mousemove updates preview
         │                      └────┬─────┘
         │                           │ click / mouseup (2-point finish)
         │                           ▼
         │                      ┌──────────┐     click empty plot
         ├─────────────────────►│ SELECTED │◄────────────────────┐
         │   hit drawing        └────┬─────┘                     │
         │                           │ drag control point        │
         │                           ▼                           │
         │                      ┌─────────────┐                   │
         │                      │ DRAGGING_CP │───────────────────┘
         │                      └─────────────┘   mouseup → SELECTED
         │
         │  (TOOL_ARMED + click drawing → SELECTED, stop tool)
         └─ ...
```

| State | Pan/zoom | Crosshair | Pointer on plot |
|-------|----------|-----------|-----------------|
| `IDLE` | Yes | Yes | Select drawing or start pan |
| `TOOL_ARMED` | No* | **Hidden** (gesture-bible) | Place first point |
| `PLACING` | No | Hidden | Preview + second point |
| `SELECTED` | Yes** | Yes | Drag CPs; click empty to deselect |
| `DRAGGING_CP` | No | Hidden | Move one control point |

\*Wheel zoom may remain enabled (TV allows zoom while tool selected); **body drag pan is suppressed** when `TOOL_ARMED` or `PLACING`.

\*\*Body drag pans unless pointer is on a control point (8px hit).

### 3.2 Transitions (normative)

1. **Toolbar cursor** → `IDLE`; clear `activeDrawingTool`.
2. **Toolbar tool** → `TOOL_ARMED`; keep tool active until cursor selected (remove auto-exit on create).
3. **1-point tools** (H-line, V-line, price line, annotation): click plot → commit → `TOOL_ARMED` (stay in tool; TV “keep drawing” default for V1) or `IDLE` if we add keep-drawing toggle later.
4. **2-point tools** (trend, ray, rect, circle, fib, channels): click → `PLACING` with anchor; mousemove updates preview; second click commits → `TOOL_ARMED`.
5. **2-point drag alternative:** mousedown → `PLACING`; mousemove preview; mouseup commits (gesture-bible: “drag to define second point”). **V1:** support **both** second-click and drag-release; identical commit path.
6. **Click drawing in IDLE or TOOL_ARMED** → `SELECTED`; if was `TOOL_ARMED`, revert to cursor (`IDLE`) — standard TV behavior when selecting existing art.
7. **Click empty plot in SELECTED** → `IDLE`.
8. **Escape key** → cancel `PLACING` preview → previous state (`TOOL_ARMED` or `IDLE`).
9. **Locked drawing** → hit-test passes for selection; control-point drag and move rejected (`not-allowed` cursor).
10. **Hidden drawing** → skip in hit-test and draw.

### 3.3 Input routing fix

Move all drawing logic into `ChartCanvas` (price pane only) via new callback prop:

```ts
onDrawingPointer?: (event: DrawingPointerEvent) => void;
```

`DrawingPointerEvent` carries **plot coordinates** `{ plotX, plotY, phase: 'down'|'move'|'up', shiftKey, ... }` already clamped to `[0, plotWidth) × [0, plotHeight)`.

`EdgeChart` implements the FSM and passes `onDrawingPointer` only when `paneId === 'price'`. Remove `onClick={handleCanvasClick}` from the container.

**Y offset bug fix:** use canvas-local coordinates from the price pane canvas `getBoundingClientRect()`, not the multi-pane container. Legend bar is a sibling overlay — it does not shift canvas origin.

---

## 4. Coordinate model

### 4.1 Canonical storage (persisted)

Each point in `SerializedDrawing.points`:

```ts
{
  timestamp: number;  // ms — primary X key; survives pan/zoom/new bars
  value: number;      // price — primary Y key
  dataIndex?: number; // optional cache; recomputed on load via findDataIndexForTimestamp
}
```

**Why timestamp + value (not pixel x/y):** Matches `chartConfig.SerializedDrawing` and TV’s bar-anchored geometry. Drawings reflow when viewport changes.

**Do not persist** plot pixels or container coordinates.

### 4.2 Runtime conversion (`drawingCoords.ts`)

| Function | Purpose |
|----------|---------|
| `plotToPoint(plotX, plotY, vp, candles, opts?)` | → `{ timestamp, value, dataIndex }`; optional magnet |
| `pointToPlot(point, vp, candles)` | → `{ x, y }` for draw/hitTest |
| `clampPlot(x, y, width, height, showTimeAxis)` | Clip to plot area |
| `snapToOhlc(plotY, dataIndex, candle, thresholdPx, vp)` | Magnet (§7) |

**Plot Y convention:** Use `plotHeight(vp.height, showTimeAxis)` for price mapping, not raw `vp.height`. Add helpers `yForPricePlot` / `priceForPlotY` that mirror crosshair math in `canvas.tsx` (lines 353–356). Refactor viewport helpers or wrap them — drawings and crosshair must share one plot-space definition.

**X convention:** Use `vp.indexForX(plotX)` then candle timestamp; optionally snap X to candle center when within 10px (same as crosshair) for point placement.

### 4.3 Plugin coordinate contract

Plugins receive `VisibleRange` + `Candle[]` in `draw` / `hitTest` / control-point methods. They never parse raw mouse events.

Internal plugin pattern:

```ts
const [a, b] = d.points.map(p => pointToPlot(p, vp, candles));
// draw line from a to b in plot space
```

For **horizontal line**, only `points[0].value` is meaningful; line spans `x ∈ [0, plotWidth]`.

For **vertical line**, only `points[0].timestamp` (or `dataIndex`) is meaningful.

### 4.4 SerializedDrawing extensions (non-breaking)

Add optional fields on the in-memory drawing (persisted if present):

```ts
type SerializedDrawing = {
  // ... existing fields ...
  id?: string;           // stable id (today patched via `(d as any).id`)
  paneId?: string;       // default 'price' for V1
  styles?: DrawingStyles; // lineColor, lineWidth, fillOpacity — V1 defaults per tool
};
```

Formalize `id` in the type (breaking for TS only, not JSON schema).

---

## 5. Plugin API

### 5.1 Base interface (keep + extend)

Existing `DrawingPlugin` in `plugin-api.ts` remains the contract. Optional additions:

```ts
export type DrawingPlacement = 'one-point' | 'two-point' | 'multi-point';

export interface DrawingPlugin {
  name: string;
  /** Default label for Object Tree */
  defaultLabel?: string;
  placement: DrawingPlacement;
  /** Max control points for getControlPoints (defaults: 2 for two-point tools) */
  maxControlPoints?: number;

  create: (start: DrawingPoint, vp: VisibleRange, candles: Candle[]) => SerializedDrawing;
  /** Refine during PLACING before commit */
  updatePreview?: (draft: SerializedDrawing, cursor: DrawingPoint, vp, candles) => SerializedDrawing;
  /** Finalize on commit (e.g. normalize ray direction) */
  finalize?: (draft: SerializedDrawing, vp, candles) => SerializedDrawing;

  draw: (ctx, drawing, vp, theme, selected: boolean, candles: Candle[]) => void;
  hitTest: (plotX, plotY, drawing, vp, candles) => boolean;

  getControlPoints?: (drawing, vp, candles) => Array<{ x: number; y: number; role?: string }>;
  updateFromControl?: (drawing, cpIndex, plotX, plotY, vp, candles) => SerializedDrawing;
}
```

**Delta from today:** Add `placement`, pass `candles` into draw/hitTest/create, add `updatePreview` / `finalize`. Existing three plugins updated to match.

**`create` signature change:** Replace `{x,y}` pixels with `DrawingPoint { timestamp, value, dataIndex? }` — caller (`EdgeChart`) converts from plot pointer via `plotToPoint`.

### 5.2 Shared primitives (`drawings/primitives.ts`)

- `distanceToSegment(px, py, x1, y1, x2, y2)` — 4px tolerance (gesture-bible, plugin-api)
- `pointInRect`, `distanceToInfiniteLine`, `distanceToRay`
- `drawControlPoints(ctx, points, theme, selected)`
- Default stroke/fill from theme tokens

### 5.3 Registry aliases (complete map)

Toolbar grouping and flyout UX: [drawing-toolbar-design.md](./drawing-toolbar-design.md).

In `pluginHost.ts`:

| Toolbar name | Registry `name` |
|--------------|-----------------|
| `horizontalStraightLine` | `horizontal_line` |
| `verticalStraightLine` | `vertical_line` |
| `straightLine` | `trend_line` |
| `rayLine` | `ray` |
| `parallelStraightLine` | `parallel_channel` |
| `priceChannelLine` | `price_channel` |
| `rect` | `rectangle` |
| `circle` | `circle` |
| `fibonacciLine` | `fib_retracement` |
| `priceLine` | `price_line` |
| `simpleAnnotation` | `annotation` |
| `measure` | `measure` |

Registry key is the stable `SerializedDrawing.name` written to JSON.

### 5.4 `hitTestAll` (implement)

```ts
export function hitTestAll(
  plotX: number,
  plotY: number,
  drawings: SerializedDrawing[],
  vp: VisibleRange,
  candles: Candle[],
): string | null {
  const sorted = [...drawings].filter(d => d.visible).sort((a, b) => b.zLevel - a.zLevel);
  for (const d of sorted) {
    if (d.locked) continue; // locked: not selectable via hit (TV: lock prevents move; selection optional — V1: skip select when locked)
    const plugin = DrawingRegistry.get(d.name);
    if (plugin?.hitTest(plotX, plotY, d, vp, candles)) return (d as any).id ?? null;
  }
  return null;
}
```

**Locked behavior (V1):** Locked drawings are visible but not hit-testable; user unlocks via Object Tree or context menu.

### 5.5 `serializeAll` / `restoreAll`

- `serializeAll`: strip runtime fields; ensure each point has `timestamp` + `value`; sort by `zLevel`.
- `restoreAll`: assign stable ids if missing; set `paneId: 'price'`; rebuild `trackedRef`; do **not** regenerate ids on every load (preserve `id` from JSON).

---

## 6. Per-tool specifications

Placement key: **1P** = one-point click, **2P** = two-point (click-click or drag), **CP** = control points after create.

| # | Toolbar | Registry name | Placement | Points | Draw behavior | Hit test | CPs | TV §6 category |
|---|---------|---------------|-----------|--------|---------------|----------|-----|----------------|
| 0 | Cursor | — | — | — | — | — | — | §6.1 |
| 1 | Horizontal Line | `horizontal_line` | 1P | `[{timestamp?, value}]` — value only | Full-width horizontal at price | 4px to line | 1 (price drag) | §6.2 H-line |
| 2 | Vertical Line | `vertical_line` | 1P | `[{timestamp}]` | Full-height vertical at bar | 4px to line | 1 (time drag) | §6.2 V-line |
| 3 | Trend Line | `trend_line` | 2P | 2 points | Segment between anchors | 4px segment | 2 | §6.2 Trendline |
| 4 | Ray | `ray` | 2P | 2 points | Segment from A through B, extend to plot edge | 4px to ray | 2 | §6.2 Ray |
| 5 | Parallel Channel | `parallel_channel` | 2P + offset | 3 points: line1 A-B, offset point | Two parallel lines | min dist to either line | 3 | §6.2 Parallel channel |
| 6 | Price Channel | `price_channel` | 2P | 2 corners | Rectangle bounded channel (horizontal emphasis) | 4px boundary | 2–4 | §6.2 Flat top/bottom (simplified) |
| 7 | Rectangle | `rectangle` | 2P | 2 corners | Stroked rect (optional light fill) | inside stroke or 4px edge | 4 corners (or 2) | §6.6 Rectangle |
| 8 | Circle | `circle` | 2P | center + rim | Ellipse if non-square drag | 4px to circumference | 2 (center, radius) | §6.6 Circle |
| 9 | Fib Retracement | `fib_retracement` | 2P | swing low → swing high | Horizontal levels 0, 0.236, 0.382, 0.5, 0.618, 0.786, 1 + labels | 4px to any level | 2 | §6.3 Fib retracement |
| 10 | Price Line | `price_line` | 1P | `[{value}]` | H-line + price label on axis (reuse last-price label style) | 4px | 1 | §6.7 Price label |
| 11 | Annotation | `annotation` | 1P | `[{timestamp, value}]` | Text box with default "Note" | box hit | 1 (move) | §6.7 Text/Note |
| 12 | Measure (utility) | `measure` | 2P | 2 points | Ruler + price/%/bars label | 4px segment | 2 | §6.9 Measure |

### 6.1 Tool notes

**Parallel channel (simplified V1):** First drag defines baseline A→B; second click sets offset distance (perpendicular). Third point stored as `{ timestamp, value }` of offset anchor. TV supports full channel drag — V1 uses 2-click + offset click (3 points total).

**Price channel (simplified V1):** Treat as axis-aligned rectangle whose top/bottom are the two price levels; time extent = visible plot width at creation time, stored as two timestamps at left/right plot edges converted to timestamps. Editing: drag top/bottom CPs.

**Fib:** Levels computed in price space: `level = p0.value + (p1.value - p0.value) * ratio`. Draw dashed horizontal lines + right-side labels. No arc/fan in V1.

**Annotation:** Render 12px padded text box; double-click to edit dispatches to existing rename flow or inline editor (Phase 2 polish: content field on `SerializedDrawing.styles.text`).

**Ray:** Extend line from `p0` through `p1` to intersection with plot bounding box.

---

## 7. Magnet (TV §6.10)

### 7.1 When active

Apply when `magnetEnabled === true` during:

- Point placement (`plotToPoint` on down/up)
- Control-point drag (`updateFromControl` input)

Do **not** apply during hit-test or selection.

### 7.2 Algorithm (strong magnet — V1)

For pointer `(plotX, plotY)` with candle at `dataIndex = vp.indexForX(plotX)`:

1. Collect OHLC prices `[o, h, l, c]`.
2. Convert each to plot Y via `yForPricePlot`.
3. If `min(|plotY - y_i|) <= 5px`, snap `value` to that price.
4. Else use raw `vp.priceForPlotY(plotY)`.

Optional: snap X to candle center when within 10px (reuse crosshair snap).

**Weak magnet / snap to indicators:** **Deferred** (TV §6.10 secondary mode).

### 7.3 Storage

Magnet affects only the committed `{ timestamp, value }` — not a separate flag on the point.

---

## 8. Preview rendering

While `PLACING`:

1. `EdgeChart` holds `previewDrawing: SerializedDrawing | null`.
2. On mousemove, call `plugin.updatePreview(draft, cursorPoint, vp, candles)`.
3. Pass `[...committed, preview]` to `ChartCanvas` OR pass `previewDrawing` separately.
4. Preview style: dashed stroke `#64748b`, 50% opacity; not in `drawingsRef` until commit.
5. On cancel (Escape): clear preview, no persist.

**Performance:** Preview triggers one extra draw per mousemove — acceptable on price pane only; throttle to rAF if needed (same pattern as wheel batching).

---

## 9. ChartHandle API changes

### 9.1 New methods (additive)

```ts
getSelectedDrawingId(): string | null;
selectDrawing(id: string | null): void;
onSelectionChange(cb: (id: string | null) => void): () => void;
getMagnetEnabled(): boolean;
```

### 9.2 Existing methods — implement for real

| Method | Behavior |
|--------|----------|
| `setMagnet(on)` | Store flag; used by `plotToPoint` |
| `bringForward(id)` | Increment `zLevel` relative to next drawing; swap if collision |
| `sendBackward(id)` | Decrement `zLevel` |
| `duplicateOverlay(id)` | Clone drawing with new id, offset points +1 bar / +0.5% price |

### 9.3 Unchanged (shell compatibility)

`startDrawing`, `stopDrawing`, `clearDrawings`, `serializeDrawings`, `restoreDrawings`, `getTrackedOverlays`, overlay visibility/lock/rename/remove, `subscribeOverlayChange` — signatures stay as in [integration-map.md](./prereqs/integration-map.md).

### 9.4 ChartCell wiring (minimal)

- Subscribe `onSelectionChange` → set `selectedOverlayId`.
- Wire `onOverlayRightClick`: on canvas contextmenu over hit drawing → fire with overlay + screen pos (implement hit-test at contextmenu coordinates).
- Object Tree: optional highlight row when `selectedDrawingId` matches.

---

## 10. Multi-pane strategy

| Scope | V1 | Future hook |
|-------|-----|-------------|
| Drawings on price pane | **Yes** — all 12 tools | — |
| Drawings on sub-panes (RSI, etc.) | **No** | `SerializedDrawing.paneId`; sub canvas gets filtered drawings |
| TV §6.10 “drawings on indicators” | **Deferred** | Same paneId hook |

`TrackedOverlay.paneId` today is hardcoded `'candle_pane'` — normalize to `'price'` to match `ChartCanvas paneId`.

---

## 11. Phased delivery plan

V1 contract requires all 12 tools + persist ([v1-scope.md](./prereqs/v1-scope.md)). Phasing is **implementation order**, not scope cuts.

### Phase 1 — Foundation + core tools (recommended first sprint)

**Goal:** End-to-end create → select → edit → persist for the highest-traffic tools; establish patterns other plugins copy.

| Deliverable | Details |
|-------------|---------|
| `drawingCoords.ts` | Plot-space mapping + magnet |
| Input FSM in `EdgeChart` + `ChartCanvas.onDrawingPointer` | Remove container click |
| `hitTestAll` + selection + CP drag | Shared control-point renderer |
| Preview for 2P tools | Dashed ghost |
| Plugins | `trend_line`, `horizontal_line`, `vertical_line`, `rectangle` |
| Aliases | All 12 registered (stub tools throw no-op draw until Phase 2) |
| Tests | coords, hitTestAll z-order, trend hit-test 4px, serialize round-trip |
| Hide crosshair when `TOOL_ARMED` / `PLACING` / `DRAGGING_CP` | gesture-bible |

**Phase 1 exit criteria:** User can draw trend/H/V/rect on active cell, select, drag CPs, magnet snap, reload page, see drawings restored.

### Phase 2 — Remaining tools + metadata ops

| Deliverable | Details |
|-------------|---------|
| Plugins | `ray`, `parallel_channel`, `price_channel`, `circle`, `fib_retracement`, `price_line`, `annotation` |
| `bringForward` / `sendBackward` | Proper zLevel swap + Object Tree reorder fix |
| `duplicateOverlay` | Clone with offset |
| `onOverlayRightClick` | Canvas right-click hit-test |
| Tests | Per-plugin golden draw/hitTest fixtures; fib level math |

### Phase 3 — TV workflow polish (late V1 / post-V1)

| Deliverable | TV reference |
|-------------|--------------|
| Keep drawing mode toggle | §6.10 Keep drawing |
| Undo/redo stack for drawings | §6.10 Undo |
| Style picker (color, width) | §6.10 Customization |
| Drawing sync across linked cells | §2 Sync drawings — **explicit deferral** for V1 |
| Sub-pane drawings | §6.10 Drawings on indicators |

---

## 12. Test strategy & oracles

### 12.1 New test files

| File | Oracles |
|------|---------|
| `src/lib/chart/drawingCoords.test.ts` | `plotToPoint` ↔ `pointToPlot` round-trip; magnet snaps to H when within 5px; snap ignores when >5px |
| `src/lib/chart/drawings/primitives.test.ts` | Point-to-segment distance: on line, 4px boundary, off line |
| `src/lib/chart/pluginHost.hitTest.test.ts` | Topmost zLevel wins; hidden skipped; locked skipped |
| `src/lib/chart/drawings/trend_line.test.ts` | hitTest 4px; CP count; serialize points |
| `src/lib/chart/drawings/horizontal_line.test.ts` | value-only persistence |
| `src/lib/chart/drawings/rectangle.test.ts` | corner order invariant; hit inside edge |
| `src/lib/chart/drawings/fib_retracement.test.ts` | Level prices at 0.618 between anchors |
| `src/lib/chart/drawingFsm.test.ts` | State transitions: arm → place → commit; escape cancel |
| `src/app/components/EdgeChart.drawing.test.tsx` | Integration: startDrawing → pointer → serializeDrawings length +1 |

### 12.2 Manual oracles (QA checklist)

1. Draw trend line two-point on 2×2 grid **active cell only** — inactive cell ignores tool.
2. Pan/zoom after draw — line stays anchored to same bars/prices.
3. Reload — drawings identical (timestamp + value).
4. Magnet on — new point snaps to nearest OHLC within 5px.
5. Lock drawing — cannot select on canvas; unlock → selectable.
6. Hide drawing — not visible, not hit-testable.
7. Delete selected (toolbar ⌫) — removes from Object Tree and config.
8. Right-click drawing — context menu (after Phase 2 wiring).

### 12.3 Performance oracle

With 50 drawings + 150 visible bars: pan/zoom remains 60fps (no React state per pointer move; rAF draw only). Aligns with [perf-targets.md](./prereqs/perf-targets.md).

---

## 13. Explicit deferrals

| Feature | TV ref | Reason |
|---------|--------|--------|
| Keep drawing toggle | §6.10 | Phase 3; default stay-in-tool after place is enough for V1 |
| Undo/redo | §6.10, §3 | Phase 3 |
| Drawing sync across layout cells | §2 | Requires stable IDs + link rules |
| Weak magnet / snap to indicators | §6.10 | Needs indicator `valueAt` on all overlays |
| Drawings on sub-panes / RSI | §6.10 | V1 price pane only; schema hook reserved |
| Alerts on drawings | §6.10, §8 | Platform feature |
| Eraser tool | §6.1 | Delete + clear all sufficient |
| Full parallel channel drag UX | §6.2 | Simplified 3-point model |
| Style editor UI | §6.10 | Default styles per tool |
| Touch drawing | — | [risk-matrix.md](./prereqs/risk-matrix.md) V2 |

---

## 14. Gap summary vs benchmarks

| Requirement | v1-scope | TV §6 / §6.10 | Design response |
|-------------|----------|---------------|-----------------|
| 12 toolbar tools | Item 8 | §6 taxonomy subset | 12 plugins + alias table §5.3 |
| Serialize/restore | Item 9 | Persistence | timestamp+value §4.1; stable ids §5.5 |
| Two-point create | gesture-bible | Click+drag | FSM §3; preview §8 |
| Hit test 4px | plugin-api | Selection | `hitTestAll` §5.4; primitives §5.2 |
| Control point edit | plugin-api | §6.10 Selection | `DRAGGING_CP` §3 |
| Magnet OHLC 5px | plugin-api | §6.10 Magnets | §7 |
| Lock/hide/rename/z/duplicate | Additional req | §6.10 | Visibility/lock exist; z/duplicate Phase 2 |
| Crosshair hidden while drawing | gesture-bible | Implicit | §3 state table |
| Drawings on indicator panes | — | §6.10 | Deferred §10 |

---

## 15. Recommended Phase 1 scope (summary)

Ship **infrastructure + 4 tools** before parallelizing the remaining eight plugins:

1. **Infrastructure:** plot-space coords, canvas-owned input FSM, selection, CP drag, preview, `hitTestAll`, magnet, crosshair hide, formalized drawing `id`.
2. **Tools:** trend line, horizontal line, vertical line, rectangle.
3. **Tests:** `drawingCoords.test.ts`, `primitives.test.ts`, `pluginHost.hitTest.test.ts`, `trend_line.test.ts`.
4. **Shell:** `getSelectedDrawingId` / `selectDrawing` / `onSelectionChange`; fix `ChartCell` selection sync.

This de-risks coordinate bugs and split input authority — the highest-probability failure modes from the current stub — while delivering usable annotation value. Phase 2 completes V1 contract tool breadth and z-order/duplicate/context-menu parity.
