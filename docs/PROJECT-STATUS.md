# Project Status

Single source for **current** progress. Historical harness dumps: [status-archive/](./status-archive/). For row-by-row feature detail, see [chart/features.md](./chart/features.md).

**Last updated:** 2026-07-17

## Current Verified State

- **Current task:** Structural refactor Tier E (persistence + AI boundaries).
- **State:** **Passing** — E1 shared `revisionedLibraryRepository`/`revisionedLibraryClient` cores + watchlist/screener/chart-template adapters; E2 two-products docs + shared `CHART_TYPE_VALUES`/`STARTER_INDICATOR_NAMES` from `@edge/chart-core`; no user-visible behavior change.
- **Latest verification:** **E1 Focused:** `Test Files 15 passed (15)`, `Tests 52 passed (52)` (revisioned helpers + sync + schemas + library route tests); **E2 Focused:** `Test Files 3 passed (3)`, `Tests 15 passed (15)` (`chart.test.ts`, `ai-tools-chart` tools, package-api-snapshot); **Build:** `npm run build:packages` passed; **Build:** `npm run build` passed; **Architecture review:** self-review — Passed.
- **Evidence:** `src/lib/persistence/repositories/revisionedLibraryRepository.ts`, `src/lib/persistence/client/revisionedLibraryClient.ts`, `src/lib/persistence/repositories/*LibraryRepository.ts`, `src/lib/persistence/client/*LibraryClient.ts`, `packages/chart-core/src/toolConstants.ts`, `packages/ai-tools-chart/ARCHITECTURE.md`, `src/lib/ai/tools/chart.test.ts`, `docs/ai-tools-architecture.md`, `src/lib/ai/ARCHITECTURE.md`, `docs/roadmaps/refactor-roadmap.md`, `src/lib/persistence/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** Structural refactor track complete for Tier E — resume product work from [ROADMAP.md](./ROADMAP.md) (no further refactor tiers in [refactor-roadmap.md](./roadmaps/refactor-roadmap.md)).

## Previous Verified State (Structural refactor Tier D)
- **Current task:** Structural refactor Tier C (app shell decomposition).
- **State:** **Passing** — C1 StockApp bootstrap/layout/sidebar hooks + `AppProviders`; C2 Object Tree vs Data Window file split; C3 seven chart chrome surfaces migrated to Edge tokens/shells; no behavior change (C3 visual token swap only).
- **Latest verification:** **Focused:** `Test Files 10 passed (10)`, `Tests 53 passed (53)` (StockApp/bootstrap, ObjectTreePanel/objectTreeModel, BarReplay/TemplatePicker/ChartGoTo/DrawingSelectionToolbar); **Build:** `npm run build` passed (`✓ Compiled successfully in 3.1s`); **Architecture review:** self-review — Passed.
- **Evidence:** `src/app/components/stock-app/*`, `StockApp.tsx`, `src/app/components/object-tree/*`, `ObjectTree.tsx`, `BarReplay.tsx`, `ChartTimeZoneMenu.tsx`, `TemplatePickerModal.tsx`, `ChartGoToModal.tsx`, `DrawingSettingsModal.tsx`, `IndicatorSettingsModal.tsx`, `DrawingSelectionToolbar.tsx`, `docs/roadmaps/refactor-roadmap.md`.
- **Current blocker:** none.
- **Next best step:** Superseded by Tier D row above.

## Previous Verified State (Screener keyboard chart viewport drift)
- **Current task:** Screener keyboard chart viewport drift.
- **State:** **Passing** — cache→fresh candle growth no longer keeps stale live-edge indices; workspace screener drive no longer double-loads via BroadcastChannel.
- **Latest verification:** **Focused:** `Test Files 5 passed (5)`, `Tests 27 passed (27)`; **Architecture review:** self-review — Passed.
- **Evidence:** `packages/chart-react/src/engine/canvas.tsx`, `canvas.test.tsx`, `useScreenerReviewDrive.ts`, `src/lib/chart/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** App-level — `/workspace` Chart + Screener → run screen → ↑/↓ through results and confirm chart stays fitted at live edge.

## Previous Verified State (Structural refactor Tier B)
- **Current task:** Structural refactor Tier B (duplication consolidation).
- **State:** **Passing** — B1 generic `useRevisionedRemoteSync` + thin library wrappers; B2 series/interval math canonical in `@edge/chart-core` with app re-exports; no user-visible change.
- **Latest verification:** **Focused:** `Test Files 13 passed (13)`, `Tests 99 passed (99)`; **Build:** `npm run build:packages` passed; **Boundaries:** `npm run lint:package-boundaries` passed; **Architecture review:** self-review — Passed.
- **Evidence:** `useRevisionedRemoteSync.ts`, `use*LibraryRemoteSync.ts`, `packages/chart-core/src/{series,interval}.ts`, `src/lib/chart/{series,intervalAdapter}.ts`, `useChartDataFeed.ts`, `priceAxisAnnotations.ts`.
- **Current blocker:** none.
- **Next best step:** Tier C1 — StockApp providers + controllers ([refactor-roadmap.md](./roadmaps/refactor-roadmap.md)).

## Previous Verified State (Screener header Option B)

## Previous Verified State (Screener results scroll + compact view)
- **Current task:** Screener results scroll + compact view control.
- **State:** **Passing** — results pane scrolls independently (`min-h-0` height chain through tile → results); List/Heat map is a compact select; denser toolbar.
- **Latest verification:** **Focused:** `Test Files 4 passed (4)`, `Tests 29 passed (29)` (`ResultsTable`, `ScreenerDialog`, `ScreenerResultsBody`, `ScreenerScreensBody`); dialog scroll assertion passed (`overflow-auto` + `min-h-0` + `flex-1`).
- **Evidence:** `ScreenerTileSurface.tsx`, `ScreenerResultsBody.tsx`, `ScreenerScreensBody.tsx`, `ResultsTable.tsx`.
- **Current blocker:** none.
- **Next best step:** App-level — small Screener tile → run Top 200 → scroll results without scrolling Screens/filters.

## Previous Verified State (Dead code removal Tier A)
- **Current task:** Dead code removal (Tier A).
- **State:** **Passing** — orphan chart duplicates (`indicators/draw`, `drawings/measure`) are package re-exports; unused app Toolbar/legend components removed; unused `createYahooMarketDataPort` removed; no user-visible change.
- **Latest verification:** **Focused:** `Test Files 8 passed (8)`, `Tests 45 passed (45)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.9s`); **Architecture review:** self-review — Passed.
- **Evidence:** `src/lib/chart/indicators/draw.ts`, `src/lib/chart/drawings/measure.ts`, deleted `Toolbar.tsx`/`ChartLegendBar.tsx`/`PaneLegendBar.tsx`, `src/lib/ai/{marketDataPort,index}.ts`, `docs/ai-tools-architecture.md`.
- **Current blocker:** none.
- **Next best step:** Tier C1 — StockApp providers ([refactor-roadmap.md](./roadmaps/refactor-roadmap.md)).

## Previous Verified State (Screener results toolbar UX)
- **Current task:** Screener results toolbar UX.
- **State:** **Passing** — post-run chrome is one toolbar: List/Heat map + result count (+ phase tooltip) + Live badge; Watchlist/Export secondary menus; no step/live paragraphs; bulk menus hidden at 0 results.
- **Latest verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 27 passed (27)` (`ResultsTable.test.tsx`, `ScreenerDialog.test.tsx`, `styles.test.ts`); **Architecture review:** self-review — Passed (`EdgeButton` secondary + forwardRef).
- **Evidence:** `ResultsTable.tsx`, `EdgeButton.tsx`, `styles.ts`, `EdgeMenuItem.tsx`, `design-system/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** Superseded by results scroll + compact view row above.

## Previous Verified State (Screener result-limit compact select)
- **Current task:** Screener result-limit compact select.
- **State:** **Passing** — freeform LIMIT input replaced with compact “Top N” select (50/100/200/500) immediately before Run screen; legacy non-preset limits still shown until changed.
- **Latest verification:** **Focused:** `Test Files 2 passed (2)`, `Tests 16 passed (16)` (`ScreenerDialog.test.tsx`, `ScreenerScreensBody.test.tsx`); **Architecture review:** self-review — Passed (UI-only control swap).
- **Evidence:** `ScreenerScreensBody.tsx`, `ScreenerDialog.test.tsx`.
- **Current blocker:** none.
- **Next best step:** App-level — open screener custom query → confirm Top 200 ▾ sits left of Run → change to Top 50 and run.

## Previous Verified State (Screener Option A split-pane UX)
- **Current task:** Screener Option A split-pane UX.
- **State:** **Passing** — unified screener surface: Screens list (starters as saved screens) + active query + results; row click / ↑↓ selects symbol and drives sibling chart via WorkspaceDrive/BroadcastChannel; Review/Screens/Results/Keepers sub-nav removed.
- **Latest verification:** **Focused:** `Test Files 15 passed (15)`, `Tests 69 passed (69)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.1s`); **Architecture review:** self-review — Passed.
- **Evidence:** `ScreenerScreensBody.tsx`, `ScreenerTileSurface.tsx`, `ScreenerResultsBody.tsx`, `ResultsTable.tsx`, `useScreenerResultSelection.ts`, `useScreenerSessionModel.ts`, `screenStorage.ts`, `types.ts`, `screenerLibrary.ts`, `deepLinks.ts`, `docs/roadmaps/screener-roadmap.md`.
- **Current blocker:** none.
- **Next best step:** App-level — `/workspace` with Chart + Screener tiles: run a screen → click row → confirm chart symbol updates; ↑/↓ flips selection; Save creates user screen in left list.

## Previous Verified State (Patterns library browse UI)
- **Current task:** Pattern Capture start/end sections + numbered presets.
- **State:** **Passing** — independent start/end section pairs (1-bar allowed); numbered preset labels via keys 1–N; pattern OHLCV bounds from section min/max.
- **Latest verification:** **Focused:** `Test Files 1 passed (1)`, `Tests 13 passed (13)` (`patternCapture.test.ts`); **Architecture review:** self-review — Passed.
- **Evidence:** `src/lib/patternCapture/{fsm,presets,buildRecord}.ts`, `PatternCapturePanel.tsx`, `PatternCaptureOverlay.tsx`, `ChartCell.tsx`, `docs/chart/features.md`, `patternLibrary/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** Superseded by Patterns library browse row above.

## Previous Verified State (Workspace pill header UX)
- **Current task:** Workspace pill header UX.
- **State:** **Passing** — Use mode: single workspace pill (switch / rename / new / duplicate); Edit mode: Editing label + Layout preset picker + Done; removed always-on name input, native select, and Save copy.
- **Latest verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 30 passed (30)`; **Architecture review:** self-review — Passed.
- **Evidence:** `WorkspacePill.tsx`, `WorkspaceHeaderControls.tsx`, `commands.ts` (`createWorkspaceDocument`), `AppWorkspaceContext.tsx`, `appWorkspace/ARCHITECTURE.md`, `design-system/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** App-level — `/workspace` → open pill → switch/rename/new/duplicate → Edit layout → Layout preset → Done; confirm Use mode is calm again.

## Previous Verified State (Workspace layout presets + empty-pane assign)
- **Current task:** Workspace layout presets + empty-pane assign.
- **State:** **Passing** — Edit mode **Layout** picker (8 presets) replaces geometry with placeholder panes; per-pane Chart/Screener/Journal chooser; filled-tile reassign in edit header; freeform drag-dock retained.
- **Latest verification:** **Focused:** `Test Files 7 passed (7)`, `Tests 52 passed (52)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.1s`); **Architecture review:** self-review — Passed.
- **Evidence:** `layoutPresets.ts`, `commands.ts` (`applyLayoutPreset`, `assignTileSurface`), `WorkspaceLayoutPresetPicker.tsx`, `WorkspaceLayoutPresetIcon.tsx`, `PlaceholderTile.tsx`, `TileFrame.tsx`, `SurfaceHost.tsx`, `LayoutTreeInner.tsx`, `AppWorkspaceContext.tsx`, `WorkspaceHeaderControls.tsx`, `appWorkspace/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** Superseded by workspace pill header UX row above.

## Previous Verified State (Broker ledger functional proof)
- **Current task:** Broker ledger functional proof (Phases 0–4 app-level).
- **State:** **Blocked** — Tier A API oracles + most Tier B pass; primary oracle **B2** (new fill without Journal mounted) not proven — paper MKT submitted `orderId=50` `PreSubmitted` / no new `journal_fills`; sidecar intermittently times out under load.
- **Latest verification:** **App-level:** see Session Log 2026-07-16 functional plan; **Focused:** `Test Files 4 passed (4)`, `Tests 13 passed (13)` (incl. A4 `database_unavailable` unit).
- **Evidence:** `docs/roadmaps/broker-ledger-functional-test-plan.md`; A1–A3/B1/B3/B4/B5 quoted below; B2 blocked; A4 unit + isolated `next dev` blocked by Next single-server lock; C1 skipped (no Flex env).
- **Current blocker:** B2 — after-hours (~22:00 ET): paper F MKT `78` cancelled (`PreSubmitted`); LMT@$25 `184` `Submitted` then cancelled; sidecar `executions:0`, `new_fills 0`. US equity extended session closed (ends ~20:00 ET). Sidecar+Gateway connected post-2FA.
- **Next best step:** Resume B2 in premarket/RTH (or portal fill while session open) → wait ≤30s without Journal → confirm new `execId` on GET `/api/me/journal/fills` → mark **Passing**.

## Previous Verified State (Personal pattern library)
- **State:** **Passing** — in-chart `WorkspaceTabBar` removed; one layout per chart tile (`pruneToSingleActiveTab` on hydrate); primary chart tile (DFS left-first) publishes symbol + price + day % to `document.title` with green/red/muted favicon; layout menu no longer create/copy/switch layouts.
- **Latest verification:** **Focused:** `Test Files 9 passed (9)`, `Tests 53 passed (53)` (`browserTabQuote`, `primaryChartTile`, `workspaceTabs`, `StockApp`, `app-workspace/`); **Architecture review:** self-review — Passed.
- **Evidence:** `browserTabQuote.ts`, `primaryChartTile.ts`, `PrimaryChartBrowserTabQuote.tsx`, `WorkspaceBrowserTabQuote.tsx`, `StockApp.tsx`, `ChartTileHost.tsx`, `SurfaceHost.tsx`, `LayoutTreeInner.tsx`, `ChartLayoutMenu.tsx`, `workspaceTabs.ts`, `appWorkspace/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** App-level — open `/workspace` with a chart; confirm browser tab shows `SYMBOL price ▲/▼ % · Edge` and favicon color; add second chart tile and confirm title still follows left/first chart; confirm no tab strip under chart header.

## Previous Verified State (App Workspace Use/Edit + shell-as-app)

- **Current task:** App Workspace Use/Edit + shell-as-app.
- **State:** **Passing** — `/workspace` is the primary app shell; **Use** vs **Edit layout** modes (session-only); module routes (`/chart`, `/screener/*`, `/journal/*`) redirect into workspace deep links; rail focuses/adds surfaces; root `lastModule` for chart/journal/screener/workspace → `/workspace`.
- **Latest verification:** **Focused:** `Test Files 7 passed (7)`, `Tests 31 passed (31)` (`src/lib/appWorkspace/`, `src/app/components/app-workspace/`); **Build:** `npm run build` passed (`✓ Compiled successfully in 3.0s`); **Architecture review:** self-review — Passed.
- **Evidence:** `AppWorkspaceContext.tsx`, `commands.ts` (`applySurfaceFocusOrOpen`), `workspace/page.tsx`, `ScreenerTileSurface.tsx`, `TileFrame.tsx`, `LayoutTreeInner.tsx`, `WorkspaceHeaderControls.tsx`, `AppWorkspaceNav.tsx`, `HomeAppNav.tsx`, `ModuleToWorkspaceRedirect.tsx`, `deepLinks.ts`, `lastModule.ts`, module redirect pages, `appWorkspace/ARCHITECTURE.md`, `design-system/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** Superseded by browser tab live quote row above.

## Previous Verified State (App Workspace Shell — Tiling Dock)

- **Current task:** App Workspace Shell (Tiling Dock).
- **State:** **Passing** — `/workspace` binary split-tree tiles (Chart, Screener, Journal, placeholder); resizable splitters; drag-to-dock; named save/duplicate/switch; in-process Review→Chart via `WorkspaceDriveContext`; deep links `/workspace?surface=screener`; module routes retained.
- **Latest verification:** **Focused:** `Test Files 5 passed (5)`, `Tests 29 passed (29)` (`src/lib/appWorkspace/`, `src/app/components/app-workspace/`, `lastModule`, `HomeAppNav`); **Build:** `npm run build` passed (`✓ Compiled successfully in 3.0s`); **Packages:** `npm run check:packages` passed; **Architecture review:** self-review — Passed.
- **Evidence:** `src/lib/appWorkspace/*`, `src/app/components/app-workspace/*`, `src/app/workspace/page.tsx`, `ChartTileHost.tsx`, `WorkspaceDriveContext.tsx`, `WorkspaceChartDriveBridge.tsx`, `useScreenerReviewDrive.ts`, `HomeAppNav.tsx`, `lastModule.ts`, `design-system/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** Superseded by Use/Edit shell-as-app row above.

## Previous Verified State (App Workspace — Phase 0 layout engine)

## Previous Verified State (Position stick entry to last price)

- **Current task:** Position stick entry to last price.
- **State:** **Passing** — Long/short entry follows live last price by default; stop/TP stay fixed; Settings → “Stick entry to last price”; manual entry drag turns stick off.
- **Latest verification:** **Focused:** `Test Files 5 passed (5)`, `Tests 59 passed (59)` (`positionGeometry`, `drawingSettingsCapabilities`, `drawingStyles`, `position_tool`, `package-api-snapshot`); `@edge/chart-core` + `@edge/chart-react` rebuild passed; **Architecture review:** self-review — Passed.
- **Evidence:** `positionGeometry.ts`, `drawingStyles.ts`, `drawingSettingsCapabilities.ts`, `DrawingSettingsModal.tsx`, `useDrawingController.ts`, `EdgeChart.tsx`, `features.md`, `ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** App-level — place Long on a live symbol, confirm entry tracks last price while stop/TP stay put; toggle Settings off and confirm entry pins.

## Previous Verified State (Account display aliases)

- **Current task:** Account display aliases.
- **State:** **Passing** — Custom account picker dropdown includes a right-side settings rail; gear opens display-name editor inside the menu (no separate header icon). Aliases persist and replace raw IB ids across picker, Account panel, Trade form, and Data Health.
- **Latest verification:** **Focused:** `Test Files 5 passed (5)`, `Tests 43 passed (43)` (`AccountPickerMenu`, `AppTopHeader`, `accountAliases`, `accountPickerOptions`, `AccountPanel`); **Architecture review:** self-review — Passed.
- **Evidence:** `AccountPickerMenu.tsx`, `AccountAliasEditor.tsx`, `AppTopHeader.tsx`, `accountAliases.ts`, `AccountAliasesProvider.tsx`, `AccountPanel.tsx`, `TradeOrderForm.tsx`, `trading/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** App-level — click account picker → gear on right → set display name → confirm picker label updates and survives reload.

## Previous Verified State (Position tool instant place at last bar)

- **Current task:** Event rail transparent background.
- **State:** **Passing** — Event badge strip no longer paints its own fill/border; plot canvas background shows through (including user overrides).
- **Latest verification:** **Focused:** `Test Files 2 passed (2)`, `Tests 18 passed (18)` (`eventBadges`, `renderer`); `@edge/chart-react` rebuild passed.
- **Evidence:** `packages/chart-react/src/engine/renderer.ts`, `docs/chart/features.md`, `src/lib/chart/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** App-level — open `/chart` with events on and confirm the rail matches the plot background.

## Previous Verified State (Time axis date-label vertical margins)

- **Current task:** Time axis date-label vertical margins.
- **State:** **Passing** — Bottom date strip is 24px; labels and crosshair time badge are vertically centered (equal top/bottom margin, TV-style).
- **Latest verification:** **Focused:** `Test Files 5 passed (5)`, `Tests 56 passed (56)` (renderer, layout, canvas, webgl mocks); `@edge/chart-core` + `@edge/chart-react` rebuild passed.
- **Evidence:** `packages/chart-core/src/layout.ts`, `packages/chart-react/src/engine/renderer.ts`, `docs/chart/features.md`.
- **Current blocker:** none.
- **Next best step:** App-level — open `/chart` and confirm date labels have equal padding above/below in the bottom strip.

## Previous Verified State (Price axis quarter tick dashes)

- **Current task:** Price axis quarter tick dashes.
- **State:** **Passing** — Three short dashes between each labeled price on the Y-axis, partitioning each interval into quarters.
- **Latest verification:** **Focused:** `Test Files 2 passed (2)`, `Tests 26 passed (26)` (`priceScaleTransform.test.ts`, `renderer.test.ts`); `@edge/chart-core` + `@edge/chart-react` rebuild passed.
- **Evidence:** `packages/chart-core/src/priceScaleTransform.ts`, `packages/chart-react/src/engine/renderer.ts`, related tests, `docs/chart/features.md`.
- **Current blocker:** none.
- **Next best step:** App-level — open `/chart` and confirm three dashes between consecutive price labels on the right axis.

## Previous Verified State (Long position empty-margin stretch fix)

- **Current task:** Long position empty-margin stretch fix.
- **State:** **Passing** — Near-miss past last candle snaps to last bar; far empty-margin uses extrapolated timestamps (never `timestamp: 0`); legacy `t:0`+virtual-index anchors clamp on render. Runtime: stretch width ~118px → ~8.8px (`zero-ts-clamped`).
- **Latest verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 44 passed (44)` (`drawingCoords`, `positionGeometry`, `position_tool`); `@edge/chart-core` rebuild passed; app-level post-fix logs confirmed clamp.
- **Evidence:** `packages/chart-core/src/drawingCoords.ts`, `packages/chart-core/src/drawings/positionGeometry.ts`, related tests.
- **Current blocker:** none.
- **Next best step:** Delete any old stretched long (persisted `t:0` points) if still on chart; draw new longs near live edge to confirm.

## Previous Verified State (Drawing hover grab cursor without selection)

- **Current task:** Drawing hover grab cursor without selection.
- **State:** **Passing** — Hovering any drawing body (or control point) shows `grab` without selecting first; locked CP → `not-allowed`; active drawing tool keeps crosshair.
- **Latest verification:** **Focused:** `Test Files 1 passed (1)`, `Tests 21 passed (21)` (`layout.test.ts`); `@edge/chart-core` + `@edge/chart-react` rebuild passed.
- **Evidence:** `packages/chart-core/src/layout.ts`, `packages/chart-react/src/engine/canvas.tsx`, `src/lib/chart/layout.test.ts`, `docs/chart/prereqs/gesture-bible.md`.
- **Current blocker:** none.
- **Next best step:** App-level — hover unselected long position and confirm grab cursor before click.

## Previous Verified State (Drawing selection toolbar clearance)

- **Current task:** Drawing selection toolbar clearance.
- **State:** **Passing** — Floating drawing toolbar sits 28px clear of the drawing; flips below when the viewport lacks room above; clamped inside the chart.
- **Latest verification:** **Focused:** `Test Files 2 passed (2)`, `Tests 10 passed (10)` (`drawingSelectionToolbarPosition`, `DrawingSelectionToolbar`).
- **Evidence:** `drawingSelectionToolbarPosition.ts`, `DrawingSelectionToolbar.tsx`, related tests.
- **Current blocker:** none.
- **Next best step:** App-level — select a long position near the top of the chart and confirm toolbar flips below with clearance.

## Previous Verified State (Workspace tab live quote strip)

- **Current task:** Workspace tab live quote strip.
- **State:** **Passing** — Tabs show last price + day % (green/red/muted); SSE `price`/`changePercent` mapped into QuoteSnapshot; all workspace tab symbols included in quote universe.
- **Latest verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 16 passed (16)` (`mappers`, `WorkspaceTabBar`, `MarketDataProvider`).
- **Evidence:** `mapRawQuoteToSnapshot`, `MarketDataProvider.tsx`, `WorkspaceTabBar.tsx`, `StockApp.tsx`, related tests.
- **Current blocker:** none.
- **Next best step:** App-level — open `/chart` on F and confirm tab shows last + day %.

## Previous Verified State (Clear manual TWS reconnect)

- **Current task:** Clear manual TWS reconnect.
- **State:** **Passing** — When TWS/Gateway is down, Reconnect appears in chart top-right and app header alert; Data Health panel keeps the same action; sidecar `/control/reconnect` resets paper and live sockets.
- **Latest verification:** **Focused:** `Test Files 4 passed (4)`, `Tests 19 passed (19)` (UI recover tests); Sidecar `Ran 2 tests OK` (`ReconnectResetTests`); **Architecture review:** self-review — Passed.
- **Evidence:** `TwsRecoverButton.tsx`, `ChartOverlayDataHealthRow.tsx`, `ChartOverlayStatusStack.tsx`, `AppTopHeader.tsx`, `DataHealthMenu.tsx`, `services/tws-sidecar/main.py`, `test_main.py`, `src/lib/marketData/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** App-level — stop one Gateway socket, confirm chart top-right Reconnect + Data Health panel both recover paper+live; external-mode Reconnect spawn shipped in follow-up row.

## Previous Verified State (Workspace tabs TV-style chrome)

- **Current task:** Workspace tabs TV-style chrome.
- **State:** **Passing** — Tab bar is ~75% of chart header height (`27px` / `h-9`); tabs stretch full track; content matches TV strip (monogram, symbol, direction, price, %, layout title).
- **Latest verification:** **Focused:** `Test Files 1 passed (1)`, `Tests 4 passed (4)` (`WorkspaceTabBar.test.tsx`).
- **Evidence:** `WorkspaceTabBar.tsx`, `WorkspaceTabBar.test.tsx`, `src/lib/design-system/ARCHITECTURE.md`, `docs/chart/features.md`.
- **Current blocker:** none.
- **Next best step:** App-level — open `/chart` and confirm tab height vs header + quote strip layout.

## Previous Verified State (Position drawing TV-style 4 handles)

- **Current task:** Position drawing TV-style 4 handles.
- **State:** **Passing** — Long/short position drawings expose four TradingView-style handles: TP/stop vertical-only, entry-left 2-axis, right width-only.
- **Latest verification:** **Focused:** `Test Files 2 passed (2)`, `Tests 29 passed (29)` (`positionGeometry.test.ts`, `position_tool.test.ts`); `@edge/chart-core` rebuild passed.
- **Evidence:** `packages/chart-core/src/drawings/positionGeometry.ts`, `positionGeometry.test.ts`, `src/lib/chart/drawings/position_tool.test.ts`, `docs/chart/features.md`, `src/lib/chart/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** App-level — select long/short position and confirm only four handles with TV drag semantics.

## Previous Verified State (Full-range chart horizontal pan)

- **Current task:** Full-range chart horizontal pan.
- **State:** **Passing** — Pan slack is visible−1 so the first bar can reach the right edge and the last bar can reach the left edge (no fixed ±40 buffer).
- **Latest verification:** **Focused:** `Test Files 1 passed (1)`, `Tests 50 passed (50)` (`packages/chart-react/src/engine/viewport.test.ts`); `@edge/chart-react` rebuild passed.
- **Evidence:** `packages/chart-react/src/engine/viewport.ts`, `viewport.test.ts`, `docs/chart/features.md`.
- **Current blocker:** none.
- **Next best step:** App-level — pan chart left/right until first bar is at right edge and latest bar is at left edge.

## Previous Verified State (Trade setup panel drawing-bound)

- **Current task:** Trade setup panel (drawing-bound).
- **State:** **Passing** — Right-click long/short position → Trade setup… opens docked Trade sidebar; panel live-syncs entry/stop/TP from bound drawing only; header Trade opens unbound panel; entry-only MKT/LMT preview→submit.
- **Latest verification:** **Focused:** `Test Files 5 passed (5)`, `Tests 20 passed (20)` (`positionTradeSetup`, `overlayContextMenu`, `TradeSidebarPanel`, `registry`, `TradeTicketModal`); **Build:** `npm run build` passed (`✓ Compiled successfully in 2.4s`); **Architecture review:** self-review — Passed.
- **Evidence:** `positionTradeSetup.ts`, `TradeSetupBindingContext.tsx`, `TradeOrderForm.tsx`, `TradeSidebarPanel.tsx`, `overlayContextMenu.ts`, `ChartCell.tsx`, `StockApp.tsx`, `registry.tsx`, `trading/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** App-level walkthrough — draw long → Trade setup… → drag stop → panel updates → Preview paper order; then RTH live fill proof.

## Previous Verified State (Full-width Edge logo header)

- **Current task:** Full-width Edge logo header.
- **State:** **Passing** — Full-width top header with clickable `logo-full-light` → `/home`; left module rail below header without Home icon.
- **Latest verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 9 passed (9)` (`AppTopHeader`, `HomeAppNav`, `AppModuleShell`); **App-level:** `/chart` shows Edge home link + Charts/Journal/Research rail only; logo navigates to `/home`; account picker loads; **Architecture review:** self-review — Passed.
- **Evidence:** `AppModuleShell.tsx`, `AppTopHeader.tsx`, `HomeAppNav.tsx`, related tests, `src/lib/design-system/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** Superseded by trade setup panel.

## Previous Verified State (Account panel open orders vs order history)

- **Current task:** Account panel open orders vs order history.
- **State:** **Passing** — Open orders excludes Cancelled/Filled; Order history shows all session orders; cancel of paper F `orderId=32` verified at broker.
- **Latest verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 22 passed (22)` (`orderStatus`, `filterOrders`, `AccountPanel`); **App-level:** `GET /account/orders` paper F `orderId=32` `status: Cancelled`; **Architecture review:** self-review — Passed.
- **Evidence:** `orderStatus.ts`, `filterOrders.ts`, `AccountPanel.tsx`, `AccountPanel.test.tsx`, `src/lib/trading/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** Superseded by full-width Edge logo header.

## Previous Verified State (Account panel cancel for null-status orders)
- **State:** **Passing** — Cancel shows when order status is null/blank; sidecar maps status from `trade.orderStatus`.
- **Latest verification:** **Focused:** `Test Files 2 passed (2)`, `Tests 18 passed (18)` (`orderStatus`, `AccountPanel`); **Sidecar:** `TradingModifyTests` 7 OK; **App-level:** paper F LMT `orderId=32` cancelled (`status: Cancelled` on `GET /account/orders`).
- **Evidence:** `orderStatus.ts`, `AccountPanel.tsx`, `AccountPanel.test.tsx`, `services/tws-sidecar/main.py`, `test_main.py`.
- **Current blocker:** none.
- **Next best step:** Superseded by open-orders vs history split.

## Previous Verified State (Trade execution reliability track)

- **Current task:** Trade execution reliability track.
- **State:** **Passing** — paper + live API bake; Postgres intent store; after-hours readiness fixes; recovery partial (dev port-ownership).
- **Latest verification:** **App-level:** paper LMT `orderId=24` `permId=438990727` cancel `Cancelled`; STP `12`/`16` cancel `Cancelled`; idempotency `24==24`; kill switch blocked preview; Postgres restart idempotency `orderId=31` after dev restart; live preview+submit `U25026894` LMT `orderId=9` `permId=703230888`; live GTC `orderId=15` cancelled 2026-07-13; **Focused:** `Test Files 14 passed (14)`, `Tests 81 passed (81)`; **Build:** `npm run build` passed; **Architecture review:** self-review — Passed.
- **Evidence:** `dataTrust.ts`, `tradingService.ts`, `intentStore.ts`, `postgresIntentStore.ts`, `intentRepository.ts`, `0005_order_intents.sql`, `.env.local` (`TWS_MANAGED=external`).
- **Current blocker:** Live 1-share fill proof still pending RTH; in-app Reconnect TWS blocked when port 8765 owned by another dev instance.
- **Next best step:** Finish UI walkthrough cancel after Account panel Cancel fix; then RTH live 1-share MKT fill + journal proof.

## Previous Verified State (Heat map data hardening)

- **Current task:** Heat map data hardening.
- **State:** **Passing** — Movers enriched via universe descriptors; screener `changePercent` mapping fixed; heat-map quote cap 200; partial size-metric banner.
- **Latest verification:** **Focused:** `Test Files 6 passed (6)`, `Tests 31 passed (31)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.0s`); **Architecture review:** self-review — Passed; app-level Gainers/Large-cap heat map walkthrough deferred.
- **Evidence:** `enrichMoversWithDescriptors.ts`, `marketDataService.ts`, `mappers.ts`, `apiScreenerFeed.ts`, `screenerHeatMapAdapter.ts`, `ResultsTable.tsx`, `useScreenerSessionModel.ts`.
- **Current blocker:** none.
- **Next best step:** Superseded by trade execution reliability track.

## Previous Verified State (Dual connection Phase D)

- **Current task:** Screener layout + right-panel UX.
- **State:** **Passing** — screener-only wide dock (panel-aware max + Expand/Collapse); never-run vs no-match empty states; edit/scan filter modes with chip summary; narrow horizontal preset chips; Limit beside Run.
- **Latest verification:** **Focused:** `Test Files 20 passed (20)`, `Tests 105 passed (105)` (`sidebarWidth`, sidebar shell, screener); **Build:** `npm run build` passed; **Architecture review:** self-review — Passed.
- **Evidence:** `src/lib/responsive/{sidebarWidth,layoutConstants}.ts`, `src/app/components/sidebar/{SidebarPanelWidthContext,PanelChromeActions,RightSidebar}.tsx`, `src/app/components/StockApp.tsx`, `src/app/components/screener/{ScreenerPanelContent,ResultsTable,FilterChipSummary}.tsx`, `src/lib/screener/{screenerSession,useScreenerSessionModel,compileQuery}.ts`, `docs/screener-roadmap.md`.
- **Current blocker:** none.
- **Next best step:** Superseded by right panel overlay layout row.

## Previous Verified State (Dual connection Phase C)

- **Current task:** Dual connection — Phase C data preference split.
- **State:** **Passing** — chart/quote IB connection decoupled from order account via `edge:marketData:connectionId`; header data chip; pre-trade quotes follow order env.
- **Latest verification:** **Focused:** Sidecar `Ran 35 tests OK`; App `Test Files 4 passed (4)`, `Tests 71 passed (71)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 4.2s`); **Architecture review:** self-review — Passed.
- **Evidence:** `services/tws-sidecar/main.py`, `dataConnectionPreference.ts`, `useDataConnectionPreference.ts`, `MarketDataProvider.tsx`, `AppTopHeader.tsx`, `tradingService.ts`, `marketDataService.ts`, `src/lib/marketData/ARCHITECTURE.md`, `src/lib/trading/ARCHITECTURE.md`, `docs/dual-connection-roadmap.md`.
- **Current blocker:** App-level Phase C proof needs both Gateways up (`services/ib-gateway/.env` + 2FA).
- **Next best step:** Phase D abstraction hardening — or app-level walkthrough: live data chip while paper order account selected.

## Previous Verified State (Position 1R yard lines)

- **Current task:** Position 1R yard lines.
- **State:** **Passing** — long/short position drawings show always-on left-edge 1R ticks with in-box `NR` labels in the profit zone.
- **Latest verification:** **Focused:** `Test Files 2 passed (2)`, `Tests 29 passed (29)`; **Build:** `npm run build:packages` passed; **Architecture review:** self-review — Passed.
- **Evidence:** `packages/chart-core/src/drawings/{positionGeometry,position_tool}.ts`, `positionGeometry.test.ts`, `docs/chart/features.md`, `src/lib/chart/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** App-level walkthrough on `/chart` — draw long + short with ≥2R target; confirm left ticks + in-box `1R`/`2R` update on resize.

## Startup Readiness

Fresh agent or developer sessions should initialize before feature work. See [AGENTS.md](../AGENTS.md) for constraints and topic docs.

| Step | Command |
|------|---------|
| Install dependencies | `npm run setup` |
| Start dev server | `npm run dev` → http://localhost:3003 |
| Fast startup verification | `npm run check:startup` |
| Full verification | `npm run check` |
| One-shot init script | `scripts/init.sh` (add `--full` for full check) |

Optional persistence: copy `.env.example` → `.env.local`, then `npm run db:up` and `npm run db:migrate`.

### Fresh-Session Acceptance Checklist

- [ ] `npm run setup` succeeds from a clean clone
- [ ] `npm run check:startup` passes (harness + active-area smoke tests)
- [ ] Active work and next priorities are visible below without verbal context
- [ ] Area-specific tests pass for the task being picked up

## Shipped Foundations

| Area | Status | Notes |
|------|--------|-------|
| Chart engine (V1) | **Done** | Custom Canvas 2D; pan/zoom/pinch, 5 chart types, crosshair sync |
| Indicators | **Done** | 15 implemented (MA, EMA, BOLL, MACD, RSI, VOL, VWAP, ATR, KDJ, CCI, OBV, DMI, WR, ROC, Supertrend); 15 catalog entries disabled |
| Drawings | **Done** | 14 tools (incl. ruler + measure utilities), typed styles, undo/redo, multi-pane routing |
| Context menus | **Done** | Blank + drawing + price-axis menus; ⌥R reset, crosshair lock toggle, bulk remove — see [context-menu-reference.md](./context-menu-reference.md) |
| Layout persistence | **Done** | localStorage + optional Postgres workspace sync |
| AI tool registry | **Done** | Shared registry; HTTP + MCP + in-app adapters |
| Watchlists / templates | **Done** | localStorage + optional remote sync |
| Rich annotation metadata | **Done** | Phase A — thesis/invalidation/target kinds on drawings |
| Market data foundation | **Done** | Provider-neutral layer in `src/lib/marketData/`; Yahoo + SEC/FRED/FMP/Tradier/IBKR adapters; registry-driven event system with chart pins |

## Harness Retention

`PROJECT-STATUS.md` is the **hot operational dashboard**, not the full ledger. Full history lives in [status-archive/](./status-archive/).

| Content | Hot retention | Archive when |
|---------|---------------|--------------|
| Current Verified State | 1 block only | Replace in place on task change; do **not** stack `## Previous Verified State` |
| Active Work | Active/Pending/Blocked + last ≤10 Passing | Older Passing rows → `status-archive/` |
| Task Contract | Incomplete / in-flight only | Complete → archive |
| Session Log | Last ~15 entries | Older entries → monthly archive file |

Prune when this file exceeds ~300 lines, on session exit after marking Passing, or weekly.

## Active Work

Use states: **Pending**, **Active**, **Blocked**, **Passing**. Keep only one item **Active** at a time.
Use verification levels: **Focused** (targeted Vitest), **Build** (`npm run build`), **App-level** (dev server or browser/manual flow), **Full** (`npm run check`).

| Feature | Behavior | State | Completion evidence / latest result | Files |
|---------|----------|-------|-------------------------------------|-------|
| Structural refactor Tier E2 (AI chart-tool split) | Two-products docs; shared chart-type/starter-indicator enums from chart-core; app `get_chart_state`/`set_chart_type` characterization tests; package execute path unchanged | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 15 passed (15)`; **Build:** `npm run build:packages` passed; **Architecture review:** self-review Passed | `packages/chart-core/src/toolConstants.ts`, `packages/ai-tools-chart/ARCHITECTURE.md`, `packages/ai-tools-chart/src/tools.ts`, `src/lib/ai/schemas.ts`, `src/lib/ai/tools/chart.test.ts`, `docs/ai-tools-architecture.md`, `src/lib/ai/ARCHITECTURE.md`, `src/test/package-api-snapshot.test.ts` |
| Structural refactor Tier E1 (revisioned CRUD helpers) | Shared `revisionedLibraryRepository`/`revisionedLibraryClient`; watchlist/screener/chart-template thin adapters; sync/conflict behavior unchanged | **Passing** | **Focused:** `Test Files 15 passed (15)`, `Tests 52 passed (52)`; **Build:** `npm run build` passed; **Architecture review:** self-review Passed | `revisionedLibraryRepository.ts`, `revisionedLibraryClient.ts`, `*LibraryRepository.ts`, `*LibraryClient.ts`, `persistence/ARCHITECTURE.md` |
| Structural refactor Tier D (chart runtime) | D1 ChartCell thin wiring + `chart-cell/*` hooks; D2 canvas render/gesture split; D3 EdgeChart coordinators; D4 drawing controller FSM/facade split; no UX change; package public API unchanged | **Passing** | **Focused:** `Test Files 11 passed (11)`, `Tests 76 passed (76)`; **Build:** `npm run build:packages` passed; **Boundaries:** `npm run lint:package-boundaries` passed; **Build:** `npm run build` passed; **Architecture review:** self-review Passed; app-level pan/zoom/draw smoke deferred | `src/app/components/chart-cell/*`, `ChartCell.tsx`, `ChartCell.patternCapture.test.tsx`, `packages/chart-react/src/engine/*`, `packages/chart-react/src/EdgeChart.tsx`, `packages/chart-react/src/use*.ts`, `packages/chart-react/src/drawing/*`, `docs/roadmaps/refactor-roadmap.md`, `src/lib/chart/ARCHITECTURE.md` |
| Structural refactor Tier C3 (design-system leftovers) | Seven chart chrome surfaces use EdgeModalShell/EdgeButton/`--edge-*` tokens; drawing paint hex preserved; no behavior change | **Passing** | **Focused:** `Test Files 4 passed (4)`, `Tests 11 passed (11)` (`BarReplay`, `TemplatePickerModal`, `ChartGoToModal`, `DrawingSelectionToolbar`); **Architecture review:** self-review Passed; app-level modal spot-check deferred | `BarReplay.tsx`, `ChartTimeZoneMenu.tsx`, `TemplatePickerModal.tsx`, `ChartGoToModal.tsx`, `DrawingSettingsModal.tsx`, `IndicatorSettingsModal.tsx`, `DrawingSelectionToolbar.tsx` |
| Structural refactor Tier C2 (Object Tree split) | `DataWindowTab` + tree row/section modules extracted; `ObjectTree` tab shell; active-chart `DataWindowProps`/actions unchanged | **Passing** | **Focused:** `Test Files 2 passed (2)`, `Tests 19 passed (19)` (`ObjectTreePanel.test.tsx`, `objectTreeModel.test.ts`); **Architecture review:** self-review Passed | `src/app/components/object-tree/*`, `ObjectTree.tsx`, `ActiveChartContext.tsx` |
| Structural refactor Tier C1 (StockApp providers) | `useStockAppBootstrap`, layout/sidebar controllers, `AppProviders`; provider order + hydrate gate preserved; StockApp thin composition root | **Passing** | **Focused:** `Test Files 4 passed (4)`, `Tests 23 passed (23)` (`StockApp.test.tsx`, `StockApp.bootstrap.test.tsx`, `src/lib/app/bootstrap/`); **Build:** `npm run build` passed (`✓ Compiled successfully in 3.1s`); **Architecture review:** self-review Passed; app-level `/workspace` smoke deferred | `src/app/components/stock-app/*`, `StockApp.tsx` |
| Screener keyboard chart viewport drift | ↑/↓ through screener results keeps chart at fitted live-edge view; cache→fresh length growth rebuilds session viewport when indices were not shifted; workspace drive skips BroadcastChannel double-load | **Passing** | **Focused:** `Test Files 5 passed (5)`, `Tests 27 passed (27)`; **Architecture review:** self-review Passed | `packages/chart-react/src/engine/canvas.tsx`, `canvas.test.tsx`, `useScreenerReviewDrive.ts`, `src/lib/chart/ARCHITECTURE.md` |
| Series/interval consolidation (Tier B2) | Pure HA/merge/coverage/2h resample in `@edge/chart-core`; app + chart-react import from package; orphan `heikinAshi.ts` removed; no UX change | **Passing** | **Focused:** `Test Files 13 passed (13)`, `Tests 99 passed (99)` (incl. B1 sync); **Build:** `npm run build:packages` passed; **Boundaries:** `npm run lint:package-boundaries` passed; **Architecture review:** self-review Passed | `packages/chart-core/src/{series,interval}.ts`, `src/lib/chart/{series,intervalAdapter}.ts`, `useChartDataFeed.ts`, `priceAxisAnnotations.ts`, deleted `packages/chart-react/.../intervalAdapter.ts`, `src/lib/heikinAshi.ts` |
| Revision-sync consolidation (Tier B1) | One `useRevisionedRemoteSync` core; watchlist/screener/chart-template hooks are thin adapters; hydrate/debounce/conflict behavior unchanged | **Passing** | **Focused:** `Test Files 6 passed (6)`, `Tests 21 passed (21)` (`src/lib/persistence/sync/`); **Architecture review:** self-review Passed | `useRevisionedRemoteSync.ts`, `useWatchlistLibraryRemoteSync.ts`, `useScreenerLibraryRemoteSync.ts`, `useChartTemplateLibraryRemoteSync.ts`, `persistence/ARCHITECTURE.md` |
| Screener header Option B | Stock Screener title + Run in chrome; active screen subtitle; rail selection highlight; + Save current in Screens rail | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 19 passed (19)` | `ScreenerScreensBody.tsx`, `ScreenerPanelContent.tsx`, `summarizeScreen.ts` |
| Screener results scroll + compact view | Results region scrolls in-pane; compact List/Heat map select; denser toolbar; tile height chain fixed | **Passing** | **Focused:** `Test Files 4 passed (4)`, `Tests 29 passed (29)`; dialog scroll assertion passed | `ScreenerTileSurface.tsx`, `ScreenerResultsBody.tsx`, `ScreenerScreensBody.tsx`, `ResultsTable.tsx` |
| Dead code removal (Tier A) | Orphan chart duplicates become package re-exports; unused app Toolbar/legend components and unused Yahoo market-data port removed; no user-visible change | **Passing** | **Focused:** `Test Files 8 passed (8)`, `Tests 45 passed (45)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.9s`); **Architecture review:** self-review Passed | `src/lib/chart/indicators/draw.ts`, `src/lib/chart/drawings/measure.ts`, deleted `Toolbar.tsx`/`ChartLegendBar.tsx`/`PaneLegendBar.tsx`, `src/lib/ai/{marketDataPort,index}.ts`, `docs/ai-tools-architecture.md` |
| Screener results toolbar UX | One post-run toolbar: view toggle + count/Live + Watchlist/Export menus (secondary buttons); hide bulk actions at 0 results; phase detail on count tooltip | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 27 passed (27)` | `ResultsTable.tsx`, `EdgeButton.tsx`, `styles.ts`, `EdgeMenuItem.tsx` |
| Screener result-limit compact select | Custom query header: “Top N” select (50/100/200/500) before Run; no freeform LIMIT | **Passing** | **Focused:** `Test Files 2 passed (2)`, `Tests 16 passed (16)` | `ScreenerScreensBody.tsx`, `ScreenerDialog.test.tsx` |
| Screener Option A split-pane UX | Unified screener: Screens list (starters seeded) + active query + results; click/↑↓ drives sibling chart; no Review/Keepers sub-nav | **Passing** | **Focused:** `Test Files 15 passed (15)`, `Tests 69 passed (69)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.1s`); **Architecture review:** self-review Passed; app-level walkthrough deferred | `ScreenerScreensBody.tsx`, `ScreenerTileSurface.tsx`, `ScreenerResultsBody.tsx`, `ResultsTable.tsx`, `useScreenerResultSelection.ts`, `screenStorage.ts`, `types.ts`, `screenerLibrary.ts`, `deepLinks.ts`, `docs/roadmaps/screener-roadmap.md` |
| Patterns library browse | Rail Patterns opens interactive captures; detail shows SVG + sections; Go to chart navigates symbol/interval/time; metadata PATCH for family/quality/notes; post-save View in Patterns | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 15 passed (15)`; **Architecture review:** self-review Passed; app-level walkthrough deferred | `src/app/api/pattern-library/records/`, `src/app/components/pattern-library/*`, `sidebar/registry.tsx`, `PatternLibraryContext.tsx`, `ChartCell.tsx`, `patternLibrary/ARCHITECTURE.md`, `docs/chart/features.md` |
| Pattern Capture start/end + presets | Per-section start/end clicks (1-bar allowed); label via numbered presets (1–N keys) or custom text; pattern bounds from section min/max; save to pattern library | **Passing** | **Focused:** `Test Files 1 passed (1)`, `Tests 13 passed (13)`; **Architecture review:** self-review Passed | `src/lib/patternCapture/{fsm,presets,buildRecord}.ts`, `PatternCapturePanel.tsx`, `PatternCaptureOverlay.tsx`, `ChartCell.tsx` |
| Pattern Capture Mode | Historical multi-section bar-snapped capture → labeled sections → persist OHLCV + frozen SVG + metadata into personal pattern library; retrieval-ready | **Passing** | **Focused:** `Test Files 12 passed (12)`, `Tests 33 passed (33)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.0s`); **Architecture review:** self-review Passed; superseded by start/end + presets row | `src/lib/patternCapture/*`, `src/lib/patternLibrary/*`, `src/app/api/pattern-library/captures/`, `PatternCapturePanel.tsx`, `PatternCaptureOverlay.tsx`, `ChartCell.tsx`, `patternLibrary.ts`, shortcuts |
| Workspace pill header UX | Use mode: single workspace pill for switch/rename/new/duplicate; Edit mode: Editing label + Layout + Done; remove always-on name input/select/Save copy | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 30 passed (30)`; **Architecture review:** self-review Passed; app-level walkthrough deferred | `WorkspacePill.tsx`, `WorkspaceHeaderControls.tsx`, `commands.ts`, `AppWorkspaceContext.tsx`, `appWorkspace/ARCHITECTURE.md`, `design-system/ARCHITECTURE.md` |
| Workspace layout presets + empty-pane assign | Edit mode **Layout** picker (8 presets) → placeholder panes → per-pane Chart/Screener/Journal chooser; filled-tile reassign in edit header; freeform drag-dock retained | **Passing** | **Focused:** `Test Files 7 passed (7)`, `Tests 52 passed (52)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.1s`); **Architecture review:** self-review Passed; app-level walkthrough deferred | `layoutPresets.ts`, `commands.ts`, `WorkspaceLayoutPresetPicker.tsx`, `PlaceholderTile.tsx`, `TileFrame.tsx`, `AppWorkspaceContext.tsx`, `WorkspaceHeaderControls.tsx`, `appWorkspace/ARCHITECTURE.md` |
| Broker ledger + sync | Server-side IB execution ingest into journal while Next+sidecar up; cursor + Flex gap backfill; account/position snapshots; client sync triggers server ingest; Data Health ledger age | **Passing** | **Functional plan complete.** **B2 PASS (RTH 2026-07-17):** paper F MKT `orderId=10190` `status:Filled` `permId=1041862008`; GET fills `before 46 after 47 new 1` `execId=00025b44.6a5abe6c.01.01` qty1 @14.32 (no Journal UI); cron later `duplicates:2`; status `lastSeenExecIds` includes that execId; `ledger sync 0m ago`. Prior: A1–A3/B1/B3–B5 pass; A4 unit 503; C1 skipped. **Focused:** `Test Files 4 passed (4)`, `Tests 13 passed (13)` | `broker-ledger-functional-test-plan.md`, ingest/*, cron route, JournalSyncProvider, DataHealthProvider |
| Personal pattern library (chart eye MVP) | Hybrid setup library: taxonomy, OHLCV features, retrieval, rules, three-arm bake-off, stress tests; AI tools for similarity + capture draft | **Passing** | **Focused:** `Test Files 9 passed (9)`, `Tests 23 passed (23)`; **CLI:** seed 100 records, bake-off recommends retrieval over VLM stub; **Architecture review:** self-review Passed | `src/lib/patternLibrary/*`, `patternLibrary.ts`, `data/pattern-library/`, `scripts/pattern-library-*.mts` |
| Browser tab live quote (remove chart tabs) | No in-chart tab strip; one layout per chart tile; primary chart (DFS left-first) publishes symbol + price + day % to browser tab title + direction favicon | **Passing** | **Focused:** `Test Files 9 passed (9)`, `Tests 53 passed (53)` (`browserTabQuote`, `primaryChartTile`, `workspaceTabs`, `StockApp`, `app-workspace/`); **Architecture review:** self-review Passed; app-level browser-tab walkthrough deferred | `browserTabQuote.ts`, `primaryChartTile.ts`, `PrimaryChartBrowserTabQuote.tsx`, `WorkspaceBrowserTabQuote.tsx`, `StockApp.tsx`, `ChartTileHost.tsx`, `ChartLayoutMenu.tsx`, `workspaceTabs.ts`, `appWorkspace/ARCHITECTURE.md` |
| App Workspace Use/Edit + shell-as-app | `/workspace` primary shell; Use vs Edit layout modes; module routes redirect to workspace deep links; rail focus/add; screener in-tile nav (Screens/Results/Review) without route escape; deep-link ingress idempotent | **Passing** | **Focused:** `Test Files 7 passed (7)`, `Tests 31 passed (31)`; fixed `Maximum update depth` on screener Screens/deep-link ingress (`applySurfaceFocusOrOpen`, stable `handleSurfaceIngress`); **Architecture review:** self-review Passed; app-level walkthrough deferred | `AppWorkspaceContext.tsx`, `commands.ts`, `workspace/page.tsx`, `ScreenerTileSurface.tsx`, `ScreenerReviewView.tsx`, `ScreenerKeepersBody.tsx`, `TileFrame.tsx`, `WorkspaceHeaderControls.tsx`, `AppWorkspaceNav.tsx`, `deepLinks.ts`, `lastModule.ts`, `ModuleToWorkspaceRedirect.tsx` |
| App Workspace Shell (Tiling Dock) | `/workspace` split-tree tiles; Chart/Screener/Journal surfaces; drag/save; in-process Review drive | **Passing** | **Focused:** `Test Files 5 passed (5)`, `Tests 29 passed (29)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.0s`); superseded by Use/Edit shell-as-app | `src/lib/appWorkspace/*`, `src/app/components/app-workspace/*`, `src/app/workspace/page.tsx` |
| Screener Review app | `/screener` Review home + keyboard queue drives Chart via BroadcastChannel; sidebar screener retained | **Passing** | **Focused:** `Test Files 14 passed (14)`, `Tests 95 passed (95)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.6s`); **Architecture review:** self-review Passed; app-level dual-window walkthrough deferred | `src/app/screener/*`, `src/lib/screener/review*`, `ScreenerDriveListener`, `ScreenerReviewView`, `HomeAppNav`, `screener-roadmap.md` |
| Liquid tradeable screener preset | Preset + QueryBuilder filter: price ≥ $5 and dollar volume (price × volume) ≥ $2M/day; local post-filter (FMP over-fetch) | **Passing** | **Focused:** `Test Files 6 passed (6)`, `Tests 37 passed (37)` (`presets`, `compileQuery`, `universeDailyStore`, `screenerParams`, `deriveDefaultSort`, `QueryBuilder`); **Architecture review:** self-review Passed | `presets.ts`, `request.ts`, `universeDailyStore.ts`, `compileQuery.ts`, `marketDataService.ts`, `ScreenerPanelContent.tsx`, `ARCHITECTURE.md` |
| Position stick entry to last price | Long/short entry follows live last price by default; stop/TP fixed; Settings toggle; entry drag disables stick | **Passing** | **Focused:** `Test Files 5 passed (5)`, `Tests 59 passed (59)`; packages rebuild passed; **Architecture review:** self-review Passed | `positionGeometry.ts`, `drawingStyles.ts`, `drawingSettingsCapabilities.ts`, `DrawingSettingsModal.tsx`, `useDrawingController.ts`, `EdgeChart.tsx` |
| Account display aliases | Custom account picker dropdown with right-side settings rail; display names in picker, Account panel, Trade form, Data Health; IB accountId stays execution identity | **Passing** | **Focused:** `Test Files 5 passed (5)`, `Tests 43 passed (43)`; **Architecture review:** self-review Passed; app-level alias reload walkthrough deferred | `AccountPickerMenu.tsx`, `AccountAliasEditor.tsx`, `accountAliases.ts`, `AccountAliasesProvider.tsx`, `AppTopHeader.tsx`, `AccountPanel.tsx`, `TradeOrderForm.tsx`, `trading/ARCHITECTURE.md` |
| Position tool instant place at last bar | Toolbar Long/Short places immediately at last-bar close; left edge on last bar; selected + cursor restored | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 40 passed (40)` (`positionGeometry`, `position_tool`, `drawingFsm`); packages rebuild passed | `positionGeometry.ts`, `position_tool.ts`, `drawingController.ts`, `useDrawingController.ts`, tests, `features.md`, `ARCHITECTURE.md` |
| Event rail transparent background | Event badge strip has no fill/border; inherits plot canvas background | **Passing** | **Focused:** `Test Files 2 passed (2)`, `Tests 18 passed (18)`; `@edge/chart-react` rebuild passed | `renderer.ts`, `features.md`, `ARCHITECTURE.md` |
| Time axis date-label vertical margins | 24px bottom strip; date labels + crosshair time badge vertically centered (equal top/bottom margin) | **Passing** | **Focused:** `Test Files 5 passed (5)`, `Tests 56 passed (56)`; packages rebuild passed | `layout.ts`, `renderer.ts`, tests, `features.md` |
| Price axis quarter tick dashes | Three short axis-border dashes between labeled prices (quarter partitions); skip when majors <16px apart | **Passing** | **Focused:** `Test Files 2 passed (2)`, `Tests 26 passed (26)` (`priceScaleTransform`, `renderer`); packages rebuild passed | `priceScaleTransform.ts`, `renderer.ts`, tests, `features.md` |
| Long position empty-margin stretch fix | Near live-edge miss snaps to last bar; empty-margin extrapolates ts (no `t:0`); legacy `t:0`+virtual di clamps on render | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 44 passed (44)` (`drawingCoords`, `positionGeometry`, `position_tool`); runtime width ~118→~8.8px | `drawingCoords.ts`, `positionGeometry.ts`, related tests |
| Drawing hover grab cursor without selection | Hover drawing body or CP → `grab` without selecting first; locked CP → `not-allowed`; armed tool keeps crosshair | **Passing** | **Focused:** `Test Files 1 passed (1)`, `Tests 21 passed (21)` (`layout.test.ts`); packages rebuild passed | `packages/chart-core/src/layout.ts`, `packages/chart-react/src/engine/canvas.tsx`, `src/lib/chart/layout.test.ts`, `docs/chart/prereqs/gesture-bible.md` |
| Drawing selection toolbar clearance | Floating toolbar 28px clear of drawing; flips below when viewport lacks room above; edge-clamped | **Passing** | **Focused:** `Test Files 2 passed (2)`, `Tests 10 passed (10)` (`drawingSelectionToolbarPosition`, `DrawingSelectionToolbar`) | `drawingSelectionToolbarPosition.ts`, `DrawingSelectionToolbar.tsx`, related tests |
| Workspace tab live quote strip | Tab shows last price + day % (▲/▼; green/red/muted flat); SSE MarketQuote `price`/`changePercent` mapped; all tab symbols quoted via `extraSymbols` | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 16 passed (16)` (`mappers`, `WorkspaceTabBar`, `MarketDataProvider`) | `mappers.ts`, `MarketDataProvider.tsx`, `WorkspaceTabBar.tsx`, `StockApp.tsx`, related tests |
| Clear manual TWS reconnect | Reconnect when TWS down: chart top-right inline button + app header accounts alert; Data Health panel unchanged; sidecar reconnect resets ib-paper + ib-live | **Passing** | **Focused:** `Test Files 4 passed (4)`, `Tests 19 passed (19)`; Sidecar `ReconnectResetTests` 2 OK; **Architecture review:** self-review Passed; app-level Gateway stop/start walkthrough deferred | `TwsRecoverButton.tsx`, `ChartOverlayDataHealthRow.tsx`, `ChartOverlayStatusStack.tsx`, `AppTopHeader.tsx`, `DataHealthMenu.tsx`, `services/tws-sidecar/main.py`, `test_main.py`, `src/lib/marketData/ARCHITECTURE.md` |
| TWS external recovery spawn + auto-reconnect | User Reconnect spawns sidecar in `TWS_MANAGED=external` when port 8765 free (`TWS_MANAGED_BY=standalone`); explicit port-conflict copy; sidecar bounded auto-reconnect (2s→30s backoff, max 5) on IB 1100/502/504 + disconnect; `/status` exposes `autoReconnectAttempt` | **Passing** | **Focused:** `Test Files 2 passed (2)`, `Tests 21 passed (21)` (`recover.test.ts`, `managedMode.test.ts`); Sidecar `Ran 43 tests OK`; **Architecture review:** self-review Passed; app-level external-mode Reconnect walkthrough deferred | `recover.ts`, `managedMode.ts`, `recover.test.ts`, `managedMode.test.ts`, `services/tws-sidecar/main.py`, `test_main.py`, `src/lib/marketData/ARCHITECTURE.md` |
| Drawing control-point grab cursor | Hover selected drawing CP → `grab` (`not-allowed` if locked); drag → `grabbing` | **Passing** | **Focused:** `Test Files 2 passed (2)`, `Tests 36 passed (36)` (`layout`, `positionGeometry`); packages rebuild passed | `packages/chart-core/src/layout.ts`, `packages/chart-react/src/engine/canvas.tsx`, `src/lib/chart/layout.test.ts`, `docs/chart/prereqs/gesture-bible.md` |
| Workspace tabs TV-style chrome | Tab bar ~75% of chart header `h-9` (27px); tabs stretch full track height; monogram + symbol + ▲/▼ + price + % change + `/` layout title | **Passing** | **Focused:** `Test Files 1 passed (1)`, `Tests 4 passed (4)` (`WorkspaceTabBar.test.tsx`) | `WorkspaceTabBar.tsx`, `WorkspaceTabBar.test.tsx`, `design-system/ARCHITECTURE.md`, `docs/chart/features.md` |
| Position drawing TV-style 4 handles | Long/short position: 4 handles — TP left vertical-only, stop left vertical-only, entry-left moves entry + left edge, right edge width-only (no entry change) | **Passing** | **Focused:** `Test Files 2 passed (2)`, `Tests 29 passed (29)` (`positionGeometry`, `position_tool`); `@edge/chart-core` rebuild passed | `packages/chart-core/src/drawings/positionGeometry.ts`, `positionGeometry.test.ts`, `src/lib/chart/drawings/position_tool.test.ts`, `docs/chart/features.md`, `src/lib/chart/ARCHITECTURE.md` |
| Full-range chart horizontal pan | Pan slack = visible−1: first bar can reach right edge; last bar can reach left edge (replaces fixed ±40 buffer) | **Passing** | **Focused:** `Test Files 1 passed (1)`, `Tests 50 passed (50)` (`viewport.test.ts`); `@edge/chart-react` rebuild passed | `packages/chart-react/src/engine/viewport.ts`, `viewport.test.ts`, `docs/chart/features.md` |
| Trade setup panel (drawing-bound) | Right-click long/short position → Trade setup… opens Trade sidebar bound to `{cellId,drawingId}`; live entry/stop/TP sync from drawing points; other drawings ignored; header Trade opens unbound panel; entry-only MKT/LMT preview→submit | **Passing** | **Focused:** `Test Files 5 passed (5)`, `Tests 20 passed (20)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.4s`); **Architecture review:** self-review Passed; app-level drag→panel sync walkthrough deferred | `positionTradeSetup.ts`, `TradeSetupBindingContext.tsx`, `TradeOrderForm.tsx`, `TradeSidebarPanel.tsx`, `overlayContextMenu.ts`, `ChartCell.tsx`, `StockApp.tsx`, `registry.tsx`, `trading/ARCHITECTURE.md`, `design-system/ARCHITECTURE.md` |
| Full-width Edge logo header | Full-width top header with clickable `logo-full-light` → `/home`; left module rail below header without Home icon | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 9 passed (9)`; **App-level:** `/chart` Edge home link + Charts/Journal/Research rail; logo → `/home`; **Architecture review:** self-review Passed | `AppModuleShell.tsx`, `AppTopHeader.tsx`, `HomeAppNav.tsx`, related tests, `design-system/ARCHITECTURE.md` |
| Account panel open orders vs order history | Open orders = working only; Order history tab = all session orders (incl. Cancelled/Filled); Today's fills unchanged | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 22 passed (22)`; **App-level:** paper F `orderId=32` `status: Cancelled` on sidecar; **Architecture review:** self-review Passed | `orderStatus.ts`, `filterOrders.ts`, `AccountPanel.tsx`, `AccountPanel.test.tsx`, `ARCHITECTURE.md` |
| Account panel cancel for null-status orders | Show Cancel on Open orders when IB/sidecar omits status; map status from `trade.orderStatus` | **Passing** | **Focused:** `Test Files 2 passed (2)`, `Tests 18 passed (18)`; **Sidecar:** `TradingModifyTests` 7 OK; **App-level:** paper F `orderId=32` `status: Cancelled`; **Architecture review:** self-review Passed | `orderStatus.ts`, `AccountPanel.tsx`, `AccountPanel.test.tsx`, `services/tws-sidecar/main.py`, `test_main.py` |
| Trade execution reliability track | Paper/live API bake; after-hours pre-trade readiness; Postgres `order_intents`; kill-switch proof; restart idempotency | **Passing** | **App-level:** paper LMT `orderId=24` cancel `Cancelled`; idempotency `24==24`; Postgres restart `orderId=31`; live `U25026894` LMT `orderId=9` `permId=703230888`; live GTC SPY qty1 `orderId=15` cancelled 2026-07-13 (open orders empty); **Focused:** `Test Files 14 passed (14)`, `Tests 81 passed (81)`; **Build:** `npm run build` passed; **Architecture review:** self-review Passed; UI walkthrough + RTH fill still open | `dataTrust.ts`, `tradingService.ts`, `intentStore.ts`, `postgresIntentStore.ts`, `intentRepository.ts`, `0005_order_intents.sql`, `docs/trading-execution-roadmap.md` |
| Heat map data hardening | Movers join universe descriptors for marketCap/sector/volume/beta; screener changePercent alias+derive; heat-map quote cap 200; partial size-metric banner | **Passing** | **Focused:** `Test Files 6 passed (6)`, `Tests 31 passed (31)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.0s`); **Architecture review:** self-review Passed; app-level Gainers/Large-cap walkthrough deferred | `enrichMoversWithDescriptors.ts`, `marketDataService.ts`, `mappers.ts`, `apiScreenerFeed.ts`, `screenerHeatMapAdapter.ts`, `ResultsTable.tsx`, `useScreenerSessionModel.ts`, `ARCHITECTURE.md` |
| Heat map live config updates | Size / Color / Group toolbar changes re-layout and recolor immediately (adapter remaps metrics; view re-squarifies) | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 21 passed (21)` (`HeatMapView`, `ResultsTable`, `screenerHeatMapAdapter`); **App-level:** large-cap heat map sizeChanged/groupChanged/colorChanged true in browser | `HeatMapView.test.tsx`, `ResultsTable.test.tsx`, `screenerHeatMapAdapter.test.ts`, `src/lib/heatmap/ARCHITECTURE.md` |
| Screener scroll containment + heat map size contrast | Presets rail stays fixed while list/heat map scrolls; default size scale linear; Scale Linear/Log in heat map toolbar | **Passing** | **Focused:** `Test Files 5 passed (5)`, `Tests 41 passed (41)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.2s`); **Architecture review:** self-review Passed; app-level scroll/size walkthrough deferred | `src/app/components/sidebar/SidebarPanelShell.tsx`, `src/app/components/screener/{ScreenerPanelContent,ResultsTable}.tsx`, `src/lib/heatmap/{defaults,squarify}.ts`, `src/app/components/heatmap/HeatMapToolbar.tsx`, `docs/screener-roadmap.md` |
| Screener heat map (reusable treemap foundation) | After a screen run, toggle List / Heat map; configure size, color, group; click cell loads chart; full result set treemap with live quotes on top 64 by size | **Passing** | **Focused:** `Test Files 5 passed (5)`, `Tests 27 passed (27)`; **ScreenerDialog:** `Test Files 1 passed (1)`, `Tests 14 passed (14)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.9s`); **Architecture review:** self-review Passed; app-level heat map walkthrough deferred | `src/lib/heatmap/`, `src/app/components/heatmap/`, `src/lib/screener/{screenerSession,screenerHeatMapAdapter,useScreenerSessionModel}.ts`, `src/app/components/screener/{ResultsTable,ScreenerPanelContent}.tsx`, `docs/screener-roadmap.md` |
| Dual connection — Phase D abstraction + Data Health split | TWS-only preference docs/tests; chart loadQuotes connectionId; sidecar `/status` connections map; Data Health Connections section (paper, live, preference); trust blocks display-only submit | **Passing** | **Focused:** Sidecar `Ran 36 tests OK`; App `Test Files 12 passed (12)`, `Tests 141 passed (141)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.7s`); **App-level:** Data Health Connections paper+live connected; data chip Live while account paper; quotes `ib-live` → `tws`; **Architecture review:** self-review Passed | `services/tws-sidecar/main.py`, `src/lib/marketData/health.ts`, `src/app/components/data-health/`, `docs/dual-connection-roadmap.md` |
| Right panel overlay layout | Docked right panel overlays chart from the right without changing chart width; resizable via left-edge handle; no dimmed backdrop; Escape + rail close; screener Expand/Pop out on overlay | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 15 passed (15)`; **Architecture review:** self-review Passed; app-level overlay resize walkthrough deferred | `src/lib/responsive/responsiveLayout.ts`, `src/app/components/StockApp.tsx`, `src/app/components/sidebar/SidebarPanelShell.tsx`, `src/lib/design-system/ARCHITECTURE.md` |
| Screener layout + right-panel UX | Screener docked panel uses panel-aware max width + Expand/Collapse; never-run vs no-match results; edit/scan filter modes with chip summary; narrow horizontal preset chips; Limit beside Run | **Passing** | **Focused:** `Test Files 20 passed (20)`, `Tests 105 passed (105)`; **Build:** `npm run build` passed; **Architecture review:** self-review Passed; app-level docked expand/scan walkthrough deferred | `src/lib/responsive/sidebarWidth.ts`, `src/app/components/sidebar/SidebarPanelWidthContext.tsx`, `src/app/components/StockApp.tsx`, `src/app/components/screener/{ScreenerPanelContent,ResultsTable,FilterChipSummary}.tsx`, `src/lib/screener/screenerSession.ts`, `docs/screener-roadmap.md` |
| TWS recovery supervisor | Recover IB Gateway/sidecar without stuck UI; quote SSE + warmup fail fast when sidecar stale/unhealthy; watchlist REST fallback; stale sidecar/version + port guidance | **Passing** | **Focused:** 55 tests passed; **App-level:** `docker stop edge-ib-gateway-paper` → recover `gatewayConnected:false` `recoveryPhase:sidecar_unresponsive`; gateway restart + sidecar reconnect → paper+live `gatewayConnected:true`; Reconnect TWS blocked when port 8765 owned by another dev instance; **Build:** `npm run build` passed | `src/lib/marketData/service/marketDataService.ts`, `src/lib/marketData/stream/`, `src/app/components/MarketDataProvider.tsx`, `services/tws-sidecar/main.py`, `scripts/tws-sidecar.sh`, `src/lib/marketData/providers/tws/`, `src/app/api/market-data/tws/recover/`, `src/lib/marketData/health.ts`, `src/lib/marketData/ARCHITECTURE.md` |
| TWS sidecar in-app recovery | Sidecar control plane stays non-blocking; worker/reconnect diagnostics; bounded reconnect; late-success finalization; Data Health phase progress during recovery | **Passing** | Superseded by clear manual TWS reconnect row; inline chart + header recover shipped 2026-07-15 | `services/tws-sidecar/main.py`, `src/app/components/data-health/`, `ChartOverlayDataHealthRow.tsx`, `AppTopHeader.tsx` |
| TWS extended-hours price alignment | Chart current-price marker aligns with watchlist live quote; TWS candles opt into extended hours via `sessionMode`; chart labels pre/regular/post-market state | **Pending** | **Focused:** 36 tests passed; telemetry fix: 9 tests passed (`collector`, `MarketDataTelemetryPanel`); **Build:** `npm run build:packages` passed; **Fast:** `npm run check:startup` passed (26 tests); **App-level:** telemetry console warning cleared on reload; TWS quote/candle alignment check pending | `packages/chart-core/src/marketSession.ts`, `packages/chart-react/src/engine/`, `services/tws-sidecar/main.py`, `src/lib/marketData/`, `src/lib/chartDataFeed/`, `src/app/components/ChartCell.tsx`, `src/app/components/ChartSettingsModal.tsx`, `src/app/components/MarketDataProvider.tsx`, `src/app/components/dev/MarketDataTelemetryPanel.tsx`, `src/lib/marketData/telemetry/collector.ts`, `src/lib/marketData/ARCHITECTURE.md` |
| Data Health latency diagnostics | Data Health dropdown includes collapsible dev-only market-data latency diagnostics and replaces the fixed bottom-right telemetry overlay | **Pending** | **Focused:** 17 tests passed (data-health UI, telemetry panel, telemetry collector); **Startup:** `npm run check:startup` passed (26 tests); app-level Data Health expand/collapse check not yet recorded | `src/app/components/data-health/DataHealthLatencySection.tsx`, `src/app/components/data-health/MarketDataLatencyDiagnosticsView.tsx`, `src/app/components/data-health/DataHealthMenu.tsx`, `src/app/components/dev/MarketDataTelemetryPanel.tsx`, `src/app/components/StockApp.tsx`, `src/lib/marketData/telemetry/` |
| Options chain floating dialog | User opens options chain from chart header or sidebar launcher in a draggable overlay; sidebar no longer shows chain table; expiration tabs reload chain for selected date with pin and risk-ruler presets in popup | **Pending** | **Focused:** 10 tests passed (`OptionsChainDialog`, `OptionsPanel`); **Startup:** `npm run check:startup` passed (26 tests); app-level expiration switch check not yet recorded | `src/app/components/options/`, `src/app/components/sidebar/panels/OptionsPanel.tsx`, `src/app/components/StockApp.tsx`, `src/app/components/chart-chrome/ChartHeaderBar.tsx`, `docs/PROJECT-STATUS.md` |
| Market context breadcrumb inline ETF crumbs + header symbol navigation | Sector/industry labels render as clickable related-ETF crumbs with controlled, viewport-aware tooltips; industry crumbs fall back to the sector ETF when no distinct industry ETF exists; Related dropdown popover removed; breadcrumb positioned closer below OHLCV ticker without overlap; symbol back/forward buttons sit immediately after ticker search in the header | **Pending** | **Focused:** 26 tests passed (`Tooltip`, `MarketContextBreadcrumb`, `ChartHeaderBar`, `ChartCell.legendSlot`); **Build:** `npm run build:packages` passed; app-level inline-crumb walkthrough not yet recorded | `src/app/components/Tooltip.tsx`, `src/app/components/Tooltip.test.tsx`, `src/app/components/chart-chrome/MarketContextBreadcrumb.tsx`, `src/app/components/chart-chrome/MarketContextBreadcrumb.test.tsx`, `src/app/components/chart-chrome/ChartHeaderBar.tsx`, `src/app/components/chart-chrome/SymbolNavArrows.tsx`, `src/app/components/ChartCell.tsx`, `src/app/components/StockApp.tsx`, `packages/chart-react/src/components/ChartLegendBar.tsx`, `src/lib/marketData/ARCHITECTURE.md`, `docs/PROJECT-STATUS.md` |
| Screener observability + baseline | Perf phases on screener route/service/technical filter; dev Screener tab in latency panel; `screener.fetch` client telemetry; before-optimization baseline in `docs/perf/screener-baseline-latest.json` | **Pending** | **Focused:** 48 tests passed; **Build:** `npm run build` passed; **Baseline:** `npm run perf:market-data` captured cold technical presets (~29–51s, candle p50 ~930–1617ms); app-level screener latency panel check not yet recorded; **Architecture review:** self-review Passed | `src/app/api/screener/run/route.ts`, `src/lib/marketData/service/marketDataService.ts`, `src/lib/screener/technicalFilter.ts`, `src/lib/marketData/telemetry/screenerPerf.ts`, `src/lib/chartDataFeed/apiScreenerFeed.ts`, `src/app/components/data-health/MarketDataLatencyDiagnosticsView.tsx`, `scripts/run-market-data-perf.mts`, `docs/perf/screener-baseline-latest.json` |
| Screener sort by leading rule + column picker | Results auto-sort by primary leading rule field on each run; cog dropdown adds/removes columns; sort override persists per saved screen; indicator columns surface for technical screens | **Pending** | **Focused:** 96 screener-related tests passed; **Build:** `npm run build` passed; **Startup:** `npm run check:startup` passed (26 tests); app-level walkthrough not yet recorded; **Architecture review:** self-review Passed | `src/lib/screener/{types,screenStorage,deriveDefaultSort,indicatorColumns,exportResults}.ts`, `src/lib/persistence/schemas/screenerLibrary.ts`, `src/app/components/screener/{ScreenerProvider,ScreenerDialog,ResultsTable,ColumnPicker}.tsx`, `docs/screener-roadmap.md` |
| IB account tracking | Live IB account in Account sidebar panel with overhauled layout: color-coded PnL, metric help tooltips, tabbed orders/fills, icon refresh, day-trades in net-liq card, computed leverage, what-if preview removed; chart position overlays; read-only w.r.t. mutations | **Pending** | **Focused:** `Test Files 2 passed (2)`, `Tests 13 passed (13)` (`AccountPanel`, `positionOverlays`); **Startup:** `npm run check:startup` passed (26 tests); app-level Account panel walkthrough on live IB Gateway not yet recorded; paused for WIP=1 Massive options integration | `src/app/components/sidebar/panels/AccountPanel.tsx`, `src/app/components/sidebar/panels/AccountPanel.test.tsx`, `src/lib/brokerage/positionOverlays.ts`, `src/lib/brokerage/positionOverlays.test.ts`, `src/app/components/AccountProvider.tsx`, `src/app/api/brokerage/`, `src/lib/brokerage/` |
| Screener dialog layout overhaul | Superseded by **Screener layout + right-panel UX** row — prior Run/⌘↵/collapse-all work retained in QueryBuilder | **Passing** | **Focused:** `Test Files 20 passed (20)`, `Tests 105 passed (105)` (screener layout row); **Build:** `npm run build` passed | `src/app/components/screener/QueryBuilder.tsx` |
| Screener technical rule builder (v1) | User constructs/edits custom technical screener rules in QueryBuilder using any implemented `@edge/chart-core` indicator; registry-aware `validateIndicatorRule` rejects invalid rules client- and server-side; presets and saved screens round-trip `query.technical`; named kinds read-only in UI | **Pending** | **Focused:** 71 tests passed (`compileQuery`, `validateIndicatorRule`, `QueryBuilder`, `ScreenerDialog`, `api/screener/run`); **Build:** `npm run build:packages` + `npm run build` passed; **Startup:** `npm run check:startup` passed (26 tests); app-level technical rule walkthrough not yet recorded; **Architecture review:** self-review Passed | `src/lib/screener/{compileQuery.ts,validateIndicatorRule.ts}`, `src/app/components/screener/{QueryBuilder.tsx,ScreenerDialog.tsx}`, `src/app/api/screener/run/route.ts`, `src/lib/marketData/ARCHITECTURE.md`, `docs/screener-roadmap.md` |
| Stock screener Phase 3 (custom indicators + comparison + summarize_screen) | Indicator-plugin screener rules via presets (MACD hist, BOLL %B, RSI); candle-fingerprint technical cache; `meta.indicatorValues` sidecar; multi-select comparison table; read-only `summarize_screen` AI tool | **Pending** | **Focused:** 49 screener/AI tests passed; **Build:** `npm run build:packages` + `npm run build` passed; app-level indicator preset + compare walkthrough not yet recorded; **Architecture review:** self-review Passed | `packages/chart-core/src/indicatorCompute.ts`, `src/lib/screener/{technicalMath,technicalFilter,presets,summarizeScreen}.ts`, `src/lib/marketData/schemas/request.ts`, `src/app/components/screener/{ComparisonView,ComparisonDialog}.tsx`, `src/lib/ai/tools/screener.ts`, `docs/screener-roadmap.md` |
| Dual connection — Phase C data preference split | Persisted `edge:marketData:connectionId`; sidecar MD routes accept `connectionId`; header data chip; pre-trade quotes follow order env; live account panel poll hint | **Passing** | **Focused:** Sidecar `Ran 35 tests OK`; App `Test Files 4 passed (4)`, `Tests 71 passed (71)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 4.2s`); **Architecture review:** self-review Passed; app-level live-data-while-paper-order walkthrough deferred | `services/tws-sidecar/main.py`, `dataConnectionPreference.ts`, `MarketDataProvider.tsx`, `AppTopHeader.tsx`, `tradingService.ts`, `marketDataService.ts`, `ARCHITECTURE.md`, `dual-connection-roadmap.md` |
| Position 1R yard lines | Long/short position drawings show always-on left-edge 1R ticks with in-box `NR` labels in profit zone | **Passing** | **Focused:** `Test Files 2 passed (2)`, `Tests 29 passed (29)`; **Build:** `npm run build:packages` passed; **Architecture review:** self-review Passed; app-level chart walkthrough deferred | `positionGeometry.ts`, `position_tool.ts`, `positionGeometry.test.ts`, `features.md`, `ARCHITECTURE.md` |
| Dual connection — Phase B account discovery honesty | Sidecar `connectionId` on all account routes; `listAccounts` paper+live with offline live seed; no `(journal)` picker rows; journal scopes by account id | **Passing** | **Focused:** Sidecar `Ran 32 tests OK`; App `Test Files 5 passed (5)`, `Tests 29 passed (29)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.8s`); **Architecture review:** self-review Passed; app-level dual-port picker walkthrough deferred | `services/tws-sidecar/main.py`, `test_main.py`, `src/lib/trading/{types,tradingService,accountPickerOptions}.ts`, `AppTopHeader.tsx`, `TradeTicketModal.tsx`, `.env.example`, `ARCHITECTURE.md` |
| Dual connection — Phase A dual Gateway infra | Docker `TRADING_MODE=both` compose (4001/4002); `npm run ib:gateway:up|down`; sidecar honest `connectionId` routing | **Passing** | **Focused:** `Ran 26 tests OK`; **App-level (partial):** `ib-paper` → `DUP586813` HTTP 200; `ib-live` → HTTP 503; compose validates; A.5 dual-port app proof deferred on credentials | `services/ib-gateway/*`, `package.json`, `.env.example`, `docs/dual-connection-roadmap.md`, `src/lib/trading/ARCHITECTURE.md` |
| Account context wiring | Journal providers under `AccountProvider`; composite picker keys; journal-only accounts from fills; journal filter reacts to picker; trade ticket Gateway-only | **Passing** | **Focused:** `Test Files 7 passed (7)`, `Tests 23 passed (23)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.6s`); **Architecture review:** self-review Passed; app-level journal/chart walkthrough deferred | `JournalModuleShell.tsx`, `JournalTradesProvider.nesting.test.tsx`, `AppTopHeader.tsx`, `accountPickerOptions.ts`, `AccountProvider.tsx`, `TradeTicketModal.tsx`, `filterTradesByAccount.ts`, `src/lib/journal/ARCHITECTURE.md`, `src/lib/trading/ARCHITECTURE.md` |
| Global account header + single account context | Persistent content-column header with `edge` + app-wide account picker; selecting account sets `environment`; trade modal/AccountPanel display-only; journal filtered by active account | **Passing** | **Focused:** `Test Files 6 passed (6)`, `Tests 26 passed (26)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.9s`); **Architecture review:** self-review Passed; nesting bug fixed in account context wiring row | `AppModuleShell.tsx`, `AppTopHeader.tsx`, `AccountProvider.tsx`, `TradeTicketModal.tsx`, `AccountPanel.tsx`, `JournalTradesProvider.tsx`, `filterTradesByAccount.ts`, `src/lib/trading/ARCHITECTURE.md`, `src/lib/design-system/ARCHITECTURE.md` |
| Trading execution — Phase 5 connection registry + paper/live | Connection registry (`ib-paper`/`ib-live`); dual sidecar Gateway sockets; global header account picker (replaces in-modal/panel Paper/Live toggle); `liveConfirmation: LIVE` on live mutations; stub second adapter | **Passing** | **Focused:** `Test Files 15 passed (15)`, `Tests 76 passed (76)`; **Sidecar:** `Ran 26 tests OK`; **Build:** `npm run build` passed; **Architecture review:** self-review Passed; app-level paper/live walkthrough deferred | `src/lib/trading/connectionRegistry.ts`, `src/lib/trading/adapters/{ibTws,stub}.ts`, `src/lib/trading/tradingEnvironment.ts`, `services/tws-sidecar/main.py`, `TradeTicketModal.tsx`, `AccountPanel.tsx`, `AccountProvider.tsx`, `docs/trading-execution-roadmap.md`, `src/lib/trading/ARCHITECTURE.md` |
| Trading execution — Phase 4 UI + journal | Chart trade ticket + what-if confirm; AccountPanel cancel on `ordersForActiveAccount`; journal `orderRef` correlation; AI `preview_order`/`place_order` with mandatory confirmation | **Passing** | **Focused:** `Test Files 7 passed (7)`, `Tests 36 passed (36)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.6s`); **Architecture review:** self-review Passed; app-level paper walkthrough deferred | `src/lib/trading/tradingClient.ts`, `src/app/components/trading/TradeTicketModal.tsx`, `src/app/components/chart-chrome/ChartHeaderBar.tsx`, `src/app/components/sidebar/panels/AccountPanel.tsx`, `src/lib/journal/correlateOrderRef.ts`, `src/lib/ai/tools/trading.ts`, `src/lib/ai/tradingPort.ts`, `docs/trading-execution-roadmap.md` |
| Trading execution — Phase 3 stops + safety | STP/STP LMT preview+submit; previewIntentId 30s expiry; short-sale hard block; PDT soft warning; `EDGE_TRADING_KILL_SWITCH`; audit log | **Passing** | **Focused:** `Test Files 10 passed (10)`, `Tests 52 passed (52)`; **Sidecar:** `Ran 25 tests OK`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.6s`); **Architecture review:** self-review Passed | `src/lib/trading/{types,validateOrder,safetyGuards,auditLog,tradingService}.ts`, `src/lib/trading/adapters/ibTws.ts`, `services/tws-sidecar/main.py`, `services/tws-sidecar/test_main.py`, `src/app/api/trading/**`, `.env.example`, `src/lib/trading/ARCHITECTURE.md`, `docs/trading-execution-roadmap.md` |
| Trading execution — Phase 2 manage + account | Modify MKT/LMT; active account persistence; account-scoped orders; lost-response reconciler | **Passing** | **Focused:** `Test Files 8 passed (8)`, `Tests 32 passed (32)`; **Sidecar:** `Ran 19 tests OK`; **Build:** `npm run build` passed; **App-level:** `defaultAccountId: DUP586813`; LMT `orderId: 38` `permId: 1306430116`; PATCH `lmtPrice: 8.95`; scoped orders include `orderRef`; cancel `status: "Cancelled"`; **Architecture review:** self-review Passed | `services/tws-sidecar/main.py`, `services/tws-sidecar/test_main.py`, `src/lib/trading/**`, `src/lib/brokerage/filterOrders.ts`, `src/app/api/trading/**`, `src/app/components/AccountProvider.tsx`, `docs/trading-execution-roadmap.md` |
| Trading execution — Phase 1 domain + adapter | Broker-neutral `TradingService`, `IbTwsTradingAdapter`, intent store, `/api/trading/*` on paper only (MKT/LMT); no UI | **Passing** | **Focused:** `Test Files 5 passed (5)`, `Tests 14 passed (14)`; **Build:** `npm run build` passed; **App-level:** preview MKT HTTP 200; MKT `orderId: 17` `permId: 1306430090`; LMT `orderId: 19` `permId: 1306430091`; cancel `status: "Cancelled"`; idempotent retry same intent; **Architecture review:** self-review Passed | `src/lib/trading/**`, `src/app/api/trading/**`, `src/lib/api/apiAuth.ts`, `src/lib/trading/ARCHITECTURE.md` |

Older Passing rows: [status-archive/](./status-archive/).

## Task Contract — Structural refactor Tier E

- **Status:** Complete — **Passing** 2026-07-17.
- **Goal:** E1 shared revisioned library repo/client helpers; E2 document portable vs app AI chart tools and share matching enums only.
- **Delivered:** `revisionedLibraryRepository.ts` + `revisionedLibraryClient.ts` + thin watchlist/screener/chart-template adapters; `packages/chart-core/src/toolConstants.ts`; `packages/ai-tools-chart/ARCHITECTURE.md`; Two products sections in AI docs; `src/lib/ai/tools/chart.test.ts`.
- **Verification:** **E1 Focused:** `Test Files 15 passed (15)`, `Tests 52 passed (52)`; **E2 Focused:** `Test Files 3 passed (3)`, `Tests 15 passed (15)`; **Build:** `npm run build:packages` passed; **Build:** `npm run build` passed; **Architecture review:** self-review Passed.
- **Blockers:** none.

## Task Contract — Structural refactor Tier D

- **Status:** Complete — **Passing** 2026-07-17.
- **Goal:** Decompose chart runtime god-files (ChartCell, canvas, EdgeChart, drawing controller) into responsibility-focused hooks/modules without user-visible behavior change.
- **Delivered:** D1 `chart-cell/*` hooks + `ChartSyncBridge` + pattern-capture characterization tests; D2 `useViewportLifecycle`/`useCanvasRenderer`/`useCanvasGestures`/`useCanvasCursor`; D3 `useCandleSession`/`useCrosshairCoordinator`/`useChartWheelPinch`/`usePaneLayoutController`/`useEventDetailController`; D4 `createDrawingHandleSlice`/`applyDrawingPointerTransition`/`useDrawingStoreSync`/`useLivePriceStickEntry`.
- **Verification:** **Focused:** `Test Files 11 passed (11)`, `Tests 76 passed (76)`; **Build:** `npm run build:packages` passed; **Boundaries:** `npm run lint:package-boundaries` passed; **Build:** `npm run build` passed; **Architecture review:** self-review Passed.
- **Blockers:** none.

## Task Contract — Workspace pill header UX

- **Status:** **Passing** 2026-07-16 — UI + domain + tests complete.
- **Goal:** Concept A header — Use mode workspace pill (switch/rename/new/duplicate); Edit mode focused chrome (Editing label + Layout + Done); remove always-on rename input, native select, Save copy.
- **Delivered:** `createWorkspaceDocument` in `commands.ts`; `WorkspacePill.tsx` popover menu; `WorkspaceHeaderControls.tsx` Use/Edit mode branches; context wiring; architecture docs updated.
- **Verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 30 passed (30)`; **Architecture review:** self-review Passed. **Deferred:** app-level pill→edit→Done walkthrough.
- **Blockers:** none.

## Task Contract — Workspace layout presets + empty-pane assign

- **Status:** **Passing** 2026-07-16 — domain + UI + tests complete.
- **Goal:** Template-first edit flow — pick structured layout preset → empty placeholder panes → assign Chart/Screener/Journal per pane; retain freeform drag-dock as secondary.
- **Delivered:** `layoutPresets.ts` (8 presets); `applyLayoutPreset` + `assignTileSurface` in `commands.ts`; `WorkspaceLayoutPresetPicker` + icon; `PlaceholderTile` chooser; `TileFrame` reassign select; context wiring; architecture docs updated.
- **Verification:** **Focused:** `Test Files 7 passed (7)`, `Tests 52 passed (52)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.1s`); **Architecture review:** self-review Passed. **Deferred:** app-level edit→preset→assign→Done walkthrough.
- **Blockers:** none.

## Task Contract — Pattern Capture start/end + numbered presets

- **Status:** **Passing** 2026-07-16 — independent section pairs + keyboard preset labels shipped.
- **Goal:** Each section defined by explicit start/end clicks (1-bar allowed); label via 1–N preset keys or custom text; pattern OHLCV span from section min/max.
- **Delivered:** Reworked `fsm.ts` (`pendingStart`/`pendingEnd`, `PICK_PRESET`); `presets.ts`; section-bounds `buildRecord.ts`; numbered preset UI in `PatternCapturePanel`; overlay + ChartCell wiring.
- **Verification:** **Focused:** `Test Files 1 passed (1)`, `Tests 13 passed (13)`; **Architecture review:** self-review Passed. **Deferred:** app-level 1-bar + multi-section walkthrough.
- **Blockers:** none.

## Task Contract — Pattern Capture Mode

- **Status:** **Passing** 2026-07-16 — full interactive multi-section capture shipped.
- **Goal:** Bar-snapped historical pattern path with section labels → OHLCV slice (no look-ahead) + frozen SVG with section bands → persist to `data/pattern-library/records/`; AI tools for save/get/similarity.
- **Delivered:** `src/lib/patternCapture/*` FSM + slice + buildRecord; extended `PatternRecord.capture`; section-aware `renderChart.ts`; `POST/GET /api/pattern-library/captures`; ChartCell overlay + panel + shortcuts; `save_pattern_capture` / `get_pattern_capture` AI tools; enriched `find_similar_setups` neighbor sections.
- **Verification:** **Focused:** `Test Files 12 passed (12)`, `Tests 33 passed (33)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.0s`); app-level walkthrough deferred.
- **Blockers:** none.

## Task Contract — Broker ledger track

- **Status:** **Passing** 2026-07-17 — Phases 0–4 + app-level functional proof (incl. B2 RTH fill).
- **Goal:** Durable broker ledger in Postgres — server fill ingest (portal + Edge), gap Flex backfill, account/position snapshots, client demoted to refresh-only; app-level proof per functional test plan.
- **Delivered:** `docs/roadmaps/broker-ledger-roadmap.md` + `broker-ledger-functional-test-plan.md`; migrations `0006`–`0008`; `runBrokerageIngest` + `scheduleBrokerageIngest`; `/api/cron/brokerage-ingest`; snapshot-route trigger; `/api/me/brokerage-ingest/status` + `/api/me/account-snapshots`; `JournalSyncProvider` server trigger; Data Health ledger sync age; A4 unit for `database_unavailable`.
- **Verification:** A1–A3, B1–B5 app-level pass (B2: F MKT `10190` Filled → new `execId=00025b44.6a5abe6c.01.01`); **Focused:** `Tests 13 passed (13)`; A4 unit for 503; C1 skipped (no Flex env).
- **Blockers:** none.

## Task Contract — App Workspace Use/Edit + shell-as-app

- **Status:** **Passing** 2026-07-16 — Waves A–E complete via orchestrated implementation.
- **Goal:** App shell = active workspace; session-scoped Use vs Edit layout modes; module deep links into one workspace; no Workspace peer nav destination.
- **Delivered:** `layoutEditMode` in `AppWorkspaceContext`; gated `TileFrame`/`LayoutTreeInner`; `WorkspaceHeaderControls` Edit/Done + Esc; mode-aware `AppWorkspaceNav`/`HomeAppNav`; `deepLinks.ts` + `ModuleToWorkspaceRedirect`; `lastModule` root → `/workspace`; `handleSurfaceIngress` for deep links; architecture docs updated.
- **Verification:** **Focused:** `Test Files 11 passed (11)`, `Tests 48 passed (48)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.0s`); **Architecture review:** self-review Passed. **Deferred:** app-level Use/Edit + redirect walkthrough.
- **Blockers:** none.
- **Next:** App-level — Use mode trading; Edit layout rearrange; `/chart` redirect; Review→Chart in-process.

## Task Contract — App Workspace Shell (Tiling Dock)

- **Status:** **Passing** 2026-07-16 — Phases 0–3 complete.
- **Goal:** Single-window ultrawide workspace with binary split-tree tiles (Chart, Screener, Journal); local persistence; in-process Review→Chart drive; drag/save.
- **Delivered:** `src/lib/appWorkspace/` domain; `/workspace` shell + surfaces; `WorkspaceDriveContext`; nav + deep links; drag-to-dock; named workspaces.
- **Verification:** **Focused:** `Test Files 5 passed (5)`, `Tests 29 passed (29)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.0s`); **Packages:** `check:packages` passed; **Architecture review:** self-review Passed. **Deferred:** app-level ultrawide walkthrough; `npm run check` blocked by pre-existing harness lint:instructions rows.
- **Blockers:** none.
- **Next:** App-level — `/workspace` with Chart + Review + Journal; confirm in-process symbol drive.

## Task Contract — Screener Review app (dual-window controller)

- **Status:** **Passing** 2026-07-16 — implemented via sub-agents (scaffold, review-core, bridge, review-ui, screens-results, verify).
- **Goal:** Dedicated `/screener` app with serial Review as home; keyboard flip/keep/skip; BroadcastChannel sync so Screener window drives Chart window; chart sidebar screener unchanged.
- **Delivered:** `/screener` routes + `ScreenerModuleShell`; `reviewSession`/`reviewChannel`/`reviewKeepers`; `ScreenerDriveListener` in StockApp; `ScreenerReviewView` + keyboard; Screens/Results/Keepers pages; roadmap Phase 5.
- **Verification:** **Focused:** `Test Files 14 passed (14)`, `Tests 95 passed (95)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.6s`); **Architecture review:** self-review Passed. **Deferred:** app-level dual-window walkthrough.
- **Blockers:** none.
- **Next:** App-level — `/chart` + `/screener` side by side; run screen → Review; confirm Chart tracks symbol on keyboard flip.

## Task Contract — Trade execution reliability track

- **Status:** **Passing** 2026-07-13 — engineering + API bake complete; operational items open (resting GTC, RTH fill, UI walkthrough).
- **Goal:** Make stock trade execution trustworthy: ops dual-Gateway readiness, paper E2E bake, TWS recovery proof, Postgres-backed intents, live 1-share order (GTC if RTH closed).
- **Delivered:** After-hours pre-trade readiness (`dataTrust.ts`, `tradingService.ts`); Postgres `order_intents` + `resolveServerIntentStore()`; paper LMT/STP/idempotency/kill-switch bake; restart idempotency `orderId=31`; live preview+LMT `orderId=9` + GTC SPY `orderId=15`; `TWS_MANAGED=external` dev pattern.
- **Verification:** **App-level:** paper `orderId=24` cancel `Cancelled`; idempotency `24==24`; Postgres restart `orderId=31`; live `orderId=9`/`15` with `orderRef`; **Focused:** `Test Files 14 passed (14)`, `Tests 81 passed (81)`; **Build:** `npm run build` passed; **Architecture review:** self-review Passed.
- **Blockers:** Live GTC `orderId=15` resting @ 650 (fill deferred); Reconnect TWS UI blocked in dev port-ownership scenario.
- **Handoff doc:** [docs/trading-execution-roadmap.md — LLM handoff](./trading-execution-roadmap.md#trade-execution-reliability-track--llm-handoff)
- **Next:** (1) cancel or monitor `orderId=15`; (2) RTH live MKT 1-share + journal `orderRef`; (3) UI walkthrough; then brackets/options backlog.

## Task Contract — Heat map data hardening

- **Status:** Complete (Passing) 2026-07-12.
- **Goal:** Heat-map Size/Color/Group defaults work on mover presets and FMP company-screener rows.
- **Delivered:** `enrichMoversWithDescriptors` + `getFmpMarketMovers` descriptor join; `moverToScreenerRow` pass-through; `mapFmpScreenerRow` `changePercentage` alias + derive; `HEAT_MAP_QUOTE_STREAM_CAP` 200; `heatMapSizeMetricCoverageWarning` banner.
- **Verification:** `Test Files 6 passed (6)`, `Tests 31 passed (31)`; `npm run build` `✓ Compiled successfully in 3.0s`; **Architecture review:** self-review Passed. **Deferred:** app-level Gainers/Large-cap walkthrough.
- **Blockers:** none.

## Task Contract — Screener heat map

- **Status:** Complete (Passing)
- **Goal:** Reusable treemap heat-map foundation + screener List / Heat map toggle with size, color, and group controls.
- **Delivered:** `src/lib/heatmap/` (types, colorScale, squarify, defaults, tests); `HeatMapView` + `HeatMapToolbar`; `screenerHeatMapAdapter`; session `resultsViewMode` + `heatMapConfig`; `ResultsTable` toggle + heat map pane; `ARCHITECTURE.md` + roadmap update.
- **Verification:** `Test Files 5 passed (5)`, `Tests 27 passed (27)`; `ScreenerDialog` `Tests 14 passed (14)`; `npm run build` `✓ Compiled successfully in 2.9s`.
- **Blockers:** none.

## Task Contract — Right panel overlay layout

- **Status:** **Passing** 2026-07-12.
- **Goal:** Docked right panel overlays chart without reflowing chart width; resize drags panel over chart; chart stays interactive under uncovered area.
- **Delivered:** `resolveSidebarMode` always `overlay`; `StockApp` overlay mount inside chart row; `absolute right-0` positioning (fixes `relative`+`fixed` conflict); auto-dock floating panels only below tablet breakpoint; screener Expand + Pop out enabled on overlay; backdrop removed; design-system doc updated.
- **Verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 15 passed (15)`; **Architecture review:** self-review Passed. **Deferred:** app-level overlay resize walkthrough.
- **Next:** App-level confirmation on `/chart`; then resume Dual connection Phase D.

## Task Contract — Screener layout + right-panel UX

- **Status:** **Passing** 2026-07-12.
- **Goal:** Widen docked screener horizontally; fix never-run empty state; add edit/scan filter modes; responsive preset chips.
- **Delivered:** Panel-aware sidebar max + Expand/Collapse; `filterViewMode` session field; `FilterChipSummary`; never-run starters; narrow chip scroller; modal `full` ≈ `min(96vw,1400px)`.
- **Verification:** **Focused:** `Test Files 20 passed (20)`, `Tests 105 passed (105)`; **Build:** `npm run build` passed; **Architecture review:** self-review Passed. **Deferred:** app-level docked expand/scan walkthrough.
- **Next:** App-level confirmation on `/chart`; then resume Dual connection Phase D.

## Task Contract — Dual connection (live data + paper/live orders)

- **Status:** Phase D **Passing** 2026-07-12; dual-connection track complete (app-level verified).
- **Goal:** Run paper+live IB Gateways simultaneously (Docker preferred); keep live market data stable while switching order account paper↔live; fold journal fills into real Gateway accounts (no `(journal)` picker rows); preserve pluggable market-data providers; harden TWS-only preference boundaries; split Data Health connection diagnostics.
- **Delivered:** Phases A–D — dual Gateway infra; honest account discovery; `edge:marketData:connectionId` decoupled from order account; sidecar MD `connectionId`; header data chip; order-scoped pre-trade quotes; live account poll hint; TWS-only preference docs/tests; chart `loadQuotes` preference parity; sidecar `/status` `connections` map; Data Health Connections section.
- **Verification:** **Focused:** Sidecar `Ran 36 tests OK`; App `Test Files 12 passed (12)`, `Tests 141 passed (141)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.7s`); **App-level:** `localhost:3003/chart` — Connections panel paper+live connected; data chip toggled to Live data while account remained `DUP586813 (paper)`; `/api/quotes` `connectionId=ib-live` → `meta.source: tws`; **Architecture review:** self-review Passed.
- **Out of scope:** Postgres intents, options/brackets, Client Portal dual-session substitute, fill account remapping, new market-data plugin framework, dual-socket TWS recovery.
- **Blockers:** none.
- **Next:** Pick next backlog item (WIP=1).

## Task Contract — TWS recovery supervisor

- **Status:** **Passing** 2026-07-13 — fallback hardening + partial recovery walkthrough; full Reconnect TWS UI deferred in dev (port `8765` ownership).
- **Goal:** Harden IB Gateway/TWS sidecar recovery and data-foundation routing so stale/unhealthy sidecar cannot hang quote SSE, warmup, or recovery finalization; auto-recover or surface precise manual action.
- **Delivered (prior):** Sidecar connection supervisor; extended `/status` fields; async reconnect bypass when worker wedged; managed sidecar restart escalation; recovery session context; Data Health phase messages.
- **Delivered (2026-07-02):** Quote SSE uses same TWS health gate as REST with poll fallback; TWS stream connect/first-frame timeouts; watchlist SSE → REST fallback on stall/error; bounded `primeMarketData` + warmup route budget; sidecar `/health` freshness/capabilities; `scripts/tws-sidecar.sh` logs effective `TWS_PORT`; recovery finalization warmup budget.
- **Verification:** **Focused:** 55 tests passed; **Startup:** `npm run check:startup` passed (26 tests); **Build:** `npm run build` passed; **App-level:** candles/quotes/warmup/stream fallback probes passed on stale sidecar; **Architecture review:** self-review Passed; **Recovery walkthrough:** pending.
- **Blockers:** Restart sidecar from current source before live recovery evidence; IB Gateway paper login on port `4002`.

## Task Contract — IB account tracking

- **Status:** Pending — panel UI overhaul shipped; app-level walkthrough on live IB Gateway pending.
- **Goal:** Live IB account data (positions, PnL, summary, orders, executions) in Account sidebar panel + chart position overlays; read-only w.r.t. brokerage mutations; TWS sidecar via reqAccountUpdates/reqPnL/openOrder events.
- **Delivered:** Sidecar `/account/*` + `/stream/account`; account tracking always attempted through the local sidecar with no `TWS_BROKERAGE_ENABLED` gate; non-blocking account update subscription for live/read-only Gateway; read-only-safe order snapshot handling; `src/lib/brokerage/` service + contracts; `/api/brokerage/*` routes; `AccountProvider` + Account panel; chart avg-cost reference line when showPositions enabled; Data Health account feed row; architecture + env docs.
- **Delivered (2026-07-01):** Account panel UI overhaul — removed what-if preview UI; color-coded PnL (`--edge-positive`/`--edge-negative`); metric help tooltips; tabbed orders/fills; icon refresh button; day-trades folded into net-liq card; leverage computed as InitMargin/NetLiq; position sort dropdown removed.
- **Verification:** **Focused:** `Test Files 2 passed (2)`, `Tests 13 passed (13)` (`AccountPanel`, `positionOverlays`); **Startup:** `npm run check:startup` passed (26 tests); Architecture review self-review Passed.
- **Blockers:** App-level Account panel walkthrough not recorded on live IB Gateway; open-order snapshot live verification requires `TWS_READONLY=false`.

## Task Contract — TWS extended-hours price alignment

- **Status:** Pending — paused for sidebar resize fix; app-level verification not yet recorded.
- **Goal:** Align watchlist `LAST` with chart current-price marker using the same live quote; support TWS extended-hours intraday candles; make pre/regular/post-market state explicit in chart UI.
- **Delivered:** `marketSession` helpers; `livePrice`/`liveMarketSession` chart props; `sessionMode` on candle requests + TWS sidecar `useRTH`; Settings → Extended hours toggle; session status badge on legend; pre/post background bands when extended mode enabled; telemetry panel uses external-store subscription with cached snapshot; SSE quote first-paint telemetry moved out of React state updater.
- **Verification:** focused marketSession/renderer/chart-feed/market-data tests + telemetry tests + `npm run build:packages` + app-level TWS alignment check + app-level console clean on reload.

## Session Log

Append one entry before handing off long-running or interrupted work. Older entries: [status-archive/](./status-archive/).

### 2026-07-17 — Structural refactor Tier E

- **Goal:** E1 revisioned repository/client helpers; E2 clarify app vs `@edge/ai-tools-chart` products.
- **Completed:** Shared persistence save/fetch cores; thin library adapters; `toolConstants.ts`; package + app AI architecture docs; app chart-tool characterization tests; package-api-snapshot updated for new chart-core exports.
- **Verification run:** **E1 Focused:** `Test Files 15 passed (15)`, `Tests 52 passed (52)`; **E2 Focused:** `Test Files 3 passed (3)`, `Tests 15 passed (15)`; **Build:** `npm run build:packages` passed; **Build:** `npm run build` passed; **Architecture review:** self-review Passed.
- **Next best step:** Resume product work from ROADMAP.md — structural refactor Tier E complete.

### 2026-07-17 — Structural refactor Tier D

- **Goal:** D1 ChartCell decompose; D2 canvas render vs gestures; D3 EdgeChart coordinators; D4 drawing controller FSM/facade split.
- **Completed:** `chart-cell/*` hooks (pattern capture, pane actions, crosshair, menus, drawing toolbar, templates, trade bind); canvas/EdgeChart/drawing internal hooks; characterization tests for capture click/save, canvas cursor/badge/gesture, EdgeChart crosshair/prepend/wheel, drawing pointer/facade.
- **Verification run:** **Focused:** `Test Files 11 passed (11)`, `Tests 76 passed (76)`; **Build:** `npm run build:packages` passed; **Boundaries:** `npm run lint:package-boundaries` passed; **Build:** `npm run build` passed; **Architecture review:** self-review Passed.
- **Next best step:** Tier E1 — revisioned repository/client helpers.

### 2026-07-17 — Structural refactor Tier C

- **Goal:** C1 StockApp provider/controller extract; C2 Object Tree vs Data Window split; C3 design-system leftover migration for seven chart chrome files.
- **Completed:** `useStockAppBootstrap`, `useStockAppLayoutController`, `useStockAppSidebarController`, `AppProviders`; `object-tree/*` modules + thin `ObjectTree.tsx`; Edge shells/tokens on `BarReplay`, `ChartTimeZoneMenu`, `TemplatePickerModal`, `ChartGoToModal`, `DrawingSettingsModal`, `IndicatorSettingsModal`, `DrawingSelectionToolbar`.
- **Verification run:** **Focused:** `Test Files 10 passed (10)`, `Tests 53 passed (53)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.1s`); **Architecture review:** self-review Passed.
- **Next best step:** Tier E1 — revisioned repository/client helpers.

### 2026-07-17 — Screener keyboard chart viewport drift

- **Goal:** Fix sporadic wrong chart position after ↑/↓ through screener results (brief correct view, then jump with empty lower scale).
- **Completed:** Canvas treats unshifted cache→fresh length growth as session rebuild (not history prepend); workspace screener drive no longer also publishes BroadcastChannel `setSymbol`.
- **Verification run:** **Focused:** `Test Files 5 passed (5)`, `Tests 27 passed (27)`.
- **Next best step:** App-level ↑/↓ through screener beside chart; confirm no post-load viewport jump.

### 2026-07-17 — Structural refactor Tier B

- **Goal:** B1 generic revision-sync hook; B2 series/interval consolidation into `@edge/chart-core`.
- **Completed:** `useRevisionedRemoteSync` + contract tests; thin watchlist/screener/template wrappers; `packages/chart-core/src/interval.ts`; app series/interval re-exports; chart-react duplicate adapter removed; orphan `heikinAshi.ts` deleted.
- **Verification run:** **Focused:** `Test Files 13 passed (13)`, `Tests 99 passed (99)`; **Build:** `npm run build:packages` passed; **Boundaries:** `npm run lint:package-boundaries` passed; **Architecture review:** self-review Passed.
- **Next best step:** Tier C1 — StockApp providers + controllers.

### 2026-07-17 — Screener header Option B

- **Goal:** Stock Screener title; show active screen; move save into Screens rail.
- **Completed:** Title + Run chrome; active name subtitle; accent rail selection; expand-in-place “+ Save current”; modal headerActions = Run (not Save); Untitled screen fallback.
- **Verification run:** **Focused:** `Test Files 3 passed (3)`, `Tests 19 passed (19)`.
- **Next best step:** App-level select + save walkthrough.

### 2026-07-17 — Screener results scroll + compact view

- **Goal:** Scroll only results in the right pane; shrink ugly List/Heat map toggle.
- **Completed:** `h-full`/`min-h-0` chain on tile + results; compact view `<select>`; denser toolbar.
- **Verification run:** **Focused:** `Test Files 4 passed (4)`, `Tests 29 passed (29)`.
- **Next best step:** App-level scroll Top 200 in a small tile.

### 2026-07-17 — Screener results toolbar UX

- **Goal:** Collapse janky post-run status lines + text actions into one bordered-button toolbar.
- **Completed:** Removed phase/live paragraphs; result count + Live badge; Watchlist/Export menus; `EdgeButton` `secondary` + forwardRef; empty runs keep toolbar without bulk menus.
- **Verification run:** **Focused:** `Test Files 3 passed (3)`, `Tests 27 passed (27)`.
- **Next best step:** App-level confirm toolbar after run / empty run.

### 2026-07-17 — Screener result-limit compact select

- **Goal:** Replace out-of-place freeform LIMIT input with compact dropdown before Run.
- **Completed:** `Top 50/100/200/500` select left of Run; legacy non-preset values kept visible until changed; dialog test updated.
- **Verification run:** **Focused:** `Test Files 2 passed (2)`, `Tests 16 passed (16)`.
- **Next best step:** App-level confirm select placement and run with Top 50.

### 2026-07-17 — Screener Option A split-pane UX

- **Goal:** Collapse Review/Screens/Results/Keepers into one split-pane screener; starters as saved screens; row click / ↑↓ drives sibling chart.
- **Completed:** `SavedScreen` movers kind + `ensureStarterScreens`; unified `ScreenerScreensBody` + `ScreenerTileSurface`; `useScreenerResultSelection` + `useScreenerReviewDrive`; removed primary Load/Open in Review; `/screener/*` → unified workspace surface; roadmap + harness updates.
- **Verification run:** **Focused:** `Test Files 15 passed (15)`, `Tests 69 passed (69)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.1s`). **Architecture review:** self-review Passed.
- **Next best step:** App-level — workspace Chart + Screener tiles: run screen → click row → ↑/↓ → confirm chart symbol follows.

### 2026-07-16 — Pattern Capture start/end + numbered presets

- **Goal:** Rework capture UX — independent start/end section pairs (1-bar allowed); numbered preset labels via keyboard 1–N.
- **Completed:** Reworked `fsm.ts`; added `presets.ts`; section-bounds `buildRecord.ts`; `PatternCapturePanel` numbered chips; overlay + ChartCell digit shortcuts.
- **Verification run:** **Focused:** `Test Files 1 passed (1)`, `Tests 13 passed (13)`; API route `Tests 1 passed (1)`. **Architecture review:** self-review Passed.
- **Next best step:** App-level — Shift+P → 1-bar section → key `2` → second section → Save; confirm JSON + SVG.

### 2026-07-16 — Workspace pill header UX

- **Goal:** Concept A — streamline workspace header: pill menu in Use mode; focused Edit chrome.
- **Completed:** `createWorkspaceDocument` command; `WorkspacePill.tsx` (switch/rename/new/duplicate); `WorkspaceHeaderControls.tsx` Use/Edit branches; context wiring; architecture docs.
- **Verification run:** **Focused:** `Test Files 3 passed (3)`, `Tests 30 passed (30)`. **Architecture review:** self-review Passed.
- **Next best step:** App-level — open pill → switch/rename/new/duplicate → Edit layout → Layout preset → Done.

### 2026-07-16 — Workspace layout presets + empty-pane assign

- **Goal:** Template-first App Workspace edit flow — layout picker → placeholder panes → per-pane app assign.
- **Completed:** `layoutPresets.ts` catalog; `applyLayoutPreset` / `assignTileSurface`; `WorkspaceLayoutPresetPicker`, `PlaceholderTile` chooser, `TileFrame` reassign; context + header wiring; architecture docs.
- **Verification run:** **Focused:** `Test Files 7 passed (7)`, `Tests 52 passed (52)`. **Build:** `npm run build` passed (`✓ Compiled successfully in 3.1s`). **Architecture review:** self-review Passed.
- **Next best step:** App-level — Edit layout → 2-col preset → assign Chart + Screener → Done; confirm Use mode and splitters.

### 2026-07-17 — Broker ledger B2 RTH fill proof

- **Goal:** Complete B2 — fill lands in ledger without Journal UI mounted.
- **Completed:** Paper F MKT `orderId=10190` `status:Filled` `permId=1041862008`; snapshot showed exec `00025b44.6a5abe6c.01.01`; GET `/api/me/journal/fills` `before 46 after 47 new 1` (symbol F BOT qty1 @14.32); cron re-run `duplicates:2`; cursor `lastSeenExecIds` includes both session execs; status age `ledger sync 0m ago`.
- **Verification run:** **Focused:** `Test Files 4 passed (4)`, `Tests 13 passed (13)`. Track → **Passing**.
- **Next best step:** None for ledger track; optional C1 Flex when env configured.

### 2026-07-16 — Broker ledger B2 retry (post-2FA)

- **Goal:** Complete B2 fill→ingest proof after Gateway 2FA.
- **Completed:** Sidecar restarted; `gatewayConnected:true`; paper F MKT `orderId=78` `PreSubmitted`→Cancelled; LMT@$25 outsideRth `orderId=184` `Submitted`→Cancelled; cron ingest `added:0`; fills still 45; sidecar executions 0.
- **Blocker:** ~22:00 ET — US equity extended hours closed; no fill available tonight.
- **Next best step:** Superseded by RTH B2 proof 2026-07-17.

### 2026-07-16 — Broker ledger functional test plan + app-level run

- **Goal:** Write LLM-runnable functional plan; execute Tier A + Tier B against live Next+Postgres+sidecar; record harness evidence.
- **Completed:** `docs/roadmaps/broker-ledger-functional-test-plan.md`; linked from roadmap README; A4 unit test on cron route; executed scenarios with quoted output in Active Work row.
- **Verification run:** **Focused:** `Test Files 4 passed (4)`, `Tests 13 passed (13)`. **App-level PASS:** A1–A3, B1, B3–B5 (quoted in Active Work). **Blocked:** B2 no fill. **Skipped:** A4 isolated next; C1 no Flex.
- **Next best step:** Superseded by B2 retry session above.

### 2026-07-16 — Broker ledger + sync (Phases 0–4)

- **Goal:** Server-side IB execution ingest into journal; cursor + Flex gap backfill; account/position snapshots; demote client fill upsert.
- **Completed:** Roadmap + architecture docs; `broker_ingest_cursors`, `account_snapshots`, `position_snapshots`; ingest modules + cron route; snapshot-path scheduler; journal sync triggers server ingest; Data Health ledger age.
- **Verification run:** `npm test -- --run src/lib/brokerage/ingest src/app/api/cron/brokerage-ingest src/app/components/journal/JournalSyncProvider.test.tsx` → `Test Files 4 passed (4)`, `Tests 12 passed (12)`.
- **Next best step:** Superseded by functional test plan session above.

### 2026-07-16 — Browser tab live quote loop fix

- **Fixed:** `Maximum update depth` on `/workspace?surface=…` — deep-link handler now keys off `searchParams.toString()` only; empty `{}` surface state no longer treated as a mutation; `applySurfaceFocusOrOpen` / `setActiveTile` idempotent when already focused.
- **Verification run:** `npm test -- --run src/lib/appWorkspace/commands.test.ts src/app/workspace/page.test.ts src/app/components/StockApp.test.tsx src/app/components/app-workspace/` → `Test Files 8 passed (8)`, `Tests 44 passed (44)`.

### 2026-07-16 — Browser tab live quote (remove chart tabs)

- **Completed:** Removed `WorkspaceTabBar`; `pruneToSingleActiveTab` on hydrate; `primaryChartTileId` DFS helper; `browserTabQuote` sets `document.title` + direction favicon from primary chart only; layout menu drops create/copy/switch layouts.
- **Verification run:** `npm test -- --run src/lib/app/browserTabQuote.test.ts src/lib/appWorkspace/primaryChartTile.test.ts src/lib/app/workspaceTabs.test.ts src/app/components/StockApp.test.tsx src/app/components/app-workspace/` → `Test Files 9 passed (9)`, `Tests 53 passed (53)`.
- **Architecture review:** self-review — Passed.

### 2026-07-16 — App Workspace screener ingress loop fix

- **Goal:** Fix runtime `Maximum update depth exceeded` when opening screener or clicking Screens in workspace.
- **Completed:** `applySurfaceFocusOrOpen` (idempotent focus/open); `handleSurfaceIngress` / `focusOrOpenSurface` use functional `setState` without `state` deps; deep-link handler dedupes via `lastIngressRef`; screener tile wires in-tile nav (Screens/Results/Review/Keepers) without `/screener/*` route escape.
- **Verification run:** **Focused:** `Test Files 7 passed (7)`, `Tests 31 passed (31)`.
- **Next best step:** App-level — add screener tile → Screens → Results → Review; reload `/workspace?surface=screener&screenerView=screens`; confirm no error overlay.

### 2026-07-16 — App Workspace Use/Edit + shell-as-app

- **Goal:** Make `/workspace` the primary app experience with Use vs Edit layout modes; module routes redirect into one active workspace.
- **Completed:** `layoutEditMode` + chrome gating; header Edit layout/Done + Esc; rail without Workspace peer; `deepLinks.ts` + module redirects; `lastModule` root → `/workspace`; `handleSurfaceIngress`; architecture docs.
- **Verification run:** **Focused:** `Test Files 11 passed (11)`, `Tests 48 passed (48)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.0s`); **Architecture review:** self-review Passed.
- **Next best step:** App-level — Use/Edit toggle, Esc, `/chart` redirect, Review→Chart in one tab.

### 2026-07-16 — App Workspace Shell (Tiling Dock)

- **Goal:** Single-window tiling workspace — Chart, Screener, Journal as rearrangeable tiles with local persistence and in-process Review→Chart drive.
- **Completed:** `src/lib/appWorkspace/` layout engine; `/workspace` shell; ChartTileHost; surface tiles; drag-to-dock; named save/duplicate; `WorkspaceDriveContext`; nav + deep links.
- **Verification run:** **Focused:** `Test Files 5 passed (5)`, `Tests 29 passed (29)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.0s`); **Packages:** `check:packages` passed.
- **Next best step:** App-level ultrawide walkthrough on `/workspace`.

### 2026-07-16 — Screener Review app (dual-window controller)

- **Goal:** `/screener` app with serial Review home; keyboard queue; BroadcastChannel drives Chart; sidebar screener retained.
- **Completed:** Phases A–F via sub-agents — module scaffold, review session, cross-window bridge, Review UI, Screens/Results/Keepers pages, roadmap Phase 5.
- **Verification run:** `npm test -- --run` (review + screener focused) → `Test Files 14 passed (14)`, `Tests 95 passed (95)`; `npm run build` → `✓ Compiled successfully in 3.6s`.
- **Next best step:** App-level dual-window walkthrough on `localhost:3003`.

### 2026-07-15 — Account display aliases

- **Goal:** User-configurable account display names in header settings; raw IB accountId remains execution identity.
- **Completed:** `edge:trading:accountAliases.v1` localStorage; `AccountAliasesProvider`; custom `AccountPickerMenu` with in-dropdown settings rail + `AccountAliasEditor`; labels wired in picker, Account panel, Trade form, Data Health.
- **Verification run:** `npm test -- --run src/app/components/home/AccountPickerMenu.test.tsx src/app/components/home/AppTopHeader.test.tsx src/lib/trading/accountAliases.test.ts src/lib/trading/accountPickerOptions.test.ts src/app/components/sidebar/panels/AccountPanel.test.tsx` → `Test Files 5 passed (5)`, `Tests 43 passed (43)`.
- **Next best step:** App-level — open account picker → gear on right → set alias → reload.

### 2026-07-15 — Position tool instant place at last bar

- **Goal:** Selecting Long/Short Position places the setup immediately (no second chart click) at last-bar close with left edge on the last bar.
- **Completed:** `placement: 'instant'`; `defaultPositionPoints`; `startDrawing` auto-commits + selects; docs updated.
- **Verification run:** `npm test -- --run packages/chart-core/src/drawings/positionGeometry.test.ts src/lib/chart/drawings/position_tool.test.ts src/lib/chart/drawingFsm.test.ts` → `Test Files 3 passed (3)`, `Tests 40 passed (40)`; `@edge/chart-core` + `@edge/chart-react` rebuild passed.
- **Next best step:** App-level confirm on `/chart`.

### 2026-07-15 — Time axis date-label vertical margins

- **Goal:** Match TradingView bottom date-axis spacing (equal top/bottom margin around labels).
- **Completed:** `TIME_AXIS_HEIGHT` 30→24; labels drawn with `textBaseline: middle` at strip center; crosshair time badge centered in strip.
- **Verification run:** `npm test -- --run` (5 files) → `Test Files 5 passed (5)`, `Tests 56 passed (56)`; `npm run build:packages` passed.
- **Next best step:** App-level confirm on `/chart`.

### 2026-07-15 — Price axis quarter tick dashes

- **Goal:** Visual quarter markers between labeled prices on the Y-axis.
- **Completed:** `scaleAxisMinorTicks` + renderer draws three 5px dashes on the price-axis border between consecutive labels.
- **Verification run:** `npm test -- --run src/lib/chart/priceScaleTransform.test.ts packages/chart-react/src/engine/renderer.test.ts` → `Test Files 2 passed (2)`, `Tests 26 passed (26)`.
- **Next best step:** App-level confirm on `/chart`.

### 2026-07-16 — Liquid tradeable screener preset

- **Goal:** Screener for $40k market-order liquidity: price ≥ $5 and ≥ $2M average daily dollar volume.
- **Completed:** `ScreenQuery.dollarVolume` local filter (`price × volume`); FMP over-fetch then trim; preset `liquid-tradeable` in starter chips; QueryBuilder “Dollar volume” field.
- **Verification run:** `npm test -- --run` presets + compileQuery + universeDailyStore + screenerParams + deriveDefaultSort + QueryBuilder → `Test Files 6 passed (6)`, `Tests 37 passed (37)`.
- **Next best step:** App-level — run “Liquid $5+ ($2M+/day)” in the screener panel and spot-check price×volume.

### 2026-07-15 — Long position empty-margin stretch fix

- **Goal:** Stop long/short position drawings from randomly stretching to the plot right edge.
- **Completed:** Root cause was empty-right-margin `plotToPoint` writing `timestamp: 0` + virtual `dataIndex`; `pointToPlot` then mapped to plot edge. Fixed snap-near-last, timestamp extrapolation, legacy clamp, expand ignore-`t:0`.
- **Verification run:** `npm test -- --run src/lib/chart/drawingCoords.test.ts packages/chart-core/src/drawings/positionGeometry.test.ts src/lib/chart/drawings/position_tool.test.ts` → `Test Files 3 passed (3)`, `Tests 44 passed (44)`; post-fix logs width ~118→~8.8 via `zero-ts-clamped`.
- **Next best step:** Optional — delete old corrupted longs from workspace; confirm new draws near live edge stay narrow.

### 2026-07-15 — TWS external recovery spawn + auto-reconnect

- **Goal:** Make Reconnect actually start the sidecar in `TWS_MANAGED=external`; bounded sidecar auto-reconnect on Gateway disconnect.
- **Completed:** `canSpawnSidecarForUserRecovery()` + standalone spawn from recover route; port-conflict UX copy; sidecar auto-reconnect supervisor (1100/502/504/disconnect); `/status` `autoReconnectAttempt`; tests + architecture doc.
- **Verification run:** `npm test -- --run src/lib/marketData/providers/tws/recover.test.ts src/lib/marketData/providers/tws/managedMode.test.ts` → `Test Files 2 passed (2)`, `Tests 21 passed (21)`; `python -m unittest test_main.py` → `Ran 43 tests OK`.
- **Next best step:** App-level — with `TWS_MANAGED=external` and no sidecar on 8765, click Reconnect and confirm sidecar starts without manual `npm run tws:sidecar`.

### 2026-07-15 — Clear manual TWS reconnect

- **Goal:** Obvious Reconnect when TWS/Gateway is down; symmetric paper+live sidecar reconnect.
- **Completed:** Shared `TwsRecoverButton`; chart top-right inline recover (`ChartOverlayDataHealthRow`); header recover on accounts error; sidecar `_reset_extra_ib_connections` + `_reconnect_extra_connections`; docs/harness updated.
- **Verification run:** `npm test -- --run` (TwsRecoverButton, ChartOverlayStatusStack, AppTopHeader, DataHealthRecover) → `Test Files 4 passed (4)`, `Tests 19 passed (19)`; `python3 -m unittest test_main.ReconnectResetTests` → 2 OK.
- **Next best step:** App-level Gateway stop/start walkthrough; then bounded auto-reconnect WIP.

### 2026-07-15 — Workspace tab live quote strip

- **Goal:** Show last traded price + day % change on workspace tabs (color-coded).
- **Completed:** Fixed SSE→QuoteSnapshot mapping (`price`/`changePercent`); tab symbols via `extraSymbols`; flat % muted; tests.
- **Verification run:** `npm test -- --run` mappers + WorkspaceTabBar + MarketDataProvider → `Test Files 3 passed (3)`, `Tests 16 passed (16)`.
- **Next best step:** App-level confirm on `/chart` for F.

### 2026-07-15 — Workspace tabs TV-style chrome

- **Goal:** Match TradingView tab height (~75% of chart header) and content strip.
- **Completed:** `WorkspaceTabBar` resized to 27px track with full-height stretch; content is monogram + symbol + direction + price + % + `/` title; docs updated.
- **Verification run:** `npm test -- --run src/app/components/chart-chrome/WorkspaceTabBar.test.tsx` → `Test Files 1 passed (1)`, `Tests 4 passed (4)`.
- **Next best step:** App-level visual check on `/chart`.

### 2026-07-15 — Position drawing TV-style 4 handles

- **Goal:** Match TradingView long/short position control points (4 handles, not 6).
- **Completed:** `positionControlPoints` / `updatePositionFromControl` reduced to TV semantics via `POSITION_CP`; docs + tests updated.
- **Verification run:** `npm test -- --run packages/chart-core/src/drawings/positionGeometry.test.ts src/lib/chart/drawings/position_tool.test.ts` → `Test Files 2 passed (2)`, `Tests 29 passed (29)`; `@edge/chart-core` `tsc` rebuild passed.
- **Next best step:** App-level — select position drawing and verify four handles + drag roles.

### 2026-07-15 — Trade setup panel (drawing-bound)

- **Goal:** Drawing-bound Trade sidebar — context menu → live-synced entry/stop/TP plan → entry-only MKT/LMT preview/submit.
- **Completed:** `positionTradeSetup.ts` (live points); `TradeSetupBindingContext` + `ChartCell` overlay sync; `Trade setup…` context menu item; `trade` sidebar panel + shared `TradeOrderForm`; header Trade opens unbound panel (modal retired from StockApp).
- **Verification run:** `npm test -- --run src/lib/trading/positionTradeSetup.test.ts src/app/components/chart-cell/overlayContextMenu.test.ts src/app/components/sidebar/panels/TradeSidebarPanel.test.tsx src/app/components/sidebar/registry.test.ts src/app/components/trading/TradeTicketModal.test.tsx` → `Test Files 5 passed (5)`, `Tests 20 passed (20)`; `npm run build` → `✓ Compiled successfully in 2.4s`.
- **Next best step:** App-level walkthrough — drag stop updates panel; Preview paper order from bound setup.

### 2026-07-13 — Trade execution reliability track

- **Goal:** Paper/live API bake, Postgres intent durability, recovery proof, live 1-share order.
- **Completed:** After-hours pre-trade readiness (`dataTrust` stale+age, `tradingService` fresh account/quote timestamps); Postgres `order_intents` migration + async `resolveServerIntentStore()`; paper LMT/STP/STP LMT/cancel/idempotency/kill-switch bake; restart idempotency `orderId=31`; live `U25026894` preview+LMT `orderId=9` + GTC SPY qty1 `orderId=15`; `TWS_MANAGED=external` in `.env.local`.
- **Verification run:** `npm test -- --run src/lib/trading/` → `Test Files 13 passed (13)`, `Tests 61 passed (61)`; `npm run build` passed; app-level order ids quoted in Current Verified State.
- **Next best step:** Handoff → [docs/trading-execution-roadmap.md — LLM handoff](./trading-execution-roadmap.md#trade-execution-reliability-track--llm-handoff).

### 2026-07-12 — Heat map data hardening

- **Goal:** Heat-map defaults (size market cap, color change %, group sector) work on movers and company-screener results.
- **Completed:** Server-side mover enrichment via `fetchUniverseDescriptors`; `changePercent` mapper fix; quote stream cap 200; partial size-metric banner; architecture + roadmap + harness updates.
- **Verification run:** `npm test -- --run src/lib/marketData/screenerUniverse/enrichMoversWithDescriptors.test.ts src/lib/marketData/service/marketDataService.fmp.test.ts src/lib/marketData/providers/fmp/mappers.screener.test.ts src/lib/chartDataFeed/apiScreenerFeed.test.ts src/lib/screener/screenerHeatMapAdapter.test.ts src/app/components/screener/ResultsTable.test.tsx` → `Test Files 6 passed (6)`, `Tests 31 passed (31)`; `npm run build` `✓ Compiled successfully in 3.0s`.
- **Next best step:** App-level — Gainers heat map with Size=market cap and Group=sector; Large-cap with Color=change % on full set.

### 2026-07-12 — Screener heat map

- **Goal:** Reusable treemap heat-map foundation plugged into stock screener with List / Heat map toggle.
- **Completed:** `src/lib/heatmap/` pure layout + color scale; `HeatMapView`/`HeatMapToolbar`; screener adapter + session state; `ResultsTable` toggle and config controls; architecture doc + roadmap update.
- **Verification run:** `npm test -- --run src/lib/heatmap/ src/lib/screener/screenerHeatMapAdapter.test.ts src/app/components/heatmap/ src/app/components/screener/ResultsTable.test.tsx` → `Test Files 5 passed (5)`, `Tests 27 passed (27)`; `ScreenerDialog` `Tests 14 passed (14)`; `npm run build` `✓ Compiled successfully in 2.9s`.
- **Next best step:** App-level walkthrough — run preset, toggle Heat map, change Size/Color/Group, click cell loads chart.

### 2026-07-12 — Dual connection Phase D

- **Goal:** Harden TWS-only preference threading; split Data Health into paper socket, live socket, and active chart data preference.
- **Completed:** Sidecar `/status` `connections` map; health probe/merge + Connections UI section; `loadQuotes` connectionId parity; docs + trust/boundary tests; architecture + roadmap updates.
- **Verification run:** Sidecar `Ran 36 tests OK`; `npm test -- --run` (12 files) `Test Files 12 passed (12)`, `Tests 141 passed (141)`; `npm run build` `✓ Compiled successfully in 2.7s`; **App-level:** restarted sidecar; both Gateways on 4001/4002; Data Health Connections paper+live connected; data chip Live + account paper; quotes `ib-live` → `tws`.
- **Next best step:** Dual-connection track complete — pick next backlog item.

### 2026-07-12 — Right panel overlay layout

- **Goal:** Docked right panel overlays chart without changing chart width; no dimmed backdrop.
- **Completed:** `resolveSidebarMode` always overlay; `StockApp` overlay inside chart row; `absolute right-0` fix for full-cover bug; narrow-viewport auto-dock; screener Expand/Pop out gates; backdrop removed; design-system + harness updates.
- **Verification run:** `npm test -- --run src/lib/responsive/responsiveLayout.test.ts src/app/components/sidebar/SidebarPanelShell.test.tsx src/app/components/sidebar/RightSidebar.test.tsx` → `Test Files 3 passed (3)`, `Tests 15 passed (15)`.
- **Next best step:** App-level walkthrough — open watchlist at desktop width, confirm chart width unchanged; drag resize; Escape closes.

### 2026-07-12 — Screener layout + right-panel UX

- **Goal:** Widen docked screener; fix never-run empty state; edit/scan modes; responsive preset presentation.
- **Completed:** Panel-aware `sidebarWidth` + Expand/Collapse; `filterViewMode` + chip summary; never-run starters; narrow preset chips; Limit beside Run; harness + roadmap updates.
- **Verification run:** `npm test -- --run src/lib/responsive/sidebarWidth.test.ts src/app/components/sidebar/ src/app/components/screener/` → `Test Files 20 passed (20)`, `Tests 105 passed (105)`; `npm run build` passed.
- **Next best step:** App-level walkthrough — Expand docked screener, run preset, confirm scan mode + Watchlist width clamp.

### 2026-07-13 — Project status harness prune

- **Goal:** Cut `PROJECT-STATUS.md` from an unbounded ledger (~2.4k lines) to a hot operational dashboard; archive full history.
- **Completed:** Created `docs/status-archive/` (`README.md`, `2026-06.md`, `2026-07.md`); moved Previous Verified stacks, completed Task Contracts, older Session Log entries, and older Passing Active Work rows; added § Harness Retention; updated harness checklists.
- **Verification run:** `npm run lint:instructions` passed; `npm run check:startup` passed (`Test Files 3 passed (3)`, `Tests 26 passed (26)`).
- **Next best step:** Follow retention table on future session exits; optional later `npm run status:prune` automation.

### 2026-07-12 — Position 1R yard lines

- **Goal:** Add always-on left-edge 1R ticks with in-box `NR` labels in the profit zone of long/short position drawings.
- **Completed:** `profitRLevels` helper in `positionGeometry.ts`; `drawProfitRYardLines` in `position_tool.ts`; unit tests; `features.md` + `ARCHITECTURE.md` + harness update.
- **Verification run:** `npm test -- --run packages/chart-core/src/drawings/positionGeometry.test.ts src/lib/chart/drawings/position_tool.test.ts` → `Test Files 2 passed (2)`, `Tests 29 passed (29)`; `npm run build:packages` passed.
- **Next best step:** App-level walkthrough on `/chart` — draw long + short with ≥2R target; confirm ticks/labels update on resize.

### 2026-07-12 — Dual connection Phase C

- **Goal:** Decouple chart/quote IB connection from header order account (`dataConnectionPreference`).
- **Completed:** Sidecar MD routes accept `connectionId`; `edge:marketData:connectionId` + header chip; threaded through TWS client, MarketDataService, API, streams; pre-trade quotes use order env; live account poll hint + architecture docs.
- **Verification run:** Sidecar `Ran 35 tests OK`; `npm test -- --run` (4 files) `Test Files 4 passed (4)`, `Tests 71 passed (71)`; `npm run build` `✓ Compiled successfully in 4.2s`.
- **Next best step:** Phase D — or app-level: live data chip while paper order account + paper order preview.

### 2026-07-12 — Dual connection Phase B

- **Goal:** Honest sidecar `connectionId` routing; Gateway-only picker; offline live seed; journal filter unchanged.
- **Completed:** B.1–B.5 — `/account/trades` + `/stream/account` accept `connectionId`; unknown id → 400; removed journal-only picker union; `availability` + `TWS_LIVE_ACCOUNT_ID` offline seed; legacy journal rematch; tests + ARCHITECTURE + harness.
- **Verification run:** Sidecar `Ran 32 tests OK`; `npm test -- --run` (5 files) `Test Files 5 passed (5)`, `Tests 29 passed (29)`; `npm run build` `✓ Compiled successfully in 2.8s`.
- **Next best step:** Phase C — `dataConnectionPreference` split.

### 2026-07-09 — Dual connection Phase A infra

- **Goal:** Ship Docker dual Gateway compose (`TRADING_MODE=both`), npm scripts, env templates, ops docs; restart sidecar; prove honest `connectionId` routing.
- **Shipped:** `services/ib-gateway/docker-compose.yml` (`ghcr.io/gnzsnz/ib-gateway:stable`, localhost 4001/4002/5900); `services/ib-gateway/.env.example`; `ib:gateway:up|down` with `--project-directory`; `.env.example` + `.gitignore` for gateway secrets; Phase A ops in `dual-connection-roadmap.md`; local dual Gateway note in `src/lib/trading/ARCHITECTURE.md`.
- **Verification run:** **Focused:** `Ran 26 tests OK`; **App-level (partial):** sidecar restarted — `ib-paper` `DUP586813` HTTP 200; `ib-live` HTTP 503 when 4001 down (no paper clone); `docker compose config` OK.
- **Known blockers:** No `services/ib-gateway/.env` yet; desktop IB Gateway on 4002; Docker image pull not completed in session.
- **Next:** Copy `.env.example` → `.env`, stop desktop Gateway, `npm run ib:gateway:up`, VNC 2FA, confirm both ports, curl distinct live managed id → mark Phase A Passing → Phase B.

### 2026-07-08 — Dual connection roadmap (plan only)

- **Goal:** Document roadmap for Docker dual Gateway + decouple live market data from paper/live order routing; remove journal-only account workaround.
- **Shipped:** `docs/dual-connection-roadmap.md` (Phases A–D); links from `ROADMAP.md`, `trading-execution-roadmap.md`, `src/lib/trading/ARCHITECTURE.md`; harness Pending row + Task Contract.
- **Verification run:** Plan-only — no code/tests.
- **Next:** Phase A — Docker `TRADING_MODE=both`, map 4001/4002, restart sidecar, prove distinct paper/live account status.

### 2026-07-08 — Account context wiring

- **Goal:** Fix journal ignoring header account picker; composite account identity; journal-discovered accounts in picker.
- **Shipped:** Journal providers nested under `AccountProvider`; `accountPickerOptions.ts` + composite picker keys; journal-only accounts from fills; `activeTradingAccount` context; trade ticket Gateway-only guard; nesting regression test.
- **Verification run:** **Focused:** `Test Files 7 passed (7)`, `Tests 23 passed (23)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.6s`).
- **Next:** App-level walkthrough — `/journal/dashboard` switch `DUP586813` vs `U25026894 (journal)`; paper vs live distinct; `/chart` trade ticket with Gateway account.

### 2026-07-08 — Global account header + single account context

- **Goal:** Persistent content-column header with `edge` + app-wide account picker; single account drives trading, account panel, and journal.
- **Shipped:** `AppTopHeader.tsx` in `AppModuleShell`; lifted `AccountProvider` with `setActiveTradingAccount`; trade modal/AccountPanel display-only account; journal `filterTradesByAccount`.
- **Verification run:** **Focused:** `Test Files 6 passed (6)`, `Tests 26 passed (26)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.9s`).
- **Next:** App-level header/account walkthrough on localhost:3003.

### 2026-07-08 — Trading execution Phase 5 connection registry + paper/live

- **Goal:** Connection registry, dual Gateway sockets, in-app Paper/Live toggle, live `LIVE` confirm gate.
- **Shipped:** `connectionRegistry.ts`, `StubTradingAdapter`, `tradingEnvironment.ts`; sidecar `ib-paper`/`ib-live`; Trade ticket + Account panel mode toggle; `liveConfirmation` on submit/cancel/modify.
- **Verification run:** **Focused:** `Test Files 15 passed (15)`, `Tests 76 passed (76)`; **Sidecar:** `Ran 26 tests OK`; **Build:** `npm run build` passed.
- **Next:** App-level paper/live walkthrough; Postgres intent store backlog.

### 2026-07-08 — Trading execution Phase 4 UI + journal

- **Goal:** Chart trade ticket, confirm modal, AccountPanel cancel, journal orderRef correlation, AI place_order.
- **Shipped:** `TradeTicketModal`, `tradingClient.ts`, AccountPanel cancel + scoped orders, `correlateOrderRef.ts`, `preview_order`/`place_order` tools.
- **Verification run:** **Focused:** `Test Files 7 passed (7)`, `Tests 36 passed (36)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.6s`).
- **Next:** Superseded by Phase 5 row.

### 2026-07-08 — Trading execution Phase 3 stops + safety

- **Goal:** STP/STP LMT orders, preview expiry, short-sale/PDT guards, kill switch, audit log.
- **Shipped:** `STP`/`STP LMT` types + sidecar builders; `previewIntentId` 30s TTL; `safetyGuards.ts`; `auditLog.ts`; `EDGE_TRADING_KILL_SWITCH`; `outsideRth` default false.
- **Verification run:** **Focused:** `Test Files 10 passed (10)`, `Tests 52 passed (52)`; **Sidecar:** `Ran 25 tests OK`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.6s`).
- **Next:** Phase 4 — chart ticket UI + journal wiring.

### 2026-07-08 — Trading execution Phase 2 manage + account

- **Goal:** Modify open orders, active account selection, account-scoped orders, lost-response reconciler.
- **Shipped:** sidecar `PATCH /trading/orders/{id}`; `reconcile.ts`, `activeAccount.ts`, `filterOrders.ts`; `TradingService.modifyOrder`; `PATCH /api/trading/orders/[orderId]`; `AccountProvider.ordersForActiveAccount`.
- **Verification run:** **Focused:** `Test Files 8 passed (8)`, `Tests 32 passed (32)`; **Sidecar:** `Ran 19 tests OK`; **Build:** `npm run build` passed; **App-level:** `orderId: 38` `permId: 1306430116`; PATCH `lmtPrice: 8.95`; scoped `orderRef: edge-phase2-api`.
- **Next:** Phase 3 — STOP orders + safety hardening.

### 2026-07-08 — Trading execution Phase 1 domain + adapter

- **Goal:** Broker-neutral trading layer on top of Phase 0 sidecar — types, service, adapter, `/api/trading/*`.
- **Shipped:** `src/lib/trading/**`, `src/app/api/trading/**`, `/api/trading` in `apiAuth` sensitive prefixes.
- **Verification run:** **Focused:** `Test Files 5 passed (5)`, `Tests 14 passed (14)`; **Build:** `npm run build` passed; **App-level:** MKT `orderId: 17` `permId: 1306430090`; LMT `orderId: 19` `permId: 1306430091`; cancel `status: "Cancelled"`.
- **Next:** Phase 2 — modify orders + active account selection.

### 2026-07-08 — Trading execution Phase 0 paper spike

- **Goal:** Prove IB paper place + cancel via TWS sidecar before full trading layer.
- **Shipped:** `POST /trading/orders`, `DELETE /trading/orders/{order_id}`, trading guards/helpers, unit tests; `.env.local` paper pins (`TWS_PORT=4002`, `TWS_ACCOUNT_ID=DUP586813`, `TWS_READONLY=false`).
- **Verification run:** **Focused:** `Ran 15 tests OK`; **App-level:** MKT `orderId: 9` `permId: 1306430087`; LMT `orderId: 10` `permId: 1306430088`; cancel `status: "Cancelled"`.
- **Next:** Phase 1 — broker-neutral types, `TradingService`, `/api/trading/*`.

### 2026-07-08 — Journal loading + empty states

- **Goal:** Layered loading, global empty, scoped empty, and error states across journal Dashboard + Trades without duplicate fetches or flash-of-empty on initial load.
- **Shipped:** `journalDataPhase` + `journalEmptyCopy`; `JournalTradesProvider` error/retry; `JournalContentGate`, `JournalPageLoadingSkeleton`, `JournalGlobalEmptyState`; page gates on `JournalDashboardView` + `JournalTradesView`; scoped empty copy unified in equity/table/list/breakdown/time widgets.
- **Verification run:** **Focused:** `Test Files 24 passed (24)`, `Tests 136 passed (136)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.5s`); **Architecture review:** self-review Passed.
- **Next:** App-level walkthrough on localhost:3003 — skeleton on cold load, global empty with Import/Sync, scoped filtered empty when filters exclude rows.

### 2026-07-07 — Journal trades table controls

- **Goal:** Add P0/P1 table controls to `/journal/trades` — sortable headers, result count, filtered empty state, client pagination, column visibility, density prefs.
- **Shipped:** `journalTradesTableControls.ts`; `JournalTradesTableControls` toolbar; upgraded `JournalTradesTable` (sortable sticky headers, conditional columns, dual empty states); `JournalTradesView` sort → paginate pipeline with localStorage prefs.
- **Verification run:** **Focused:** `Test Files 4 passed (4)`, `Tests 48 passed (48)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.7s`); **Architecture review:** self-review Passed.
- **Next:** App-level walkthrough on `/journal/trades` — sort, paginate, toggle columns/density, confirm prefs survive refresh.

### 2026-07-07 — Journal trades page hero summary cards

- **Goal:** Show the four dashboard hero KPI cards at the top of `/journal/trades` with the trades table below.
- **Shipped:** `JournalTradesView` renders `JournalSummaryCards` above `JournalTradesTable` using the same scoped closed-trade stats + account equity as dashboard.
- **Verification run:** **Focused:** `Test Files 2 passed (2)`, `Tests 44 passed (44)`; **Architecture review:** self-review Passed.

### Session Exit Checklist

- [ ] Active Work state and latest result updated
- [ ] Task Contract updated or cleared
- [ ] Known blockers recorded
- [ ] Temporary/debug artifacts removed
- [ ] Next concrete action recorded
- [ ] Appropriate verification tier run

## Next Priorities (Post-V1)

Canonical roadmap: [ROADMAP.md](./ROADMAP.md). Immediate priorities:

1. **Corporate events / news / fundamentals / macro panels** — next Phase 2 market-data workflow expansions; news provider economics in [News Flow Roadmap](./roadmaps/news-flow-roadmap.md)
2. **Bar Replay persistence** — persist position in `CellConfig`
3. ~~**Options sidebar panel**~~ — **shipped**

## Explicit Deferrals

- Pine Script / community indicators
- Price/drawing alerts
- Non-time charts (Renko, P&F, Kagi)
- Volume footprint, TPO, session profile
- 16-chart layouts, cloud sync

## Verification for Active Areas

```bash
# Internal package boundaries
npm run lint:package-boundaries
npm run typecheck:packages
npm run build:packages
npm run check:examples

# Package API snapshots
npm test -- --run src/test/package-api-snapshot.test.ts
npm test -- --run src/test/package-boundaries.test.ts

# Context menu / copy menu
npm test -- --run src/app/components/chartContextMenu.test.ts
npm test -- --run src/app/components/chartCopyMenu.test.ts

# Chart engine (canonical package paths)
npm test -- --run packages/chart-react/src/engine/
npm test -- --run packages/chart-react/src/EdgeChart.test.tsx
npm test -- --run src/app/components/chart-cell/
npm test -- --run src/app/components/ChartCell.activeChart.test.tsx
npm test -- --run src/lib/chart/

# AI tools
npm test -- --run src/lib/ai/
```

## Related Docs

- [status-archive/](./status-archive/) — pruned harness history (Session Log, Task Contracts, old Active Work)
- [chart/features.md](./chart/features.md) — full feature inventory with status per row
- [ROADMAP.md](./ROADMAP.md) — consolidated product and engineering roadmap
- [journal-roadmap.md](./journal-roadmap.md) — post-v1 journal reporting tiers (Tier 1–3)
- [chart/context-menu-reference.md](./chart/context-menu-reference.md) — TV vs Edge menu parity
- [ai-tools-architecture.md](./ai-tools-architecture.md) — AI tool design and rollout phases
- [chart/drawing-platform-plan.md](./chart/drawing-platform-plan.md) — drawing platform (complete)
