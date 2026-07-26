# Local Production Containerization Roadmap

Keep development host-native while replacing the macOS worktree + `launchd`
production runtime with an immutable Docker image on the same machine.

**Last updated:** 2026-07-26

**Status:** Phase 0 **Passing** (2026-07-26). Phase 1 **Passing** (2026-07-26).

**Related:** [Local Development and Production](./local-dev-production-roadmap.md),
[Shared Cache Topology](./shared-cache-topology-roadmap.md),
[Production Observability](./production-observability-roadmap.md),
[Security Hardening](./security-hardening-roadmap.md),
[Observability Architecture](../../src/lib/observability/ARCHITECTURE.md),
[Persistence Architecture](../../src/lib/persistence/ARCHITECTURE.md),
[Repository Constraints](../CONSTRAINTS.md).

---

## Intent Classification

- **Primary:** Feature — run the stable local production app as a revision-pinned
  Docker image while preserving host-native Next.js development.
- **Secondary:** Operations, security, and testing — replace `launchd` lifecycle
  ownership, preserve deploy/rollback guarantees, and prove container recovery.
- **Architecture review:** **Required** — self-review **Pending**. This changes the
  production runtime, dependency networking, secret loading, writable state,
  deployment, rollback, and broker-sidecar boundary.
- **Assumptions:**
  - One macOS host; development remains `next dev` on `127.0.0.1:3003`.
  - Production remains private and loopback-only on `127.0.0.1:3000`.
  - Postgres and Redis remain shared Docker services with separate database and
    key namespaces for development and production.
  - Docker Desktop starts at login. Zero-downtime deployment remains out of scope.

---

## Checklist Review

- **Missing:** A production image, a secret-safe build context, an app Compose
  service, container-aware dependency URLs, and image-based deployment state.
- **Misalignment:** The completed local deployment track intentionally made
  Next.js host-native and uses a detached worktree plus `launchd`; this successor
  must replace that runtime without weakening its revision, health, or rollback
  gates.
- **Risks:**
  - Development needs host ports while production needs Compose DNS names.
  - `NEXT_PUBLIC_*` settings are build-time inputs; runtime secrets must never
    enter image layers or build logs.
  - Repository-relative uploads and diagnostic files are lost unless every
    writable path is inventoried and mounted explicitly.
  - A host-native TWS sidecar is not reachable at container loopback.
  - Both `launchd` and Docker must never compete for production port `3000`.
  - Rolling back an image cannot reverse a destructive database migration.
- **Decisions:**
  - Build immutable images tagged `edge-app:<full-git-sha>` from a clean,
    revision-specific context; never deploy `latest` as the source of truth.
  - Use a Next.js standalone runtime image, non-root user, Docker health check,
    bounded Docker logs, and `restart: unless-stopped`.
  - Keep runtime secrets in ignored, mode-`0600`
    `.edge/local-prod/production.env`; do not copy an env file into the image.
  - Bind app, Postgres, and Redis host ports to `127.0.0.1`; production uses
    `postgres:5432` and `redis:6379` over the Compose network.
  - Run migrations as an explicit one-shot container from the same revision
    before replacing the app container.
  - Keep TWS disabled by default. If production enables the host sidecar, use an
    authenticated `host.docker.internal` bridge and require
    `TWS_SIDECAR_SECRET`; do not let the app container spawn or restart it.

---

## End-state topology

```text
macOS host
├── development checkout
│   └── next dev → 127.0.0.1:3003
├── ignored production state
│   └── .edge/local-prod/
│       ├── production.env (0600)
│       ├── deploy-revisions.json
│       └── durable file-data mounts
└── Docker Compose project: edge
    ├── app-prod (edge-app:<git-sha>) → 127.0.0.1:3000
    ├── postgres
    │   ├── edge_dev
    │   └── edge_prod
    ├── redis
    │   ├── edge:dev:…
    │   └── edge:prod:…
    └── app-prod-migrate (one-shot deployment profile)
```

| Concern | Development | Production |
|---------|-------------|------------|
| Runtime | Host `next dev` | Docker standalone Next.js |
| Port | `127.0.0.1:3003` | `127.0.0.1:3000` |
| Source identity | Active checkout | Image tag + OCI revision label |
| Postgres URL | `127.0.0.1:5432/edge_dev` | `postgres:5432/edge_prod` |
| Redis URL | `127.0.0.1:6379` | `redis:6379` |
| Cache namespace | `EDGE_CACHE_ENV=dev` | `EDGE_CACHE_ENV=prod` |
| Secrets | `.env.local` | `.edge/local-prod/production.env` |
| Lifecycle | Manual | Docker restart policy |
| Logs | Terminal/dev tooling | Docker stdout/stderr with rotation |
| TWS ownership | Disabled by default | External authenticated sidecar |

---

## Scope

### In scope

- Multi-stage production Dockerfile and strict `.dockerignore`.
- Next.js standalone output and monorepo/workspace dependency tracing.
- Production app and one-shot migration services in the existing Compose project.
- Loopback host bindings and internal Compose dependency URLs.
- Production secret-file validation without image-layer leakage.
- Durable mount inventory and migration of existing production file data.
- Image build, start, stop, status, logs, deploy, rollback, and cleanup commands.
- Retirement of production `launchd` and the permanent production worktree after
  a proven rollback window.
