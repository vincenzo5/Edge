# App UX Polish Roadmap

Raise Edge from a functional trading workspace to a calm, deliberate professional terminal without weakening chart density or changing trading behavior.

**Last updated:** 2026-07-22

**Status:** Phase 0 **Passing** (2026-07-18); Phase 1 **Passing** (2026-07-18); Phase 2 **Passing** (2026-07-18); Phase 3 **Passing** (2026-07-18); Phase 4 **Passing** (2026-07-18); Phase 5 **Passing** (2026-07-22) — surface convergence delivered via [component-standardization-roadmap.md](./component-standardization-roadmap.md) Phase 5 (2026-07-18); closeout re-verify **Passing** (2026-07-22). **Track complete.** Residual chrome spot-checks → [app-level-verification-roadmap.md](./app-level-verification-roadmap.md) Phase 6.

**Related:** [Component Standardization Roadmap](./component-standardization-roadmap.md), [Design System Architecture](../../src/lib/design-system/ARCHITECTURE.md), [Chart Architecture](../../src/lib/chart/ARCHITECTURE.md), [Project Status](../PROJECT-STATUS.md), [Feature Planning Checklist](../checklists/feature-planning-checklist.md).

---

## Intent Classification

- **Primary:** Feature — the work changes user-visible hierarchy, responsiveness, interaction feedback, and accessibility.
- **Secondary:** Refactor and Testing — consolidate presentation through existing Edge primitives and add visual/app-level acceptance coverage.
- **Checklists applied:** `feature-planning-checklist.md`, `testing-verification-checklist.md`, `harness-status-checklist.md`, `architecture-review-checklist.md`.
- **Assumption:** Edge remains a dense desktop-first trading application; this is not a consumer-dashboard redesign.

## Checklist Review

- **Architecture review:** **Required** — self-review, **Passed for roadmap**. The work touches shared design tokens, reusable primitives, workspace layout, and chart-adjacent chrome. Each implementation phase must repeat the exit review before being marked Passing.
- **Aligned:** Existing `--edge-*` tokens, `Edge*` primitives, style helpers, workspace tiles, and custom chart engine remain the foundations. Midnight Chrome remains the dark palette.
- **Missing:** A checked-in screenshot regression system is not currently established. Phase 0 defines a lightweight baseline before deciding whether automation is justified.
- **Misalignments:** Some legacy surfaces still encode local spacing, typography, borders, or interaction states instead of shared recipes. These should migrate when their phase is active, not through a broad unrelated rewrite.
- **Risks:** Reduced density could hurt information scanning; larger controls could crowd narrow tiles; shared token changes can regress many routes; chart-runtime edits can affect canvas performance.
- **Recommendations:** Work in vertical phases with WIP=1, verify at 1024/1440/1920 widths, preserve the black chart stage, and prefer spacing over additional borders.

---

## Product Goal

A user should immediately understand:

1. **Where they are** — workspace, module, panel, and active tool have clear hierarchy.
2. **What matters now** — primary data and actions dominate supporting metadata.
3. **What is interactive** — hover, selected, focus, disabled, loading, and destructive states are consistent.
4. **How regions relate** — chart, rails, tiles, panels, cards, and popovers feel like one system.

### Success criteria

- Primary chrome/body copy meets WCAG AA contrast (`4.5:1`); meaningful non-text UI meets `3:1`.
- Standard desktop controls have at least a `32px` pointer target; dense exceptions are explicit and keyboard accessible.
- No primary panel title is below `14px`; no primary body/action text is below `12px`. Axis metadata and compact annotations may remain smaller.
- Workspace routes have no unintended horizontal overflow at `1024`, `1440`, or `1920` CSS pixels.
- Menus, cards, and panels use canonical tokens/primitives rather than new raw hex or Tailwind palette colors.
- Motion stays within `120–180ms` for routine feedback and respects `prefers-reduced-motion`.
- The pure-black chart plot and axis stage remains unchanged unless a chart-specific phase explicitly updates it.

