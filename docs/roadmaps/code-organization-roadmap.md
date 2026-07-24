# Code Organization Roadmap

Phased track to close structural debt left after [Structural Refactor](./refactor-roadmap.md): layering leaks, god modules, unfinished UI migration, chart shim forever-tax, and harness/index drift — without changing user-visible product behavior.

**Last updated:** 2026-07-24

**Status:** Phase 0 **Passing** (2026-07-24). Phase 1 **Passing** (2026-07-24). Phase 2 **Passing** (2026-07-24). Phase 3 **Pending**.

**Related:** [Structural Refactor](./refactor-roadmap.md) (complete), [Refactor Planning Checklist](../checklists/refactor-planning-checklist.md), [Chart Architecture](../../src/lib/chart/ARCHITECTURE.md), [Market Data Architecture](../../src/lib/marketData/ARCHITECTURE.md), [AI Tools Architecture](../../src/lib/ai/ARCHITECTURE.md), [Persistence Architecture](../../src/lib/persistence/ARCHITECTURE.md), [Design System Architecture](../../src/lib/design-system/ARCHITECTURE.md), [Project Status](../PROJECT-STATUS.md), [Edge Roadmap](../ROADMAP.md), [AGENTS.md](../../AGENTS.md).

**Origin:** 2026-07-24 repo organization review (domain map is sound; debt is incomplete migrations + missing app-layer boundary enforcement).

---

## Intent Classification

- **Primary:** Refactor — reorganize layering, file homes, and module size without changing product behavior.
- **Secondary:** Testing — characterization / boundary lint so moves stay safe; Docs — harness archive + index alignment (Phase 2).
- **Arch:** Required — self-review each phase (package vs app boundaries, market-data hot path, AI/persistence contracts). Phase 0 self-review **Passed** (2026-07-24).
- **Assumptions:**
  - Continues [refactor-roadmap.md](./refactor-roadmap.md); does not reopen Tier A–E unless a phase finds a regression.
  - Behavior invariant unless a phase explicitly notes a UX-only cleanup (none planned).
  - WIP=1 — one phase Active; quote real command output before **Passing**.
  - Activate only when Current Active Work is free (Wave 2 Phase 4 or successor).

---

## Checklist Review

- **Missing:** App `src/lib` → `src/app` import ban (packages already linted); size budgets; enforced `PROJECT-STATUS` archive; chart shim deletion deadline; finished `components/` feature-folder migration.
- **Misalignments:** `refactor-roadmap.md` claims `ChartCell` ~939 LOC thin shell — file is ~1202; `AGENTS.md` Repo Layout undersells `packages/` and misplaces design-system primitives; roadmap indexes lag Research UX / Wave 2 in places.
- **Risks:** Market-data routing regressions when splitting `marketDataService`; hydration/provider-order breaks when moving providers; AI/persistence type moves breaking adapters; aggressive shim deletion without consumer migration.
- **Decisions:** Fix **layering before** large god-file splits (types must live in `lib` first). Docs/harness hygiene is early (low code risk, high agent friction). Chart shim sunset is last (depends on consumers already preferring packages).

---

## Goal

After this track:

1. **`src/lib` never imports `src/app`** — shared types/hooks live below the UI; enforced by lint/test.
2. **God modules are coordinators** — `marketDataService` and `ChartCell` are wiring + thin shells under explicit size budgets.
3. **One UI home per concern** — fat files leave `src/app/components/` root for feature folders; root holds composition only.
4. **Chart packages are the edit surface** — `src/lib/chart/*` shims shrink or die on a dated sunset; new code imports `@edge/*`.
5. **Harness stays navigable** — `PROJECT-STATUS.md` hot dashboard + archive policy; index docs match verified state.

### Success criteria (track-level)

| Criterion | Measure |
|-----------|---------|
| Layering | `rg "from [\"']@/app/" src/lib` → 0 production imports (tests may allowlisted); boundary test fails on new leaks |
| Market data | `marketDataService.ts` under budget (target ≤ ~800 LOC shell + extracted modules); focused MD tests green |
| ChartCell | `ChartCell.tsx` under budget (target ≤ ~400 LOC shell); existing `ChartCell.*.test.*` green |
| Components root | Root `src/app/components/*.{tsx,ts}` is composition/providers only — no new feature bodies at root |
| Chart shims | Documented inventory + sunset; new app code prefers `@edge/chart-*`; shim count trending down |
| Harness | `PROJECT-STATUS.md` Current + Active + ≤10 recent Passing; older stacks in `status-archive/`; README/ROADMAP/AGENTS layout aligned |

---

## Issue inventory → phases

