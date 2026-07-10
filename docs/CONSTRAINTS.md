# Repository Constraints

Hard rules for humans and agents. Violations cause bugs, security issues, or agent failures.

## Adding Constraints

When adding a new constraint that is not self-evident, include brief provenance in the same PR:

- **Source** — why the rule exists (bug, security finding, architecture decision)
- **Applies when** — which tasks or areas must follow it
- **Remove when** — what would make the rule obsolete

Prefer encoding one-off lessons as tests instead of permanent narrative constraints. Do not add global rules to [AGENTS.md](../AGENTS.md) when a topic doc or scoped Cursor rule is sufficient.

## Chart Engine

- **MUST** use the custom Edge canvas engine in `src/lib/chart/` for all chart rendering and interaction.
- **MUST NOT** reintroduce klinecharts or embed TradingView Charting Library.
- **MUST** register new indicators and drawings through the plugin registries (`indicators/registry.ts`, `drawings/registry.ts`).
- **MUST NOT** trigger React re-renders on every wheel/pan tick — viewport updates stay imperative via pane handles.
- **MUST** persist drawing changes through `DrawingStore` commands (undo/redo depends on this).

## AI Tools

- **MUST** route all AI capabilities through the shared tool registry in `src/lib/ai/`.
- **MUST NOT** let tools import React or mutate component state directly — use `ToolContext` facades.
- **MUST** validate all tool inputs with Zod schemas before execution.
- **MUST** require explicit confirmation for destructive tools (`delete_drawing`, `clear_watchlist`, `delete_watchlist`, `place_order`).
- **MUST** document linked-layout propagation when tools mutate symbol/range/interval.

## Persistence

- **MUST** use optimistic concurrency (`baseRevision`) for remote writes.
- **MUST NOT** commit `DATABASE_URL`, `EDGE_AUTH_SECRET`, or `.env.local`.
- **MUST** treat persistence as optional — app must work with localStorage-only when Postgres is unavailable.

## Design System

- **MUST** use `--edge-*` CSS variables, `Edge*` primitives (`src/app/components/design-system/`), or helpers from `styles.ts` for app UI chrome in `src/app/components/`.
- **MUST** keep `src/lib/design-system/edge.ts` and `src/app/globals.css` token values in sync — `edge.test.ts` enforces this.
- **MUST** update `edgeChartColors` / `packages/chart-core/src/themeTokens.ts` when changing chart-surface colors that appear on both DOM and canvas.
- **MUST NOT** use ad-hoc Tailwind palette classes (`gray-*`, `blue-*`, `red-*`) or hardcoded hex colors in new app chrome — use semantic Edge tokens.
- **MUST NOT** mix landing-page brand tokens (see `public/brand/BRAND.md`) into in-app chart platform chrome.

*Applies when:* building or restyling toolbars, sidebars, menus, modals, panels, or other React UI in `src/app/components/`. *Source:* Edge design system rollout and TradingView visual parity pass. *Remove when:* superseded by a different token system with equivalent enforcement.

## API Routes

- **MUST** validate request bodies with existing Zod schemas in route handlers.
- **MUST NOT** expose internal error details in production responses.

## Documentation

- **MUST** update the closest architecture or status doc when changing shared behavior (see [AGENTS.md](../AGENTS.md)).
- **MUST NOT** create duplicate docs with suffixes like `_fixed`, `_new`, `_clean`.
- **MUST** keep `docs/chart/features.md` rows accurate when shipping or changing chart features.

## Security

- **MUST** add sensitive files to `.gitignore`.
- **MUST NOT** commit API keys, secrets, or credentials.
- **MUST** use the dev session cookie auth boundary for persistence routes (not production auth).

## Testing

- **MUST** add or update tests for new behavior in the same change.
- **MUST** run focused tests for the changed area before marking work complete.
- **SHOULD** run `npm test -- --run` and `npm run build` before merging architectural changes.