### Non-goals

- Replacing the custom Edge chart engine.
- Redesigning chart gestures, order semantics, persistence, market-data routing, or AI tools.
- Making every surface spacious; this remains a data-dense desktop product.
- A simultaneous light-theme redesign. Shared token changes must keep light mode functional, but dark mode is the visual target.
- Decorative gradients, glass effects, or animation that competes with market data.

---

## Proposed Plan

### Phase 0 — Baseline and visual acceptance

**Outcome:** A repeatable before/after review set prevents subjective polish work from drifting.

| Work item | Scope |
|-----------|-------|
| Reference routes | `/workspace`, `/home`, `/screener`, `/journal/dashboard`, one modal, one menu/popover |
| Reference widths | 1024, 1440, 1920 CSS pixels |
| State matrix | Default, hover, selected, focus-visible, disabled, loading, empty, and error where available |
| Audit | Typography sizes, target sizes, overflow, contrast, raw colors, duplicate borders, and nested navigation |

**Exit evidence:** Baseline screenshots and an issue list grouped by shared foundation vs route-specific defects; no production behavior change.

#### Phase 0 results (2026-07-18)

**Runner:** `npm run ux:baseline` against `http://localhost:3003` — **12/12** route-width audits, **10/10** curated WebP captures, **0** runner failures.

**Artifacts:**

| Artifact | Path |
|----------|------|
| Numerical audit (latest) | [`docs/ux-baseline/ux-baseline-latest.json`](../ux-baseline/ux-baseline-latest.json) |
| Home 1024 / 1440 / 1920 | [`home-1024.webp`](../assets/ux-polish/phase-0/home-1024.webp), [`home-1440.webp`](../assets/ux-polish/phase-0/home-1440.webp), [`home-1920.webp`](../assets/ux-polish/phase-0/home-1920.webp) |
| Workspace chart 1024 / 1440 / 1920 | [`workspace-chart-1024.webp`](../assets/ux-polish/phase-0/workspace-chart-1024.webp), [`workspace-chart-1440.webp`](../assets/ux-polish/phase-0/workspace-chart-1440.webp), [`workspace-chart-1920.webp`](../assets/ux-polish/phase-0/workspace-chart-1920.webp) |
| Screener pre-run empty @ 1440 | [`workspace-screener-empty-1440.webp`](../assets/ux-polish/phase-0/workspace-screener-empty-1440.webp) |
| Journal empty @ 1440 | [`workspace-journal-empty-1440.webp`](../assets/ux-polish/phase-0/workspace-journal-empty-1440.webp) |
| Journal import modal @ 1440 | [`workspace-journal-import-modal-1440.webp`](../assets/ux-polish/phase-0/workspace-journal-import-modal-1440.webp) |
| Chart type popover @ 1440 | [`workspace-chart-type-popover-1440.webp`](../assets/ux-polish/phase-0/workspace-chart-type-popover-1440.webp) |

**Audit matrix:** Home, Workspace Chart, Workspace Screener (`/workspace?surface=screener`), Workspace Journal (`/workspace?surface=journal&journalView=dashboard`) at **1024×900**, **1440×900**, **1920×900**. Requested URLs matched final URLs (no redirect during capture). Layout edit mode not visible after Escape. **Horizontal overflow: 0/12** routes.

**Source color audit (`src/app/components/`):** **8** files with raw hex; **5** files with ad-hoc Tailwind palette classes. Sample paths: `IndicatorSettingsModal.tsx`, `DrawingSelectionToolbar.tsx`, `DrawingSettingsModal.tsx`, `ChartSnapshotMenu.tsx`, `ObjectTreeDrawingRow.tsx`, `ChartSettingsModal.tsx`.

**Prioritized findings → Phase 1+ input:**

