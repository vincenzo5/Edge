# Feature Planning Checklist

Use when adding new user-visible capability, API behavior, provider integration, chart feature, AI tool, or workflow.

## Scope and Behavior

- [ ] One-sentence user-visible behavior defined
- [ ] In scope vs out of scope explicitly listed
- [ ] Success criteria stated (what "done" looks like for a user)
- [ ] No adjacent polish or speculative features bundled in

## Harness and WIP

- [ ] Current Active Work in [PROJECT-STATUS.md](../PROJECT-STATUS.md) reviewed
- [ ] WIP=1 respected — existing Active task completed, blocked, or intentionally paused
- [ ] Active Work row planned with behavior, state, completion evidence, and files
- [ ] Task Contract planned if work is long-running or cross-component

## Ownership and Integration

- [ ] Primary ownership area identified (chart, market data, UI, AI, persistence, API)
- [ ] Architecture review applicability decided per [architecture-review-checklist.md](./architecture-review-checklist.md)
- [ ] Closest architecture doc identified and will be read/updated
- [ ] Feature plugs into existing foundation (not a parallel system)
- [ ] Package vs app boundary clear (`packages/` vs `src/`)

## Area-Specific Constraints

### Chart features

- [ ] Uses custom Edge canvas engine — no klinecharts or TradingView embed
- [ ] New indicators/drawings registered through plugin registries
- [ ] Viewport updates stay imperative (no React re-render per pan/wheel tick)
- [ ] Drawing mutations go through `DrawingStore` commands
- [ ] `docs/chart/features.md` row planned if shipping chart behavior

### Market data features

- [ ] Provider-neutral routing through `src/lib/marketData/service/`
- [ ] Request/response validated with Zod schemas
- [ ] Fallback, timeout, and circuit-breaker behavior considered
- [ ] Source/freshness metadata exposed where UI or diagnostics need it
- [ ] Hot store / cache invalidation considered

### UI chrome features

- [ ] Uses `--edge-*` tokens and `Edge*` primitives
- [ ] No ad-hoc Tailwind palette or hardcoded hex in new chrome
- [ ] Loading, empty, error, and disabled states defined

### AI tool features

- [ ] Tool registered in `src/lib/ai/` — no direct React state mutation
- [ ] Inputs validated with Zod
- [ ] Destructive tools require explicit confirmation
- [ ] Linked-layout propagation documented if symbol/range/interval changes

### Persistence features

- [ ] Optimistic concurrency (`baseRevision`) for remote writes
- [ ] App works with localStorage-only when Postgres unavailable
- [ ] No secrets in committed files

## API and Data Contracts

- [ ] New or changed API routes have Zod-validated inputs
- [ ] Error responses do not leak internal details in production
- [ ] SSR-safe behavior considered (localStorage deferral, hydration)
- [ ] Optional-service fallback behavior defined (TWS, IBKR, Postgres)

## Verification

- [ ] Completion evidence defined before implementation (see [testing-verification-checklist.md](./testing-verification-checklist.md))
- [ ] Focused tests planned for new behavior
- [ ] Build tier included if package boundaries touched
- [ ] App-level verification planned when UI + state + engine or API + provider crossed

## Documentation

- [ ] Closest architecture doc update planned
- [ ] `docs/PROJECT-STATUS.md` harness update planned
- [ ] No duplicate docs with `_fixed`, `_new`, `_clean` suffixes
