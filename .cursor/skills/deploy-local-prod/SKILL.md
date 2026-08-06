---
name: deploy-local-prod
description: >-
  Ship or promote local Docker production on 127.0.0.1:3000. Use when the user
  says deploy, ship to prod, deploy to prod, promote to production, push to prod,
  rollback production, or wants the latest main revision running in container prod.
---

# Deploy Local Production

Container production only. Legacy worktree/LaunchAgent deploy is retired.

Deep operator detail: [src/lib/observability/ARCHITECTURE.md](../../../src/lib/observability/ARCHITECTURE.md) (Operator runbook).

## Intent routing

| User intent | Pipeline |
|-------------|----------|
| **Ship** (default) — "deploy", "ship to prod", `/deploy-prod` with no input | Agent commits if dirty → `npm run local:prod:ship` |
| **Promote** — SHA/tag given, or "promote only" | Preflight → `local:prod:container:deploy -- --revision <rev>` → status → probe |
| **Rollback** | Preflight → `local:prod:container:rollback` → status → probe |

Default revision for ship: **`HEAD` on `main`**. Do not ask unless branch/revision is ambiguous.

## Ship pipeline

Run when user wants latest work on production.

1. **If worktree dirty** — agent commits safe changes (secret scan; no `.env*` / credentials). Do not run ship until clean.
2. **Ship** — `npm run local:prod:ship`  
   (clean main → `ci:local` → `git push` → `container:deploy --revision HEAD` → status)  
   Deploy gates inside promote: `check:startup` → chart-perf strict → host `tsc` → image build → migrate → health.
3. **Probe** — `curl -sf http://127.0.0.1:3000/healthz` and `curl -sf http://127.0.0.1:3000/readyz`

## Promote pipeline

Run when user gave a specific revision or asked to promote only (no commit/push).

1. **Resolve revision** — SHA, tag, or `HEAD`.
2. **Preflight** — `npm run local:deploy:preflight`
3. **Promote** — `npm run local:prod:container:deploy -- --revision <rev>`
4. **Status** — `npm run local:prod:container:status`
5. **Probe** — `/healthz` and `/readyz` as above

## Rollback pipeline

1. `npm run local:deploy:preflight`
2. `npm run local:prod:container:rollback`
3. `npm run local:prod:container:status`
4. Probe `/healthz` and `/readyz`

## Gate playbooks

On gate failure: fix **only** that blocker, then re-run ship or promote. No feature work.

| Stopped at | Fix | Retry |
|------------|-----|-------|
| `git_clean` / harness / `check:startup` | Fix `PROJECT-STATUS` / instructions lint; recommit | `local:prod:ship` |
| chart-perf | Fix perf regression; restore dirty `docs/perf/*-latest.json` if noise | ship or promote |
| TypeScript / `tsc` | Fix types; recommit | ship or promote |
| image / `next build` | Fix build errors; recommit | ship or promote |
| `/readyz` | `local:infra:verify`, `local:prod:container:logs`; rollback if prod broken | infra fix or rollback |

## Hard rules

- Use **only** `local:prod:container:*` and `local:prod:ship` — never legacy `local:prod:deploy` or LaunchAgent paths.
- Do **not** pass `--skip-startup`, `--skip-chart-perf`, `--skip-typecheck`, or `--skip-infra` unless the user explicitly allows it.
- Do **not** edit secrets, `.env*`, or `.edge/local-prod/production.env`.
- On failure: stop; use failure template; do not retry with improvised commands.

## Success report

- Revision shipped or promoted (from status: `deploy.current`, digest, `container.readyz`)
- Prod URL: `http://127.0.0.1:3000`
- Rollback: `npm run local:prod:container:rollback`

## Failure report template

```
**Stopped at:** <step name>
**Exit:** <code or key log lines>
**Current prod:** <deploy.current from status if available, else unknown>
**Recommended next:**
- <command or check>
```

Common `/readyz` reason codes: `postgres_unavailable`, `redis_unavailable`, `tws_unavailable`.
