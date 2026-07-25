# Runtime interaction performance — Phase 7 evidence

# Date: 2026-07-25

## Scope

Layout persistence fan-out — per-cell layout store, DrawingStore revision, revision-based dirty fingerprints; multi-cell render isolation + persistence round-trip.

## Delivered

- `packages/chart-core/src/drawingStore.ts` — monotonic `revision` / `getRevision()`
- `packages/chart-react/src/drawing/createDrawingHandleSlice.ts` — `getDrawingRevision`
- `packages/chart-react/src/drawing/useDrawingStoreSync.ts` — `stateDrawingsRevision` hydrate dedupe
- `packages/chart-react/src/types.ts` — `drawingsRevision` prop + handle method
- `src/lib/chart/cellLayoutStore.ts` — keyed per-cell config store + dirty flush
- `src/lib/chart/useCellLayoutConfig.ts` — `useSyncExternalStore` selectors
- `src/app/components/chart-cell/ChartCell.tsx` — memo + store subscription
- `src/app/components/stock-app/useStockAppLayoutController.ts` — slice-only vs shell update path
- `src/app/components/stock-app/useStockAppBootstrap.ts` — store hydrate + debounced flush
- `src/lib/persistence/sync/layoutContentFingerprint.ts` — `layoutRevisionFingerprint`
- `src/app/components/chart-cell/useDrawingLayoutSync.ts` — revision-based persist/restore
- `src/lib/chart/ARCHITECTURE.md` — Phase 7 paragraph

## Architecture review

Self-review **Passed** — store ownership per `chartId`; `linkDrawings` via store writes + ChartSyncBridge; inactive-engine remount reads flushed `CellConfig`.

## Focused

```
npm test -- --run src/lib/chart/cellLayoutStore.test.ts src/lib/persistence/sync/layoutContentFingerprint.test.ts src/app/components/chart-cell/useViewportPersistSync.test.ts src/lib/chart/drawingStore.test.ts src/test/runtimeInteractionWakeups.test.tsx
Test Files  5 passed (5)
Tests  28 passed (28)
```

## Wakeup / render evidence

- Phase 7: edit cell-0 drawings → cell-0 probe renders **1**, cell-1 probe renders **0**
- Persistence flush round-trip: drawing slice captured on `flushCellLayoutNow`

## Next

Phase 8 — server amplification + CI budgets
