# AI Tools Chart — Architecture

Portable chart-session tools for agents that operate on a headless `@edge/chart-core` session — not the Edge application registry.

## Responsibility

Expose read/write tools against a `ChartSessionPort` (`getState`, `setState`, `getSymbol`, `getVisibleRange`) for examples, SDK consumers, and package tests. These tools do **not** know about multi-cell layout, watchlists, screener, trading, or app chrome.

## Key Modules

| Module | Role |
|--------|------|
| `src/tools.ts` | Tool definitions (`get_chart_state`, `set_chart_type`, `summarize_chart`, …) |
| `src/context.ts` | `ChartToolContext` — `{ chart: ChartSessionPort, clientSession?: boolean }` |
| `src/session.ts` | In-memory session factory for examples |

## Tool Inventory

| Tool | Permission | Notes |
|------|------------|-------|
| `get_chart_state` | read | Returns serialized state + symbol + visible range; input `{}` |
| `summarize_chart` | read | Compact counts and name lists |
| `list_supported_indicators` | read | Starter + registered indicator names |
| `set_chart_type` | write | Mutates session via `restoreChartState` |
| `add_indicator` | write | Appends to serialized indicators (starter enum) |
| `clear_drawings` | destructive | Clears all drawings; requires confirmation |

## Shared Names, Different Products

Several tool names overlap with Edge app tools in `src/lib/ai/tools/chart.ts` (`get_chart_state`, `set_chart_type`, and workflow `summarize_chart`). **Same string name does not mean the same contract.**

| Tool | This package | Edge app registry |
|------|--------------|-------------------|
| `get_chart_state` | `{}` → serialized session state | `{ cellIndex }` → cell config + active overlays |
| `set_chart_type` | `{ chartType }` on session | `{ chartType, cellIndex }` via layout cell update |
| `summarize_chart` | Session counts/names | Rich app summary with annotations/thesis |

Shared enums only: `CHART_TYPE_VALUES` and `STARTER_INDICATOR_NAMES` from `@edge/chart-core`. Execute paths stay separate.

## Consumers

- `examples/ai-tools-chart-basic` — primary demo
- `packages/ai-tools-chart/src/tools.test.ts` — package tests
- `src/test/package-api-snapshot.test.ts` — export surface

The Edge app registry (`src/lib/ai/clientTools.ts`) does **not** import this package.

## Invariants

- Tools MUST NOT import React or Edge app contexts.
- Do not register these tools in the app registry without an explicit product decision.
- Package export names are snapshot-tested — rename tools only with a semver/breaking change plan.

## Related Docs

- [docs/ai-tools-architecture.md](../../docs/ai-tools-architecture.md) — Edge application tools (Two products section)
- [src/lib/ai/ARCHITECTURE.md](../../src/lib/ai/ARCHITECTURE.md) — app registry
- [@edge/chart-core](../chart-core/) — chart state and enums

## Verification

```bash
npm test -- --run packages/ai-tools-chart/src/tools.test.ts
npm run build:packages
npm run check:examples
```
