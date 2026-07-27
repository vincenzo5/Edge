---
name: deploy-local-prod
description: >-
  Promote or rollback local Docker production on 127.0.0.1:3000 using
  local:prod:container:* commands. Use when the user says deploy to prod,
  promote to production, push to prod, rollback production, or wants to ship
  a tested Git revision to local container production.
---

# Deploy Local Production

Container production only. Legacy worktree/LaunchAgent deploy is retired.

Deep operator detail: [src/lib/observability/ARCHITECTURE.md](../../../src/lib/observability/ARCHITECTURE.md) (Operator runbook).

## Deploy pipeline

Run in order. Stop on first nonzero exit.

1. **Resolve revision** — SHA, tag, or `HEAD`. If the user gave none, ask once; do not guess.
2. **Preflight** — `npm run local:deploy:preflight`
3. **Promote** — `npm run local:prod:container:deploy -- --revision <rev>`  
   (deploy itself runs `check:startup`, then `CHART_PERF_BUDGET_STRICT=1 npm run perf:chart`, then build/migrate/start)
4. **Status** — `npm run local:prod:container:status`
5. **Probe** — `curl -sf http://127.0.0.1:3000/healthz` and `curl -sf http://127.0.0.1:3000/readyz`

## Rollback pipeline

When intent is rollback (not promote):

1. `npm run local:deploy:preflight`
2. `npm run local:prod:container:rollback`
3. `npm run local:prod:container:status`
4. Probe `/healthz` and `/readyz` as above

## Hard rules

- Use **only** `local:prod:container:*` for promote/rollback — never legacy `local:prod:deploy` or LaunchAgent paths.
- Do **not** pass `--skip-startup`, `--skip-chart-perf`, or `--skip-infra` unless the user explicitly allows it.
- Do **not** edit secrets, `.env*`, or `.edge/local-prod/production.env`.
- Do **not** start adjacent coding, refactors, or harness updates unless asked.
- On failure: stop; do not retry with improvised commands.

## Success report

- Revision promoted or rolled back (from status output: `deploy.current`, digest, `container.readyz`)
- Prod URL: `http://127.0.0.1:3000`
- Rollback command if promote succeeded: `npm run local:prod:container:rollback`

## Failure report template

Use this structure when any step fails:

```
**Stopped at:** <step name>
**Exit:** <code or key log lines>
**Current prod:** <deploy.current from status if available, else unknown>
**Recommended next:**
- <command or check, e.g. local:prod:container:logs, local:infra:verify, rollback>
```

Common `/readyz` reason codes: `postgres_unavailable`, `redis_unavailable`, `tws_unavailable`.
