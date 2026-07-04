# Communication

Answer as simply as possible. Prefer one sentence over two, a bullet list over a paragraph, and a direct answer over preamble. Expand only when asked.

---

# Edge — Agent Entry Point

Edge is a custom financial charting app built on a Canvas 2D engine (`EdgeChart`), with AI tool integration via a shared registry and optional Postgres persistence.

## Tech Stack

- **App**: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **Chart engine**: Custom canvas renderer in `src/lib/chart/` (not TradingView, not klinecharts)
- **Data**: Yahoo Finance via `/api/candles`, `/api/search`, etc.
- **AI tools**: Zod-validated registry in `src/lib/ai/` — in-app, HTTP, and MCP adapters
- **Persistence**: Drizzle ORM + Postgres (optional; localStorage fallback for layout)
- **Tests**: Vitest + Testing Library

## Initialize (every fresh session)

Before feature work, read [docs/PROJECT-STATUS.md](docs/PROJECT-STATUS.md) (Startup Readiness + Active Work), then:

```bash
npm run setup              # install from lockfile
npm run check:startup      # fast readiness gate
npm run dev                # http://localhost:3003
```

Optional: `scripts/init.sh` (add `--full` for full check). Copy `.env.example` → `.env.local` when using persistence or auth.

```bash
npm run dev:with-db        # Postgres + migrate + dev (cloud sync)
npm run db:up              # start Postgres only (optional)
npm run db:migrate         # apply migrations (requires DATABASE_URL)
npm run mcp:edge           # MCP server for external agents
```

Cloud sync requires `DATABASE_URL` and `EDGE_AUTH_SECRET` in `.env.local`. Use `npm run dev:with-db` so Postgres is up before the app bootstraps a dev session. Plain `npm run dev` still works without Postgres (localStorage fallback). Stop Postgres with `npm run db:down` when finished.

## Verify

Run focused tests for the area you changed, then `npm run check` when touching shared behavior:

```bash
# Focused (examples)
npm test -- --run src/lib/chart/drawingStore.test.ts
npm test -- --run src/lib/ai/registry.test.ts
npm test -- --run src/app/components/chartContextMenu.test.ts

# Full readiness gate
npm run check
```

## Work Boundaries

Default to WIP=1: keep only one task actively in progress. Do not start adjacent refactors, polish, or follow-up features until the current task has executable completion evidence.

A task is done only when its focused verification passes or a blocker is recorded in `docs/PROJECT-STATUS.md`.

Active work rows in `docs/PROJECT-STATUS.md` must include behavior, state, and completion evidence.

## Definition of Done

Do not declare work complete because code was written or unit tests pass. Completion requires the active work row's completion evidence to pass and the latest result to be recorded.

Use layered verification when risk warrants it: focused tests for contained changes; `npm run build` when touching shared architecture or app wiring; app-level confirmation when a change crosses UI + state + chart engine, API + persistence, or AI tool + app context boundaries.

Do not start refactors, polish, or performance work until the core behavior has passed its completion evidence.

For long-running or cross-component work, write a Task Contract in `docs/PROJECT-STATUS.md` before editing code.

## Session Exit

Before handing off, leave a clean state: update `docs/PROJECT-STATUS.md`, record verification results, note blockers, remove temporary/debug artifacts you created, and make the next action explicit.

Run the smallest verification tier that matches the change; use `npm run check` for broad/shared behavior before merge.

## Repo Layout

| Path | Purpose |
|------|---------|
| `src/app/components/` | React UI — `StockApp`, `ChartCell`, `EdgeChart`, sidebars |
| `src/lib/design-system/` | Edge tokens, CSS variables, UI primitives for app chrome |
| `src/lib/ai/` | Shared AI tool registry, adapters, session bridge |
| `src/lib/persistence/` | Schemas, repositories, client sync, dev auth |
| `src/app/api/` | REST routes — candles, AI tools, persistence |
| `docs/chart/` | Chart feature inventory, specs, context-menu reference |
| `docs/PROJECT-STATUS.md` | Current work and shipped foundations |

