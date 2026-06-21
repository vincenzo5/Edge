# V1 Scope Lock — Edge Custom Chart

All 12 features MUST ship in V1. No deferrals.

## Must Ship (Full 12)
1. Pan, zoom, scroll — wheel, pinch, drag; momentum; edge fetch on scroll-left
2. Candlestick rendering — solid, hollow, OHLC bars, area, Heikin Ashi
3. Crosshair + readout — synced vertical line; price/time DOM labels per pane
4. Auto-scaled axes — price Y-axis and time X-axis from visible range
5. Symbol + interval + range — search, selectors, Yahoo OHLCV pipeline
6. Overlay indicators — MA, EMA, BOLL on price pane (plugin API)
7. Sub-pane indicators — MACD, RSI, VOL in resizable/collapsible panes
8. Core drawings — trend, H/V line, ray, rectangle, Fib (plugin API) + 7 more from current set
9. Drawing/drawing persist — serialize points to CellConfig; restore on load
10. Layout persistence — grid mode, per-cell config, theme in localStorage
11. Multi-chart grid + symbol link — 1×1–2×2; propagate symbol/range/interval
12. Crosshair sync — broadcast timestamp; peer charts snap crosshair (fix current no-op)

## Additional Requirements from Current App
- Bar Replay with visibleCount slicing
- Object Tree for indicators/drawings
- Drawing toolbar + magnet + context menu (rename/lock/hide/z-order/duplicate)
- Pane collapse/maximize/move with persisted paneOrder/collapsedPanes/maximizedPane
- Light/dark themes with live switch
- 28 indicators registered (Trend/Momentum/Volume categories)
- 12 drawing tools (cursor, hline, vline, trend, ray, parallel channel, price channel, rect, circle, fib, price line, annotation)

## Out of Scope for V1
- Mobile/touch gestures beyond basic
- Custom user studies (plugin API is there but no UI for adding new)
- Non-time charts (Renko etc.)
- Volume profile, order flow, etc.

This is the immutable contract. Any implementation must deliver 100% of the above.

## Implementation status (living)

| # | Feature | Status (June 2025) |
|---|---------|-------------------|
| 1–5 | Pan/zoom, candles, crosshair, axes, symbol pipeline | **Mostly done**; pinch + edge fetch on scroll-left still open |
| 6–8 | Indicators + drawings | **Partial** — MA/MACD done; BOLL/RSI/VOL/EMA + most drawings stub |
| 9–10 | Persist drawings + layout | **Done** |
| 11–12 | Multi-chart grid + link + crosshair sync | **Done** — see [features.md](../features.md) §9–§6 |