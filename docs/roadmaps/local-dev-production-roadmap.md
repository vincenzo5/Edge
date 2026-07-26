# Local Development and Production Roadmap

Run a stable production build and the active development server concurrently on one macOS machine, with shared Docker infrastructure and explicit environment isolation.

**Last updated:** 2026-07-25

**Status:** Phase 0 **Passing** (2026-07-25); Phase 1 **Passing** (2026-07-25); Phase 2 **Passing** (2026-07-25); Phase 3 **Passing** (2026-07-25); Phase 4 **Passing** (2026-07-26); Phase 5 **Passing**.

**Related:** [Shared Cache Topology](./shared-cache-topology-roadmap.md), [Production Observability](./production-observability-roadmap.md), [Security Hardening](./security-hardening-roadmap.md), [Market Data Architecture](../../src/lib/marketData/ARCHITECTURE.md), [Observability Architecture](../../src/lib/observability/ARCHITECTURE.md), [Project Status](../PROJECT-STATUS.md), [Repository Constraints](../CONSTRAINTS.md).

---

## Intent Classification

- **Primary:** Feature — add a repeatable local production deployment alongside the existing development workflow.
- **Secondary:** Operations and testing — isolate configuration/data, manage process lifecycle, verify promotion and rollback.
- **Architecture review:** **Required** — self-review **Passed** for Phase 0. The validator is static and side-effect-free; it preserves runtime ownership boundaries, emits fixed redacted diagnostics, and leaves infrastructure/process changes to later phases.
- **Assumptions:**
  - One macOS host, one production Next.js process, and one development Next.js process.
  - Redis and Postgres remain Docker services; the Next.js and TWS processes remain host-native.
  - Development is manually started; production starts automatically and survives terminal closure/reboot.
  - Short production downtime during an explicit deploy is acceptable; zero-downtime deployment is not required.
  - The production app is private/local unless a later phase adds an HTTPS reverse proxy.

---

## Checklist Review

- **Existing foundation:** Docker Compose already runs Postgres and ephemeral Redis; Redis adapters, fail-loud production behavior, health reporting, and `EDGE_CACHE_ENV` key isolation already ship.
- **Missing:** separate production runtime directory, separate Postgres databases, production environment validation, managed production lifecycle, explicit promotion/rollback, and concurrent-environment proof.
- **Risks:**
  - Running `next dev` and `next start` from one checkout would race on `.next`; separate runtime directories are mandatory.
  - One Redis process is a shared failure and memory-pressure domain even though keys are isolated.
  - Development must never run `FLUSHALL`, alter production-prefixed keys, or own/restart the production TWS sidecar.
  - Development migrations must not target the production database.
  - `NEXT_PUBLIC_*` values are build-time inputs; production must build with the production environment loaded.
  - Production secrets must remain outside Git and use restrictive file permissions.
- **Decisions:**
  - Keep one Docker Redis instance and isolate keys with `EDGE_CACHE_ENV=dev|prod`.
  - Keep one Docker Postgres server but use separate `edge_dev` and `edge_prod` databases.
  - Use the current checkout for development and a dedicated production worktree for the stable build.
  - Use macOS `launchd` for the production process; do not add a Node process-manager dependency.
  - Production owns the broker sidecar. Development defaults to `TWS_ENABLED=false` and uses provider fallbacks unless broker testing is explicitly enabled.

---

## End-state topology

```text
macOS host
├── development checkout
│   └── next dev → 127.0.0.1:3003
├── production worktree (stable revision)
│   └── next start → 127.0.0.1:3000
├── production TWS sidecar / IB Gateway
│   └── production-owned host processes
└── Docker Compose
    ├── Postgres
    │   ├── edge_dev
    │   └── edge_prod
    └── Redis (single ephemeral instance)
        ├── edge:dev:1:md:…
        └── edge:prod:1:md:…
```

