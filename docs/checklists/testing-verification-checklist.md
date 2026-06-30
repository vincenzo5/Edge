# Testing and Verification Checklist

Use when choosing verification tiers for any plan, and as a secondary checklist for feature, refactor, and bugfix work.

## Define Completion Evidence First

- [ ] Evidence defined before implementation starts
- [ ] Evidence matches Definition of Done in [AGENTS.md](../../AGENTS.md)
- [ ] Work not marked **Passing** until evidence actually passes

## Verification Tiers

| Tier | Command / action | Use when |
|------|------------------|----------|
| **Focused** | `npm test -- --run <paths>` | Contained behavior change in one area |
| **Build** | `npm run build:packages` or `npm run build` | Package boundaries, exports, or shared build graph touched |
| **Startup** | `npm run check:startup` | Harness, instruction files, or active-area smoke |
| **App-level** | Manual flow on `http://localhost:3003` | UI + state + engine, API + provider, or live sidecar |
| **Full** | `npm run check` | Broad/shared behavior before merge |

Pick the **smallest tier that matches risk**, then add higher tiers when boundaries are crossed.

When **Architecture review: Required**, consider Build, App-level, or Full tiers per the triggers below.

## Risk-to-Tier Mapping

### Always run Focused when

- [ ] New or changed behavior has a test file in the same change
- [ ] Bug fix includes a regression test

### Add Build when

- [ ] `packages/chart-react/` or `packages/chart-core/` changed
- [ ] Public package exports changed
- [ ] App imports from moved package paths

### Add Startup when

- [ ] `docs/PROJECT-STATUS.md`, `AGENTS.md`, or `.cursor/rules/` changed
- [ ] Instruction validator or harness smoke implicated

### Add App-level when

- [ ] Chart rendering or interaction verified visually
- [ ] Market data provider routing/fallback needs live or dev-server check
- [ ] Data Health, recovery, or sidecar control flows involved
- [ ] Crosshair, drawing sync, or layout sync behavior changed

### Add Full when

- [ ] Shared architecture or multiple ownership areas changed
- [ ] Package boundaries + app wiring + API routes in one change
- [ ] Pre-merge confidence needed beyond focused coverage

## Area Test Pointers

See [PROJECT-STATUS.md](../PROJECT-STATUS.md) § Verification for Active Areas. Common focused paths:

```bash
# Chart engine
npm test -- --run packages/chart-react/src/engine/
npm test -- --run packages/chart-react/src/EdgeChart.test.tsx

# Market data
npm test -- --run src/lib/marketData/
npm test -- --run src/lib/chartDataFeed/

# AI tools
npm test -- --run src/lib/ai/

# Design system / UI chrome
npm test -- --run src/lib/design-system/
npm test -- --run src/app/components/chart-chrome/

# Package boundaries
npm run lint:package-boundaries
npm run typecheck:packages
npm run build:packages
```

## Live / Collection Checks (when relevant)

- [ ] `npm run tws:probe` — TWS/Gateway path
- [ ] `npm run ibkr:probe` — IBKR Client Portal path
- [ ] `npm run perf:market-data` — performance regression for market-data changes

## Record Results

- [ ] Exact commands and pass/fail recorded in Active Work row
- [ ] Pending app-level checks explicitly noted, not silently omitted
- [ ] Blockers recorded if live verification cannot run locally