| # | Issue | Severity | Phase |
|---|--------|----------|-------|
| I1 | `src/lib` → `src/app/components` imports (AI, copilot, screener, symbol-search, script library) | High | 0 inventory → **1** fix + gate |
| I2 | `marketDataService.ts` ~3120 LOC | High | **4** |
| I3 | `ChartCell.tsx` ~1202 LOC (regrew after Tier D) | High | **3** move + **4** split |
| I4 | Half-migrated `src/app/components/` (feature folders + fat root) | Medium | **3** |
| I5 | ~61 chart re-export shims under `src/lib/chart/` | Medium | **5** |
| I6 | `PROJECT-STATUS.md` ~4.5k-line append-only log | High (agent friction) | **2** |
| I7 | Index drift (`roadmaps/README`, parts of `ROADMAP`, `AGENTS` layout) | Medium | **2** |
| I8 | React under `lib/` (`ScriptLibraryMountGate.tsx`) | Low–Medium | **1** or **3** with its folder |

Known inverted imports (Phase 1 targets):

| File | Imports from |
|------|----------------|
| `src/lib/ai/context.ts`, `src/lib/ai/tools/_helpers.ts` | `@/app/components/ActiveChartContext` |
| `src/lib/persistence/client/copilotThreadsClient.ts` | `@/app/components/copilot/useCopilotThread` |
| `src/lib/copilot/copilotThreadRedact.ts` | same |
| `src/lib/marketData/search/searchClient.ts` | `@/app/components/design-system/symbol-search/types` |
| `src/lib/screener/useScreenerSessionModel.ts` | screener provider / `ResultsTable` constants |
| `src/lib/scriptLibrary/ScriptLibraryMountGate.tsx` | `AppWorkspaceContext` |

---

## Principles

| Principle | Meaning |
|-----------|---------|
| Behavior invariant | Charting, market data, AI, sync, menus stay identical unless a phase says otherwise |
| Layering | `app` → `lib` → `packages` / `db`; never `lib` → `app` |
| Packages canonical | `@edge/chart-core` / `@edge/chart-react` / `@edge/ai-tools-*` own implementations; app keeps adapters only |
| Tests before move | Characterization or contract tests land before extracting hot paths |
| Size budgets | Coordinators stay thin; growth beyond budget is a new extract, not “just one more hook” |
| No product bundling | Park feature asks in their product tracks |
| WIP=1 + evidence | One Active phase; harness records focused (and build when packages/boundaries move) output |

---

## Proposed Plan

### Phase 0 — Baseline & policy

**Outcome:** Measurable inventory, budgets, and enforcement hooks so later phases cannot silently regress.

**Status:** **Passing** (2026-07-24)

**Baseline:** [docs/evidence/code-org-baseline.txt](../evidence/code-org-baseline.txt)

| # | Deliverable |
|---|-------------|
| 0.1 | Inventory doc section (or `docs/evidence/code-org-baseline.txt`): lib→app import list, top LOC offenders, components-root file list, chart shim count |
| 0.2 | Size budgets written (targets above); note current LOC as baseline |
| 0.3 | Boundary gate stub: script or Vitest that lists lib→app imports (fail mode **warn** or allowlist-only in Phase 0; **fail** in Phase 1) |
| 0.4 | Extend package-boundary notes / `AGENTS` Work Boundaries pointer to this track (no full AGENTS rewrite yet) |
| 0.5 | Confirm `examples/chart-perf-harness` inclusion gap in `validate-package-boundaries` — fix or explicitly defer to Phase 5 |

**Files (expected):** `scripts/validate-app-lib-boundaries.mts` (or extend `package-boundary-policy`), `src/test/package-boundaries.test.ts` / new `app-lib-boundaries.test.ts`, this roadmap, optional evidence file.

**Exit evidence:**

- Focused: boundary inventory test runs; baseline artifact committed or quoted
- Architecture review: self-review Passed (policy only)
- App-level: N/A

**Depends on:** none (safe whenever WIP=1 is free).

---

### Phase 1 — Layer inversion (`lib` ↛ `app`)

**Outcome:** Shared types and pure helpers live under `src/lib` (or packages); UI owns React only; boundary test **fails** on new leaks.

**Status:** **Passing** (2026-07-24)

| # | Deliverable |
|---|-------------|
| 1.1 | Move `ActiveChartSnapshot` (and related pure types) to `src/lib/chart/` or `src/lib/ai/`; UI re-exports if needed |
| 1.2 | Move Copilot message/thread types used by persistence/redact out of `useCopilotThread` into `src/lib/copilot/` |
| 1.3 | Move `SymbolSearchResult` (and search DTOs) to `src/lib/marketData/search/` or design-system tokens path under `lib` |
| 1.4 | Untangle screener session model: page-size + state types in `src/lib/screener/`; provider stays in app |
| 1.5 | Relocate or invert `ScriptLibraryMountGate` (app component that calls lib, not lib→app) |
| 1.6 | Flip boundary gate to **fail** CI/check on production `src/lib` → `src/app` imports |