| Priority | Scope | Issue | Evidence (1440 unless noted) |
|----------|-------|-------|------------------------------|
| P0 | Shared foundation | App header controls below **32px** target — data chip (~23px), account picker (~26px), workspace pill (~22px), Edit layout (~19px) | All four audited routes |
| P0 | Shared foundation | **10px body copy** on chrome labels (data chip, Edit layout, Save, connection summary) below **12px** body floor | Workspace routes + home |
| P0 | Shared foundation | **12px panel titles** on home (`Continue`, `Recent workspaces`) below **14px** title floor | Home |
| P1 | Shared foundation | Home section headings and primary CTAs fail **4.5:1** contrast (`Continue` 3.51:1, `Open charts` 2.84:1, `Recent workspaces` 3.92:1) | Home |
| P1 | Chart chrome | Chart header density — interval trigger (~24px), data-source badge (~14px), range bar pills (~20px) | Workspace chart/screener/journal |
| P1 | Chart chrome | OHLC legend single-letter labels (`O/H/L/C`) at **2.55:1** on chart overlay | Screener + journal tiles with chart |
| P1 | Screener | Run control contrast **2.84:1** on accent fill; heavy small-target + small-text counts in pre-run state | Screener empty capture |
| P2 | Journal | Empty-state actions (`Sync fills`, import) use **10px** link text; modal chrome acceptable but inherits shared compact rhythm | Journal empty + import modal captures |
| P2 | Shared foundation | ~~Chart overlay recovery CTA (`Start TWS sidecar`)~~ **Superseded (2026-07-24):** recover CTA removed from chart overlay; header owns calm `Reconnect`; Data Health / Settings keep ops labels | Screener + journal when sidecar offline |
| — | Intentional deferral | No horizontal overflow at reference widths; black chart stage preserved in all captures | 12/12 audits |

**Phase 1 starting point:** Raise shared control heights to **32px** compact / **36px** standard, define typography roles (title ≥14px, body ≥12px), and fix home + screener Run contrast before route-specific tile polish in Phases 2–3.


### Phase 1 — Foundation: rhythm, type, shape, and motion

**Outcome:** Shared tokens and primitives establish one visual rhythm before individual screens are tuned.

| Work item | Direction |
|-----------|-----------|
| Typography | Define panel title, body, metadata, numeric, and compact annotation roles |
| Spacing | Use a 4px rhythm (`4/8/12/16/24`) and remove arbitrary local gaps |
| Shape | Dense control `4px`; card/popover `8px`; dialog `10–12px`; chart remains square |
| Controls | Canonical `32px` compact and `36px` standard heights; consistent icon sizing and padding |
| Motion | Shared fast/normal transitions with reduced-motion fallbacks |
| Elevation | Borders separate major regions; surface contrast and shadow separate transient overlays |

**Primary files:** `src/app/globals.css`, `src/lib/design-system/edge.ts`, `src/app/components/design-system/`, `src/app/components/design-system/styles.ts`, `src/lib/design-system/ARCHITECTURE.md`.

**Exit evidence:** Focused design-system tests, token synchronization, representative component tests, and visual comparison of shared controls.

#### Phase 1 results (2026-07-18)

**Focused:** `Test Files 8 passed (8)`, `Tests 37 passed (37)` (edge tokens, styles, EdgeButton/EdgeIconButton, AppTopHeader, WorkspaceHeaderControls, WorkspacePill, HomeContinueCard, ScreenerScreensBody).

**Build:** `npm run build` passed (`✓ Compiled successfully in 3.6s`).

**App-level:** `npm run ux:baseline` → `Audits: 12/12`, `Captures: 10/10`, horizontal overflow **0/12**; Phase 0 P0 shared-foundation targets cleared (`app-data-connection-chip`, `app-account-picker`, `workspace-pill`, `workspace-layout-edit` no longer in `smallTargets`); home `smallText`/`contrastIssues` empty @1440; primary CTA contrast issues for `Open charts` / `Run` cleared.

