# Drawing Tools — Foundation Assessment

Architecture and UX foundation status for Edge Chart's drawing stack. Use this when deciding whether to add individual tools or invest in platform-layer work first.

**Related:** [drawing-engine-design.md](./drawing-engine-design.md) (target design), [drawing-toolbar-design.md](./drawing-toolbar-design.md) (rail UX), [features.md §8](./features.md) (shipped tool list), [tradingview-reference.md §6](./tradingview-reference.md) (TV benchmark), [indicator-foundation-plan.md](./indicator-foundation-plan.md) (parallel indicator platform upgrade; shared `LineStyleOverride` pattern).

---

## Executive summary

**Yes — the core foundation is in place and TV-aligned.** V1 closed the gap between the original broken prototype (container click, pixel coords, no FSM) and the design in `drawing-engine-design.md`. New line/shape/Fib tools can be added by implementing `DrawingPlugin` + registry alias + toolbar entry without touching the render loop or FSM for the common 1-point / 2-point cases.

**Not yet complete for the full 110+ toolset.** Before scaling to pitchforks, patterns, brushes, polylines, and sub-pane drawings, a small set of **platform extensions** is needed (multi-click placement loop, typed styles, command history, pane routing). These are deliberate deferrals, not architectural dead ends.

| Layer | Status | Scales to full TV toolset? |
|-------|--------|----------------------------|
| Plugin registry + aliases | **Done** | Yes — one plugin per tool |
| Coordinate model (`timestamp` + `value`) | **Done** | Yes — bar-anchored geometry |
| Input FSM + price-pane routing | **Done** | Mostly — multi-point loop incomplete |
| Preview / commit / CP edit | **Done** | Yes for 1P/2P tools |
| Shared hit-test + z-order primitives | **Done** | Yes |
| Toolbar shell + prefs persistence | **Done** | Yes — add groups without engine changes |
| Styles / settings pipeline | **Stub** (`styles?: unknown`) | Needs typed contract + editor |
| Command history (undo/redo) | **Missing** | Needs layer above mutations |
| Multi-pane drawing (`paneId`) | **Schema only** | Needs filter + input routing per pane |
| Freehand / path input mode | **Missing** | Separate pointer-stream path |

---

## Architecture (current)

```
ChartCell / DrawingToolbar / ObjectTree          ← shell (TV-style left rail)
        │ ChartHandle imperative API
EdgeChart — DrawingController FSM                ← interaction state machine
        │ onDrawingPointer (plot coords)
ChartCanvas (price pane only)                    ← input authority + draw loop
        │
drawingCoords.ts                                 ← plot ↔ data point, magnet
pluginHost.ts                                    ← aliases, hitTestAll, serialize
drawings/registry.ts + per-tool plugins          ← extensibility surface
drawings/primitives.ts                           ← shared geometry + CP chrome
```

### Extension contract (`DrawingPlugin`)

Each tool implements the interface in `src/lib/chart/plugin-api.ts`:

| Method | Role |
|--------|------|
| `placement` | `'one-point' \| 'two-point' \| 'multi-point'` — FSM routing |
| `create` | First anchor → draft `SerializedDrawing` |
| `updatePreview` | Live ghost during `PLACING` |
| `finalize` | Normalize on commit (e.g. ray direction) |
| `draw` | Canvas render; receives `selected`, `preview` opts |
| `hitTest` | 4px tolerance selection |
| `getControlPoints` / `updateFromControl` | Post-create edit |

**Adding a standard tool:** create plugin file → `registerDrawing()` → add `drawingAliases` entry → add row to `toolGroups.ts` flyout.

### Coordinate model (TV-aligned)

Persisted points use `{ timestamp, value, dataIndex? }` — not pixels. Drawings reflow on pan, zoom, and bar prepend. Plot-space helpers in `drawingCoords.ts` share the same Y convention as crosshair (`plotHeight`, `yForPricePlot`).

### Interaction FSM (TV-aligned)

| State | TV equivalent | Edge behavior |
|-------|---------------|---------------|
| `idle` | Cross cursor | Pan, select drawings |
| `tool_armed` | Tool selected | Crosshair hidden; pan suppressed; click to place |
| `placing` | First point set | Dashed preview; second click or drag-release commits |
| `selected` | Drawing selected | CP squares; drag to edit; click empty deselects |
| `dragging_cp` | CP drag | Magnet applies; crosshair hidden |