- Concurrent host-dev/container-prod, outage, reboot, deploy, and rollback proof.

### Out of scope

- Containerizing the development server.
- Kubernetes, cloud hosting, a public reverse proxy, TLS termination, or LAN
  exposure.
- Zero-downtime, blue/green, or multi-replica production.
- Separate Postgres or Redis servers for each environment.
- Containerizing IB Gateway or the TWS sidecar unless the authenticated macOS
  host bridge cannot meet the broker readiness gate.
- Production authentication redesign.

---

## Success criteria

1. Host-native development and Docker production serve concurrently on ports
   `3003` and `3000`.
2. Production reports the exact full Git SHA and image/build identity that the
   deploy command selected.
3. No source checkout, `node_modules`, `.git`, local env file, credential, or
   development build output exists in the runtime image.
4. Production reaches Postgres and Redis only through Compose DNS and fails
   readiness when either required dependency is unavailable.
5. Development still reaches loopback infrastructure and remains isolated to
   `edge_dev` and `EDGE_CACHE_ENV=dev`.
6. Docker restarts production after a process/container failure and after host
   reboot without starting development.
7. A failed candidate remains unpromoted, and one rollback command restores the
   previous known-good image and passes all health gates.
8. Durable uploads and required production state survive container replacement.
9. Production secrets are ignored, permission-restricted, absent from image
   history, Compose rendering, logs, and evidence.
10. No LaunchAgent or unmanaged process competes for port `3000` after cutover.

---

## Phase 0 — Freeze the replacement contract

**Outcome:** Define exactly what moves into Docker, what remains host-native, and
how existing production state transitions safely.

| Work item | Scope |
|-----------|-------|
| Runtime inventory | Enumerate build inputs, runtime dependencies, writable paths, uploads, logs, and process-owned metadata |
| Environment split | Define host-dev URLs versus Compose-prod URLs; move the production secret contract to `.edge/local-prod/production.env` |
| Image identity | Freeze SHA tag, OCI labels, build ID, architecture, and clean-context requirements |
| Lifecycle ownership | Map every worktree/`launchd` command to its Docker successor and define the port-ownership cutover guard |
| Broker boundary | Validate TWS-disabled default and authenticated `host.docker.internal` behavior when explicitly enabled |
| Compatibility | Preserve current health, readiness, migration-safety, revision-state, and redaction contracts |

**Primary files:** this roadmap, `.env.example`, `scripts/validate-local-deploy.mts`,
`src/lib/observability/ARCHITECTURE.md`,
`src/lib/marketData/ARCHITECTURE.md`,
`src/lib/persistence/ARCHITECTURE.md`.

**Gate:** Static tests reject unsafe bindings, hostnames, permissions, duplicate
port ownership, missing broker auth, and secrets in formatted output.

---

## Phase 1 — Build an immutable production image

**Outcome:** A clean Git revision builds into a minimal, reproducible,
non-root Next.js runtime image.

| Work item | Scope |
|-----------|-------|
| Standalone output | Enable and verify Next.js standalone output with workspace packages and required static assets |
| Multi-stage build | Add dependency, build, migration, and runtime targets; pin the Node major line and lock installation with `npm ci` |
| Build context | Exclude Git data, env files, `.edge`, local data, test output, and development dependencies from the runtime target |
| Build inputs | Permit only allowlisted non-secret `NEXT_PUBLIC_*` values at build time; load all secrets at runtime |
| Runtime hardening | Run non-root with init, dropped capabilities, no-new-privileges, and only verified writable mounts/tmpfs |
| Provenance | Add OCI source/revision/created labels and expose a redacted runtime identity check |

**Primary files:** `Dockerfile`, `.dockerignore`, `next.config.mjs`, `package.json`,
focused Docker/build tests under `scripts/`.

**Gate:** Build `edge-app:<sha>` for the current clean revision; inspect the
runtime image and history for forbidden files/values; run `/healthz` from the
image without mounting source.

---

## Phase 2 — Compose networking, state, and readiness

**Outcome:** The production container joins the existing infrastructure while
development continues using host-loopback ports.

| Work item | Scope |
|-----------|-------|
| App service | Add `app-prod`, loopback port `3000`, runtime env file, health check, restart policy, log rotation, and dependency health conditions |
| Migration service | Add a non-running-by-default one-shot service/target using the same Git revision as `app-prod` |
| Dependency URLs | Use `postgres` and `redis` service DNS in production; preserve loopback URLs for development |
| Host exposure | Change infrastructure host publishes to `127.0.0.1` without breaking host-native development |
| Durable state | Mount only inventoried writable paths; migrate existing file data with ownership and integrity checks |
| Broker route | Prove TWS-disabled readiness; when enabled, require authenticated host bridge and prevent lifecycle ownership from the app container |

**Primary files:** `docker-compose.yml`, `.env.example`,
`scripts/local-data-infrastructure.mts`, production runtime helpers,
`src/lib/marketData/ARCHITECTURE.md`,
`src/lib/persistence/ARCHITECTURE.md`.

