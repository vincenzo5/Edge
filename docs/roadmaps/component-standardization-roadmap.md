# Component Standardization Roadmap

Converge Edge app chrome on shared visual primitives, interaction contracts, and product-specific composites without flattening intentional chart density or changing trading semantics.

**Last updated:** 2026-07-18

**Status:** Phase 0 **Passing** (2026-07-18); Phase 1 **Passing** (2026-07-18); Phase 2 **Passing** (2026-07-18); Phase 3 **Passing** (2026-07-18); Phase 4 **Passing** (2026-07-18); Phase 5 **Passing** (2026-07-18); Phase 6 EdgeSelect **Passing** (2026-07-19). **Track complete.** Residual chrome spot-checks → [app-level-verification-roadmap.md](./app-level-verification-roadmap.md) Phase 6.

**Related:** [App UX Polish Roadmap](./app-ux-polish-roadmap.md), [Design System Architecture](../../src/lib/design-system/ARCHITECTURE.md), [Project Status](../PROJECT-STATUS.md), [Repository Constraints](../CONSTRAINTS.md).

---

## Intent Classification

- **Primary:** Feature — standard interaction, accessibility, and visual behavior is user-visible.
- **Secondary:** Refactor and Testing — consolidate duplicated components and add shared contract coverage.
- **Checklists applied:** `feature-planning-checklist.md`, `refactor-planning-checklist.md`, `testing-verification-checklist.md`, `harness-status-checklist.md`, `architecture-review-checklist.md`.
- **Harness state:** App UX polish Phase 4 and component-standardization Phases 0–4 are **Passing**; Phase 5 remains **Pending** until activated under WIP=1.
- **Behavior invariant:** Trading, journal filtering, chart navigation, watchlist mutations, screener queries, and persisted state remain identical except where a phase explicitly standardizes accessibility or misleading UI copy.

---

## Checklist Review

- **Architecture review:** **Required** — self-review, **Passed for roadmap**. The work introduces shared UI abstractions and migrates cross-component flows. Each implementation phase requires an exit self-review before it may be marked Passing.
- **Aligned:** Existing `--edge-*` tokens, `Edge*` primitives, `styles.ts`, `Tooltip`, `ChartAnchoredPopover`, `TileDensityContext`, and the App UX polish track remain the foundation.
- **Missing:** No automated component-gallery or screenshot-diff harness exists. Use the existing `ux:baseline` route matrix; do not create a parallel visual harness unless repeated regressions justify it.
- **Misalignments:** Several components reference undefined surface variables; symbol-search behavior is duplicated; legacy overlays bypass shared shells; menu, tooltip, toggle, spinner, and field conventions diverge.
- **Risks:** A universal component could become prop-heavy; modal/menu migrations can regress focus or dismissal; shared token changes affect many routes; density cleanup can reduce trading information throughput.
- **Recommendations:** Correct broken token references first, promote abstractions only after two real consumers, migrate one component family per phase, and preserve documented chart-stage exceptions.

---

## Product Goal

Users should experience one coherent component language:

1. Controls with the same role share shape, density, typography, focus, disabled, loading, and error behavior.
2. Repeated product logic such as symbol discovery has one implementation.
3. Similar-looking controls with different intent share presentation without being forced into one behavior component.
4. Keyboard and assistive-technology behavior is part of each primitive’s contract.
5. Intentional chart, rail, and dense-table exceptions are explicit rather than accidental.

### Success criteria

- No app component references an undefined `--edge-*` variable or invalid Edge surface class.
- Chart and watchlist symbol discovery share one search hook and one dialog/result implementation.
- Journal symbol filtering uses the shared field presentation while retaining exact local-filter semantics.
- Centered dialogs and slide-overs use shared focus, dismissal, labeling, and focus-return behavior.
- Shared tabs and menus support documented keyboard navigation.
- High-traffic icon-only controls have an accessible name, visible focus state, and a valid target-size rule or documented compact exception.
- Existing Edge loading, empty, error, toggle, button, menu, and tooltip primitives replace equivalent local recipes.
- Reference routes remain free of horizontal overflow at 1024, 1440, and 1920 CSS pixels.
- Trading and chart behavior remains unchanged outside explicitly tested accessibility and copy corrections.

