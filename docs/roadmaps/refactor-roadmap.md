# Structural Refactor Roadmap

Single roadmap for consolidating duplicated sync/series logic and decomposing oversized chart/app coordinators — without changing user-visible behavior.

**Last updated:** 2026-07-17

**Status:** Tier A (dead code) **Passing**. Tier B **Passing** (2026-07-17). Tier C **Passing** (2026-07-17). Tier D **Passing** (2026-07-17). Tier E **Passing** (2026-07-17) — E1 revisioned repo/client helpers; E2 AI chart-tool product split.

**Related:** [Refactor Planning Checklist](../checklists/refactor-planning-checklist.md), [Chart Architecture](../../src/lib/chart/ARCHITECTURE.md), [Persistence Architecture](../../src/lib/persistence/ARCHITECTURE.md), [Design System Architecture](../../src/lib/design-system/ARCHITECTURE.md), [AI Tools Architecture](../ai-tools-architecture.md), [Project Status](../PROJECT-STATUS.md), [Edge Roadmap](../ROADMAP.md).

---

## Goal

Make Edge cheaper and safer to change:

1. **One implementation** for revisioned remote sync and candle series/interval math.
2. **Coordinators as wiring** — `ChartCell`, package `EdgeChart`/`canvas`, and drawing controller stop owning every concern in one file.
3. **Clear product boundaries** — app AI chart tools vs portable package tools; Object Tree vs Data Window; Edge design-system chrome vs leftover Tailwind.

**Hard rule:** Each phase is a behavior-preserving refactor unless a phase explicitly notes a UX-only cleanup. Use [refactor-planning-checklist.md](../checklists/refactor-planning-checklist.md). WIP=1 — one Active Work row at a time.

---

## Verified Today vs Gaps

| Capability | Status | Notes |
|------------|--------|-------|
| Tier A dead-code removal | **Passing** | Orphan chart re-exports; unused Toolbar/legend; unused Yahoo MD port removed (2026-07-17) |
| Generic revision-sync hook | **Passing** | Typed `useRevisionedRemoteSync` + thin watchlist/screener/template wrappers (2026-07-17) |
| Series/interval in one package | **Passing** | Pure series/interval math in `@edge/chart-core`; app re-exports; chart-react duplicate adapter removed (2026-07-17) |
| ChartCell as thin shell | **Passing** | ~939 lines — `chart-cell/*` hooks + wiring (2026-07-17) |
| Canvas render ≠ gestures | **Passing** | `canvas.tsx` ~349 lines; `useViewportLifecycle`, `useCanvasRenderer`, `useCanvasGestures`, `useCanvasCursor` (2026-07-17) |
| EdgeChart coordinators | **Passing** | `EdgeChart.tsx` ~566 lines; session/crosshair/wheel/pane/event-detail hooks (2026-07-17) |
| Drawing controller split | **Passing** | `useDrawingController.ts` ~406 lines; handle slice + pointer FSM modules (2026-07-17) |
| StockApp providers extracted | **Passing** | C1 — `stock-app/*` hooks + `AppProviders`; `StockApp.tsx` ~152 lines (2026-07-17) |
| Design-system modal migrate | **Passing** | C3 — seven chart chrome files on Edge shells/tokens (2026-07-17) |
| Object Tree ≠ Data Window | **Passing** | C2 — `object-tree/*` modules; `ObjectTree.tsx` ~160 lines (2026-07-17) |
| Revisioned CRUD helpers | **Passing** | `revisionedLibraryRepository.ts` + `revisionedLibraryClient.ts`; watchlist/screener/template adapters (2026-07-17) |
| AI chart tools clarified | **Passing** | Two-products docs; shared `CHART_TYPE_VALUES` / `STARTER_INDICATOR_NAMES` from chart-core (2026-07-17) |

---

## Principles

| Principle | Meaning |
|-----------|---------|
| Behavior invariant | User-visible charting, sync, and menus stay identical unless a phase says otherwise |
| Package direction | `@edge/chart-core` / `@edge/chart-react` are canonical; `src/lib/chart/*` stays re-exports or thin adapters |
| Tests before move | Characterization / contract tests land before extracting hot paths |
| No opportunistic features | Refactor only — park product asks in their own track |
| Evidence in harness | Each Active Work item records focused (and build when packages move) completion evidence |

---

## Phasing

### Tier A — Dead code (done)

**Outcome:** Remove unused surface area so Tier B has a clear import graph.

**Status:** **Passing** (2026-07-17).

| Work item | Evidence |
|-----------|----------|
| Orphan chart duplicates → package re-exports | `indicators/draw`, `drawings/measure` |
| Unused app Toolbar / legend components | Deleted |
| Unused `createYahooMarketDataPort` | Removed from AI market-data port |

---

### Tier B — Duplication consolidation (done)

**Outcome:** One sync core and one series/interval home. Medium effort, high leverage, lower risk than god-file splits.

**Status:** **Passing** (2026-07-17).

