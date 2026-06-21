# Performance & Quality Bar — V1 Targets

## Numeric Targets
- **Rendering**: 5000+ candles visible at 60 fps during pan/zoom (measured on M1/M2 MacBook Air, Chrome).
- **Bundle size**: New chart code (all L0-L4 + EdgeChart) ≤ 35 kB gzipped (excluding React, lucide icons).
- **First paint**: 1-year daily data (252 candles) rendered < 250 ms from fetch complete.
- **Memory**: No leaks — 10x data reload cycles must not grow JS heap > 10 MB.
- **Latency**: Crosshair move → label update < 16 ms (one frame). Drawing create < 50 ms.

## Qualitative Rules
- "Native feel": pan/zoom must match or exceed current klinecharts smoothness. No visible jank, tearing, or dropped frames.
- All gestures respond within 16 ms of input.
- Dark theme text/icons must meet WCAG AA contrast on #0A0B0E background.
- No console errors or warnings in normal operation.
- ResizeObserver + rAF must keep 60 fps even when 4 charts in 2x2 grid + replay running.

## Measurement
- Use performance.now() around draw loop.
- Chrome DevTools Performance tab for 60 fps verification.
- Bundle: `npm run build` && `npx bundlesize` or similar.

Failure to meet these = implementation not complete.