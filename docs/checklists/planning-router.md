# Planning Router

Route every planning request to the correct checklist before proposing implementation steps.

## When to Use

Use this doc whenever generating a plan in Plan mode or when the user asks to plan, scope, or design work before coding.

## Pre-Read (Always)

Before classifying intent, read:

1. [docs/PROJECT-STATUS.md](../PROJECT-STATUS.md) — Current Verified State, Active Work, Task Contracts, Session Log
2. [AGENTS.md](../../AGENTS.md) — harness contract, WIP=1, Definition of Done
3. [docs/CONSTRAINTS.md](../CONSTRAINTS.md) — hard rules for the affected area

Then apply [harness-status-checklist.md](./harness-status-checklist.md) for every plan.

## Architecture Review (Always Evaluate)

After selecting the primary intent checklist, **always** evaluate [architecture-review-checklist.md](./architecture-review-checklist.md).

Every plan must state in **Checklist Review**:

- **Architecture review: N/A** — with a short reason, or
- **Architecture review: Required** — with reviewer type (`architect agent` | `human` | `self-review`) and result (`Pending` | `Passed` | `Blocked`)

Apply the full architecture checklist when work touches any trigger in that doc (package boundaries, shared state, API/provider/persistence contracts, chart runtime, cross-component flows, public exports, new abstractions, performance-sensitive paths, migration/compatibility).

## Intent Classification

Pick one **primary** intent and optional **secondary** intent(s).

| Intent | Use when the user wants to… | Checklist |
|--------|------------------------------|-----------|
| **Feature** | Add new capability, UI, API, provider behavior, chart feature, AI tool, or workflow | [feature-planning-checklist.md](./feature-planning-checklist.md) |
| **Refactor** | Clean up, extract, simplify, or reorganize code without changing user-visible behavior (except explicitly noted) | [refactor-planning-checklist.md](./refactor-planning-checklist.md) |
| **Bugfix** | Fix broken behavior, regression, runtime error, wrong data, UI bug, test failure, or provider failure | [bugfix-planning-checklist.md](./bugfix-planning-checklist.md) |
| **Testing** | Add tests, review coverage, or define verification strategy for existing or planned work | [testing-verification-checklist.md](./testing-verification-checklist.md) |

### Routing Rules

- If the request adds user-visible behavior → **Feature** (even if it also refactors).
- If the request says "fix" or describes incorrect current behavior → **Bugfix**.
- If the request says "refactor" but changes behavior → treat as **Feature** or **Bugfix**; note the mismatch.
- If the request is primarily about verification or test gaps → **Testing** (plus the relevant primary intent checklist).
- Long-running or cross-component work → always also apply **Harness** checklist.
- If a **Bugfix** touches any [Area Ownership](#area-ownership-quick-reference) path beyond a single leaf file, use the **full plan** (not the lightweight stub).

### Ambiguity

If intent is unclear:

1. State the assumed primary intent and why.
2. List what would change the classification.
3. Ask one clarifying question only when the choice materially affects scope or verification.

## Required Plan Sections

Every plan MUST include these sections in order:

### 1. Intent Classification

```md
## Intent Classification
- Primary: Feature | Refactor | Bugfix | Testing
- Secondary: (optional)
- Checklists applied: docs/checklists/...
- Assumptions: (if any)
```

### 2. Checklist Review

Walk the selected checklist(s) and report:

- **Architecture review** — `N/A` (reason) or `Required` (reviewer, result, deferred risks)
- **Aligned** — requirements already satisfied or clearly addressed in the plan
- **Missing** — inputs, evidence, or decisions not yet defined
- **Misalignments** — conflicts with constraints, harness state, or stated intent
- **Risks** — areas likely to break shared behavior
- **Recommendations** — scope changes, sequencing, or verification upgrades before implementation

Do not skip items silently. If an item is N/A, say why.

### 3. Proposed Plan

Concise, actionable implementation steps.

### 4. Verification Plan

Use [testing-verification-checklist.md](./testing-verification-checklist.md) to pick tiers:

- **Focused** — targeted Vitest for changed area
- **Build** — `npm run build` or `npm run build:packages`
- **App-level** — manual/browser flow on `localhost:3003`
- **Full** — `npm run check`

### 5. Harness Update

State exactly what will change in `docs/PROJECT-STATUS.md`:

- Active Work row (add/update/state)
- Task Contract (create/update/clear)
- Session Log entry (yes/no)
- Current Verified State block after completion

### Lightweight plan (contained bugfix only)

When the change is a **single-function bugfix** with no cross-package impact, a 3-line stub may replace the full sections above:

```md
- Intent: Bugfix
- Architecture review: N/A (contained — <one file/one function>)
- Verification: Focused — npm test -- --run <path>
```

Use only when **none** of these apply: shared state, API contract, persistence schema, chart runtime, cross-package path, or multiple Area Ownership paths. Otherwise use the full plan.

## Area Ownership Quick Reference

| Area | Primary paths | Architecture doc |
|------|---------------|------------------|
| Chart engine | `packages/chart-react/`, `packages/chart-core/`, `src/lib/chart/` | `src/lib/chart/ARCHITECTURE.md` |
| Market data | `src/lib/marketData/`, `src/lib/chartDataFeed/`, `services/tws-sidecar/` | `src/lib/marketData/ARCHITECTURE.md` |
| App UI chrome | `src/app/components/`, `src/lib/design-system/` | `src/lib/design-system/ARCHITECTURE.md` |
| AI tools | `src/lib/ai/` | `src/lib/ai/ARCHITECTURE.md` |
| Persistence | `src/lib/persistence/`, `/api/me/*` | `src/lib/persistence/ARCHITECTURE.md` |
| API routes | `src/app/api/` | closest area architecture doc |

## Non-Goals

- Do not create a second planning Cursor rule — routing is enforced through [plan-harness-awareness.mdc](../../.cursor/rules/plan-harness-awareness.mdc).
- Do not start implementation in the planning response unless the user explicitly asks to execute.
