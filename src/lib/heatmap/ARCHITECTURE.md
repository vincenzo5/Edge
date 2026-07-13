# Heat Map Architecture

Host-agnostic treemap heat map for Edge app chrome. Screener is the first consumer; other surfaces (watchlists, sector overviews) can reuse the same contract.

## Responsibility

- **Layout + color math** — pure functions in `src/lib/heatmap/` (no React)
- **Rendering** — `src/app/components/heatmap/` (`HeatMapView`, `HeatMapToolbar`)
- **Host adapters** — map domain rows into `HeatMapItem[]` (e.g. `src/lib/screener/screenerHeatMapAdapter.ts`)

## Data contract

```ts
HeatMapItem {
  id, label,
  sizeValue,   // drives rectangle area
  colorValue,  // drives fill
  groupPath?,  // optional nesting keys
  meta?,       // host payload (e.g. ScreenerResultRow)
}

HeatMapConfig {
  sizeBy: { metric, scale, missing },
  colorBy: { metric, scale, missing },
  groupBy: "none" | "sector" | "industry" | ...
}
```

Size, color, and grouping are **independent** encodings.

## Layout

- Squarified treemap in `squarify.ts` (no external dependency)
- Optional group frames with nested leaf layout
- `groupBy: "none"` → flat treemap

## Color

- Diverging (default for change %) or sequential scales
- Domains: fixed (TradingView-style ±3%), data-driven, or percentile
- Fills use Edge positive/negative/neutral tokens via rgba — not ad-hoc Tailwind palette classes

## UI

- `HeatMapView` — SVG-positioned cells, auto labels by cell size, legend, hover tooltip, leaf click
- `HeatMapToolbar` — Size / Scale / Color / Group pickers for any host (Scale hidden when Size=Equal)

## Screener integration

- Session-only state: `resultsViewMode` (`list` | `heatmap`), `heatMapConfig` in `ScreenerSessionState` (default size: market cap **linear**; log available via Scale control)
- `ResultsTable` toggles List / Heat map; heat map paints **full result set** with live quotes on top **200** symbols by size
- Toolbar Size / Color / Group changes update `heatMapConfig` immediately; adapter remaps `sizeValue`/`colorValue` and `HeatMapView` re-layouts on the same tick
- Mover presets enriched server-side with universe descriptors; `mapFmpScreenerRow` derives `changePercent` when FMP omits percent fields; muted banner when active size metric is missing for ≥50% of items
- Leaf click → existing `onLoadChart` row action

## Out of scope (MVP)

- Logos, nested multi-level grouping, WebGL, persisted view/config on saved screens, calendar heat maps

## Verification

```bash
npm test -- --run src/lib/heatmap/
npm test -- --run src/lib/screener/screenerHeatMapAdapter.test.ts
npm test -- --run src/app/components/heatmap/
npm test -- --run src/app/components/screener/ResultsTable.test.tsx
```
