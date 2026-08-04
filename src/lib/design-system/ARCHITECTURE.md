# Edge Design System Architecture

Shared tokens and React primitives for **in-app chart platform chrome** (toolbars, sidebars, menus, modals, panels). Not the landing-page brand kit — see `public/brand/BRAND.md` and `.cursor/skills/visual-assets/` for marketing assets.

## Responsibility

Keep DOM UI visually consistent with the TradingView-inspired dark chart platform: surfaces, typography, spacing, hover/active states, and semantic colors (positive/negative/accent).

Canvas rendering uses a **separate token path** (see [Dual token paths](#dual-token-paths)).

## Source of truth

| Layer | Path | Role |
|-------|------|------|
| TypeScript tokens | `edge.ts` | `edgeTokens`, `edgeLayoutTokens`, `edgeChartColors`, `toneTextClass`, `syncedLayoutTokenKeys` |
| CSS variables | `src/app/globals.css` | `--edge-*` custom properties (light + `.dark`) |
| Component classes | `globals.css` `@layer components` | `.edge-panel`, `.edge-popover`, `.edge-icon-button`, `.edge-menu-item`, … |
| Style helpers | `src/app/components/design-system/styles.ts` | `headerBarClass`, `menuItemClass`, `modalShellClass`, … |
| React primitives | `src/app/components/design-system/` | `EdgeButton`, `EdgeModalShell`, `EdgeSegmentedTabs`, … |

**Invariant:** `edge.ts` dark/light color values MUST match `globals.css`. Layout foundation tokens in `syncedLayoutTokenKeys` MUST match `globals.css` in both `:root` and `.dark`. Enforced by `src/lib/design-system/edge.test.ts`.

When adding or changing a token, update **both** `edge.ts` and `globals.css` in the same change.

## Visual rhythm (Phase 1 foundation)

Shared chrome uses one rhythm before route-specific polish:

| Role | Token / class | Value |
|------|---------------|-------|
| Panel title | `.edge-type-panel-title` / `-strong` | 14px semibold |
| Body / action | `.edge-type-body` | 12px |
| Metadata | `.edge-type-metadata` | 12px, secondary color |
| Tabular numeric | `.edge-type-numeric` | 12px, tabular nums |
| Compact annotation | `.edge-type-annotation` | 10px — section microcopy, chart axis labels only |
| Spacing rhythm | `--edge-space-1…6` | 4 / 8 / 12 / 16 / 24px |
| Control compact | `--edge-control-height-compact` | 32px — header chips, buttons, menu rows |
| Control standard | `--edge-control-height-standard` | 36px — search shells, standard icon buttons |
| Dense control radius | `--edge-radius-sm` | 4px |
| Card / popover radius | `--edge-radius-lg` | 8px |
| Dialog radius | `--edge-radius-dialog` | 10px |
| Motion fast / normal | `--edge-motion-fast` / `-normal` | 120ms / 180ms; `.edge-spinner`, `.edge-skeleton-pulse`, `.edge-app-enter`, and control transitions respect `prefers-reduced-motion` |
| Primary CTA fill | `--edge-accent-blue-fill` + `--edge-text-on-accent` | Filled buttons only; link/accent semantics stay on `--edge-accent-blue` |

Style helpers in `styles.ts`: `panelTitleClass`, `bodyTextClass`, `metadataTextClass`, `annotationTextClass`, `compactControlClass`, `standardControlClass`, `headerChipClass`, `fieldClass`, `selectClass`, `labeledFieldClass`, `borderLegendSurfaceClass`, `borderLegendLabelClass`, `clearButtonClass`, `primaryButtonClass` (uses fill + on-accent).

### Field and select recipes (component standardization Phase 1)

Use shared field helpers before inventing inline border/bg classes on native `<input>` or custom triggers:

| Helper | Use for |
|--------|---------|
| `fieldClass({ density, disabled, invalid })` | Text/number inputs — compact (32px) or standard (36px) |
| `EdgeSelect` | Single-value pickers — `variant="chip"` for toolbar chrome, `variant="field"` for forms/drawers |
| `EdgeMicroSelect` | Annotation-sized (18px) dropdown for dense form chrome — trade ticket Fill/Type modifiers |
| `EdgeBorderLabeledControl` | Border-legend rim label on custom bordered triggers (app header account/data pickers) |
| `EdgeSegmentedTabs` | Exclusive short preset lists (≤4 options) — e.g. List/Heat map, Linear/Log |
| `EdgeUnderlineTabs` | Section navigation (2–4 views) — underline active tab, shrink-to-content; journal Dashboard/Trades |
| `selectClass({ density, disabled, invalid })` | Legacy native-select surface — **deprecated**; use `EdgeSelect` instead |
| `labeledFieldClass()` | Inline label + control rows for non-select fields (e.g. journal exact-symbol input) |
| `searchInputShellClass()` + `EdgeSearchInput` | Modal/search fields with optional leading icon, clear, `aria-busy`, `aria-invalid` |
| `clearButtonClass()` | Icon-only clear controls inside search shells |

When `EdgeSelect` receives a `label`, the category sits on the top outline (border-legend) via `EdgeBorderLabeledControl` — not left of the trigger. Pass `labelSurface="toolbar"` for app-header chips; default `panel` for journal/screener/form contexts. Unlabeled selects keep value-only triggers with `aria-label` when needed. App header workspace/account/data pickers use `EdgeBorderLabeledControl` directly on custom menu triggers.

Accessible naming: search fields must expose `aria-label` (placeholders alone are insufficient). Journal exact-symbol filtering keeps equality semantics with local uppercase normalization — it does **not** use the symbol-discovery hook/dialog.

### Symbol discovery (Phase 2)

Three-layer split:

| Layer | Module | Responsibility |
|-------|--------|----------------|
| Behavior | `useSymbolSearch` | Debounced `/api/search`, loading/error/results, abort + stale-response protection |
| Composite | `SymbolSearchDialog` | `EdgeModalShell` + `EdgeSearchInput` + listbox keyboard contract; `select` vs `add` presentation variant |
| Product | `SearchBar`, `WatchlistSearch` | Chart trigger vs watchlist add wiring only |

Chart uses `SymbolSearchTrigger` (button with `aria-haspopup="dialog"`) + dialog `mode="select"`. Watchlist uses the same dialog with `mode="add"`. Journal scope bar keeps a compact exact-symbol input with trailing search icon and `aria-label` — equality filtering only (no discovery). Chart trigger and journal exact field share `CompactSearchFieldShell` + `compactSearchFieldClass` presentation; modal discovery still uses standard `EdgeSearchInput`.

**Compact exceptions (documented):** identity letter badge in price legend (10px annotation); chart overlay connection summary remains annotation-sized; icon rails remain square targets (32–36px) without widening the black chart stage.

### Copilot parity aliases (Grok UX track)

Copilot shell/composer (sidebar, `/copilot`, tile) may use scoped CSS variables under `.copilot-shell` for grok.com parity without changing global `--edge-*` rhythm. Frozen mapping: [grok-copilot-parity-roadmap.md](../../docs/roadmaps/grok-copilot-parity-roadmap.md) § I.

| Alias | Role |
|-------|------|
| `--copilot-canvas-bg` | Near-black chat canvas (`#050505`) |
| `--copilot-query-bar-bg` | Pill composer fill (`#141414`) |
| `--copilot-query-bar-ring` | Inset ring (~8% primary mix) |
| `--copilot-menu-bg` | In-bar model dropdown surface |
| `--copilot-bar-min-height` / `--copilot-bar-max-width` / `--copilot-pill-radius` | 60px / 800px / 9999px |
| `--copilot-history-rail-width` | Collapsible history rail on `/copilot` + wide tile (280px) |
| `--copilot-message-body-size` | Active-thread message body (16px) |

Full pills and 16px composer body text are **Copilot-only exceptions** to general app UX polish rules. Phase 1 landed `.copilot-shell` canvas + alias vars in `globals.css`; Phase 2 consumes query-bar/pill vars in `CopilotComposer` (`copilot-query-bar`, attach stub, model chip, circular ↑/stop); Phase 3 consumes `--copilot-menu-bg` / `--copilot-menu-radius` for the in-bar model dropdown; Phase 4 adds `--copilot-history-rail-width` (280px), `--copilot-message-body-size`, and `.copilot-streaming-cursor` for active-thread message chrome. Do not leak into journal/chart chrome.

## Interaction states (Phase 4)

Shared chrome communicates availability through one recipe set before route-specific convergence:

| State | Recipe | Notes |
|-------|--------|-------|
| Hover | `--edge-surface-hover` via style helpers / `.edge-menu-item:hover` | Motion gated with `motion-safe:` in `styles.ts` |
| Selected / active | `--edge-surface-active` + optional `aria-pressed` on toggles | `EdgeIconButton` sets `aria-pressed` when `active`/`pressed` |
| Focus | `.edge-focus-ring:focus-visible` → `--edge-focus` box-shadow | Never color-only |
| Disabled | `opacity-40` + `cursor-not-allowed` | Buttons use native `disabled` |
| Loading | `EdgeButton loading` → `aria-busy`, spinner, disabled | Prefer over ad-hoc label swaps |
| Destructive | `destructiveButtonClass()` or `.edge-menu-item[data-danger="true"]` | Menu + outline actions |
| Error / alert | `role="alert"` on blocking error surfaces (e.g. chart cell fallback) | Blocking errors only |
| Toast | `EdgeToastViewport` via `NotificationProvider` | Ephemeral in-app notifications; bell inbox for history |
| Motion | `--edge-motion-fast/normal`; `.edge-popover-enter`; reduced-motion fallbacks in `globals.css` | Popovers use restrained fade/scale |

Modal/slide-over focus: `useFocusTrap` in `EdgeModalShell` / `EdgeSlideOver` — initial focus, Tab wrap, Escape dismiss, restore focus on close. Menu popovers use `EdgeAnchoredPopover` + `useMenuKeyboardNav` for Arrow/Home/End on `[role="menuitem"]` rows. Column pickers use the same anchored dismiss/focus-return shell with checkbox rows (not menuitem roving focus).

**Compact exceptions (documented):** chart overlay recover CTA uses compact control height (32px) with body typography; `EdgeToggle` keeps a 20px visual track inside a 32px hit target.

## Dual token paths

```
App DOM chrome          Canvas / WebGL
─────────────────       ─────────────────────────────
globals.css --edge-*    packages/chart-core/themeTokens.ts
edge.ts                 edgeChartColors (edge.ts)
Tailwind var(...)       chartSettings defaults + renderer.ts
```

- **DOM UI** (`src/app/components/`): use `var(--edge-*)`, `Edge*` components, or helpers from `styles.ts`.
- **In-chart legend overlay** (`packages/chart-react/src/components/PriceLegendLayout.tsx` for price pane; `PaneLegendBar.tsx` for indicator panes): uses `--edge-*` in class names. Price legend tiers: identity (13px semibold + optional 10px letter badge), inline O/H/L/C labels on `--edge-text-secondary` with 12px mono values + change, context row chips on identity hover (12px metadata via `MarketContextBreadcrumb`).
- **Canvas draw loop** (`packages/chart-react/src/engine/renderer.ts`): uses `getChartColors()` / `themeTokens.ts`.

If you change chart background, grid, or axis colors, update `edgeChartColors` / `themeTokens.ts` together — not only CSS.

## Appearance: mode + palette

Edge separates **mode** (light/dark) from **palette** (named color themes):

| Concept | Values | Control | Storage |
|---------|--------|---------|---------|
| Mode (`Theme`) | `light` \| `dark` | Header sun/moon toggle | `edge:app:theme:v1` |
| Palette (`PaletteId`) | `midnight` \| `graphite` \| `slate` | Application settings → **Appearance** | `edge:app:palette:v1` |

Apply path: `applyAppearanceToRoot(theme, palette)` sets `<html class="light|dark" data-palette="…">` and `setActiveChartPalette()` for canvas colors. Pre-hydration script in `src/app/layout.tsx` reads both keys before first paint.

Token tables live in `src/lib/design-system/edge.ts` (`edgeTokens[palette][theme]`). CSS mirrors via `:root` / `.dark` (Midnight fallback) plus `:root[data-palette="…"]` / `.dark[data-palette="…"]` blocks in `globals.css`. Chart canvas reads `getChartColors(theme, palette)` from `@edge/chart-core`.

Default: `theme=dark`, `palette=midnight` (current Midnight Chrome look unchanged).

## Dark palette direction

The in-app dark theme uses **Midnight Chrome**: a pure-black chart stage surrounded by progressively lighter, blue-leaning surfaces. Periwinkle is the interaction accent; turquoise, coral, and amber remain reserved for positive, negative, and warning semantics.

- Keep `surface-chart` pure black so plot and axis regions read as one uninterrupted stage.
- Build hierarchy through `surface-toolbar` → `surface-panel` → `surface-popover`; do not flatten these back to one gray.
- Use the accent for primary actions, selection, links, and focus—not general decoration.
- Keep positive/negative colors semantic so trading direction is never confused with navigation state.

## Semantic tokens (when to use)

| Token | Typical use |
|-------|-------------|
| `surface-chart` | Chart cell plot background |
| `surface-toolbar` | Top header bar, bottom range bar, segmented tab rail |
| `surface-rail` | Left drawing toolbar and right sidebar icon rails (dark: near-black chrome surrounding the black chart stage) |
| `text-rail` / `text-rail-active` | Icon rail idle vs hover/active icon colors (shared left/right rails) |
| `surface-panel` | Right sidebar panels, legend hover backdrop |
| `surface-popover` | Context menus, dropdowns, modals |
| `surface-hover` / `surface-active` | Row/button hover and selected states |
| `border` / `border-subtle` / `border-strong` | Panel dividers; subtle for chart-adjacent strips |
| `text-primary` / `text-strong` | Body copy vs emphasized labels (symbol, active preset) |
| `text-secondary` / `text-muted` | Hints, axis-like labels, section headers |
| `accent-blue` | Links, primary actions, last-price line color |
| `accent-blue-fill` / `text-on-accent` | Filled primary CTAs (`EdgeButton variant="primary"`) — separate from link/accent semantics |
| `positive` / `negative` | Price change, up/down candles (via `toneTextClass`) |
| `warning` | Stale data, stream interruptions, non-fatal alerts (`ChartFeedStatusBadge`, data-health menu) |

Prefer **semantic** tokens over raw hex. Use `toneTextClass('positive' | 'negative' | 'neutral')` for signed values.

## React primitives

Import from `src/app/components/design-system/index.ts`:

| Primitive | Use for |
|-----------|---------|
| `EdgeButton` / `EdgeIconButton` | Toolbar and header actions; `variant="primary"` uses `--edge-accent-blue-fill` + `--edge-text-on-accent`; `variant="destructive"` / `"link"` for semantic actions; `loading` sets `aria-busy`; `size="compact"` (32px) or `"standard"` (36px) on icon buttons |
| `EdgeMenuItem` / `EdgeMenuSectionHeader` | Context menus and dropdown lists; menu rows use `role="menuitem"`, selected/disabled/trailing props |
| `EdgeAnchoredPopover` | Trigger-anchored popovers with viewport clamping, outside-click + Escape dismiss, focus return, optional menu keyboard nav |
| `ColumnPickerPopover` | Shared checkbox-column picker over `EdgeAnchoredPopover` (Screener + Journal table controls); optional native drag-reorder via `reorderable` + `onReorder` |
| `EdgeModalShell` | Dialog shells (settings, search, confirmations); optional `headerActions` beside title, `footer` for bottom controls; `maxWidth="full"` ≈ `min(96vw, 1400px)`; defaults to viewport centering, or parent-tile centering via `ModalContainmentProvider` (chart cell) |
| `ModalContainmentProvider` | Scopes `EdgeModalShell` to a chart/tile overlay host (`absolute inset-0` portal) so workspace side panes are not covered |
| `EdgeSlideOver` | Right-side overlay detail panels (~⅓ or ½ viewport); backdrop + Escape dismiss; portaled to `document.body` |
| `EdgeSearchInput` | Modal search fields |
| `EdgeSelect` | Custom single-select menus — chip (toolbar) or field (forms); keyboard nav + focus return via `EdgeAnchoredPopover` |
| `EdgeSegmentedTabs` | 2–4 way panel tabs (Object tree / Data window) and short exclusive presets |
| `EdgePanelHeader` | Sidebar panel title row |
| `EdgeEmptyState` | Placeholder when no data; optional `title`, `action`, `role="alert"`, and semantic `tone` |
| `EdgeStatusRegion` | Loading/status wrapper owning `role="status"` + `aria-busy`; decorative `EdgeSpinner` + optional skeleton children |
| `EdgeFilterChip` | Filter summary chips — `variant="static"` (Screener scan summary) or `"dismissible"` (Journal active filters) |
| `EdgeMetricTile` | Simple label/value tiles with optional help tooltip and value tone — plain or bordered |
| `EdgeSpinner` | Loading spinners (`xs` / `sm` / `md`); uses `.edge-spinner` with reduced-motion fallback |
| `EdgeSkeletonLine` | Pulse skeleton bars/lines; uses `.edge-skeleton-pulse` with reduced-motion fallback |
| `EdgeToggle` / `EdgeToggleSwitch` | Boolean settings rows (`standard`) and compact menu-inline switches (`compact`) |
| `EdgeFlipChip` | Two-state cycle control (shows current label only); optional positive/negative tone for Buy/Sell |

Shared rail styling for left drawing toolbar and right sidebar: `src/app/components/chart-icons/toolbarButtonStyles.ts` — `iconRailShellClass(edge)`, `iconRailButtonClass`, `railMode` prop (`full` \| `compact`) on `DrawingToolbar`, `ChartDrawingRail`, and `SidebarRail`; icons 22/20 px via `edgeLayoutTokens.iconRailIconSize`; active state uses `surface-active` + `--edge-accent-blue` icon color.

Settings actions use the single closed-outline `SettingsIcon` from `chart-chrome/ChartHeaderIcons.tsx`; do not add radial or inline gear variants. The Risk rail remains a shield because it opens risk controls rather than general settings.

## Surface recipes (canonical examples)

| Surface | Reference file |
|---------|----------------|
| Chart header | `chart-chrome/ChartHeaderBar.tsx` + `styles.ts` — includes enabled **Trade** control when `onOpenTrade` is wired |
| Trade sidebar panel | `sidebar/panels/TradeSidebarPanel.tsx` + `trading/TradeOrderForm.tsx` — docked place/preview/confirm; drawing-bound plan levels; header Trade opens unbound; LIVE confirm on live submit |
| Trade ticket modal (legacy) | `trading/TradeTicketModal.tsx` — thin `EdgeModalShell` wrapper for tests |
| Browser tab live quote | `chart-chrome/PrimaryChartBrowserTabQuote.tsx` + `src/lib/app/browserTabQuote.ts` — primary chart symbol/price/day % → `document.title` + direction favicon (in-chart tab strip removed) |
| Symbol search trigger + dialog | `design-system/symbol-search/` + `CompactSearchFieldShell` + thin adapters in `SearchBar.tsx`, `watchlist/WatchlistSearch.tsx` |
| Context menu | `ContextMenu.tsx` — `role="menu"`, `useMenuKeyboardNav`, leaf auto-close; chart cell + app shell |
| App context menu | `home/AppContextMenuProvider.tsx` — Control+right-click on `AppModuleShell`; shares chrome actions via `AppChromeActionsProvider.tsx` |
| Settings modal | `ChartSettingsModal.tsx` |
| Chart tool modals | `DrawingSettingsModal.tsx`, `IndicatorSettingsModal.tsx`, `TemplatePickerModal.tsx`, `ChartGoToModal.tsx` — `EdgeModalShell` + `EdgeButton` + `--edge-*` field tokens (Tier C3) |
| Chart popovers / replay | `ChartTimeZoneMenu.tsx` (`popoverPanelClass`), `DrawingSelectionToolbar.tsx`, `BarReplay.tsx` — semantic tokens; drawing paint hex unchanged |
| Sidebar icon rail | `sidebar/SidebarRail.tsx` + `toolbarButtonStyles.ts` — main group (watchlist → options → screener → patterns → object-tree → trade → account); footer group: **Risk** (shield icon; internal panel id `settings`) — no theme control on rail |
| Docked sidebar panel | `sidebar/{RightSidebar,SidebarPanelShell}.tsx` — `absolute` overlay on chart row (`right-0`); resizable via `SidebarResizeHandle`; chart canvas row stays full-width under the panel, but `ChartGrid` applies `paddingRight = overlayInsetPx` (from `SidebarPanelWidthContext`, includes resize preview) so candles/price axis stay clear of the panel; floating panels apply no inset; panel-aware max via `sidebarWidth.ts` (screener: `90% viewport − rail`, cap 1400px; other panels 560px; leaving screener clamps stored width) |
| Floating panel window | `sidebar/{FloatingPanelShell,FloatingPanelHost}.tsx` — draggable/resizable pop-out over chart; **Dock** returns to sidebar; geometry persisted in `layout.sidebar.floatingGeometry` |
| Panel Pop out / Dock / Expand | `sidebar/{PanelPresentationContext,PanelChromeActions,SidebarPanelWidthContext}.tsx` — `PanelPopOutButton` + screener `PanelExpandButton`; presentation in `layout.sidebar.presentation` (`docked` \| `floating`) |
| Screener results heat map | `heatmap/{HeatMapView,HeatMapToolbar}.tsx` + `src/lib/heatmap/` — treemap List/Heat map toggle in screener; see `docs/roadmaps/screener-roadmap.md` |
| Centered modal (short flows) | `EdgeModalShell` — symbol search, confirmations; not for persistent tools (use floating panel instead). Chart chrome modals (symbol search in header, indicators, settings, go-to, templates) inherit `ModalContainmentProvider` from `AppProviders` / `edge-app-shell` and center within the chart tile, not the full workspace viewport |
| Command palette | `shortcuts/CommandPalette.tsx` + `ShortcutOverlaysHost` — viewport-centered `EdgeModalShell` (`containment="viewport"`) portaled to `document.body` at `z-[1300]`; opened via ⌘K/Ctrl+K; empty state shows **Recent** (localStorage) + curated **Quick guide** groups; filtered results use `EdgeSearchInput`; symbol change via `/` uses shared `SymbolSearchDialog` |
| Chart tile modal host | `stock-app/AppProviders.tsx` — `relative` `edge-app-shell` + `data-testid="chart-modal-root"` overlay host (covers header + grid; chart-header symbol search trigger lives in `ChartHeaderBar`, outside `ChartCell`) |
| Right overlay detail panel | `EdgeSlideOver` — journal trade review, future research/settings sub-panels; overlays content without reflow |
| Object tree / data window | `ObjectTree.tsx` |
| Watchlist panel | `watchlist/WatchlistPanel.tsx` |
| Bottom range bar | `ChartRangeBar.tsx` |
| Chart cell shell | `ChartCell.tsx` — left `DrawingToolbar` rail + flex column (`ChartErrorBoundary` → `EdgeChart` + `ChartRangeBar`) so the range bar matches chart width |
| Chart overlay status stack | `chart-cell/ChartOverlayStatusStack.tsx` + `ChartOverlayDataHealthRow.tsx` — active-cell top-right stack (left of price-axis strip): embedded `ChartFeedStatusBadge` when stale/stream/error; optional inline `TwsRecoverButton` when TWS recovery is needed; icon-only `DataHealthButton` (severity dot + tooltip) on active cell |
| Account picker | `home/AccountPickerMenu.tsx` + `AccountAliasEditor.tsx` — order-account dropdown; optional display aliases (`edge:trading:accountAliases.v1`) via settings gear; IB `accountId` remains execution identity |
| Chart feed status overlay | `chart-cell/ChartFeedStatusBadge.tsx` — stale/stream/error/refreshing feed state (standalone or embedded in the stack) |
| Chart error fallback | `chart-cell/ChartErrorBoundary.tsx` — in-cell error UI with retry and copy-error actions |
| App hydration placeholder | `chart-cell/AppHydrationShell.tsx` — full chrome skeleton (header, rails, chart grid, range bar; residual top skeleton strip) until `StockApp` layout hydrates; also used by `src/app/loading.tsx` during route load |
| App home hub | `home/HomeShell.tsx` — responsive Layout 1 tri-pane (≥2560) with dual-stack/tabbed/drawer/hub fallbacks; Continue card + workspace cards; journal preview (recent trades) + research preview; no chart bootstrap |
| App module shell | `home/AppModuleShell.tsx` wraps `AppThemeProvider` + `AppChromeActionsProvider` + `AppContextMenuProvider` + `home/AppTopHeader.tsx` — full-height module routes with full-width top header (clickable `logo-full-light` → `/home`, centered workspace controls on `/workspace`, right cluster: **Market data** selector, order **account** picker, **theme** toggle, **application settings** gear → `AppSettingsShell` with timezone defaults + **Appearance** palette picker); plain right-click on the header (`data-app-context-menu-surface`) or Control+right-click anywhere opens app context menu; no left module rail |
| App-level theme | `src/lib/app/appThemePreference.ts` + `src/lib/app/appPalettePreference.ts` + `AppThemeProvider.tsx` — persisted `edge:app:theme:v1` + `edge:app:palette:v1`; user-preferences pack sync; pre-hydration script in `src/app/layout.tsx`; header sun/moon toggles mode; Application settings **Appearance** picks palette (Midnight / Graphite / Deep Slate); chart tiles consume provider theme + palette |
| App default timezone | `src/lib/app/appTimeZonePreference.ts` + `AppTimeZoneProvider.tsx` — persisted `edge:app:timeZone:v1`; Application settings slide-over sets default; chart clock inherits via `mergeChartSettings(..., { defaultTimeZone })` unless per-chart override; saves use `persistChartSettings` so the app default is not baked as a per-chart `UTC` override |
| App workspace (app shell) | `app-workspace/AppWorkspaceShell.tsx` + `LayoutTreeView.tsx` + `SplitPane.tsx` + `TileFrame.tsx` + `TileDensityContext.tsx` + `WorkspacePill.tsx` + `WorkspaceHeaderControls.tsx` + `WorkspaceLayoutPresetPicker.tsx` — `/workspace` binary split-tree tiles (Chart, Screener, Journal); **Use** vs **Edit layout** modes; `SplitPane` drag-resize (row → horizontal, column → vertical) with 8px hit target over a 1px hairline; tile content width drives **compact / standard / wide** density (520 / 900 px thresholds); Use-mode workspace pill (switch/rename/new/duplicate); edit-mode **Layout** preset picker → placeholder panes → per-pane assign; drag-to-dock in edit only; module routes redirect via `deepLinks.ts`; in-process Review→Chart via `WorkspaceDriveContext` |
| Journal module | `journal/JournalModuleShell.tsx` + `JournalSubNav.tsx` (Dashboard / Trades only; settings via deep link) — module routes redirect to workspace; workspace journal tiles use one `JournalModuleHeader` row (**Journal** title → underline tabs → period/symbol/filters → Sync/Import/settings via `JournalTileChrome`) + `surfaceState.journalView` instead of link sub-nav |
| Options chain table | `options/{OptionsChainView,OptionsChainTable,ChainRowGreeksPopover}.tsx` — sidebar launcher + floating dialog; bid/ask/last spine table, row-hover greeks popover, expiration tabs |
| Chart cold-load overlay | `chart-cell/ChartLoadingOverlay.tsx` + shared `chart-cell/SkeletonCandleBars.tsx` — symbol-aware spinner + candlestick skeleton (wick + body) when candles are loading and empty; also used by `AppHydrationShell` chart region; rendered from app `EdgeChart.tsx` |

Copy patterns from these files before inventing new markup.

## Anti-patterns

- **Do not** use Tailwind palette utilities (`gray-*`, `blue-*`, `red-*`) in `src/app/components/` for chrome — use `--edge-*` or primitives.
- **Do not** hardcode hex colors in components (`#12131A`, `#1E2030`, …) — add a semantic token if needed.
- **Do not** duplicate modal/menu markup when `EdgeModalShell` / `menuItemClass` already cover the case.
- **Do not** mix landing-page brand tokens (electric green, `#0A0B0E`) into chart app chrome.

Legacy components may still violate these rules; migrate them when touched.

## Phase 5 dense-table and paint exceptions

Documented compact exceptions after route migration (2026-07-18):

| Surface | Exception | Reason |
|---------|-----------|--------|
| Options chain table / Account positions grid | 11px tabular spine rows | Trading throughput in dense tables |
| Screener results table headers/footer | 10px via `annotationTextClass()` | Dense scan results |
| Watchlist row badges | 9–10px age/tag badges | Row density in multi-column table |
| Drawing/indicator settings color inputs | Hex defaults in `<input type="color">` | Canvas paint persistence, not chrome |
| Chart settings canvas background | `#0A0B0E` default | Chart-stage color setting |
| Options expiration rail | Custom scrollable tabs | Documented one-consumer domain composite (Phase 3) |

**Static enforcement:** `src/lib/design-system/edge.test.ts` bans undefined `--edge-*` tokens and Tailwind palette utility classes in production app components. Raw hex in color-picker/drawing contexts is audited by `npm run ux:baseline` but not globally banned in Vitest.

## Adding a new UI surface

1. Read this doc and a canonical example from the table above.
2. Use existing `Edge*` primitives or `styles.ts` helpers first.
3. If new semantic color is required, add to `edge.ts` + `globals.css` and extend `edge.test.ts` if needed.
4. Run focused tests for the touched area.

## Verification

```bash
# Token sync (edge.ts ↔ globals.css)
npm test -- --run src/lib/design-system/edge.test.ts

# Style helper smoke
npm test -- --run src/app/components/design-system/styles.test.ts

# Example surfaces after UI changes
npm test -- --run src/app/components/sidebar/panels/ObjectTreePanel.test.tsx
npm run check:startup
```

## Related docs

- [docs/CONSTRAINTS.md](../../../docs/CONSTRAINTS.md) — design-system MUST / MUST NOT rules
- [src/lib/chart/ARCHITECTURE.md](../chart/ARCHITECTURE.md) — canvas engine (separate from DOM chrome)
- [docs/chart/drawing-toolbar-design.md](../../../docs/chart/drawing-toolbar-design.md) — left rail layout notes
- [docs/roadmaps/research-ux-roadmap.md](../../../docs/roadmaps/research-ux-roadmap.md) — Board chrome (Phase 3+) uses Edge tokens; density switch in app chrome (Phase 1+)
