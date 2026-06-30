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
- **In-chart legend overlay** (`packages/chart-react/src/components/PaneLegendBar.tsx`): uses `--edge-*` in class names.
- **Canvas draw loop** (`packages/chart-react/src/engine/renderer.ts`): uses `getChartColors()` / `themeTokens.ts`.

If you change chart background, grid, or axis colors, update `edgeChartColors` / `themeTokens.ts` together — not only CSS.

## Semantic tokens (when to use)

| Token | Typical use |
|-------|-------------|
| `surface-chart` | Chart cell plot background |
| `surface-toolbar` | Top header bar, bottom range bar, segmented tab rail |
| `surface-panel` | Right sidebar panels, legend hover backdrop |
| `surface-popover` | Context menus, dropdowns, modals |
| `surface-hover` / `surface-active` | Row/button hover and selected states |
| `border` / `border-subtle` / `border-strong` | Panel dividers; subtle for chart-adjacent strips |
| `text-primary` / `text-strong` | Body copy vs emphasized labels (symbol, active preset) |
| `text-secondary` / `text-muted` | Hints, axis-like labels, section headers |
| `accent-blue` | Links, primary actions, last-price line color |
| `positive` / `negative` | Price change, up/down candles (via `toneTextClass`) |

Prefer **semantic** tokens over raw hex. Use `toneTextClass('positive' | 'negative' | 'neutral')` for signed values.

## React primitives

Import from `src/app/components/design-system/index.ts`:

| Primitive | Use for |
|-----------|---------|
| `EdgeButton` / `EdgeIconButton` | Toolbar and header actions; `EdgeButton` supports `variant="primary"` for filled accent CTAs |
| `EdgeMenuItem` / `EdgeMenuSectionHeader` | Context menus and dropdown lists |
| `EdgeModalShell` | Dialog shells (settings, search, confirmations); optional `headerActions` beside title, `footer` for bottom controls |
| `EdgeSearchInput` | Modal search fields |
| `EdgeSegmentedTabs` | 2–4 way panel tabs (Object tree / Data window) |
| `EdgePanelHeader` | Sidebar panel title row |
| `EdgeEmptyState` | Placeholder when no data |
| `EdgeToggle` | Boolean settings rows |

Shared rail styling for left drawing toolbar and right sidebar: `src/app/components/chart-icons/toolbarButtonStyles.ts`.

## Surface recipes (canonical examples)

| Surface | Reference file |
|---------|----------------|
| Chart header | `chart-chrome/ChartHeaderBar.tsx` + `styles.ts` |
| Symbol search pill | `SearchBar.tsx` (compact mode) |
| Context menu | `ContextMenu.tsx` |
| Settings modal | `ChartSettingsModal.tsx` |
| Sidebar icon rail | `sidebar/SidebarRail.tsx` + `toolbarButtonStyles.ts` |
| Object tree / data window | `ObjectTree.tsx` |
| Watchlist panel | `watchlist/WatchlistPanel.tsx` |
| Bottom range bar | `ChartRangeBar.tsx` |

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
