# ENGINE — Chart platform

**Purpose:** Canvas engine, chart packages, indicators, drawings, scripting, viewport/perf. Owns rendering and interaction invariants no other lane can prove.

## Seed

- Custom Edge canvas only — see [Chart Engine](../../CONSTRAINTS.md#chart-engine).
- **Never:** klinecharts, TradingView embed, React re-render on every pan/wheel tick, drawing mutations outside `DrawingStore` commands.

## Load set

Read after this pack, before deep edits:

- [src/lib/chart/ARCHITECTURE.md](../../src/lib/chart/ARCHITECTURE.md)
- [packages/indicator-runtime/ARCHITECTURE.md](../../../packages/indicator-runtime/ARCHITECTURE.md)
- [packages/ai-tools-chart/ARCHITECTURE.md](../../../packages/ai-tools-chart/ARCHITECTURE.md) — when AI touches chart tools
- [docs/chart/features.md](../../chart/features.md) — when shipping or changing feature rows
- [docs/chart/context-menu-reference.md](../../chart/context-menu-reference.md) — menu parity work

## Sensors

Focused (pick paths touched):

```bash
npm test -- --run src/lib/chart/drawingStore.test.ts
npm test -- --run src/app/components/chartContextMenu.test.ts
npm run lint:chart-shims
npm run lint:package-boundaries
```

When packages or shared architecture change: `npm run build:packages` or `npm run check:packages` as plan specifies.

App-level when UI + engine + state cross: manual chart interaction on `http://localhost:3003`.

## Status prefix

`ENGINE — …` (e.g. `ENGINE — drawing sync`, `ENGINE — indicator perf`).

## Security pins

| id | note |
|----|------|
| SEC-15 | CSP / HSTS on app routes — canvas indicator QuickJS exceptions |

Full ledger: [security-invariant-ledger.md](../security-invariant-ledger.md).