| Concern | Development | Production |
|---------|-------------|------------|
| App port | `127.0.0.1:3003` | `127.0.0.1:3000` |
| Runtime | `next dev` | built `next start` |
| Source | active working checkout | dedicated stable worktree |
| Postgres database | `edge_dev` | `edge_prod` |
| Redis URL | `redis://localhost:6379` | `redis://localhost:6379` |
| Redis key environment | `EDGE_CACHE_ENV=dev` | `EDGE_CACHE_ENV=prod` |
| Redis requirement | optional/fallback allowed | required/fail-loud |
| API auth | `dev-open` on loopback | API key + normal session boundary |
| TWS ownership | disabled by default | authoritative sidecar owner |
| Lifecycle | manually started | `launchd` managed |

---

## Scope

### In scope

- Concurrent development and production servers on separate ports and build directories.
- Shared Docker Redis with tested key isolation.
- Shared Docker Postgres server with separate databases.
- Separate local environment files and secrets.
- Production build, start, stop, status, deploy, and rollback commands.
- Production startup on reboot and restart after unexpected process exit.
- Health, readiness, cache-backend, persistence-isolation, and reboot verification.
- A documented promotion path from a tested Git revision to production.

### Out of scope

- Cloud hosting, Kubernetes, Redis Cluster, or multiple production Node processes.
- Zero-downtime or blue/green deployment.
- Sharing durable production user data with development.
- Exposing the development server to the LAN or internet.
- Containerizing the Next.js or TWS processes.
- A third staging environment.
- Paid monitoring or deployment services.

---

## Success criteria

1. Development and production run concurrently without sharing `.next`, ports, environment files, or Postgres databases.
2. Both processes use the same Redis instance while `dev` and `prod` keys remain disjoint.
3. Production refuses to become ready when required Redis or Postgres is unavailable.
4. Development changes do not affect the running production revision until an explicit deploy.
5. Production restarts after a process crash and host reboot without starting development.
6. A failed production health check leaves the prior known-good revision recoverable through one rollback command.
7. Production secrets are untracked, permission-restricted, and absent from logs and verification artifacts.
8. Production is the only environment allowed to own/recover the production TWS sidecar.

---

## Phase 0 — Contract and preflight

**Outcome:** Freeze the local deployment contract and reject unsafe or ambiguous configuration before any production process is introduced.

**Frozen constants:** development uses the active checkout, `.env.local`,
`127.0.0.1:3003`, `edge_dev`, and `EDGE_CACHE_ENV=dev`. Production uses the
sibling `<checkout-name>-production` worktree, `.env.production.local`,
`127.0.0.1:3000`, `edge_prod`, and `EDGE_CACHE_ENV=prod`. The production
worktree is clean and detached at an explicitly selected commit/tag; promotion
never follows a moving branch implicitly. The production env file permits no
group/world access.

| Work item | Scope |
|-----------|-------|
| Deployment constants | Name the two ports, runtime paths, database names, Redis environment segments, and production worktree branch/revision policy |
| Environment contract | Extend `.env.example` with concise dev/prod profiles without adding real secrets |
| Preflight validator | Add a script that validates port separation, distinct database names/secrets, production auth, Redis-required settings, loopback binding, and TWS ownership |
| Command surface | Add small, non-interactive npm commands for preflight and environment status |
| Documentation | Keep this roadmap, Market Data Redis guidance, and Observability operator guidance consistent |

**Primary files:** `.env.example`, `package.json`, `scripts/validate-local-deploy.mts`, `src/lib/marketData/ARCHITECTURE.md`, `src/lib/observability/ARCHITECTURE.md`.

**Commands:** `npm run local:deploy:preflight` validates both profiles and exits
nonzero for unsafe configuration; `npm run local:deploy:status` prints only
redacted contract metadata. Both accept `--dev-root`, `--prod-root`,
`--dev-env`, and `--prod-env` overrides.

**Gate:** Deterministic tests prove unsafe configurations fail with actionable messages; no secret values appear in output.

---