**Gate:** Compose reports Postgres, Redis, and app healthy; both app ports respond;
database/cache isolation passes; container replacement preserves durable files.

---

## Phase 3 — Replace worktree and LaunchAgent lifecycle

**Outcome:** Docker exclusively owns production runtime lifecycle and operator
commands remain small, non-interactive, and redaction-safe.

| Work item | Scope |
|-----------|-------|
| Command surface | Implement image build, migrate, start, stop, restart, status, logs, and inspect commands with predictable exit codes |
| Ownership guard | Refuse startup while the old LaunchAgent is loaded or an unmanaged process owns port `3000` |
| Status model | Report container/image SHA, build ID, health/readiness, dependency state, and previous deploy identity without secrets |
| Log model | Replace file/LaunchAgent logs with bounded Docker logs while preserving request IDs and structured output |
| Boot behavior | Verify Docker Desktop + Compose restart policy recover production after login/reboot |
| Compatibility window | Keep legacy status/uninstall entry points only long enough to perform and verify cutover |

**Primary files:** `scripts/local-prod.mts`, production Docker CLI module and tests,
`scripts/local-prod.sh`, `scripts/local-prod-service.mts`, `package.json`,
`src/lib/observability/ARCHITECTURE.md`.

**Gate:** Install-free Docker lifecycle survives terminal closure, forced process
exit, container removal/recreation, and host reboot; development stays stopped
after reboot.

---

## Phase 4 — Image-based promotion and rollback

**Outcome:** Deploy and rollback operate on immutable images rather than a
permanent production worktree.

| Work item | Scope |
|-----------|-------|
| Revision build | Resolve an explicit SHA/tag, create a temporary clean build context, build/tag the image, then remove the context |
| Pre-deploy gate | Run startup checks, image inspection, migration classification, config validation, and one-shot migrations |
| Replacement | Start the candidate, require Docker health plus `/healthz`, `/readyz`, and Redis non-degraded health before promotion |
| Revision state | Track current, previous, pending, and failed image SHA/digest outside Git without secrets |
| Rollback | Restore the previous immutable image and rerun the complete health gate |
| Retention | Keep current + previous + one failed diagnostic image; prune only unreferenced Edge images |

**Primary files:** `scripts/deploy-local-prod.mts`,
`scripts/deploy-health-gate.mts`, `scripts/deploy-migration-policy.mts`,
deployment tests, `package.json`, `src/lib/observability/ARCHITECTURE.md`.

**Gate:** Known-good promotion succeeds; an intentionally bad candidate remains
unpromoted; rollback restores the prior SHA/digest and readiness. Migrations used
in the exercise are additive/backward-compatible.

---

## Phase 5 — Cutover and concurrent operations proof

**Outcome:** The hybrid host-development/container-production topology is the
only supported local production path and has complete operational evidence.

| Scenario | Required evidence |
|----------|-------------------|
| Concurrent use | Host dev `:3003` and container prod `:3000` serve together |
| Build isolation | Dev source/HMR/build changes do not alter the running image |
| Dependency isolation | `edge_dev`/`edge_prod` and `dev`/`prod` Redis roots remain disjoint |
| Outage/recovery | Production becomes unready on required Redis/Postgres outage and recovers |
| Process recovery | Kill PID 1 or stop the container unexpectedly; Docker restarts it |
| Host recovery | Docker infrastructure and production return after reboot; development remains stopped |
| Durable state | Upload/state checksum survives replacement and rollback |
| Promotion/rollback | Explicit SHA deploys; failed candidate rolls back to prior digest |
| Security | Loopback-only ports, non-root runtime, secret scan, and redacted logs pass |
| Legacy retirement | LaunchAgent unloaded/uninstalled; permanent production worktree no longer required |

**Primary files:** `scripts/verify-local-environments.mts`, focused tests,
operator sections in the closest architecture docs, package command surface.

**Gate:** Every scenario has timestamped, redacted evidence; production watcher
targets `http://127.0.0.1:3000/readyz`; the old LaunchAgent is absent and no
non-container process owns port `3000`.

---

## Verification Plan

- **Focused:** Dockerfile/Compose contract tests, deployment CLI tests, env
  validation/redaction tests, migration policy tests, and verifier scenarios.
- **Build:** `docker build --target runtime` for a clean full SHA, followed by
  standalone startup and forbidden-content/image-history inspection.
- **App-level:** Concurrent `:3003`/`:3000`, dependency outage/recovery, durable
  state, crash/reboot recovery, promotion, failed candidate, and rollback.
- **Full:** `npm run check`, `docker compose config`, and the complete local
  production verification matrix before cutover.
- **Operational:** `/healthz`, `/readyz`, authenticated market-data health, Docker
  health/status, exact image digest, and production readiness watcher on port
  `3000`.

---

## Harness Update

Activate `Local production containerization — Phase N`; WIP=1; use a
cross-component Task Contract; on Passing quote focused, image-build, app-level,
and operational evidence; update this roadmap and its indexes during closeout;
Commit: yes.