**Files (expected):** files in inventory table; `src/lib/ai/context.ts`; `src/lib/persistence/client/copilotThreadsClient.ts`; `src/lib/marketData/search/*`; `src/lib/screener/*`; `src/app/components/**` thin re-exports; boundary script/test.

**Exit evidence:**

- Focused: AI + persistence + screener + search + copilot tests; `rg` / boundary test = 0 leaks
- Build: `npm run build` when shared types cross API/AI
- Architecture review: self-review Passed
- App-level: N/A unless Copilot thread hydrate regresses (then one reload walk)

**Depends on:** Phase 0.

---

### Phase 2 — Harness & index hygiene

**Outcome:** Status board is a dashboard again; roadmap indexes and `AGENTS` layout match code.

**Status:** **Passing** (2026-07-24)

| # | Deliverable |
|---|-------------|
| 2.1 | Archive Previous Verified stacks older than the keep window into `docs/status-archive/` (dated file); leave Current + Active + recent Passing |
| 2.2 | Document archive rule in harness checklist / PROJECT-STATUS header (keep ≤ N previous blocks) |
| 2.3 | Align `docs/roadmaps/README.md` + stale `docs/ROADMAP.md` rows (Research UX, Wave 2, shared-cache, etc.) with PROJECT-STATUS |
| 2.4 | Refresh `AGENTS.md` Repo Layout: `packages/`, `marketData`, trading/journal, design-system tokens vs primitives |
| 2.5 | Optional: `npm run harness:closeout` / docs automation note so closeout prefers archive over append forever |

**Files (expected):** `docs/PROJECT-STATUS.md`, `docs/status-archive/*`, `docs/checklists/harness-status-checklist.md`, `docs/roadmaps/README.md`, `docs/ROADMAP.md`, `AGENTS.md`.

**Exit evidence:**

- Focused: `npm run lint:instructions` (AGENTS size/scoping); spot-check PROJECT-STATUS line count drop
- Architecture review: N/A (docs) or self-review Passed for AGENTS accuracy
- App-level: N/A

**Depends on:** none hard — can run after Phase 0; preferred before Phase 3–4 so agents navigate correctly. May parallelize with Phase 1 only if WIP policy allows a docs-only Active row (prefer sequential).

---

### Phase 3 — Components tree completion

**Outcome:** Feature code lives in feature folders; `src/app/components/` root is shells, providers, and re-exports.

**Status:** **Pending**

| # | Deliverable |
|---|-------------|
| 3.1 | Inventory root files → target folders (`chart-cell/`, `chart-chrome/`, `stock-app/`, `drawing/`, providers/, etc.) |
| 3.2 | Move EdgeChart / DrawingToolbar / ChartGrid / modals / toolbars into existing or new feature dirs; leave thin root re-exports **only if** import churn demands a short bridge |
| 3.3 | Relocate fat providers that are not true app-wide roots (or document why they stay at root) |
| 3.4 | `ChartCell.tsx` becomes a thin composition root over `chart-cell/*` (line-count toward Phase 4 budget; full split may finish in 4) |
| 3.5 | Ban list: no new feature implementations at components root (note in design-system or chart ARCHITECTURE) |

**Files (expected):** `src/app/components/*`, `src/app/components/chart-cell/*`, `chart-chrome/*`, `stock-app/*`, `object-tree/*`, tests colocated with moves.

**Exit evidence:**

- Focused: ChartCell / EdgeChart / StockApp / DrawingToolbar / ObjectTree test suites
- Build: `npm run build` if import graph churns widely
- Architecture review: self-review Passed
- App-level: deferred unless a chrome path breaks (one `/workspace` smoke)

**Depends on:** Phase 1 preferred (so moves do not re-introduce lib→app). Phase 2 helpful but not required.

---

### Phase 4 — God-module decomposition

**Outcome:** Hot coordinators are wiring layers; logic lives in focused modules with characterization tests.

**Status:** **Pending**

#### 4A — `MarketDataService` split

| | |
|--|--|
| **Why** | ~3120 LOC central routing/cache/provider orchestration — change risk and review cost |
| **Where** | `src/lib/marketData/service/` — extract routing, cache, provider selection, quote/candle paths per existing ARCHITECTURE seams |
| **Approach** | Characterization tests on public service methods first; extract pure helpers then sub-services; keep `MarketDataService` as façade |
| **Risk** | High — provider order, cache keys, trust/freshness, connectionId threading |
| **Verify** | Focused marketData + chartDataFeed + API candle tests; Build if service public surface moves; Arch self-review; App-level: one cold candle + feed chip source walk |

