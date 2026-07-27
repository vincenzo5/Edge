# OPS — Local production

**Purpose:** Container deploy/rollback, readyz, HTTPS, env verify, secret-free health probes. Owns production-ops invariants on local Docker.

## Seed

- Fail closed on sensitive APIs; secret-free probes — see [Security](../../CONSTRAINTS.md#security) and [Observability](../../CONSTRAINTS.md#observability).
- **Never:** connection strings or stacks in `/healthz`/`/readyz` JSON; commit secrets; skip preflight on promote.

## Load set

Read after this pack, before deep edits:

- [.cursor/skills/deploy-local-prod/SKILL.md](../../../.cursor/skills/deploy-local-prod/SKILL.md)
- [.cursor/rules/deploy-local-prod.mdc](../../../.cursor/rules/deploy-local-prod.mdc)
- [docs/roadmaps/local-production-containerization-roadmap.md](../../roadmaps/local-production-containerization-roadmap.md)

## Sensors

Scoped to change:

```bash
npm run local:prod:container:status
npm run local:prod:verify
npm run local:deploy:preflight
npm run watch:readyz   # when health/readyz touched
npm run report:production-errors   # when prod error surfaces touched
```

Promote/rollback: `/deploy-prod` or `local:prod:container:deploy` / `rollback` per skill.

App-level: probe `http://127.0.0.1:3000/readyz` — JSON must be secret-free.

## Status prefix

`OPS — …` (e.g. `OPS — container deploy`, `OPS — readyz hardening`).

## Security pins

| id | note |
|----|------|
| SEC-01 | Sensitive files in `.gitignore` |
| SEC-02 | No committed secrets |
| SEC-04 | API key fail-closed |
| SEC-05 | Trusted proxy / client IP |
| SEC-08 | Dev session auto-bootstrap gate |
| SEC-09 | `/api/dev/local-errors` prod 404 |
| SEC-10 | Cron secret required |
| SEC-21 | No required paid observability SaaS |
| SEC-22 | `redactDiagnostic` on ops surfaces |
| SEC-23 | Secret-free health probes |

Full ledger: [security-invariant-ledger.md](../security-invariant-ledger.md).