#### B1 — Generic revision-sync hook

| | |
|--|--|
| **Why** | Watchlist / screener / chart-template sync copy the same hydrate → revision compare → debounce → conflict loop (~100 lines × 3). |
| **Where** | `src/lib/persistence/sync/useRevisionedRemoteSync.ts`, thin wrappers for watchlist/screener/chart-template |
| **Approach** | Typed `useRevisionedRemoteSync` (+ resource adapters). Contract tests for hydrate, conflict, and no-loop equality before migrating each consumer. |
| **Risk** | Sync regressions or conflict loops. |
| **Verify** | **Passing** — `Test Files 6 passed (6)`, `Tests 21 passed (21)` (`src/lib/persistence/sync/`); **Architecture review:** self-review Passed |

#### B2 — Series + interval consolidation

| | |
|--|--|
| **Why** | Heikin Ashi, merge, history coverage, interval mapping, and 2h resampling exist in both app and package; interval adapters are near-identical. |
| **Where** | `packages/chart-core/src/{series,interval}.ts`; app thin re-exports in `src/lib/chart/{series,intervalAdapter}.ts` |
| **Approach** | Pure series/resampling math → `@edge/chart-core`. App keeps fetch/normalize adapters under `src/lib/chartDataFeed` (or thin `src/lib/chart` re-exports). |
| **Risk** | Candle order, duplicate timestamps, fetch-boundary changes. |
| **Verify** | **Passing** — `Test Files 12 passed (12)`, `Tests 90 passed (90)` (sync + series/interval + package snapshot + chartDataFeed); **Build:** `npm run build:packages` passed; **Boundaries:** `npm run lint:package-boundaries` passed; **Architecture review:** self-review Passed |

**Tier B exit:** Both B1 and B2 **Passing** with harness evidence. Next: Tier C1 (StockApp providers).

---

### Tier C — App shell decomposition

**Outcome:** App coordinators become composition roots; behavior stays in focused hooks/modules.

#### C1 — StockApp providers + controllers

| | |
|--|--|
| **Why** | Bootstrap, persistence, layout mutations, sidebars, symbol history, and ~13 providers live in one component (~741 lines). |
| **Where** | `src/app/components/stock-app/*`, thin `StockApp.tsx` |
| **Approach** | Extract `useStockAppBootstrap`, layout/sidebar controllers, and `AppProviders`. Do not reorder providers casually. |
| **Risk** | Medium-high — hydration and provider order. |
| **Verify** | **Passing** — `Test Files 4 passed (4)`, `Tests 23 passed (23)`; **Build:** `npm run build` passed; **Architecture review:** self-review Passed |

#### C2 — Object Tree vs Data Window

| | |
|--|--|
| **Why** | Tree editing and the Data Window candle/indicator panel are independent features in one file (~926 lines). |
| **Where** | `src/app/components/object-tree/*`, tab shell `ObjectTree.tsx` |
| **Approach** | Extract `DataWindowTab` (+ tree row/section modules). Keep `ObjectTree` as tab shell. |
| **Risk** | Medium — broad active-chart action contracts. |
| **Verify** | **Passing** — `Test Files 2 passed (2)`, `Tests 19 passed (19)`; **Architecture review:** self-review Passed |

#### C3 — Design-system leftovers (incremental)

| | |
|--|--|
| **Why** | Several chart modals still use `gray-*` / `blue-*` / raw hex beside Edge tokens. |
| **Where** | `DrawingSettingsModal`, `IndicatorSettingsModal`, `TemplatePickerModal`, `ChartGoToModal`, `ChartTimeZoneMenu`, `DrawingSelectionToolbar`, `BarReplay` |
| **Approach** | Migrate shells/buttons/fields to `EdgeModalShell` / `EdgeButton` / semantic vars when touched. Preserve user-selectable drawing colors. |
| **Risk** | Visual regressions; do not “token-ize” canvas paint colors. |
| **Verify** | **Passing** — `Test Files 4 passed (4)`, `Tests 11 passed (11)`; **Architecture review:** self-review Passed |

**Tier C exit:** C1, C2, and C3 **Passing** with harness evidence (2026-07-17). Next: Tier D (complete) → Tier E1.

---

### Tier D — Chart runtime decomposition (done)

**Outcome:** Package/runtime files split by responsibility. Characterization tests first.

**Status:** **Passing** (2026-07-17).

#### D1 — Decompose `ChartCell`

| | |
|--|--|
| **Status** | **Passing** |
| **Verify** | **Passing** — `Test Files 6 passed (6)`, `Tests 22 passed (22)` (ChartCell suite incl. pattern-capture characterization); **Build:** `npm run build` passed; **Architecture review:** self-review Passed |

#### D2 — Split canvas render vs gestures

| | |
|--|--|
| **Status** | **Passing** |
| **Verify** | **Passing** — `Tests 19 passed (19)` (`canvas.test.tsx`); **Build:** `npm run build:packages` passed; **Boundaries:** `npm run lint:package-boundaries` passed |

