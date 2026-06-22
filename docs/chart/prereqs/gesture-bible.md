# Gesture Bible — Interaction Behavior Specs

## Pan / Zoom / Scroll
- Mouse drag on chart area: pan left/right (horizontal only for price chart). Momentum: after release, continue with deceleration (velocity * 0.9 per frame, stop < 0.5px).
- Wheel: zoom in/out centered on mouse X position. Factor 1.1x per notch. Clamp visible candles 10–5000.
- Pinch on trackpad/touch: zoom with center at midpoint.
- Scroll-left edge: if data available and not at start, auto-fetch previous range (future: infinite scroll).
- Visible range never shows <10 or >5000 candles. Auto-scale price axis to min/max of visible candles + 5% padding.
- No vertical pan (price scale draggable separately if implemented later).

## Crosshair
- Mouse move over any pane: show vertical + horizontal lines (themed color).
- Price label on Y-axis (right side of pane), time label on X-axis (bottom).
- On candle hover: snap to nearest candle center for vertical line.
- Free mode when not near candle (within 10px).
- Crosshair hidden when drawing tool active or mouse leaves chart container.
- Broadcast timestamp (ms) on every move for sync.

## Drawing Tools
- Select tool from DrawingToolbar: enter create mode.
- Click on chart: start point for most tools (trend, ray, etc.).
- Drag to define second point; release to finish.
- Hit test tolerance: 4px around line/segment for selection.
- Selected drawing: show control points (small squares), allow drag to edit.
- Right-click on drawing: open context menu (position near click). Full TV item list: [context-menu-reference.md §2](../context-menu-reference.md#2-drawing--overlay-context-menu).
- Right-click on blank chart: open chart context menu (always visible in TV). Edge target: [context-menu-reference.md §1](../context-menu-reference.md#1-blank-chart-plot-area).
- Magnet: when enabled, snap new points to nearest candle OHLC (within 5px vertical).

## Pane Controls
- Drag separator between panes: resize height (min 40px, max 400px).
- Maximize button: expand pane to full chart cell height, collapse others.
- Collapse button: collapse pane to 24px header height; restore uncollapses.
- Move up/down buttons: reorder in `paneOrder` (swap with adjacent pane).
- Remove (trash): sub-panes only, when multiple panes exist — removes indicator.
- Controls appear on hover over each pane header when **two or more panes** exist (inline top-right icon row, click only).

## Replay
- BarReplay scrubber changes visibleCount: slice data to 0..count, re-render instantly.
- Play/pause: auto-increment visibleCount at selected speed (0.5x–5x = 1 candle per 2000ms–200ms).

## Multi-Chart
- Linked: symbol/range/interval change propagates.
- Crosshair sync: broadcast ts, other charts move crosshair to same time if data present.

All gestures must feel "native" — 60fps, no jank, instant response.