### In scope

- `src/app/components/design-system/` primitives and `styles.ts`
- Search, fields, selects, toggles, buttons, tabs, menus, popovers, modals, slide-overs, tooltips, loading, empty/error states, chips, column pickers, and metric tiles
- High-traffic Workspace, Chart, Journal, Screener, Watchlist, Options, Account, and Settings consumers
- `src/lib/design-system/edge.ts`, `src/app/globals.css`, and the closest design-system documentation

### Out of scope

- Chart canvas rendering, gestures, drawing persistence, market-data routing, trading execution, journal statistics, or screener query semantics
- A new third-party component framework
- A Storybook/component-gallery project unless a later phase proves it necessary
- A simultaneous light-theme redesign
- Replacing all domain-specific composites with one universal component
- Marketing/landing-page brand tokens

---

## Current Findings

### Search flows

| Flow | Current role | Recommendation |
|------|--------------|----------------|
| Chart `SearchBar` | Read-only chart-header trigger opens `/api/search` symbol discovery | `SymbolSearchTrigger` + shared `SymbolSearchDialog` |
| Watchlist `WatchlistSearch` | Adds a discovered symbol to the active list using the same endpoint | Same dialog with an `add` result action |
| Journal `JournalScopeBar` symbol field | Controlled exact-match local trade filter | Shared compact search-field presentation only |
| Indicator picker | Local catalog filter | Shared search field with an explicit accessible label |
| Chart quick search | Command-search shell; behavior incomplete | Complete in its own product track or hide until functional |

The chart and journal should look related, but they should not share one behavior component. Presentation belongs in a field primitive; symbol discovery belongs in a hook/dialog composite; journal filtering remains controlled local state.

### Highest-impact duplication

| Role | Parallel implementations | Target |
|------|--------------------------|--------|
| Symbol discovery | `SearchBar`, `WatchlistSearch` | `useSymbolSearch` + `SymbolSearchDialog` |
| Menu section header | `ChartMenuSectionHeader`, `EdgeMenuSectionHeader` | `EdgeMenuSectionHeader` |
| Menu row | `ChartMenuItemRow`, `EdgeMenuItem`, inline rows | Extended `EdgeMenuItem` |
| Modal shell | Edge shell plus SearchBar, Chart Settings, Drawing Rename, Journal Import | `EdgeModalShell` |
| Toggle | Exported `EdgeToggle`, local switch/checkbox recipes | `EdgeToggle` / documented size variant |
| Column picker | Screener and Journal implementations | Shared `ColumnPickerPopover` |
| Loading indicator | `EdgeSpinner` plus local animated borders | `EdgeSpinner` + status wrapper |
| Metric tile | Journal, Account, summary-card variants | Shared primitive after two consumers are aligned |

### Correctness defects to reconcile first

Current consumers reference names not present in the synchronized token source, including:

- `--edge-bg-secondary`
- `--edge-bg-tertiary`
- `--edge-surface-raised`
- `--edge-surface-muted`
- `--edge-surface`

For each usage, choose an existing semantic token when the meaning already exists. Add a new token only when the surface role is distinct, then update `edge.ts`, `globals.css`, and token tests together.

---

## Design Rules

### Three-layer component model

1. **Primitive:** appearance and interaction contract, such as `EdgeSearchField`, `EdgeButton`, or `EdgeModalShell`.
2. **Behavior:** reusable state/side-effect logic, such as `useSymbolSearch` or anchored-position/dismiss hooks.
3. **Product composite:** domain semantics, such as `SymbolSearchDialog`, a Journal filter bar, or an Options expiration picker.

### Promotion rule

Promote a local pattern only after at least two real consumers need the same contract. Prefer composition and named variants over boolean-heavy universal components.

### Exception rule

Keep specialized components when the role is materially different:

- chart header and drawing overlay controls
- left/right icon rails
- draggable floating panels
- chart canvas and drawing colors
- domain badges for market direction, feed health, and trade outcomes

Exceptions still use semantic tokens, accessible names, focus states, and documented size rules.

---

## Proposed Plan

### Phase 0 — Reconcile the audit with App UX polish Phase 4

**Outcome:** Phase 5 starts from verified current code rather than redoing active accessibility work.

