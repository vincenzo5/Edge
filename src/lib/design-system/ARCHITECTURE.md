# Edge Design System Architecture

Shared tokens and React primitives for **in-app chart platform chrome** (toolbars, sidebars, menus, modals, panels). Not the landing-page brand kit — see `public/brand/BRAND.md` and `.cursor/skills/visual-assets/` for marketing assets.

## Responsibility

Keep DOM UI visually consistent with the TradingView-inspired dark chart platform: surfaces, typography, spacing, hover/active states, and semantic colors (positive/negative/accent).

Canvas rendering uses a **separate token path** (see [Dual token paths](#dual-token-paths)).

## Source of truth

| Layer | Path | Role |
|-------|------|------|
| TypeScript tokens | `edge.ts` | `edgeTokens`, `edgeLayoutTokens`, `edgeChartColors`, `toneTextClass` |
| CSS variables | `src/app/globals.css` | `--edge-*` custom properties (light + `.dark`) |
| Component classes | `globals.css` `@layer components` | `.edge-panel`, `.edge-popover`, `.edge-icon-button`, `.edge-menu-item`, … |
| Style helpers | `src/app/components/design-system/styles.ts` | `headerBarClass`, `menuItemClass`, `modalShellClass`, … |
| React primitives | `src/app/components/design-system/` | `EdgeButton`, `EdgeModalShell`, `EdgeSegmentedTabs`, … |

**Invariant:** `edge.ts` dark/light values MUST match `globals.css`. Enforced by `src/lib/design-system/edge.test.ts`.

When adding or changing a token, update **both** `edge.ts` and `globals.css` in the same change.

## Dual token paths

```
App DOM chrome          Canvas / WebGL
─────────────────       ─────────────────────────────
globals.css --edge-*    packages/chart-core/themeTokens.ts
edge.ts                 edgeChartColors (edge.ts)
Tailwind var(...)       chartSettings defaults + renderer.ts
```

- **DOM UI** (`src/app/components/`): use `var(--edge-*)`, `Edge*` components, or helpers from `styles.ts`.
- **In-chart legend overlay** (`packages/chart-react/src/components/PriceLegendLayout.tsx` for price pane; `PaneLegendBar.tsx` for indicator panes): uses `--edge-*` in class names. Price legend tiers: identity (13px semibold + optional letter badge), inline tone-colored O/H/L/C + change (11px mono tabular), context row chips on identity hover (10px mono ticker pills via `legendContextSlot`).
- **Canvas draw loop** (`packages/chart-react/src/engine/renderer.ts`): uses `getChartColors()` / `themeTokens.ts`.

If you change chart background, grid, or axis colors, update `edgeChartColors` / `themeTokens.ts` together — not only CSS.

## Semantic tokens (when to use)

| Token | Typical use |
|-------|-------------|
| `surface-chart` | Chart cell plot background |
| `surface-toolbar` | Top header bar, bottom range bar, segmented tab rail |
| `surface-rail` | Left drawing toolbar and right sidebar icon rails (dark: same as chart bg) |
| `text-rail` / `text-rail-active` | Icon rail idle vs hover/active icon colors (shared left/right rails) |
| `surface-panel` | Right sidebar panels, legend hover backdrop |
| `surface-popover` | Context menus, dropdowns, modals |
| `surface-hover` / `surface-active` | Row/button hover and selected states |
| `border` / `border-subtle` / `border-strong` | Panel dividers; subtle for chart-adjacent strips |
| `text-primary` / `text-strong` | Body copy vs emphasized labels (symbol, active preset) |
| `text-secondary` / `text-muted` | Hints, axis-like labels, section headers |
| `accent-blue` | Links, primary actions, last-price line color |
| `positive` / `negative` | Price change, up/down candles (via `toneTextClass`) |
| `warning` | Stale data, stream interruptions, non-fatal alerts (`ChartFeedStatusBadge`, data-health menu) |

Prefer **semantic** tokens over raw hex. Use `toneTextClass('positive' | 'negative' | 'neutral')` for signed values.

## React primitives

Import from `src/app/components/design-system/index.ts`:

| Primitive | Use for |
|-----------|---------|
| `EdgeButton` / `EdgeIconButton` | Toolbar and header actions; `EdgeButton` supports `variant="primary"` for filled accent CTAs |
| `EdgeMenuItem` / `EdgeMenuSectionHeader` | Context menus and dropdown lists |
| `EdgeModalShell` | Dialog shells (settings, search, confirmations); optional `headerActions` beside title, `footer` for bottom controls; `maxWidth="full"` ≈ `min(96vw, 1400px)` |
| `EdgeSlideOver` | Right-side overlay detail panels (~⅓ or ½ viewport); backdrop + Escape dismiss; portaled to `document.body` |
| `EdgeSearchInput` | Modal search fields |
| `EdgeSegmentedTabs` | 2–4 way panel tabs (Object tree / Data window) |
| `EdgePanelHeader` | Sidebar panel title row |
| `EdgeEmptyState` | Placeholder when no data |
| `EdgeSpinner` | Loading spinners (`sm` / `md`); uses `.edge-spinner` with reduced-motion fallback |
| `EdgeSkeletonLine` | Pulse skeleton bars/lines; uses `.edge-skeleton-pulse` with reduced-motion fallback |
| `EdgeToggle` | Boolean settings rows |

Shared rail styling for left drawing toolbar and right sidebar: `src/app/components/chart-icons/toolbarButtonStyles.ts` — `iconRailShellClass(edge)`, `iconRailButtonClass`, `railMode` prop (`full` \| `compact`) on `DrawingToolbar`, `ChartDrawingRail`, and `SidebarRail`; icons 22/20 px via `edgeLayoutTokens.iconRailIconSize`; active state uses `surface-hover` without ring.

## Surface recipes (canonical examples)

| Surface | Reference file |
|---------|----------------|
| Chart header | `chart-chrome/ChartHeaderBar.tsx` + `styles.ts` — includes enabled **Trade** control when `onOpenTrade` is wired |
| Trade sidebar panel | `sidebar/panels/TradeSidebarPanel.tsx` + `trading/TradeOrderForm.tsx` — docked place/preview/confirm; drawing-bound plan levels; header Trade opens unbound; LIVE confirm on live submit |
| Trade ticket modal (legacy) | `trading/TradeTicketModal.tsx` — thin `EdgeModalShell` wrapper for tests |
| Workspace tab bar | `chart-chrome/WorkspaceTabBar.tsx` — scrollable pills above header at ~75% of chart header height (`h-9`); monogram + symbol + direction + price + % change + `/` layout title; `+` create / close when >1 tab |
| Symbol search pill | `SearchBar.tsx` (compact mode) |
| Context menu | `ContextMenu.tsx` |
| Settings modal | `ChartSettingsModal.tsx` |
| Sidebar icon rail | `sidebar/SidebarRail.tsx` + `toolbarButtonStyles.ts` — main group (watchlist → options → screener → object-tree → account); footer group: theme toggle (sun/moon) then settings cog |
| Docked sidebar panel | `sidebar/{RightSidebar,SidebarPanelShell}.tsx` — `absolute` overlay on chart row (`right-0`); resizable via `SidebarResizeHandle`; chart width unchanged; panel-aware max via `sidebarWidth.ts` (screener: `90% viewport − rail`, cap 1400px; other panels 560px; leaving screener clamps stored width) |
| Floating panel window | `sidebar/{FloatingPanelShell,FloatingPanelHost}.tsx` — draggable/resizable pop-out over chart; **Dock** returns to sidebar; geometry persisted in `layout.sidebar.floatingGeometry` |
| Panel Pop out / Dock / Expand | `sidebar/{PanelPresentationContext,PanelChromeActions,SidebarPanelWidthContext}.tsx` — `PanelPopOutButton` + screener `PanelExpandButton`; presentation in `layout.sidebar.presentation` (`docked` \| `floating`) |
| Screener results heat map | `heatmap/{HeatMapView,HeatMapToolbar}.tsx` + `src/lib/heatmap/` — treemap List/Heat map toggle in screener; see `docs/roadmaps/screener-roadmap.md` |
| Centered modal (short flows) | `EdgeModalShell` — symbol search, confirmations; not for persistent tools (use floating panel instead) |
| Right overlay detail panel | `EdgeSlideOver` — journal trade review, future research/settings sub-panels; overlays content without reflow |
| Object tree / data window | `ObjectTree.tsx` |
| Watchlist panel | `watchlist/WatchlistPanel.tsx` |
| Bottom range bar | `ChartRangeBar.tsx` |
| Chart cell shell | `ChartCell.tsx` — left `DrawingToolbar` rail + flex column (`ChartErrorBoundary` → `EdgeChart` + `ChartRangeBar`) so the range bar matches chart width |
| Chart overlay status stack | `chart-cell/ChartOverlayStatusStack.tsx` + `ChartOverlayDataHealthRow.tsx` — active-cell top-right stack (left of price-axis strip): embedded `ChartFeedStatusBadge` when stale/stream/error; optional inline `TwsRecoverButton` when TWS recovery is needed; icon-only `DataHealthButton` (severity dot + tooltip) on active cell |
| Account picker | `home/AccountPickerMenu.tsx` + `AccountAliasEditor.tsx` — order-account dropdown; optional display aliases (`edge:trading:accountAliases.v1`) via settings gear; IB `accountId` remains execution identity |
| Chart feed status overlay | `chart-cell/ChartFeedStatusBadge.tsx` — stale/stream/error/refreshing feed state (standalone or embedded in the stack) |
| Chart error fallback | `chart-cell/ChartErrorBoundary.tsx` — in-cell error UI with retry and copy-error actions |
| App hydration placeholder | `chart-cell/AppHydrationShell.tsx` — full chrome skeleton (workspace tab bar, header, rails, chart grid, range bar) until `StockApp` layout hydrates; also used by `src/app/loading.tsx` during route load |
| App home hub | `home/HomeShell.tsx` + `home/HomeAppNav.tsx` — responsive Layout 1 tri-pane (≥2560) with dual-stack/tabbed/drawer/hub fallbacks; Continue card + workspace cards; journal preview (recent trades) + research preview; module nav rail (Charts/Journal/Research); no chart bootstrap |
| App module shell | `home/AppModuleShell.tsx` + `home/AppTopHeader.tsx` — full-height module routes with full-width top header (clickable `logo-full-light` → `/home`, chart **data connection** chip, order **account** picker) and `HomeAppNav` rail below the header |
| Journal module | `journal/JournalModuleShell.tsx` + `JournalSubNav.tsx` — `AppModuleShell` + sub-nav (Dashboard / Trades / Settings) with sync/trades providers; trades scoped to header-selected account |
| Options chain table | `options/{OptionsChainView,OptionsChainTable,ChainRowGreeksPopover}.tsx` — sidebar launcher + floating dialog; bid/ask/last spine table, row-hover greeks popover, expiration tabs |
| Chart cold-load overlay | `chart-cell/ChartLoadingOverlay.tsx` — symbol-aware spinner + skeleton bars when candles are loading and empty; rendered from app `EdgeChart.tsx` |

Copy patterns from these files before inventing new markup.

## Anti-patterns

- **Do not** use Tailwind palette utilities (`gray-*`, `blue-*`, `red-*`) in `src/app/components/` for chrome — use `--edge-*` or primitives.
- **Do not** hardcode hex colors in components (`#12131A`, `#1E2030`, …) — add a semantic token if needed.
- **Do not** duplicate modal/menu markup when `EdgeModalShell` / `menuItemClass` already cover the case.
- **Do not** mix landing-page brand tokens (electric green, `#0A0B0E`) into chart app chrome.

Legacy components may still violate these rules; migrate them when touched.

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