## Key Docs (read when relevant)

Load topic docs on demand — do not read everything for every task.

| Doc | Read when |
|-----|-----------|
| [docs/PROJECT-STATUS.md](docs/PROJECT-STATUS.md) | Planning work, checking shipped vs active vs deferred |
| [docs/CONSTRAINTS.md](docs/CONSTRAINTS.md) | Before any change — hard rules (MUST / MUST NOT) |
| [src/lib/design-system/ARCHITECTURE.md](src/lib/design-system/ARCHITECTURE.md) | Styling app chrome — tokens, `Edge*` primitives, menus, modals, sidebars |
| [src/lib/chart/ARCHITECTURE.md](src/lib/chart/ARCHITECTURE.md) | Chart rendering, drawings, indicators, viewport, panes, context menus |
| [src/lib/ai/ARCHITECTURE.md](src/lib/ai/ARCHITECTURE.md) | Adding or changing AI tools, adapters, or tool permissions |
| [src/lib/persistence/ARCHITECTURE.md](src/lib/persistence/ARCHITECTURE.md) | Sync, schemas, repositories, auth, or `/api/me/*` routes |
| [docs/chart/features.md](docs/chart/features.md) | Shipping or updating chart feature status rows |
| [docs/chart/context-menu-reference.md](docs/chart/context-menu-reference.md) | Context menu parity or copy/paste behavior |
| [docs/ai-tools-architecture.md](docs/ai-tools-architecture.md) | Full AI tool inventory, rollout phases, adapter details |

## Hard Constraints (summary)

See [docs/CONSTRAINTS.md](docs/CONSTRAINTS.md) for the full list. Critical rules:

- Chart work uses the custom Edge canvas engine — do not reintroduce klinecharts or embed TradingView.
- AI capabilities route through `src/lib/ai/` registry — no direct React state manipulation from tools.
- Destructive AI tools require explicit confirmation.
- App UI chrome uses Edge design tokens and primitives — see `src/lib/design-system/ARCHITECTURE.md`.
- Never commit secrets or `.env.local`.

## Instruction Hygiene

This file is a router, not an encyclopedia. Keep it under 150 lines.

- **Global rules only here** — add to this file only non-negotiable constraints that apply to every task.
- **Scoped guidance → topic docs** — chart, AI, persistence, design system, and feature details belong in the docs above.
- **Scoped guidance → Cursor rules/skills** — visual asset production uses `.cursor/rules/visual-assets.mdc` and `.cursor/skills/`.
- **Historical lessons → tests** — encode one-off bug fixes as Vitest cases instead of permanent narrative notes.
- **Before adding a rule** — ask whether it belongs in a topic doc, a test, or code comments instead.

Run `npm run lint:instructions` to verify entry-file size and rule scoping.

## Session Continuity

For long-running or interrupted work, update `docs/PROJECT-STATUS.md` before handing off: current state, completed work, known blockers, verification run/result, and next concrete action.

Record durable architecture decisions in the closest architecture doc rather than a separate decision log unless decisions begin accumulating across multiple areas.

## Doc Maintenance

When a change touches chart architecture, AI tool contracts, persistence schemas, API behavior, or verification expectations, update the closest related doc in the same change:

- Chart engine → `src/lib/chart/ARCHITECTURE.md` + row in `docs/chart/features.md`
- AI tools → `src/lib/ai/ARCHITECTURE.md` + `docs/ai-tools-architecture.md`
- Persistence → `src/lib/persistence/ARCHITECTURE.md`
- Design system → `src/lib/design-system/ARCHITECTURE.md`
- Current status → `docs/PROJECT-STATUS.md`

Optional pre-push automation: `npm run hooks:install` then set `CURSOR_API_KEY` in `.env.local`. The hook runs `npm run docs:auto-update` against unpushed diffs; harness updates require `--evidence-file`.
