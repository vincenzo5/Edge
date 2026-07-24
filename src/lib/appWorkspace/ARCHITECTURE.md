# App Workspace (shell layout)

Pure domain for the single-window **App Workspace** — a binary split-tree of product **tiles** (Chart, Screener, Journal, Scripts, etc.). Chart layout state (`WorkspaceTabsState` / `ChartLayout`) persists **per chart tile** (one layout per tile, no in-chart tab strip).

| Path | Role |
|------|------|
| `types.ts` | `AppWorkspaceDocument`, `LayoutNode`, `TileInstance`, `SurfaceId` |
| `commands.ts` | Pure mutations: open/close/split/move/resize/active/create/duplicate/preset/assign |
| `layoutPresets.ts` | Workspace shell layout catalog (24 presets: geometry placeholders + workflow seeds) |
| `primaryChartTile.ts` | DFS left-first chart tile id (browser tab quote owner) |
| `schema.ts` | Zod parse for persisted documents |
| `storage.ts` | `localStorage` key `tv-ai:app-workspaces:v1` |
| `chartTileBindingSketch.ts` | Per-tile workspace-tabs key helpers + `ChartTileHostBindingContract` |
| `deepLinks.ts` | `buildWorkspaceDeepLink()` + `WORKSPACE_SURFACE_LINKS` for module-route ingress |
| `../app/workspaceSnapshot.ts` | **Different** — chart-tab summary for AI (`AppWorkspaceSnapshot`) |

## Layout model

Binary split tree only:

- `SplitNode`: `direction` `row` \| `column`, fractional `sizes`, two children
- `TileNode`: pointer to `TileInstance` in document `tiles` map

Chart multi-cell grids remain in `ChartLayout` inside a Chart tile — not in this tree.

## Commands

All UI mutations should call command functions in `commands.ts` (or thin React wrappers), not mutate trees ad hoc.

- `createWorkspaceDocument(state, name?)` — append a fresh default document and activate it
- `applyLayoutPreset(doc, presetId)` — replace active document geometry with the preset tree (preserves doc `id`/`name`)
- `assignTileSurface(doc, tileId, surfaceId)` — in-place surface swap on an existing tile (Chart / Screener / Journal / Scripts)

## Layout presets (edit mode)

Twenty-four shell presets in `layoutPresets.ts`:

- **Geometry (20):** empty `placeholder` panes — `single`, `two-cols`, `two-rows`, `two-cols-70-30`, `two-cols-30-70`, `three-cols`, `three-rows`, `main-right-stack`, `main-left-stack`, `main-bottom-stack`, `main-top-stack`, `half-right-stack`, `half-left-stack`, `half-bottom-stack`, `half-top-stack`, `main-right-3`, `main-bottom-3`, `grid-2x2`, `grid-2x3`, `grid-3x2`.
- **Workflow (4):** seeded surfaces — `scan-desk` (Screener/Chart), `trade-desk` (Chart + Screener/Journal stack), `journal-review` (Chart/Journal), `triple-module` (Chart/Screener/Journal).

**Edit flow (primary):** header **Layout** picker → panes (placeholders or seeded) → optional per-pane chooser → **Done**.

**Edit flow (secondary):** drag-to-dock, close — unchanged from tiling dock.

Chart multi-cell templates (`layoutTemplates.ts`) apply **inside** a Chart tile only — not workspace shell geometry.

## Persistence

v1: localStorage list + active document (`tv-ai:app-workspaces:v1`). Provider initializes with `createDefaultWorkspacesState()` and loads persisted layout in `useEffect` only (avoids SSR/client hydration mismatch when tiles include Screener/Journal).

**Phase 2 (shipped):** Shell documents sync via `/api/me/app-workspaces` when Postgres + session are configured. `AppWorkspaceContext` loads local first, races remote hydrate (500ms timeout), and pushes **committed** shell state only (Use-mode autosave + **Done**/Escape commit — not edit drafts). Conflict policy: adopt remote snapshot by `syncRevision`. While layout edit is open, remote apply is deferred; on **Done**/Escape the local commit wins and any deferred remote snapshot is discarded (then pushed), so closed tiles cannot be restored by a stale cloud snapshot.

**Phase 1 (shipped):** Each Chart tile mounts `StockApp` with a tile binding (`tileId`, `isPrimaryChartTile`, optional `chartWorkspaceId`). Local chart content keys:

- Primary chart tile (DFS left-first): legacy `tv-ai:workspace-tabs:v1`
- Other chart tiles: `tv-ai:workspace-tabs:v1:tile:{tileId}` with fresh defaults on first open

Bootstrap rules: non-primary tiles never orphan-adopt remote workspaces; `chartWorkspaceId` on the shell tile seeds/links Postgres sync; first remote create writes `chartWorkspaceId` back to the shell document. Closing a chart tile clears scoped local storage and archives/dismisses its remote when `chartWorkspaceId` is set.

**Phase 0 contracts (frozen):**

- Shell stores geometry + tile surfaces only — **no embedded `ChartLayout`** in `AppWorkspaceDocument`.
- Chart content stays in per-tile `WorkspaceTabsState` + existing `/api/me/chart-workspaces`.
- `ChartTileHost` prop contract: `{ tileId, isPrimaryChartTile, chartWorkspaceId? }` — see [`chartTileBindingSketch.ts`](./chartTileBindingSketch.ts).