1. Finish App UX polish Phase 4 and record its focused, build, and app-level evidence.
2. Re-run the component inventory after Phase 4 lands.
3. Remove findings already resolved by Phase 4: modal focus containment, menu keyboard navigation, busy semantics, segmented-tab keyboard support, and target-size fixes.
4. Freeze the residual Phase 5 scope in the App UX Polish Task Contract.

**Exit evidence:** App UX polish Phase 4 is **Passing** with exact command output in `docs/PROJECT-STATUS.md`; residual Phase 5 list is explicit.

#### Phase 0 results (2026-07-18)

**Prerequisite:** App UX polish Phase 4 **Passing** — **Focused:** `Test Files 9 passed (9)`, `Tests 29 passed (29)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.2s`); **App-level:** overflow **0/12** on the Phase 4 baseline.

**Reconciliation inventory (post–Phase 4, no production code changes):**

| Category | Count | Representative paths |
|----------|-------|----------------------|
| Undefined `--edge-*` tokens | **12 files**, **28 references** | `--edge-bg-secondary` (15 refs / 6 files), `--edge-bg-tertiary` (5 / 2), `--edge-surface-raised` (2 / 2), `--edge-surface-muted` (4 / 3), bare `--edge-surface` (2 / 2) — e.g. `options/*`, `TileFrame.tsx`, `ResultsTable.tsx`, `chainDisplay.ts` |
| Raw hex in components | **8 files** | `IndicatorSettingsModal.tsx`, `DrawingSettingsModal.tsx`, `DrawingRenameModal.tsx`, `DrawingSelectionToolbar.tsx`, `ChartSettingsModal.tsx`, `ChartSnapshotMenu.tsx`, `object-tree/ObjectTreeDrawingRow.tsx`, plus test/icon paths in baseline sample |
| Tailwind palette in components | **5 files** | `DrawingRenameModal.tsx`, `ChartSettingsModal.tsx`, `DrawingSelectionToolbar.tsx`, `ChartSnapshotMenu.tsx`, `ObjectTreeDrawingRow.tsx` |
| Symbol-discovery duplication | **2 flows** | `SearchBar.tsx` (custom modal shell), `watchlist/WatchlistSearch.tsx` (`EdgeModalShell`) |
| Chart menu parallel impl | **8 files** | `ChartMenuItemRow.tsx`, `ChartMenuSectionHeader.tsx` + 6 chart menu consumers |
| Custom modal shells (no shared focus trap) | **3 files** | `SearchBar.tsx`, `journal/JournalImportDialog.tsx`, `DrawingRenameModal.tsx` |
| `EdgeToggle` production adoption | **0 consumers** | Primitive exported only |
| Local `animate-pulse` skeletons | **2 files** | `screener/ResultsTable.tsx`, `options/OptionsChainTable.tsx` |
| Column picker duplication | **2 implementations** | `screener/ColumnPicker.tsx`, `journal/JournalTradesTableControls.tsx` |
| Remaining baseline `smallTargets` | **5/12 audits** | Home `home-journal-open` / `home-research-open` @1440/1920; screener QueryBuilder micro-controls (`screener-expand-all`, rule toggles, add-rule/group) |

**Resolved by App UX polish Phase 4 — remove from actionable backlog:**

- Modal/slide-over focus containment (`useFocusTrap` in `EdgeModalShell` / `EdgeSlideOver`)
- Menu keyboard navigation (`useMenuKeyboardNav`; chart anchored popover)
- Busy semantics (`EdgeButton` `aria-busy` / loading)
- Segmented-tab keyboard support + 32px targets (`EdgeSegmentedTabs`)
- Phase 4 target-size fixes (overlay recover CTA, journal tile tabs, shared header controls)

**Frozen residual scope (Phase 1–5):**