**Architecture review:** self-review — **Passed**; chart chrome OHLC/range density and screener tile microcopy deferred to Phases 2–3.

**Delivered:** synchronized typography/spacing/shape/control/motion tokens in `globals.css` + `edge.ts`; `accent-blue-fill` + `text-on-accent` for accessible primary CTAs; shared recipes in `styles.ts` + `EdgeButton`/`EdgeIconButton`; migrated header/workspace/home section titles.

**Full gate:** `npm run check` blocked by **71** pre-existing `docs/PROJECT-STATUS.md` evidence-validation issues (unchanged baseline); not a Phase 1 regression.

### Phase 2 — App shell and chart chrome hierarchy

**Outcome:** Header, chart toolbar, rails, and range bar read as intentional groups rather than a continuous strip of tiny controls.

| Work item | Direction |
|-----------|-----------|
| App header | Clarify logo/workspace/account/data-connection hierarchy and reduce competing labels |
| Chart header | Group symbol/interval/chart-type controls separately from capture, replay, trade, and layout actions |
| Rails | Stronger active state through tinted surface + accent icon; consistent hover and tooltip timing |
| Separators | Remove duplicate hairlines; retain boundaries only between major regions |
| Legibility | Raise primary labels and price-axis metadata without brightening the black chart stage |

**Primary files:** `src/app/components/home/AppTopHeader.tsx`, `src/app/components/chart-chrome/`, `src/app/components/chart-icons/`, `src/app/components/ChartRangeBar.tsx`, `src/app/components/sidebar/`.

**Exit evidence:** Focused shell/chrome tests, keyboard traversal, and app-level chart smoke at all reference widths.

#### Phase 2 results (2026-07-18)

**Focused:** `Test Files 7 passed (7)`, `Tests 41 passed (41)` (ChartHeaderBar, ChartRangeBar, toolbarButtonStyles, FloatingPanelShell, styles, PriceLegendLayout, AppTopHeader).

**Build:** `npm run build:packages` passed; `npm run build` passed (`✓ Compiled successfully in 3.1s`).

**App-level:** `npm run ux:baseline` → `Audits: 12/12`, `Captures: 10/10`, horizontal overflow **0/12**; Phase 0 P1 chart-chrome targets cleared — `symbol-search-input`, `chart-interval-trigger`, `chart-data-source-badge`, `chart-range-preset-*` no longer in `smallTargets`; OHLC O/H/L/C `contrastIssues` cleared; overlay recover CTA (`chart-overlay-recover-tws`) remains P2 deferral.

**Architecture review:** self-review — **Passed**; workspace tile reflow deferred to Phase 3.

**Delivered:** instrument/studies/history/actions clusters in `ChartHeaderBar`; Alert/Publish routed through More menu; range bar on compact control recipes + testIds; rail active accent; OHLC secondary labels @12px; data badge 32×32; app header primary/secondary clusters.

### Phase 3 — Workspace and right-panel responsiveness

**Outcome:** Screener, dashboard, and other modules remain readable when tiled beside a chart.

| Work item | Direction |
|-----------|-----------|
| Tile hierarchy | Make tile title, local actions, and content boundaries explicit without boxing every subsection |
| Responsive cards | Reflow dashboard metrics/cards before text truncates or values collide |
| Nested navigation | Remove or collapse duplicate rails/sub-navigation within narrow tiles |
| Panel spacing | Standardize panel padding and row density; use whitespace instead of repeated borders |
| Resize behavior | Define compact, standard, and wide presentation thresholds from available tile width |

**Primary files:** `src/app/components/app-workspace/`, `src/app/components/sidebar/`, `src/app/components/screener/`, `src/app/components/home/`, `src/app/components/journal/`.

**Exit evidence:** Workspace resize tests where practical; app-level Chart + Screener and Dashboard layouts at `1024/1440/1920`, with no clipped primary action or horizontal overflow.