## Phase 1 — Shared Docker infrastructure with data isolation

**Outcome:** One Docker Compose project supplies healthy Redis and Postgres services while durable development and production data remain separate.

| Work item | Scope |
|-----------|-------|
| Postgres databases | Provision `edge_dev` and `edge_prod` idempotently in the existing Postgres container |
| Redis profile | Preserve ephemeral `maxmemory` + `noeviction`; add a health check without adding persistence |
| Postgres health | Add a Compose health check used by startup/deploy scripts |
| Environment URLs | Point both apps at the same Redis URL and different Postgres database URLs |
| Isolation proof | Verify Redis roots are `edge:dev:…` and `edge:prod:…`; verify writes/migrations in one database do not appear in the other |
| Safety rule | Ban broad Redis flushes from app/deploy scripts; cleanup must target one environment prefix |

**Primary files:** `docker-compose.yml`, `scripts/`, `.env.example`, `src/lib/marketData/cache/redisKeys.test.ts`.

**Gate:** Compose reports both services healthy; Redis parity passes for both environment segments; Postgres isolation probe passes.

---

## Phase 2 — Separate stable production runtime

**Outcome:** Development continues in the active checkout while production runs a tested build from an independent worktree.

| Work item | Scope |
|-----------|-------|
| Runtime layout | Establish a dedicated production worktree outside the development directory |
| Build isolation | Ensure production owns its own dependencies and `.next`; never build production in the active development checkout |
| Binding | Development binds to `127.0.0.1:3003`; production binds to `127.0.0.1:3000` |
| Environment loading | Load production-only secrets/config before both `next build` and `next start` |
| Production commands | Add preflight, migrate, build, start, stop, and status wrappers with predictable exit codes |
| Baseline proof | Run both servers concurrently and record their revision, runtime mode, database target identity, and cache backend |

**Primary files:** `package.json`, `scripts/dev-with-db.sh`, `scripts/local-prod.sh`, `scripts/validate-local-deploy.mts`.

**Gate:** Both servers respond concurrently; changing development source does not change production behavior or production build assets.

---

## Phase 3 — Managed production lifecycle

**Outcome:** Production is a host service rather than a terminal command.

| Work item | Scope |
|-----------|-------|
| Service definition | Add a safe `launchd` template/installer that runs the production wrapper as the current user |
| Restart policy | Restart production after unexpected exit with bounded retry behavior |
| Boot order | Wait for Docker Postgres/Redis health before migrations/start; fail visibly instead of silently falling back |
| Logs | Capture stdout/stderr using existing structured/redacted logging; rotate or bound host log files |
| TWS ownership | Production uses the authoritative external/local sidecar contract; development remains unable to restart it by default |
| Operator commands | One command each for install, start, stop, restart, status, logs, and uninstall |

**Primary files:** `scripts/local-prod.sh`, `scripts/install-local-prod-service.sh`, `ops/launchd/`, `package.json`, `src/lib/observability/ARCHITECTURE.md`.

**Gate:** Production survives terminal closure, restarts after a forced process exit, and returns healthy after a host reboot without starting development.

---

## Phase 4 — Promotion and rollback

**Outcome:** Production changes only through an explicit, evidence-gated promotion of a known Git revision.

| Work item | Scope |
|-----------|-------|
| Promotion input | Require a commit SHA or release tag; reject a dirty or unverified production worktree |
| Pre-deploy gate | Run installation, focused startup checks, full build, config preflight, and database migration before restart |
| Revision record | Persist current and previous production SHAs outside Git without storing secrets |
| Health gate | Restart production, then require `/healthz`, `/readyz`, and Redis backend `kind=redis` with `degraded=false` |
| Rollback | Restore the previous SHA, rebuild if needed, restart, and repeat readiness checks |
| Migration policy | Require backward-compatible/additive migrations for one-step rollback; flag destructive migrations for manual handling |

**Primary files:** `scripts/deploy-local-prod.sh`, `scripts/local-prod.sh`, `package.json`, `src/lib/observability/ARCHITECTURE.md`.