Additional TV behaviors implemented:

- **Keep drawing** toggle — stay armed after commit, or return to cursor
- **Select existing while armed** — disarms tool, selects drawing (via `onDrawingDisarmed`)
- **Escape** — cancels in-progress `placing` preview
- **Active cell gate** — drawing input only on focused grid cell
- **Locked** — visible but not hit-testable / not CP-draggable

---

## What scales cleanly today

These patterns copy directly from existing plugins (`trend_line`, `fib_retracement`, `rectangle`, etc.):

- Trend-line family: info line, extended line, horizontal ray, cross line
- More Fib variants: fan, extension, arc (same 2P swing + level math)
- Simple shapes: ellipse, triangle, rotated rectangle (2P + `finalize`)
- More 1P tools: note variants, price label (extend `annotation` / `price_line`)
- Measure variants: date range, date+price range (2P + label formatting)

**Toolbar expansion:** `drawing-toolbar-design.md` maps TV §6.2–6.9 to Edge flyout groups. New categories (Pitchforks, Patterns, Gann) are **registry + flyout additions** — no engine rewrite.

---

## Foundation gaps (fix before / while scaling)

Ordered by impact on future tool work.

### 1. Multi-point placement loop (high)

`DrawingPlugin.placement: 'multi-point'` exists (`parallel_channel` uses it), but the FSM treats multi-point like two-point: **commits on the second click**. Parallel channel's third offset point is never reachable in normal UX.

**Needed:** generic `placingStep` counter — commit when `points.length >= maxControlPoints` (or plugin signals `isComplete(draft)`). Required for: parallel channel (3P), pitchforks (3P), chart patterns (4–5P), polylines (N clicks + double-click finish).

### 2. Typed styles + settings pipeline (high)

`SerializedDrawing.styles` is `unknown`. TV's per-drawing Settings dialog (color, width, extend, labels, visibility intervals) needs:

```ts
type DrawingStyles = {
  lineColor?: string;
  lineWidth?: number;
  lineDash?: number[];
  fillColor?: string;
  fillOpacity?: number;
  extendLeft?: boolean;
  extendRight?: boolean;
  text?: string;
  fontSize?: number;
  // tool-specific extensions via discriminated union later
};
```

Plugins read `drawing.styles ?? defaultStylesForTool(name)` in `draw`. Style changes go through `ChartHandle.updateDrawingStyles(id, patch)` + command history.

### 3. Command history / undo-redo (high)

All drawing mutations today write directly to `drawingsRef`. Undo requires a small command stack:

- `AddDrawing`, `RemoveDrawing`, `UpdatePoints`, `UpdateMeta`, `ReorderZ`
- Batch commits for drag operations (mousedown → mouseup = one undo step)

FSM stays unchanged; mutations go through a `DrawingStore` adapter.

### 4. Pane routing (medium)

`SerializedDrawing.paneId` and `TrackedOverlay.paneId` exist; implementation hardcodes `'price'`. TV draws on indicator panes too.

**Needed:**

- Filter `drawings` per `ChartCanvas` by `paneId`
- Route `onDrawingPointer` to the pane under cursor (map Y → pane segment)
- Per-pane price scale in `plotToPoint` / `pointToPlot` (sub-pane Y is indicator value, not OHLC)

Schema is ready; render loop and input routing need extension.

### 5. Freehand / brush input mode (medium)

Brush, highlighter, and path tools need **pointer-stream capture** (sample points on move, simplify on up), not click-click FSM. Recommend a parallel `'freehand'` placement mode or a separate `DrawingInputMode` enum rather than overloading `placing`.

### 6. Magnet modes (low)

V1: strong OHLC snap only. TV also has weak magnet and snap-to-indicator. Extend `PlotToPointOptions` with `magnetMode: 'off' | 'strong' | 'weak' | 'indicators'` and pass overlay indicator values into `snapToOhlc` successor.

### 7. Whole-drawing body drag (low)

TV allows dragging a selected drawing as a unit. Edge only supports CP drag. Optional `moveDrawing(id, deltaTimestamp, deltaValue)` on plugin or generic point translation in controller.