#### Phase 3 results (2026-07-18)

**Focused:** `Test Files 6 passed (6)`, `Tests 44 passed (44)` (tileDensity, TileFrame, JournalTileSurface, ScreenerScreensBody, JournalSummaryCards, JournalGlobalEmptyState).

**Build:** `npm run build` passed (`✓ Compiled successfully in 3.5s`).

**App-level:** `npm run ux:baseline` → `Audits: 12/12`, `Captures: 10/10`, horizontal overflow **0/12**; screener compact collapse + journal tile segmented nav verified in focused tests; `chart-overlay-recover-tws` remains P2 deferral.

**Architecture review:** self-review — **Passed**.

**Delivered:** `TileDensityContext` + `resolveTileDensityMode` (520/900px thresholds, 24px hysteresis); screener `variant="app"` narrow collapse with horizontal screen chips; journal tile `JournalTileNav` (`EdgeSegmentedTabs` + `surfaceState.journalView`); density-driven journal summary/dashboard grids; scope bar + empty-state compact control floors; docked/floating screener narrow chip parity.

### Phase 4 — Interaction states and accessibility

**Outcome:** Every control communicates availability and state consistently with mouse and keyboard.

| Work item | Direction |
|-----------|-----------|
| State recipes | Hover, pressed, selected, focus-visible, disabled, loading, destructive, and success |
| Focus | Visible focus rings with logical tab order; no focus indication based on color alone |
| Targets | Raise routine pointer targets to `32–36px`; document compact chart exceptions |
| Feedback | Consistent spinner/skeleton/empty/error patterns and action completion feedback |
| Motion | Popovers use restrained fade/scale; resizing and selection transitions do not delay input |

**Primary files:** `src/app/components/design-system/`, `src/app/components/chart-icons/toolbarButtonStyles.ts`, shared menus/modals, route-specific controls found in the Phase 0 audit.

**Exit evidence:** Focused interaction tests, keyboard-only walkthrough, reduced-motion check, and automated accessibility checks if the existing stack supports them without a new parallel harness.

#### Phase 4 results (2026-07-18)

**Focused:** `Test Files 9 passed (9)`, `Tests 29 passed (29)` (styles, EdgeButton/EdgeIconButton/EdgeModalShell/EdgeSlideOver/EdgeSegmentedTabs/EdgeSpinner, TwsRecoverButton, ChartErrorBoundary, JournalGlobalEmptyState).

**Build:** `npm run build` passed (`✓ Compiled successfully in 3.2s`).

**App-level:** `npm run ux:baseline` → `Audits: 12/12`, `Captures: 10/10`, horizontal overflow **0/12**; Phase 4 audit targets cleared — `chart-overlay-recover-tws` absent from `smallTargets`; journal tile segmented tabs **0/12** `smallTargets` across reference widths.

**Architecture review:** self-review — **Passed**; screener QueryBuilder micro-controls, home Open links, and route-wide raw-color cleanup deferred to Phase 5.

**Delivered:** `useFocusTrap` + `useMenuKeyboardNav`; loading/destructive/link action recipes in `styles.ts`; `EdgeButton`/`EdgeIconButton` busy + pressed semantics; modal/slide-over focus containment + `aria-modal`; segmented-tab Arrow/Home/End + 32px targets; chart popover keyboard nav + restrained enter motion; compact recover CTA floor; chart error `role="alert"`.

**Full gate:** `npm run check:startup` blocked by **71** pre-existing status-doc validation issues; not a Phase 4 regression.

### Phase 5 — Surface convergence and final polish

**Outcome:** High-traffic routes share the same language, and remaining exceptions are intentional.

Detailed component-family sequencing, search convergence, token repair, migration rules, verification, and harness updates live in the [Component Standardization Roadmap](./component-standardization-roadmap.md). Component-standardization Phase 0 reconciled the post–Phase 4 audit and froze the residual Phase 1–5 backlog in the App UX Polish Task Contract; treat that roadmap as this phase’s execution plan, not a parallel Active Work track.