| Phase | Residual work |
|-------|---------------|
| **Phase 1** | Repair **12** undefined-token files; add compact/standard field + select recipes; accessible naming on search fields and icon-only controls |
| **Phase 2** | `useSymbolSearch` + `SymbolSearchDialog`; migrate `SearchBar` + `WatchlistSearch`; journal symbol field presentation only (exact filter semantics unchanged) |
| **Phase 3** | Converge chart menus on `EdgeMenuItem` / `EdgeMenuSectionHeader`; adopt `EdgeToggle`; shared column picker; generalized anchored popover behavior |
| **Phase 4** | Replace local pulse skeletons; status/loading wrapper; aligned filter-chip + `EdgeMetricTile` after two-consumer validation |
| **Phase 5** | Route clusters (Workspace+Chart → Journal → Screener+Watchlist → Options+Account+Trade → Settings); home Open links + screener QueryBuilder target cleanup; raw hex/palette migration (**8 + 5** files); optional static enforcement |

**Intentional exceptions (do not flatten):** chart header/drawing overlays, left/right icon rails, draggable floating panels, canvas/drawing colors, domain badges (feed health, trade outcomes), chart-overlay connection summary annotation tier.

**Phase 0 verification:** **App-level:** `npm run ux:baseline` → `Audits: 12/12`, `Captures: 10/10`, overflow **0/12**, `smallTargets` **5/12**, raw hex **8**, Tailwind palette **5**; **Architecture review:** self-review **Passed**; **Startup:** `npm run check:startup` blocked by **72** pre-existing status-doc validation issues (unchanged baseline).

---

### Phase 1 — Token and primitive correctness

**Outcome:** Every shared component builds on valid semantic tokens and complete base contracts.

1. Replace undefined surface variables with existing semantic tokens or add justified synchronized tokens.
2. Remove invalid local surface class names.
3. Add shared compact/standard field and select recipes with consistent label, description, error, disabled, loading, and clear behavior.
4. Add required accessible naming to search fields and icon-only controls.
5. Standardize disabled opacity, close/clear controls, icon-size roles, and z-index/backdrop guidance.
6. Extend design-system tests for token sync and primitive state contracts.

**Primary files:** `src/lib/design-system/edge.ts`, `src/app/globals.css`, `src/app/components/design-system/`, `src/lib/design-system/ARCHITECTURE.md`.

**Exit evidence:** Focused token/primitive tests pass; `npm run build` passes; no undefined Edge variable/class remains in production components.

#### Phase 1 results (2026-07-18)

**Token repair:** Remapped **15 files** / **35** undefined-token references to existing semantic roles (`surface-toolbar`, `surface-panel`, `surface-hover`, `surface-active`, `negative`, `accent-blue-fill`) — no new tokens added.

**Field/select recipes:** Added `fieldClass`, `selectClass`, `labeledFieldClass`, and `clearButtonClass` in `styles.ts`; extended `EdgeSearchInput` with compact/standard density, `aria-busy`/`aria-invalid`, and labeled clear action.

**Consumer migrations:** Journal scope bar, risk settings panel, workspace tile reassign select.

**Accessible naming:** `SearchBar` (compact + modal), `IndicatorPicker`, `ChartQuickSearchModal`, journal exact-symbol filter.

**Verification:** **Focused:** `Test Files 6 passed (6)`, `Tests 27 passed (27)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.3s`); **App-level:** `npm run ux:baseline` → `Audits: 12/12`, `Captures: 10/10`, overflow **0/12**, `smallTargets` **5/12**; **Static:** production token ban test **0** violations; **Architecture review:** self-review **Passed**; **Startup:** `npm run check:startup` blocked by **71** pre-existing status-doc validation issues.

---

### Phase 2 — Search and symbol-discovery convergence

**Outcome:** Search controls share one visual language, while discovery and local filtering keep correct semantics.

1. Extract a typed `useSymbolSearch` hook for query normalization, debounce, loading, error, results, and cancellation/race safety.
2. Build one `SymbolSearchDialog` from `EdgeModalShell` + shared search field + accessible listbox behavior.
3. Add product variants for chart selection and watchlist addition without duplicating the result list.
4. Replace the chart’s read-only input trigger with a semantically correct button-like `SymbolSearchTrigger`.
5. Migrate `WatchlistSearch` to the shared dialog.
6. Migrate Journal’s symbol field to the compact field primitive; change copy from “Search symbol” to “Symbol filter” or “Exact symbol” while preserving equality semantics.
7. Remove or implement the duplicated inert asset-category chips.
8. Add regression tests for debounce, stale responses, keyboard selection, clear, close, focus return, chart selection, watchlist add, and journal exact filtering.

