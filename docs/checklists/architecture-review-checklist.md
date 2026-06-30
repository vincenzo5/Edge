# Architecture Review Checklist

Cross-cutting checklist applied to **every** plan. Not a primary intent — use alongside Feature, Refactor, Bugfix, or Testing checklists.

## When Required

Every plan must state one of:

- **Architecture review: N/A** — with a short reason (e.g. single-file copy change, no boundary or contract impact)
- **Architecture review: Required** — apply this checklist fully; record reviewer type and result

Apply this checklist when proposed work touches **any** of:

- Package/app boundaries (`packages/` vs `src/`)
- Shared state ownership (context providers, hot store, layout sync, drawing sync)
- API, schema, provider, or persistence contracts
- Chart engine/runtime architecture
- Cross-component flows (UI + API + provider, chart engine + app, AI tool + app context)
- Public exports or stable interfaces
- New abstractions, registries, services, or adapters
- Performance-sensitive paths (pan/zoom, hot store, quote streams, canvas redraw)
- Migration or backward compatibility (layout schema, persisted data, package re-exports)

If none apply, record **N/A** with the reason. Do not skip the decision silently.

## Reviewer and Status

Record in the plan **Checklist Review** section:

| Field | Values |
|-------|--------|
| Applicability | `N/A` \| `Required` |
| Reviewer | `architect agent` \| `human` \| `self-review` |
| Result | `Pending` \| `Passed` \| `Blocked` |
| Deferred risks | Explicit list or `none` |

For **Required** reviews, walk all four phases below. For **N/A**, skip phases and state why triggers did not apply.

## Phase 1: Intake Review

Before proposing implementation:

- [ ] Primary ownership area identified (see [planning-router.md](./planning-router.md) § Area Ownership)
- [ ] Closest architecture doc identified and read
- [ ] Existing system shape understood — no parallel system proposed without justification
- [ ] Work plugs into existing foundation (service layer, registries, design tokens, tool registry)
- [ ] Package vs app boundary clear for touched paths

## Phase 2: Design Review

Before coding:

- [ ] Proposed data/control flow is explicit (who owns state, who reads/writes, sync boundaries)
- [ ] Dependency direction is correct (app → packages; providers → service; tools → facades, not React)
- [ ] New abstractions justified by real complexity — not speculative layers
- [ ] Public contracts and compatibility risks identified (exports, schemas, persisted layout, API responses)
- [ ] Failure modes and boundaries explicit (fallback, timeout, SSR, optional services)
- [ ] Conflicts with [CONSTRAINTS.md](../CONSTRAINTS.md) resolved or escalated

## Phase 3: Implementation Review

During implementation:

- [ ] Code stays within intended ownership boundaries
- [ ] No unrelated refactor or architecture drift bundled in
- [ ] State, side effects, and async boundaries remain testable
- [ ] Performance-sensitive invariants preserved (imperative viewport, no per-tick React re-renders, cache key correctness)
- [ ] Refactor boundary checks satisfied when applicable (see [refactor-planning-checklist.md](./refactor-planning-checklist.md) § Architecture Boundaries)

## Phase 4: Exit Review

Before marking work **Passing**:

- [ ] Verification tier matches architectural risk (see [testing-verification-checklist.md](./testing-verification-checklist.md))
- [ ] Architecture doc updated if contracts or structure changed
- [ ] Harness records architecture review result when work is tracked in Active Work
- [ ] Deferred architecture risks documented explicitly or marked `none`

## Area Ownership Quick Reference

Use the table in [planning-router.md](./planning-router.md) § Area Ownership Quick Reference — do not duplicate area docs here.

## Non-Goals

- Do not require human architect sign-off for trivial, single-file changes — **N/A** with reason is valid.
- Do not add a fifth primary intent — architecture review is cross-cutting only.
- Do not create duplicate architecture narrative in `docs/CONSTRAINTS.md` unless a proven gap requires it.
