# Risk Matrix — Hard Problems Classification

## Must Be Solid in V1
- Drawing hit-testing & editing (4px tolerance, control point drag, serialize/restore all 12 tools)
- Pane collapse/maximize/resize with correct z-order and control bar hit areas
- 60 fps pan/zoom with 5000 candles + multiple indicators + drawings visible
- Crosshair sync across cells (timestamp broadcast + visual snap)

## Good Enough in V1 (acceptable tradeoffs)
- Crosshair sync visual lag of 1 frame (16 ms) is OK
- Drawing creation UX can be basic (no live preview during drag for complex tools)
- Sub-pane indicator value labels on crosshair can be implemented later if perf tight

## Deferred Entirely (V2)
- Mobile pinch + touch drawing + long-press context menus
- Custom indicator authoring UI
- Infinite left-scroll data fetching (edge prefetch only for current range)
- Non-time chart types, volume-by-price, footprint, etc.

## Mitigation Strategy
- Start with L0+L1+L2 (viewport + renderer) in isolation, test 60 fps with synthetic data before adding plugins.
- Drawing hit-test: implement 4px line distance formula early, test with unit tests.
- Use requestAnimationFrame + double-buffering if needed for smooth overlay.
- For sync: simple timestamp broadcast first; optimize later if needed.

Document any deviation from "Must Be Solid" with explicit reason in commit/PR.