#### D3 — EdgeChart coordinators

| | |
|--|--|
| **Status** | **Passing** |
| **Verify** | **Passing** — `Tests 12 passed (12)` (`EdgeChart.test.tsx`); **Build:** `npm run build:packages` passed |

#### D4 — Drawing controller FSM vs command facade

| | |
|--|--|
| **Status** | **Passing** |
| **Verify** | **Passing** — `Tests 13 passed (13)` (drawing controller suite); **Build:** `npm run build:packages` passed; package-api-snapshot unchanged |

**Tier D exit:** D1–D4 **Passing** with harness evidence (2026-07-17). Next: Tier E1.

---

### Tier E — Persistence + AI boundaries

**Outcome:** Shared revisioned CRUD mechanics; explicit AI chart-tool product split.

#### E1 — Revisioned repository/client helpers

| | |
|--|--|
| **Why** | Watchlist and screener library repos/clients duplicate create-if-absent, optimistic revision, conflict, and response parsing. |
| **Where** | `src/lib/persistence/` repositories + clients |
| **Approach** | Small revisioned-record helpers; keep typed resource adapters (do not over-genericize schemas). |
| **Risk** | Schema-specific behavior lost in a mega-helper. |
| **Verify** | **Passing** — `Test Files 15 passed (15)`, `Tests 52 passed (52)` (revisioned helpers + sync + schemas + library route tests); **Build:** `npm run build` passed; **Architecture review:** self-review Passed |

#### E2 — Clarify two AI chart-tool products

| | |
|--|--|
| **Why** | App registry tools and `@edge/ai-tools-chart` share names (`get_chart_state`, `set_chart_type`) with different contexts; package is mostly tests/examples while the app uses its own tools. |
| **Where** | `src/lib/ai/tools/chart.ts`, `packages/ai-tools-chart/src/tools.ts` |
| **Approach** | Document “portable chart-session tools” vs “Edge application tools”; share schemas only where semantics match. Do not merge mechanically. |
| **Risk** | External/example consumers of the package API. |
| **Verify** | **Passing** — `Test Files 3 passed (3)`, `Tests 15 passed (15)` (`chart.test.ts`, `packages/ai-tools-chart` tools, package-api-snapshot); **Build:** `npm run build:packages` passed; **Architecture review:** self-review Passed |

**Tier E exit:** E1 and E2 **Passing** with harness evidence (2026-07-17). Structural refactor track complete for Tier E.

---

## Suggested execution order

```
A (done) → B1 or B2 → B (both) → C1 → C2 / C3 (opportunistic)
         → D1 (when chart features need it)
         → D2 → D3 → D4 (characterization tests first)
         → E1 (natural after B1) → E2
```

Prefer **B1 → B2 → C1 → E1** as the default near-term spine. Defer Tier D until a feature or bug makes the god-file cost undeniable, or until B/C are green and WIP is free.

---

## Hotspot sizes (snapshot 2026-07-17)

| File | Lines (approx.) |
|------|-----------------|
| `src/app/components/ChartCell.tsx` | 939 |
| `packages/chart-react/src/engine/canvas.tsx` | 349 |
| `packages/chart-react/src/EdgeChart.tsx` | 566 |
| `packages/chart-react/src/drawing/useDrawingController.ts` | 406 |
| `src/app/components/ObjectTree.tsx` | 160 |
| `src/app/components/StockApp.tsx` | 152 |
| `src/lib/chart/series.ts` | 227 |
| `packages/chart-core/src/series.ts` | 177 |
| `use*LibraryRemoteSync.ts` (each) | ~100–110 |

---

## Verification gates (per phase)

| Tier | Minimum | When broader |
|------|---------|----------------|
| B | Focused tests for moved sync/series | `build:packages` + package-boundary lint if imports move |
| C | Focused UI/controller tests | App smoke if provider or tree wiring changes |
| D | Characterization tests **before** extract; focused after | `build:packages`; pan/zoom/draw app-level when touching canvas/drawing |
| E | Persistence or AI registry tests | Docs update in same change |

Completion evidence must quote actual command output in [PROJECT-STATUS.md](../PROJECT-STATUS.md) Active Work (not “tests pass”).

---

## Explicit non-goals

- Product features (new indicators, alerts, screener Phase 3, etc.) — use their own roadmaps.
- Full TradingView parity or public npm package release polish.
- Rewriting the chart engine to WebGL as part of this track (see Charting Platform Acceleration in [ROADMAP.md](../ROADMAP.md)).
- Big-bang “split everything” PRs — one phase / one Active Work row.

---

## Harness

When executing a phase:

1. Set Active Work to that phase only (WIP=1).
2. Apply [refactor-planning-checklist.md](../checklists/refactor-planning-checklist.md).
3. Architecture review: self-review for B/C/E; Required if D changes package public API or gesture/drawing contracts.
4. Record Passing/Blocked + evidence; point **Next best step** at the next phase in this file.