#### 4B — `ChartCell` finish

| | |
|--|--|
| **Why** | Regrew to ~1202 LOC after Tier D “thin shell” |
| **Where** | `src/app/components/chart-cell/*` + thin `ChartCell.tsx` |
| **Approach** | Continue hook/module extract (feed binding, live policy, legend, pane actions, pattern capture already partially split); hit ≤ ~400 LOC shell budget |
| **Risk** | Medium-high — active chart, live policy, link sync |
| **Verify** | Existing `ChartCell.*.test.*` + related; Arch self-review; App-level deferred unless link/live regresses |

#### 4C — Opportunistic budget check (optional same phase or follow-up)

| File | Action |
|------|--------|
| `src/lib/trading/tradingService.ts` (~1k) | Split only if touched for bugs; else backlog note |
| `src/lib/marketData/health.ts` (~1.3k) | Extract projectors if Phase 4A touches health |
| `AlertsConfigPane.tsx` (~1k) | Leave to alerts track unless blocking |

**Exit evidence:** Budgets met or waived with written rationale; focused suites quoted; arch Passed.

**Depends on:** Phase 1; Phase 3 for ChartCell folder home.

---

### Phase 5 — Chart shim sunset

**Outcome:** Packages are the default import path; compatibility shims have a deletion plan and shrinking count.

**Status:** **Pending**

| # | Deliverable |
|---|-------------|
| 5.1 | Inventory which `src/lib/chart/*` files are pure `export * from '@edge/…'` vs real adapters |
| 5.2 | Migrate high-churn app imports to `@edge/chart-core` / `@edge/chart-react` directly (codemod or staged folders) |
| 5.3 | Keep only adapters that must stay app-side (feed glue, persistence mapping); delete pure re-exports when call sites clear |
| 5.4 | Sunset date + CI grep: discourage new `src/lib/chart` shim files; include perf harness in package-boundary scan if deferred from 0.5 |
| 5.5 | Update `src/lib/chart/ARCHITECTURE.md` “Canonical vs compatibility” with post-sunset state |

**Files (expected):** `src/lib/chart/*`, app/package import sites, `scripts/validate-package-boundaries.mts`, chart ARCHITECTURE, package API snapshot if exports change.

**Exit evidence:**

- Focused: package boundaries + package API snapshot + chart package tests; `npm run build:packages`
- Architecture review: self-review Passed
- App-level: N/A (import-path only) unless adapter behavior changes

**Depends on:** Phase 3–4 preferred so coordinators are not mid-move; Phase 0.5 gap closed here if not earlier.

---

## Near-term execution order

1. **Phase 0** — baseline + policy (start when WIP=1 free)
2. **Phase 1** — layer inversion + fail-closed gate
3. **Phase 2** — harness/index hygiene (docs; do before or immediately after Phase 1)
4. **Phase 3** — components tree completion
5. **Phase 4** — god-module splits (4A then 4B)
6. **Phase 5** — chart shim sunset

Do not start Phase 4A until Phase 1 **Passing** (types stable). Do not start Phase 5 deletion until consumer migration is underway and package boundaries stay green.

---

## Explicit exclusions

| Excluded | Reason |
|----------|--------|
| Product features (Research, playbooks, alerts delivery, etc.) | Own tracks |
| Replacing Canvas engine / TradingView embed | CONSTRAINTS |
| Public npm publish of `@edge/*` packages | Explicit deferral in ROADMAP |
| Full `tradingService` / alerts UI rewrite | Optional 4C only if touched |
| Rewriting all kebab/camel folder names | Noise; fix only when moving files |
| CRDT / multi-device sync | Workspace track / deferrals |

---

## Verification Plan (per phase)

| Tier | When |
|------|------|
| Focused tests | Always — suites for touched modules |
| Boundary lint | Phase 0+ (`app-lib` + existing `lint:package-boundaries`) |
| Build | Phases that move shared AI/persistence/chart package surfaces |
| App-level | Only when UI+state+engine or API+MD path changes (4A candle/chip; optional chrome smoke in 3/4B) |
| Arch review | Required each phase — self-review unless human escalates |

---

## Harness Update

- **Activate:** Code organization — Phase 0 when Current Active Work is free; WIP=1.
- **On Passing:** Quote focused (and build/boundary) evidence; update this roadmap Status line + Active Work row.
- **Task Contract:** Yes for Phases 1, 3, 4 (cross-session / cross-component).
- **Commit:** yes (per phase closeout) unless phase is docs-only and plan says skip.