1. Apply the shared recipes to Workspace, Screener, Journal, Research, Options, Trade, settings, menus, and dialogs.
2. Remove remaining ad-hoc chrome colors, arbitrary spacing, and duplicate surface recipes.
3. Compare final screenshots against Phase 0 at all reference widths.
4. Record intentional compact exceptions in the closest architecture doc.
5. Stop when the acceptance criteria pass; do not bundle product features.

**Exit evidence:** Focused route tests, `npm run build`, app-level route matrix, final visual review, and `npm run check` before merge when the accumulated track is broad.

#### Phase 5 results (2026-07-22 closeout)

**Delivered via component-standardization Phase 5 (2026-07-18):** Route-cluster migrations (Workspace+Chart, Journal, Home+Screener+Watchlist, Options+Account+Trade, Settings); shared modal/field recipes; Tailwind palette ban in `edge.test.ts`; dense-table/paint exceptions documented in design-system architecture.

**Closeout re-verify (2026-07-22):** No additional route restyle — reconcile App UX polish Phase 5 **Pending** against component-standardization Phase 5 **Passing**.

- **App-level:** `npm run ux:baseline` → `Audits: 12/12`, `Captures: 10/10`, horizontal overflow **0/12**, raw hex files (components) **8**, Tailwind palette files (components) **0**
- **Architecture review:** self-review **Passed**
- **Evidence:** [component-standardization-roadmap.md](./component-standardization-roadmap.md) Phase 5 results; [ux-baseline-latest.json](../ux-baseline/ux-baseline-latest.json)

---

## Sequencing and WIP

1. Execute one phase at a time; only that phase may be **Active**.
2. Phase 0 precedes shared token changes.
3. Phase 1 precedes route-by-route polish to prevent repeated local fixes.
4. Phase 3 follows shell hierarchy so responsive decisions use stable chrome dimensions.
5. Phase 4 may fix state defects discovered earlier, but must not become a parallel component rewrite.
6. Each phase can ship independently after its completion evidence passes.

---

## Verification Plan

| Tier | Plan |
|------|------|
| **Focused** | Design-system tests plus tests for each touched shell, workspace, screener, journal, or chart-chrome component |
| **Build** | `npm run build`; add `npm run build:packages` only if `packages/chart-*` changes |
| **Startup** | `npm run check:startup` after harness/status updates; record any pre-existing validator blocker separately |
| **App-level** | Browser walkthrough of reference routes and states at 1024/1440/1920; capture numerical width/overflow/contrast evidence where possible |
| **Full** | `npm run check` before merging broad shared-token or multi-route phases |

Per phase, record exact output such as `Test Files N passed (N)`, build compilation timing/exit, and app-level measurements—not paraphrases.

---

## Harness Update

When implementation starts:

- Add one **Active Work** row for the current phase only: feature name, user-visible behavior, state, exact completion evidence, and primary files.
- Create an **App UX Polish** Task Contract because the track is cross-component and likely cross-session; update Delivered, Verification, Blockers, and next phase after each handoff.
- Append a **Session Log** entry for every completed or interrupted phase.
- Replace the **Current Verified State** block after each significant phase; do not add another Previous Verified State section.
- Mark a phase **Passing** only after its focused and app-level evidence succeeds. Keep future phases **Pending** in this roadmap, not as multiple Active Work rows.
- Archive older Passing rows/session entries as required to keep `PROJECT-STATUS.md` a hot dashboard.

### Planned Active Work row

- **Feature:** App UX polish Phase N
- **Behavior:** Use the phase outcome above.
- **State:** Pending → Active → Passing/Blocked
- **Completion evidence:** Exact focused test counts, build result when applicable, and app-level width/state measurements
- **Files:** Only the phase’s primary ownership paths

