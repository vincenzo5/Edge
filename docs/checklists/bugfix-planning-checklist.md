# Bugfix Planning Checklist

Use when fixing broken behavior, regressions, runtime errors, wrong data, UI bugs, test failures, or provider failures.

## Reproduction and Characterization

- [ ] Failure described concretely (steps, inputs, expected vs actual)
- [ ] Reproduction path identified (test, manual flow, provider state, environment)
- [ ] Smallest broken contract identified (schema, cache, renderer, sync, provider, hydration, etc.)
- [ ] Regression introduced by recent change? If yes, link to Active Work or Session Log entry

## Harness and WIP

- [ ] Checked whether bug relates to current Active Work
- [ ] If fixing Active Work item, plan updates completion evidence on that row
- [ ] If unrelated bug, ensure fix does not expand scope into feature work

## Root Cause

- [ ] Plan targets cause, not just symptom
- [ ] Architecture review Required if fix changes or reveals a contract gap (see [architecture-review-checklist.md](./architecture-review-checklist.md))
- [ ] Edge states considered:
  - TWS/IBKR/Postgres unavailable
  - Empty or stale cache / hot store
  - SSR hydration vs client-only storage
  - Off-hours null quote/option fields
  - Gateway timeout / circuit breaker open
  - Sidebar resize / canvas dimension changes

## Area-Specific Checks

### Chart bugs

- [ ] Data series replacement on symbol change
- [ ] Viewport, crosshair, and drawing state interactions
- [ ] Canvas resize / layout effect redraw timing
- [ ] Package engine vs app wrapper (`EdgeChart`, `ChartCell`) boundary

### Market data bugs

- [ ] Provider source metadata and fallback path
- [ ] Cache key correctness and invalidation
- [ ] Timeout and health-gate behavior
- [ ] Sidecar vs Next.js API vs client feed alignment

### UI bugs

- [ ] State sync between context providers and panels
- [ ] Keyboard/accessibility if interaction bug
- [ ] Edge design tokens not masking layout issues

## Fix Quality

- [ ] Regression test planned that fails before fix and passes after
- [ ] No unrelated refactors bundled in the fix PR
- [ ] Error handling improved at the appropriate boundary only

## Verification

- [ ] Focused test for the regression
- [ ] Related area tests run if shared code touched
- [ ] App-level verification when bug crosses UI + data + engine
- [ ] Live provider check when bug is environment-specific (TWS, IBKR)

## Documentation

- [ ] Harness Active Work row updated with latest verification result
- [ ] Architecture doc updated only if bug revealed a contract gap worth documenting
- [ ] Prefer encoding one-off lessons as tests over permanent narrative constraints
