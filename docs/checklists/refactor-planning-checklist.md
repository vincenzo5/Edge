# Refactor Planning Checklist

Use when simplifying, extracting, reorganizing, or cleaning up code without changing user-visible behavior.

## Invariant Definition

- [ ] Behavior invariant stated: "must remain identical except for ___"
- [ ] If user-visible behavior changes, reclassify as Feature or Bugfix
- [ ] Refactor scope bounded — no opportunistic feature additions

## Harness and WIP

- [ ] Current Active Work reviewed; WIP=1 respected
- [ ] Refactor does not block completion evidence on an in-flight feature unless explicitly accepted
- [ ] Harness update planned only if refactor is tracked as its own Active Work item

## Safety Net

- [ ] Existing tests identified that should pass unchanged
- [ ] Missing regression coverage noted before moving code
- [ ] Public/package exports inventoried — no accidental breaking changes
- [ ] Package API snapshot test (`src/test/package-api-snapshot.test.ts`) considered if exports change

## Architecture Boundaries

Use as **Phase 3: Implementation Review** inputs when [architecture-review-checklist.md](./architecture-review-checklist.md) is Required.

- [ ] Canonical direction preserved: `@edge/chart-react` / `@edge/chart-core` are canonical for chart runtime
- [ ] Legacy `src/lib/chart/` paths remain re-exports, not duplicate implementations
- [ ] No new compatibility shims unless persisted data or stable public API requires them
- [ ] Refactor moves code by responsibility, not just file size

## High-Risk Paths

- [ ] Chart pan/zoom/wheel paths — imperative viewport updates preserved
- [ ] DrawingStore command flow — undo/redo not broken
- [ ] Market data routing — provider order, cache keys, hot store unchanged
- [ ] React render boundaries — no new per-tick re-renders in chart interaction
- [ ] AI tool registry contracts unchanged unless explicitly in scope

## Verification

- [ ] Focused regression tests for affected area
- [ ] `npm run build:packages` if package code moved
- [ ] `npm run lint:package-boundaries` if import graph changed
- [ ] `npm run check` only if shared architecture widely touched
- [ ] App-level verification only if refactor crosses UI + engine wiring

## Documentation

- [ ] Architecture doc updated only if structure actually changed
- [ ] No narrative-only constraints added to `docs/CONSTRAINTS.md` unless proven necessary
- [ ] Harness updated if refactor is a tracked work item