**Gate:** A known-good deploy succeeds; an intentionally bad revision fails its health gate and the rollback command restores the prior revision.

---

## Phase 5 — Concurrent operations proof and handoff

**Outcome:** The two-environment system is proven under normal development, deploy, dependency failure, reboot, and rollback workflows.

| Scenario | Required evidence |
|----------|-------------------|
| Concurrent use | Development and production serve on their assigned ports for the same test window |
| Build isolation | Development rebuild/HMR leaves production revision and assets unchanged |
| Redis isolation | Same logical cache request creates disjoint `dev` and `prod` keys; no cross-read |
| Redis outage | Production becomes unready/fails loud; development follows its documented fallback policy; recovery restores both |
| Database isolation | Development migration/test writes do not change production schema/data |
| Process recovery | Forced production exit is restarted by `launchd` |
| Host recovery | Docker infrastructure and production return after reboot; development stays stopped |
| Promotion | Tested revision deploys and reports expected SHA/config |
| Rollback | Previous revision is restored after a failed deploy |
| Broker ownership | Development cannot restart or claim the production sidecar under its default profile |

**Primary files:** `scripts/verify-local-environments.mts`, focused tests, operator runbook sections in the closest architecture docs.

**Gate:** Every scenario has timestamped command output with secrets redacted; the production readiness watcher targets port `3000`.

---

## Environment contract

### Development

```dotenv
DATABASE_URL=postgres://.../edge_dev
EDGE_MARKET_DATA_CACHE_BACKEND=redis
REDIS_URL=redis://localhost:6379
EDGE_CACHE_ENV=dev
EDGE_REQUIRE_REDIS=0
EDGE_API_AUTH_MODE=dev-open
TWS_ENABLED=false
```

### Production

```dotenv
DATABASE_URL=postgres://.../edge_prod
EDGE_MARKET_DATA_CACHE_BACKEND=redis
REDIS_URL=redis://localhost:6379
EDGE_CACHE_ENV=prod
EDGE_REQUIRE_REDIS=1
EDGE_API_KEY=<secret>
EDGE_AUTH_SECRET=<secret>
EDGE_ALLOW_OPEN_DEV_SESSION=0
```

Production may add `EDGE_READYZ_REQUIRE_TWS=1` only when the broker sidecar is required for that deployment profile. Real values belong in ignored, permission-restricted local files.

---

## Guardrails

- Never run production from the development checkout.
- Never point development at `edge_prod`.
- Never use the same `EDGE_CACHE_ENV` value for both processes.
- Never use `FLUSHALL` or `FLUSHDB` in application/deploy automation for the shared Redis instance.
- Never permit `EDGE_API_AUTH_MODE=dev-open` in production.
- Never enable open dev-session bootstrap in production.
- Never write secrets into committed launchd templates, shell scripts, docs, logs, or evidence files.
- Never let development own production TWS recovery; broker testing must use an explicit isolated profile.
- Keep Redis ephemeral; Postgres remains the durable state owner.
- Keep production bound to loopback unless an explicit HTTPS reverse-proxy phase is approved.

---

## Verification plan

- **Focused:** deployment validator tests, Redis environment-key tests, Compose configuration validation, and production wrapper tests.
- **Build:** `npm run build` with the production profile after preflight.
- **App-level:** concurrent `:3003` development and `:3000` production checks, persistence isolation, Redis key inspection, outage/recovery, service restart, reboot, deploy, and rollback.
- **Full:** `npm run check` before promoting the first production revision.
- **Operational:** `/healthz`, `/readyz`, and authenticated `/api/market-data/health`; production readiness watcher configured for `http://127.0.0.1:3000/readyz`.

---

## Harness update

Activate `Local development and production — Phase N`; WIP=1; create a cross-component Task Contract; on Passing quote focused/build/app-level evidence; update this roadmap status through harness closeout; Commit: yes.
