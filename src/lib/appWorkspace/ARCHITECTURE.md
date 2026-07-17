# App Workspace (shell layout)

Pure domain for the single-window **App Workspace** — a binary split-tree of product **tiles** (Chart, Screener, Journal, etc.). Chart layout state (`WorkspaceTabsState` / `ChartLayout`) still persists per chart tile, but the UI is **one layout per chart tile** (no in-chart tab strip).

| Path | Role |
|------|------|
| `types.ts` | `AppWorkspaceDocument`, `LayoutNode`, `TileInstance`, `SurfaceId` |
| `commands.ts` | Pure mutations: open/close/split/move/resize/active/create/duplicate/preset/assign |
| `layoutPresets.ts` | Workspace shell layout catalog (8 presets → placeholder tile trees) |
| `primaryChartTile.ts` | DFS left-first chart tile id (browser tab quote owner) |
| `schema.ts` | Zod parse for persisted documents |
| `storage.ts` | `localStorage` key `tv-ai:app-workspaces:v1` |
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
- `applyLayoutPreset(doc, presetId)` — replace active document geometry with preset placeholder tiles (preserves doc `id`/`name`)
- `assignTileSurface(doc, tileId, surfaceId)` — in-place surface swap on an existing tile (Chart / Screener / Journal)

## Layout presets (edit mode)

Eight shell presets in `layoutPresets.ts` (`single`, `two-cols`, `two-rows`, `two-cols-70-30`, `three-cols`, `main-right-stack`, `main-bottom-stack`, `grid-2x2`). Each builds a binary split tree of `placeholder` tiles.

**Edit flow (primary):** header **Layout** picker → empty panes → per-pane chooser (Chart / Screener / Journal) → **Done**.

**Edit flow (secondary):** drag-to-dock, close — unchanged from tiling dock.

Chart multi-cell templates (`layoutTemplates.ts`) apply **inside** a Chart tile only — not workspace shell geometry.

## Persistence

v1: localStorage list + active document. Provider initializes with `createDefaultWorkspacesState()` and loads persisted layout in `useEffect` only (avoids SSR/client hydration mismatch when tiles include Screener/Journal).

## Cross-tile communication

In-process workspace session (React context) for Review→Chart drive. `BroadcastChannel` in `reviewChannel.ts` remains fallback for dual browser tabs only.

## App shell and layout modes

The app **is** the workspace: `/workspace` is the primary shell (not a peer module). Chart, Screener, and Journal are **tiles** inside the active `AppWorkspaceDocument`.

| Mode | Session state | Chrome |
|------|---------------|--------|
| **Use** (default) | `layoutEditMode: "use"` in `AppWorkspaceContext` — not persisted | **Workspace pill** (switch / rename / new / duplicate) + **Edit layout**; full-bleed tiles; splitters resize |
| **Edit layout** | Toggle via header **Edit layout** / **Done** or `Esc` | **Editing · {name}** label + **Layout** preset picker + **Done**; tile headers with reassign + close; drag-to-dock; empty-pane chooser |

**Ingress:** `/chart`, `/screener/*`, `/journal/*` redirect to `/workspace?surface=…` (see `deepLinks.ts`). `handleSurfaceIngress` focuses an existing tile in Use mode; opens a new tile in Edit when missing. Root `lastModule` for chart/journal/screener/workspace resolves to `/workspace`.

**Browser tab quote:** The **primary** chart tile (first chart in DFS tree order) publishes live symbol + price + day % to `document.title` via `src/lib/app/browserTabQuote.ts`. The favicon stays the Edge candle mark but tints **green** (up) or **red** (down); flat/no-% uses default brand green. `WorkspaceBrowserTabQuote` clears the title when no chart tile exists.

**Naming:** App **workspace** = layout document (split tree). Chart **layout** = single `ChartLayout` per chart tile (`WorkspaceTabsState` pruned to one tab on hydrate).
