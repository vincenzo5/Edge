# Drawing Platform Implementation Plan

Phased implementation for four drawing-platform extensions: multi-point FSM, typed styles, undo/redo stack, and multi-pane drawing routing — scaling Edge Chart's plugin architecture toward TradingView's full toolset without a render-loop rewrite.

**Status:** All slices **1.1–4.2 shipped** (platform phase complete). Out-of-scope items remain deferred per foundation doc.

**Related:** [drawing-foundation.md](./drawing-foundation.md) (gap analysis), [drawing-engine-design.md](./drawing-engine-design.md) (target design), [features.md §8](./features.md) (live status).

---

## Build order

| Order | Workstream | Status |
|-------|------------|--------|
| 1 | Multi-point FSM | **Done** (1.1 + 1.2) |
| 2a | Typed styles | **Done** (2.1 + 2.2) |
| 2b | Undo/redo | **Done** (3.1 + 3.2) |
| 3 | Pane routing | **Done** (4.1 + 4.2) |

---

## Execution model — sub-agents (Composer 2.5 Fast)

Each slice implemented by a dedicated sub-agent with **`model: composer-2.5-fast`**. Parent orchestrates sequencing, merge, and verification.

| Slice | Focus | Status |
|-------|-------|--------|
| Doc | This document + foundation link | Shipped |
| 1.1 | Multi-point FSM + parallel channel fix | Shipped |
| 1.2 | Variable-N foundation (`isPlacementComplete`, double-click stub) | Shipped |
| 2.1 | `DrawingStyles` types, defaults, representative plugins | Shipped |
| 2.2 | Full plugin migration + extend lines + Settings modal | Shipped |
| 3.1 | `DrawingStore` + Add/Remove/UpdatePoints + ⌘Z | Shipped |
| 3.2 | UpdateMeta + ReorderZ + redo for meta/z-order | Shipped |
| 4.1 | Sub-pane render + input + pane-aware coords | Shipped |
| 4.2 | Full pane parity + Object Tree pane labels | Shipped |

---

## Workstream 1: Multi-point FSM

### Slice 1.1 — Shipped

- `placingStep`, `isMultiPointTool`, `isDraftComplete`, `advancePlacing`
- Parallel channel 3-click commit; 2P tools unchanged

### Slice 1.2 — Shipped

- `appendPointPreview` in `drawingUtils.ts`
- `finishPlacingIfComplete`, `supportsDoubleClickFinish`, `isDoubleClickFinish`
- Double-click stub in `EdgeChart` + `detail` on pointer events
- §3.2 updated in `drawing-engine-design.md`

---

## Workstream 2: Typed styles

### Slice 2.1 — Shipped

- `DrawingStyles`, `drawingStyles.ts`, `updateDrawingStyles` on `ChartHandle`

### Slice 2.2 — Shipped

- All 13 plugins use `resolveDrawingStyles` + `strokeFromStyles`
- `extendLeft`/`extendRight` on trend line and ray (`extendSegmentEndpoints`)
- `DrawingSettingsModal` + context menu **Settings…** in `ChartCell`

---

## Workstream 3: Undo/redo stack

### Slice 3.1 — Shipped

- `DrawingStore`, CP drag batching, ⌘Z / ⌘⇧Z in `ChartCell`
- Hydrate clears history; persist via 500ms debounce unchanged

### Slice 3.2 — Shipped

- `bringForward`/`sendBackward` → `reorderZ`
- `setOverlayVisible`/`locked`/`renameOverlay` → `updateMeta`
- `lockAllDrawings`/`setAllDrawingsVisible` → batched `updateMeta`
- `syncTrackedFromDrawings` on store subscription

---

## Workstream 4: Pane routing

### Slice 4.1 — Shipped

- Per-pane drawings filter, sub-pane input, pane-aware `plotToPoint`

### Slice 4.2 — Shipped

- All tools on sub-panes; `selectedIdForPane` scopes selection chrome
- `resolvePaneLabel` + Object Tree pane badges
- Hit-test isolation tests

---

## Out of scope (still deferred)

Freehand/brush, clipboard, weak magnet on price pane, eraser cursor, drawing sync across grid cells, whole-drawing body drag, alerts on drawings, render loop rewrite.

---

## Verification checklist

```bash
npm test -- --run \
  src/lib/chart/drawingFsm.test.ts \
  src/lib/chart/drawingPlacement.test.ts \
  src/lib/chart/drawingCoords.test.ts \
  src/lib/chart/drawingStore.test.ts \
  src/lib/chart/drawingStyles.test.ts \
  src/lib/chart/pluginHost.hitTest.test.ts \
  src/lib/chart/paneLabels.test.ts \
  src/app/components/EdgeChart.drawing.test.tsx \
  src/app/components/sidebar/panels/ObjectTreePanel.test.tsx
```

**Manual:** Parallel channel 3-click; Settings color/width; undo lock/z-order/style; RSI trend line + Object Tree pane badge.

---

## Source files

| Area | Path |
|------|------|
| FSM | `src/lib/chart/drawingController.ts` |
| Store | `src/lib/chart/drawingStore.ts` |
| Styles | `src/lib/chart/drawingStyles.ts` |
| Pane labels | `src/lib/chart/paneLabels.ts` |
| Settings UI | `src/app/components/DrawingSettingsModal.tsx` |
| Pointer | `src/app/components/EdgeChart.tsx` |
| Canvas | `src/lib/chart/canvas.tsx` |
| Coords | `src/lib/chart/drawingCoords.ts` |
