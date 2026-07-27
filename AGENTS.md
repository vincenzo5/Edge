# Communication

Write in the spirit of [ASD-STE100 Simplified Technical English](https://www.asd-ste100.org/): short sentences, active voice, one idea per sentence, and one clear word for one meaning. Full STE dictionary compliance is not required. Prefer one sentence over two, a bullet list over a paragraph, and a direct answer over preamble. Expand only when asked.

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

Before feature work, slice-read [docs/PROJECT-STATUS.md](docs/PROJECT-STATUS.md) per [harness-status-checklist.md](docs/checklists/harness-status-checklist.md) hot windows (Plan vs Execute), then:

```bash
npm run setup              # install from lockfile
npm run check:startup      # fast readiness gate
npm run dev                # Postgres (Docker) + migrate + dev on http://localhost:3003
```

Optional: `scripts/init.sh` (add `--full` for full check). Copy `.env.example` → `.env.local` and set `EDGE_AUTH_SECRET` before first `npm run dev`. Cloud sync requires `DATABASE_URL` and `EDGE_AUTH_SECRET` in `.env.local`.

## Verify

Run focused tests for the area you changed, then `npm run check` when touching shared behavior:

```bash
# Focused (examples)
npm test -- --run src/lib/chart/drawingStore.test.ts
npm test -- --run src/lib/ai/registry.test.ts
npm test -- --run src/app/components/chartContextMenu.test.ts
npm run report:memory   # lab memory scorecard from memory-baseline-latest.json

# Full readiness gate
npm run check
```

## Work Boundaries

Default to WIP=1: keep only one task actively in progress. Do not start adjacent refactors, polish, or follow-up features until the current task has executable completion evidence. Planning → [plan-harness-awareness.mdc](.cursor/rules/plan-harness-awareness.mdc); implementing an approved plan → [execute-from-plan-checklist.md](docs/checklists/execute-from-plan-checklist.md) (skip planning checklists). Large plan sessions (~15–20+ tool calls) → fresh execute via `/handoff` + plan path.

**Layering:** `src/lib` must not import `src/app` — shared types/hooks live below UI (`app` → `lib` → `packages`). Fail-closed gate: `npm run lint:app-lib-boundaries` (also in `check:packages`). Baseline: [docs/evidence/code-org-baseline.txt](docs/evidence/code-org-baseline.txt).

A task is done only when its focused verification passes or a blocker is recorded in `docs/PROJECT-STATUS.md`.

Active work rows in `docs/PROJECT-STATUS.md` must include behavior, state, and completion evidence.

## Definition of Done

Do not declare work complete because code was written or unit tests pass. Completion requires the active work row's completion evidence to pass and the latest result to be recorded.

Use layered verification when risk warrants it: focused tests for contained changes; `npm run build` when touching shared architecture or app wiring; app-level confirmation when a change crosses UI + state + chart engine, API + persistence, or AI tool + app context boundaries.

Do not start refactors, polish, or performance work until the core behavior has passed its completion evidence.

For long-running or cross-component work, write a Task Contract in `docs/PROJECT-STATUS.md` before editing code.

## Session Exit

Before handing off, leave a clean state: update `docs/PROJECT-STATUS.md`, record verification results, note blockers, remove temporary/debug artifacts you created, and make the next action explicit. On execute-from-plan closeout, after **Passing** with quoted evidence, create one git commit for the task (skip if no changes or plan says `Commit: skip`).

Run the smallest verification tier that matches the change; use `npm run check` for broad/shared behavior before merge.

## Repo Layout

| Path | Purpose |
|------|---------|
| `packages/` | `@edge/chart-core`, `@edge/chart-react`, `@edge/ai-tools-*`, `@edge/indicator-runtime` |
| `src/app/components/` | React UI — `StockApp`, `ChartCell`, feature folders, sidebars |
| `src/app/components/design-system/` | `Edge*` primitives; tokens in `src/lib/design-system/` |
| `src/lib/chart/` | App chart adapters (runtime in `@edge/chart-*` packages) |
| `src/lib/marketData/` | Market data service, search, cache, health |
| `src/lib/trading/`, `src/lib/journal/` | Orders, playbooks, broker adapters; trade journal |
| `src/lib/ai/`, `src/lib/persistence/` | AI tool registry; Drizzle schemas + client sync |
| `src/app/api/` | REST — candles, AI tools, persistence |
| `docs/chart/`, `docs/PROJECT-STATUS.md` | Feature inventory; hot harness (`docs/status-archive/` history) |

## Key Docs (read when relevant)

Load topic docs on demand — do not read everything for every task.

| Doc | Read when |
|-----|-----------|
| [docs/PROJECT-STATUS.md](docs/PROJECT-STATUS.md) | Planning work, checking shipped vs active vs deferred — hot windows in [harness-status-checklist.md](docs/checklists/harness-status-checklist.md) |
| [docs/ROADMAP.md](docs/ROADMAP.md) + [docs/roadmaps/](docs/roadmaps/README.md) | Product direction, phase index, and feature-track phasing |
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
- **Scoped guidance → topic docs** — chart, AI, persistence, design system details belong in the docs above.
- **Scoped guidance → Cursor rules/skills** — visual asset production uses `.cursor/rules/visual-assets.mdc` and `.cursor/skills/`; local prod deploy/rollback uses `.cursor/rules/deploy-local-prod.mdc`, `.cursor/skills/deploy-local-prod`, and `/deploy-prod`.
- **Historical lessons → tests** — encode one-off bug fixes as Vitest cases instead of permanent narrative notes.
- **Before adding a rule** — ask whether it belongs in a topic doc, a test, or code comments instead.

Run `npm run lint:instructions` to verify entry-file size and rule scoping.

## Session Continuity

For long-running or interrupted work, update `docs/PROJECT-STATUS.md` before handing off. On execute closeout: `npm run harness:closeout -- --name "…" --evidence-file …` (archives Previous Verified overflow to `docs/status-archive/`).

Record durable architecture decisions in the closest architecture doc rather than a separate decision log unless decisions begin accumulating across multiple areas.

## Doc Maintenance

When a change touches chart architecture, AI tool contracts, persistence schemas, API behavior, or verification expectations, update the closest related doc in the same change:

- Chart engine → `src/lib/chart/ARCHITECTURE.md` + row in `docs/chart/features.md`
- AI tools → `src/lib/ai/ARCHITECTURE.md` + `docs/ai-tools-architecture.md`
- Persistence → `src/lib/persistence/ARCHITECTURE.md`
- Design system → `src/lib/design-system/ARCHITECTURE.md`
- Current status → `docs/PROJECT-STATUS.md`

Local CI only (no GitHub Actions): `npm run hooks:install` → pre-push runs `npm run ci:local`. Full: `npm run check`. Chart perf / prod: deploy pipeline. Optional docs: `EDGE_DOCS_HOOK=1` + `CURSOR_API_KEY`.