**Primary files:** `SearchBar.tsx`, `watchlist/WatchlistSearch.tsx`, `journal/JournalScopeBar.tsx`, shared design-system/search modules.

**Exit evidence:** Focused search/journal/watchlist tests pass; build passes; keyboard-only chart, watchlist, and journal flows pass at app level.

#### Phase 2 results (2026-07-18)

**Shared module:** Added `src/app/components/design-system/symbol-search/` — `SymbolSearchResult`, race-safe `useSymbolSearch`, accessible `SymbolSearchDialog` (`select`/`add` variants), and semantic `SymbolSearchTrigger`. Extended `EdgeModalShell` with optional `returnFocusRef`.

**Migrations:** `SearchBar.tsx` and `WatchlistSearch.tsx` now delegate to the shared hook/dialog; removed duplicated fetch/debounce UI and inert asset-category chips; deleted unused non-compact chart search path. Journal `JournalScopeBar` keeps local exact-filter semantics with **Exact symbol** label/placeholder.

**Verification:** **Focused:** `Test Files 7 passed (7)`, `Tests 39 passed (39)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.3s`); **App-level:** `/workspace` chart Search symbol → MSFT → Enter → title `MSFT · Edge`, dialog closed, focus returned to trigger; watchlist Add symbol shared dialog lists results; journal Trades exact-symbol field placeholder **Exact symbol**, lowercase input uppercases to `AAPL` and filters locally; **Architecture review:** self-review **Passed**; **Startup:** `npm run check:startup` blocked by **71** pre-existing status-doc validation issues.

---

### Phase 3 — Menus, popovers, tabs, toggles, and table controls

**Outcome:** Repeated control families use one interaction contract and thin domain wrappers.

1. Converge `ChartMenuSectionHeader` on `EdgeMenuSectionHeader`.
2. Extend `EdgeMenuItem` for selected state, role, icon, danger, submenu, and trailing content; migrate chart and inline menu rows.
3. Generalize anchored position, outside-click, Escape, and focus-return behavior from the best existing popover implementation.
4. Adopt `EdgeToggle` for boolean settings; add a compact size only where two consumers require it.
5. Share the Screener/Journal column-picker popover composite.
6. Add only justified segmented-tab variants such as scrollable/two-line labels.
7. Preserve domain-specific chart wrappers as thin adapters over shared recipes.

**Primary files:** design-system menu/toggle/tab primitives, `chart-chrome/`, `journal/JournalTradesTableControls.tsx`, `screener/ColumnPicker.tsx`.

**Exit evidence:** Focused keyboard and interaction tests pass; build passes; representative menus, tabs, toggles, and column pickers pass keyboard-only app-level checks.

#### Phase 3 results (2026-07-18)

**Menu convergence:** Extended `EdgeMenuItem` with `selected`, `trailing`, `disabledReason`, and default `role="menuitem"`; `ChartMenuItemRow`, `ChartMenuSectionHeader`, and `ChartHeaderMoreMenu` are thin adapters over shared primitives.

**Popover behavior:** Promoted `EdgeAnchoredPopover` + `edgeAnchoredPopoverLayout.ts` to design-system; `ChartAnchoredPopover` re-exports layout helpers and delegates to the shared shell.

**Toggles:** Added `EdgeToggleSwitch` with `standard`/`compact` sizes; migrated `ChartLayoutMenu` sync/manage switches (compact) and `ChartSettingsModal` rows (`EdgeToggle` standard).

**Column picker:** Added shared `ColumnPickerPopover`; migrated `screener/ColumnPicker.tsx` and `journal/JournalTradesTableControls.tsx` (Journal min-2 + required `chart` column preserved).

**Segmented tabs:** No new `EdgeSegmentedTabs` variants — Options expiration rail remains a documented one-consumer domain composite.

**Verification:** **Focused:** `Test Files 18 passed (18)`, `Tests 65 passed (65)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.3s`); **App-level:** `/workspace` journal Trades → Columns opens checkbox popover; layout setup menu Escape dismiss + focus return verified in unit tests; **Architecture review:** self-review **Passed**; **Startup:** `npm run check:startup` reports **71** pre-existing status-doc validation issues (unchanged baseline).

---

### Phase 4 — Feedback and data-display composites

