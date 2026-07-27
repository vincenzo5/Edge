# Planning Router

Route every planning request to the correct checklist before proposing implementation steps.

## When to Use

Use this doc whenever generating a plan in Plan mode or when the user asks to plan, scope, or design work before coding.

## Pre-Read (Always)

Before classifying intent, read:

1. [docs/PROJECT-STATUS.md](../PROJECT-STATUS.md) — hot windows per [harness-status-checklist.md](./harness-status-checklist.md): Current Verified State top block; Active Work + Task Contract for this track; Session Log only if handoff/blocker
2. [AGENTS.md](../../AGENTS.md) — harness contract, WIP=1, Definition of Done
3. [docs/CONSTRAINTS.md](../CONSTRAINTS.md) — hard rules for the affected area

Then apply [harness-status-checklist.md](./harness-status-checklist.md) for every plan.

After Plan vs Execute routing, classify `Branch:` per [plan-harness-awareness.mdc](../../.cursor/rules/plan-harness-awareness.mdc) and the intent→branch router in [docs/harness/README.md](../harness/README.md) — before deep topic architecture reads.

## Architecture Review (Always Evaluate)

After selecting the primary intent checklist, **always** evaluate [architecture-review-checklist.md](./architecture-review-checklist.md).

Every plan must record the architecture decision in **Intent Classification** or **Checklist Review** (compact form):

- **Arch: N/A** — short reason, or
- **Arch: Required** — reviewer (`architect agent` | `human` | `self-review`) and result (`Pending` | `Passed` | `Blocked`)

Do not expand into an Aligned essay — checklist walk is for the planner, not the plan output.

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

Walk selected checklists internally. Every plan MUST include these sections in order (compact output):

### 1. Intent Classification

```md
## Intent Classification
- Branch: <ENGINE|DATA|LIVE|AGENT|APP|OPS|HARNESS> (secondary: <lane|none>)
- Primary / Secondary. Arch: N/A (reason) | Required (reviewer, Pending|Passed|Blocked).
- Assumptions: only non-obvious deltas (omit checklist file lists).
```

### 2. Checklist Review

Deltas only — do not skip silently; omit sections with nothing to report:

- **Missing** — inputs, evidence, or decisions not yet defined
- **Misalignments** — conflicts with constraints, harness state, or stated intent
- **Risks / Decisions** — non-obvious breakage or scope choices

**MUST NOT:** Aligned essays, checklist link lists, roadmap restatements, Recommendations boilerplate.

### 3. Proposed Plan

Numbered steps with concrete files. Link roadmaps instead of restating prior phases. Mermaid only when topology ≠ the step list. Frontmatter todos: 5–8 words; body owns detail.

### 4. Verification Plan

Use [testing-verification-checklist.md](./testing-verification-checklist.md) to pick tiers internally. Write only tiers that apply:

- **Focused** — `npm test -- --run <paths>` (required when code changes)
- **Build** — `npm run build` or `npm run build:packages`
- **App-level** — manual/browser flow on `localhost:3003`
- **Full** — `npm run check`

Omit "not required" tier essays.

### 5. Harness Update

One line: Activate `<name>`; WIP=1; on Passing quote evidence; Task Contract / Session Log if cross-session; `Commit: yes` (default) or `Commit: skip (reason)`.

### Do not drop

Architecture decision; focused command when code changes; app-level when UI+state / API+persist / AI+app cross; harness activate + quoted evidence; concrete files for non-trivial work.

### Compact example

```md
## Intent Classification
- Branch: APP (secondary: none)
- Primary: Feature. Arch: Required (self-review, Pending).

## Checklist Review
- Missing: `/api/me/foo` route not defined.
- Risk: dual source of truth if header and Settings diverge.

## Proposed Plan
1. Add schema + repo in `src/lib/persistence/`.
2. Wire Settings to `useFooList`.

## Verification Plan
- Focused: `npm test -- --run src/lib/persistence src/app/api/me/foo`
- App-level: Settings → edit label → reload preserves

## Harness Update
Activate Foo Phase 1; Passing with quoted Vitest counts; Commit: yes.
```

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

## Implementing an approved plan

When the user asks to implement (not plan), use [execute-from-plan-checklist.md](./execute-from-plan-checklist.md) and [execute-from-plan.mdc](../../.cursor/rules/execute-from-plan.mdc) — do not re-walk this router or intent checklists.

## Non-Goals

- Do not create a second planning Cursor rule — routing is enforced through [plan-harness-awareness.mdc](../../.cursor/rules/plan-harness-awareness.mdc).
- [execute-from-plan.mdc](../../.cursor/rules/execute-from-plan.mdc) is the implement path, not a second planning rule.
- Do not start implementation in the planning response unless the user explicitly asks to execute.