**Gaps / next:** User preference pack (Phase 3). Phased plan: [workspace-state-persistence-roadmap.md](../../../docs/roadmaps/workspace-state-persistence-roadmap.md).

## Cross-tile communication

In-process workspace session (React context) for Review→Chart drive. `BroadcastChannel` in `reviewChannel.ts` remains fallback for dual browser tabs only.

## App shell and layout modes

The app **is** the workspace: `/workspace` is the primary shell (not a peer module). Chart, Screener, Journal, and Scripts are **tiles** inside the active `AppWorkspaceDocument`.

| Mode | Session state | Chrome |
|------|---------------|--------|
| **Use** (default) | `layoutEditMode: "use"` in `AppWorkspaceContext` — not persisted | **Workspace pill** (switch / rename / new / duplicate) + **Edit layout**; full-bleed tiles; splitters resize (8px hit target over 1px hairline); autosave after ~400ms |
| **Edit layout** | Toggle via header **Edit layout** / **Done** or `Esc`; baseline snapshot on enter | **Editing · {name}** label + **Layout** preset picker + **Done**; tile headers with reassign + close; drag-to-dock; empty-pane chooser; same splitter resize; **no autosave** until **Done** / `Esc` |

**Exit:** **Done** or **Escape** commits the draft and returns to Use mode (no separate Save button or confirm dialog).

**App context menu:** **Control + right-click** (`ctrlKey && button === 2`) anywhere on the app shell opens a global menu: Edit layout, Order account, Market data, Settings. Over a workspace tile (`data-workspace-tile-id`), a **Change panel** section at the bottom lists Chart / Screener / Journal / Scripts inline (no submenu). Plain right-click keeps chart-scoped menus. In **Use** mode, panel swaps persist immediately; in **Edit** mode they mutate the draft until **Done**.

## App header (module shell)

`AppTopHeader` is shared across `/home`, `/workspace`, and module routes via `AppModuleShell`. Responsibility split:

| Control | Scope | Persistence |
|---------|-------|-------------|
| Workspace pill / Edit layout | Active workspace document | `AppWorkspace` localStorage |
| Market data selector | Chart + watchlist TWS connection | `edge:marketData:connectionId` |
| Trading account picker | Orders, journal filter, account panel | `AccountProvider` |
| Theme toggle | Global app + chart chrome | `edge:app:theme:v1` (`AppThemeProvider`) |
| Settings gear | Application settings shell (content deferred) | — |

Chart sidebar rail retains chart-scoped tools only; **Risk** opens risk settings (panel id `settings`).

**Ingress:** `/chart`, `/screener/*`, `/journal/*` redirect to `/workspace?surface=…` (see `deepLinks.ts`). Legacy screener sub-routes (`/screener/review`, `/screener/keepers`, `/screener/results`) redirect to `screenerView=screens`; workspace ingress coerces any legacy `screenerView` to `screens`. `ScreenerTileSurface` mounts the unified Option A screens+results pane full width (no in-tile Review/Keepers sub-nav). Review/Keepers module code remains dormant. `handleSurfaceIngress` focuses an existing tile in Use mode; opens a new tile in Edit when missing. After apply, ingress query keys are stripped via `workspacePathAfterIngress` (one-shot) so refresh cannot reopen a closed tile from a sticky `?surface=…`. Unrelated params (e.g. `scriptFixture`) are kept. Root `lastModule` for chart/journal/screener/workspace resolves to `/workspace`.

**Browser tab quote:** The **primary** chart tile (first chart in DFS tree order) publishes live symbol + price + day % to `document.title` via `src/lib/app/browserTabQuote.ts`. The favicon stays the Edge candle mark but tints **green** (up) or **red** (down); flat/no-% uses default brand green. `WorkspaceBrowserTabQuote` clears the title when no chart tile exists.

**Naming:** App **workspace** = layout document (split tree). Chart **layout** = single `ChartLayout` per chart tile (`WorkspaceTabsState` pruned to one tab on hydrate).

**Home remote truth:** `/home` workspace cards load local tabs first, then merge `/api/me/chart-workspaces` via `resolveHomeWorkspaceTabs` (500ms local-first race, orphan adopt, late apply) — same chart-workspace merge primitive as chart bootstrap, without pulling watchlist/screener. See [data-serving-efficiency-roadmap.md](../../../docs/roadmaps/data-serving-efficiency-roadmap.md) Phase 2.

## Tile density (UX polish Phase 3)

`TileFrame` wraps tile content in `TileDensityContext`, measuring content width via `ResizeObserver` (`useElementSize`).

| Mode | Width | Behavior |
|------|------:|----------|
| **compact** | &lt; 520px | Collapse nested rails; screener screens → horizontal chips; journal dashboard single-column summary cards; journal tile title row + merged scope chrome |
| **standard** | 520–899px | Two-column journal summary cards; two-column metric grids; screener screens column visible |
| **wide** | ≥ 900px | Full multi-column journal dashboard sections |

Constants: `TILE_DENSITY_BREAKPOINTS`, `TILE_DENSITY_HYSTERESIS` in `src/lib/responsive/layoutConstants.ts`; resolver `resolveTileDensityMode()` in `tileDensity.ts`. Docked/floating screener panels reuse the same 520px narrow threshold via `SCREENER_NARROW_LAYOUT_THRESHOLD`.