**Outcome:** Loading, empty, error, filter-chip, and metric states communicate consistently.

1. Replace local animated-border spinners with `EdgeSpinner`.
2. Add a status/loading wrapper that owns `aria-busy` or `role="status"` while the spinner remains decorative.
3. Compose chart and route error states from `EdgeEmptyState` and `EdgeButton` where appropriate.
4. Add a dismissible filter-chip primitive only after Journal and Screener contracts are aligned.
5. Add `EdgeMetricTile` only after Journal and Account label/value/help/tone needs are reconciled.
6. Standardize destructive, warning, success, and link-action semantics without using landing-page colors.

**Primary files:** design-system feedback primitives, Screener results, Options loading states, Journal filters/metrics, Account metrics, chart error surfaces.

**Exit evidence:** Focused feedback/component tests pass; build passes; loading, empty, error, and metric states pass app-level visual/accessibility review.

#### Phase 4 results (2026-07-18)

**Shared feedback primitives:** Added `EdgeStatusRegion` (status/busy wrapper), `EdgeFilterChip` (`static` + `dismissible`), `EdgeMetricTile` (plain/bordered with help + tone); extended `EdgeEmptyState` with optional title/alert tone; extended `EdgeButton` with `destructive` and `link` variants; added `EdgeSpinner` `xs` size.

**Consumer migrations:** Screener `ResultsTable` loading banner + error tone; `ScreenerScreensBody` run button uses `EdgeButton loading`; Options `OptionsChainTable` loading panel + error empty state; chart `ChartLoadingOverlay` + `ChartErrorBoundary` composed from shared primitives; Journal `JournalScopeBar` dismissible chips + link Clear all; Screener `FilterChipSummary` static chips; Account panel metric tiles + Journal `JournalMetricGrid` use `EdgeMetricTile`. Removed unreachable screener table skeleton branch.

**Verification:** **Focused:** `Test Files 15 passed (15)`, `Tests 94 passed (94)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.7s`); **App-level:** `npm run ux:baseline` → `Audits: 12/12`, `Captures: 10/10`, overflow **0/12**; **Architecture review:** self-review **Passed**; **Startup:** `npm run check:startup` reports **71** pre-existing status-doc validation issues.

---

### Phase 5 — Route-by-route migration and enforcement

**Outcome:** High-traffic routes use the shared system, and remaining exceptions are intentional.

Migrate one route cluster at a time:

1. Workspace + Chart
2. Journal
3. Screener + Watchlist
4. Options + Account + Trade
5. Settings, remaining dialogs, and low-frequency surfaces

For each cluster:

- remove ad-hoc Tailwind palette classes and hardcoded chrome colors
- replace unexplained 9px/11px text, off-token heights, radii, shadows, and backdrops
- use named typography and control-density roles
- document compact chart/table exceptions
- verify default, hover, active, focus, disabled, loading, empty, and error states

After migration, add a focused static check only for proven recurring violations: undefined Edge variables, prohibited palette classes, or duplicate legacy component imports. Do not create broad brittle class-string snapshots.

**Exit evidence:** Focused route tests and `npm run build` pass; `npm run ux:baseline` reports all target captures complete and horizontal overflow `0/12`; final architecture self-review passes; `npm run check` passes or an unrelated pre-existing blocker is recorded with exact output.

#### Phase 5 results (2026-07-18)

**Route migrations:** Workspace layout picker + chart chrome palette/shadow cleanup; `DrawingRenameModal`, `JournalImportDialog`, and `ChartSettingsModal` on `EdgeModalShell`; Journal filter drawer field recipes; Home Open links + Screener QueryBuilder target fixes; Watchlist control chips; Options payoff heat semantic tokens; Trade/Account alias field recipes; Data Health invalid surface token fixed; chart modals use shared `fieldClass`.

**Enforcement:** Extended `edge.test.ts` with Tailwind palette ban for production `src/app/components/**` (mirrors `ux:baseline` audit).

**Intentional exceptions (documented):** Drawing/canvas color-picker hex; options chain + account dense table typography (11px); chart overlay annotation tier; Options expiration rail domain composite; approved paint files remain in baseline hex count (**8**) but are not chrome violations.