### 8. Clipboard (low)

Copy/paste needs serialized drawing JSON + offset transform. Independent of plugin API; uses `serializeAll` / restore with new ids.

---

## Visual UX foundation vs TradingView

### Aligned (keep as-is)

| Area | Edge | TV |
|------|------|-----|
| Left rail position | ChartCell left column | Supercharts left toolbar |
| Section order | Cursor → grouped tools → utilities → toggles → delete | Same |
| Flyout groups | Lines, Channels & Shapes, Annotation | Same concept (TV has more groups) |
| Flyout interaction | Hover open (desktop), pin (touch), Escape close | Same |
| Active group icon | Shows armed tool icon | Same |
| Utilities placement | Measure + Zoom outside flyouts | §6.9 standalone |
| Workflow toggles | Magnet, keep drawing, lock all, hide all | §6.10 |
| Preview ghost | Dashed stroke during placement | Same |
| Control points | Square handles on selection | Same |
| Crosshair during draw | Hidden while arming/placing/dragging CP | Same |
| Dark rail tokens | `#787B86` idle, `#2A2E39` active | TV dark theme |

Implementation: `DrawingToolbar.tsx`, `DrawingToolGroup.tsx`, `toolGroups.ts`, `ChartToolIcons.tsx`, `toolbarButtonStyles.ts`.

### Simplified (intentional V1 — shell can grow)

| TV | Edge today | Extension path |
|----|------------|----------------|
| 8 toolbar categories | 3 flyout groups | Add groups in `toolGroups.ts` + icons |
| 6 cursor modes | Crosshair only | Cursor section in rail; eraser = hit-test + delete on click |
| Fibonacci & Gann section | Fib retracement inside Shapes group | Split flyout when tool count warrants |
| Patterns / Forecasting / Icons sections | Omitted | New flyout groups; plugins unchanged |
| Per-drawing Settings modal | Context menu only (rename/lock/hide/z) | Style pipeline (§ gap 2) |
| Object Tree groups | Flat drawing list | UI-only grouping layer |

### UX mismatches to track

| Behavior | TV | Edge | Fix |
|----------|-----|------|-----|
| Locked drawing selection | Selectable, not movable | Not hit-testable | Allow hit-test, block CP drag |
| Parallel channel | 3-click offset | Commits at 2 clicks | Multi-point loop (§ gap 1) |
| Measure persistence | Often ephemeral readout | Persisted drawing | Phase 2: optional ephemeral flag on plugin |
| Drawing on RSI/MACD pane | Supported | Price pane only | Pane routing (§ gap 4) |

---

## Recommendation

**Do not rebuild the drawing stack.** The plugin + FSM + coordinate model is the right foundation and matches how TradingView's charting library separates drawings from the core chart (toolbar → tool mode → geometry plugins → persisted shapes).

**Before adding many tools**, invest in this order:

1. **Multi-point placement loop** — unblocks channels, pitchforks, patterns
2. **Typed `DrawingStyles` + update API** — unblocks settings dialog and consistent rendering
3. **Command history** — unblocks undo/redo (expected TV workflow)
4. **Pane routing** — unblocks indicator-pane trendlines

**Implementation plan:** [drawing-platform-plan.md](./drawing-platform-plan.md) — phased slices, acceptance criteria, test oracles, and sub-agent execution model. Indicator counterpart: [indicator-foundation-plan.md](./indicator-foundation-plan.md).

After that, new tools are mostly **plugin files** — the intended clean path to the full toolset.

---

## Source files

| Area | Path |
|------|------|
| FSM | `src/lib/chart/drawingController.ts` |
| Pointer handler | `src/app/components/EdgeChart.tsx` (`handleDrawingPointer`) |
| Canvas input | `src/lib/chart/canvas.tsx` |
| Coordinates | `src/lib/chart/drawingCoords.ts` |
| Plugin API | `src/lib/chart/plugin-api.ts` |
| Registry / hit-test | `src/lib/chart/pluginHost.ts` |
| Primitives | `src/lib/chart/drawings/primitives.ts` |
| Toolbar | `src/app/components/DrawingToolbar.tsx` |
| Tool groups | `src/app/components/chart-icons/toolGroups.ts` |