**Verification:** **Focused:** `Test Files 56 passed (56)`, `Tests 234 passed (234)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.5s`); **App-level:** `npm run ux:baseline` → `Audits: 12/12`, `Captures: 10/10`, overflow **0/12**, `smallTargets` **0/12**, Tailwind palette **0**; **Architecture review:** self-review **Passed**; **Startup:** `npm run check:startup` reports **71** pre-existing status-doc validation issues (unchanged baseline); **Full:** `npm run check` exit 0 with same **71** pre-existing status-doc validation issues.

---

## Verification Plan

| Tier | Plan |
|------|------|
| **Focused** | Design-system contracts plus each migrated consumer family; require interaction/a11y assertions for focus, keyboard, busy, disabled, and dismissal states |
| **Build** | `npm run build` for every phase; `npm run build:packages` only if package code changes |
| **Startup** | `npm run check:startup` after `docs/PROJECT-STATUS.md` or harness updates |
| **App-level** | Keyboard-only and visual walkthrough on `http://localhost:3003`; run `npm run ux:baseline` at route milestones |
| **Full** | `npm run check` before marking the broad final migration Passing |

### Phase-specific focused coverage

- **Phase 1:** `src/lib/design-system/edge.test.ts`, `src/app/components/design-system/`
- **Phase 2:** symbol search, watchlist add-symbol, Journal scope/filter tests
- **Phase 3:** menu, popover, segmented-tab, toggle, and column-picker tests
- **Phase 4:** spinner/loading-region, empty/error, filter-chip, and metric-tile tests
- **Phase 5:** touched route clusters plus existing UX baseline

Record actual output in the harness, such as `Test Files N passed (N)`, `Tests N passed (N)`, build compilation timing/exit, and `Audits: 12/12`, `Captures: 10/10`, overflow `0/12`. Never replace executable evidence with “tests pass.”

---

## Harness Update

Phase 0 reconciled the audit against Passing App UX polish Phase 4 (2026-07-18). Activate Phase 1 under WIP=1 when implementation begins.

When implementation starts:

- **Active Work row:** after Phase 4 becomes Passing, add or rename the single row to `App component standardization Phase N`; include user-visible behavior, state, exact completion evidence, and primary files.
- **WIP=1:** do not activate a component-standardization phase while another row is Active. Block, pause, or complete the current item first.
- **Task Contract:** update the existing **App UX Polish** Task Contract; do not create a parallel component-standardization contract.
- **Session Log:** append an entry after every completed, blocked, or interrupted phase with goal, completed work, exact verification, blockers, and next step.
- **Current Verified State:** replace the top block after each phase; do not add another Previous Verified State section.
- **Resulting state:** one phase moves `Pending → Active → Passing/Blocked`; future phases remain Pending only in this roadmap.

### Planned Active Work row

- **Feature:** App component standardization Phase N
- **Behavior:** Use the phase outcome above in user-visible terms.
- **State:** Pending → Active → Passing/Blocked
- **Completion evidence:** exact focused test counts, build result, and required app-level measurements
- **Files:** only the active phase’s ownership paths

---

## Stop Conditions

Stop the track when:

1. Success criteria pass on the reference routes.
2. Remaining variants are documented and semantically justified.
3. No planned primitive has only one speculative consumer.
4. Further convergence would erase useful chart density or domain meaning.
5. The final harness evidence and architecture review are recorded.

---

### Phase 6 — EdgeSelect migration (2026-07-19)

**Outcome:** All app chrome single-value pickers use `EdgeSelect` or `EdgeSegmentedTabs`; native `<select>` banned under `src/app/components/`.

1. Add `EdgeSelect` (`chip` + `field`) on `EdgeAnchoredPopover` + `EdgeMenuItem`.
2. Migrate journal, screener, heatmap, chart/settings, options, and builder surfaces.
3. Use `EdgeSegmentedTabs` for List/Heat map and heat-map Linear/Log scale.
4. Ban native `<select>` via production static test in `edge.test.ts`.

**Primary files:** `EdgeSelect.tsx`, journal/screener/heatmap/settings consumers, `src/lib/design-system/ARCHITECTURE.md`.

**Exit evidence:** Focused consumer + primitive tests pass; `npm run build` passes; native select ban test **0** violations.
