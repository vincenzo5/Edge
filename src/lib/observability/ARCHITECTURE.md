# Observability Architecture

Production ops surfaces and solo local tooling for Edge. This module owns the local error log; the **production successor** (probes, structured logs, durable audit/errors, free alerts) is phased in [Production Observability Roadmap](../../../docs/roadmaps/production-observability-roadmap.md). The roadmap’s **free stack contract** table is source of truth for allowed vs forbidden tooling.

**Related:** [Market Data Architecture](../marketData/ARCHITECTURE.md) (solo Data Health / SLIs), [Trading Architecture](../trading/ARCHITECTURE.md) (audit ring), [Security Hardening Roadmap](../../../docs/roadmaps/security-hardening-roadmap.md), [Repository Constraints](../../../docs/CONSTRAINTS.md).

---

## Ownership split

| Surface | Audience | Owner |
|---------|----------|-------|
| Data Health UI, `/api/market-data/health`, `report:data-reliability` | Solo operator (local/dev) | Market data — see [Local observability](../marketData/ARCHITECTURE.md#local-observability-solo) |
| `.edge/error-log.jsonl`, `/api/dev/local-errors`, `report:local-errors` | Solo operator (non-prod) | This module — **404 in production** |
| `/healthz`, `/readyz`, request IDs, access logs, durable audit/errors, free alerts | Production orchestrators / ops | Production observability track (Phases 1–5) |

Solo toolkit **stays** for `dev` / `dev:lite`. Production adds durable, restart-safe paths without paid APM/Sentry/PagerDuty.

---

## Free stack contract (summary)

Full table: [production-observability-roadmap.md § Free stack contract](../../../docs/roadmaps/production-observability-roadmap.md#free-stack-contract-non-negotiable-for-this-track).

| Need | Allowed (free) | Forbidden in this track |
|------|----------------|-------------------------|
| Liveness / readiness | First-party `/healthz`, `/readyz` | Paid uptime SaaS as the only path |
| Logs | OSS JSON logger → stdout/stderr | Datadog / paid log shippers as required deps |
| Request correlation | App-generated request ID header | Paid APM as prerequisite |
| Trading audit | Postgres table (+ optional CLI/API) | Vendor audit products |
| Error sink | Postgres table (+ report CLI) | Sentry / Bugsnag / paid error SaaS |
| Alerts | Cron + Discord/Slack webhook; optional self-hosted Uptime Kuma | PagerDuty / paid incident SaaS |

Postgres/Redis hosting is application infrastructure, not observability SaaS.

---

## Probe contract (Phase 1)

Cheap machine probes — distinct from rich human health at `/api/market-data/health` and the Data Health UI.

**Implementation:** `src/app/healthz/route.ts`, `src/app/readyz/route.ts`, `src/lib/observability/readiness.ts`, `src/db/index.ts` (`pingDatabase`). Routes live outside `/api/*` so middleware does not auth-gate or rate-limit them.

### `GET /healthz` — liveness

- **Purpose:** Is the Node process up?
- **Checks:** None — no Postgres, Redis, TWS, or market-data fan-out.
- **Success:** HTTP **200**, minimal JSON body (e.g. `{ "ok": true }`).
- **Auth:** **Public** — no API key; safe for load balancers and Docker healthchecks.
- **Response rules:** No secrets, connection strings, stack traces, or internal URLs.

### `GET /readyz` — readiness

- **Purpose:** Can this deploy profile serve traffic?
- **Checks:** Cheap pings gated by existing env (see [Env knobs](#env-knobs-sketch)):
  - Postgres ping when `DATABASE_URL` is set.
  - Redis ping when Redis is required (`EDGE_REQUIRE_REDIS=1` or `NODE_ENV=production` with Redis backend — see [Shared Cache Topology](../../../docs/roadmaps/shared-cache-topology-roadmap.md)).
  - Optional TWS sidecar ping when brokerage is expected (`EDGE_READYZ_REQUIRE_TWS=1` and `TWS_SIDECAR_URL` set).
- **Success:** HTTP **200** when all required checks for the profile pass.
- **Failure:** HTTP **503** with redacted reason codes only — e.g. `postgres_unavailable`, `redis_unavailable`, `tws_unavailable`. Never echo `REDIS_URL`, `DATABASE_URL`, account IDs, or raw provider errors.
- **Auth:** **Public** — same constraints as `/healthz`.

### What stays separate

| Endpoint | Role |
|----------|------|
| `/healthz` | Process alive |
| `/readyz` | Required deps for deploy profile |
| `/api/market-data/health` | Rich market-data / provider / recovery diagnostics (operator UI) |
| `services/tws-sidecar` `/health` | Sidecar process only — folded into app `/readyz` when `EDGE_READYZ_REQUIRE_TWS=1` |

### Orchestrator healthchecks (Docker / Kubernetes)

| Probe | Use for | Example |
|-------|---------|---------|
| `GET /healthz` | Liveness — process up, no dep fan-out | Docker `HEALTHCHECK CMD curl -fsS http://127.0.0.1:3003/healthz` |
| `GET /readyz` | Readiness — required deps for deploy profile | K8s `readinessProbe.httpGet.path: /readyz` |

Use `/healthz` for restart-on-hang; use `/readyz` to remove traffic when Postgres, required Redis, or required TWS sidecar is down. Do not point orchestrators at `/api/market-data/health` (auth-gated, heavy).

---

## Request IDs and access logs (Phase 2)

**Implementation:** [`src/middleware.ts`](../../../middleware.ts), [`requestIdCore.ts`](requestIdCore.ts), [`requestIdContext.ts`](requestIdContext.ts), [`accessLog.ts`](accessLog.ts), [`accessLogHook.ts`](accessLogHook.ts), [`instrumentation.ts`](../../../instrumentation.ts).

### Request correlation

- **Header:** `x-edge-request-id` by default; override with `EDGE_REQUEST_ID_HEADER`.
- **Middleware (`/api/*`):** Accept a valid incoming ID (charset `[\w.-]+`, max 128) or mint UUID; forward on the request; set response header on pass-through and auth/rate-limit short-circuits (401/429).
- **Node ALS:** `accessLogHook` wraps `/api/*` HTTP requests so route handlers, AI stderr logs, and trading audit can read `getRequestId()` without threading IDs through every call site.

### Access log line

One stdout JSON line per `/api/*` request on `res.finish` (silenced in `test` / Vitest):

```json
{"ts":"…","event":"http.access","method":"GET","path":"/api/search","status":200,"durationMs":12,"requestId":"…"}
```

- **Path:** pathname only — query strings stripped (no tokens in logs).
- **Never logged:** bodies, cookies, Authorization, tool args, broker payloads.
- **Non-API routes:** `/healthz`, `/readyz`, pages — no access log (cheap probes stay quiet).

### Propagation

| Surface | Field |
|---------|-------|
| MCP tool stderr (`mcp.tool`) | optional `requestId` |
| Session bridge stderr (`session.bridge`) | optional `requestId` |
| Trading audit ring | optional `requestId` on entries |

Market-data trace header `x-edge-md-trace-id` remains scoped to market-data routes — not replaced.

---

## Durable trading audit (Phase 3)

**Implementation:** [`auditLog.ts`](../trading/auditLog.ts), [`tradingAuditPersist.ts`](../trading/tradingAuditPersist.ts), [`tradingAuditRepository.ts`](../persistence/repositories/tradingAuditRepository.ts), [`GET /api/me/trading-audit`](../../../app/api/me/trading-audit/route.ts), [`report-trading-audit.mts`](../../../scripts/report-trading-audit.mts).

- **Dual-write:** `appendAudit` always updates the in-memory ring; when `DATABASE_URL` is set, fire-and-forget Postgres insert (fail-open — DB errors never block trading).
- **Schema:** `trading_audit_events` — `at_ms`, `action`, `outcome`, `intent_id`, `order_ref`, `request_id`, bounded redacted `detail`; **no** `account_id` or broker payloads.
- **Read paths:** `GET /api/me/trading-audit` (`withPersistenceAuth`, `?limit=` capped at 200); `npm run report:trading-audit` (requires Postgres — ring alone is process-local).
- **Retention:** `EDGE_AUDIT_RETENTION_DAYS` (default **90**); lazy purge on persist and report/CLI.

---

## Production error sink (Phase 4)

**Implementation:** [`localErrorLogStore.ts`](localErrorLogStore.ts), [`productionErrorPersist.ts`](productionErrorPersist.ts), [`productionErrorRepository.ts`](../persistence/repositories/productionErrorRepository.ts), [`POST`/`GET /api/me/production-errors`](../../../app/api/me/production-errors/route.ts), [`report-production-errors.mts`](../../../scripts/report-production-errors.mts), [`reportLocalError.ts`](reportLocalError.ts).

- **Dual-write:** `appendLocalError` always writes JSONL when possible; when `DATABASE_URL` is set, fire-and-forget Postgres insert (fail-open — DB errors never block API responses).
- **Schema:** `production_error_events` — `at_ms`, `source`, `message`, optional redacted `stack`/`detail`/`request_id`; **no** tokens, account IDs, or raw provider payloads.
- **Ingest paths:**
  - Server: `safeErrorResponse` / `appendLocalError` → Postgres via `ensureDevAppUser()` when DB configured.
  - Client (production): `reportLocalError` → `POST /api/me/production-errors` with session auth (`credentials: include`).
  - Client (non-prod): unchanged `POST /api/dev/local-errors` (loopback / `EDGE_API_KEY`).
- **Read paths:** `GET /api/me/production-errors` (`withPersistenceAuth`, `?limit=` capped at 200); `npm run report:production-errors` (requires Postgres).
- **Retention:** `EDGE_ERROR_RETENTION_DAYS` (default **30**); lazy purge on persist and report/CLI.
- **Solo path preserved:** `.edge/error-log.jsonl` + `/api/dev/local-errors` stay **404 in production** (CONSTRAINTS).

---

## Free alerts (Phase 5)

**Implementation:** [`readyzProbe.ts`](readyzProbe.ts), [`readyzAlertState.ts`](readyzAlertState.ts), [`readyzAlertNotify.ts`](readyzAlertNotify.ts), [`readyzAlertRun.ts`](readyzAlertRun.ts), [`scripts/watch-readyz.mts`](../../../scripts/watch-readyz.mts).

External watcher — **not** in-app `/api/cron/*` (cron inside Node cannot fire when the process is down).

- **Probe:** `GET EDGE_READYZ_URL` (default `http://127.0.0.1:3003/readyz`); parse `{ ok, reasons? }`; network/non-JSON → fixed codes (`readyz_unreachable`, `readyz_invalid_response`) — never echo bodies or secrets.
- **State:** gitignored `.edge/readyz-alert-state.json` tracks consecutive failures and alerting; `EDGE_READYZ_ALERT_FAILURES` (default **3**) before first notify; single recovery notify when readiness returns after alerting.
- **Notify:** `POST EDGE_ALERT_WEBHOOK_URL` with Discord (`content`) + Slack (`text`) compatible JSON; payload includes host label (`EDGE_ALERT_HOST`), fixed reason codes, timestamp only.
- **CLI:** `npm run watch:readyz` — one-shot (cron-friendly); `--loop --interval-ms N` for long-running; `--dry-run` prints would-notify payload without POST.

**Cron example:**

```cron
*/2 * * * * cd /path/to/edge && npm run watch:readyz >> /var/log/edge-readyz-watch.log 2>&1
```

**Uptime Kuma (optional):** self-hosted HTTP monitor on `/readyz` with Discord/Slack notification channel is an acceptable alternative; first-party script above is the proven repo path.

Distinct from product price alerts (`src/lib/alerts/`, `/api/cron/alert-evaluate`).

---

## Concurrent local environments

The local deployment contract keeps development on `127.0.0.1:3003` and
production on `127.0.0.1:3000`. The watcher default remains the development
target for existing workflows; the production profile must explicitly set
`EDGE_READYZ_URL=http://127.0.0.1:3000/readyz`. Run
`npm run local:deploy:status` to print the two profiles without URLs or secret
values, and `npm run local:deploy:preflight` before production build/start work.

Phase 2 adds a manual production runtime wrapper (`scripts/local-prod.mts`,
`scripts/local-prod.sh`) with `npm run local:prod:{setup,preflight,migrate,build,start,stop,status,logs}`.
Phase 3 adds a user-scoped macOS LaunchAgent (`com.edge.local-prod`) via
`scripts/local-prod-service.mts` and `npm run local:prod:service:{install,uninstall,start,stop,restart,status,logs}`.
The launchd job runs `scripts/local-prod-service.sh run`, which delegates to the
foreground `local-prod service-run` supervisor (infra wait → preflight → migrate →
`next start`). Manual `local:prod:start` refuses when launchd is loaded; service
stop uses `launchctl bootout`. Managed metadata lives under gitignored
`.edge/local-prod/` (`local-prod.meta.json` includes `supervisor=manual|launchd`;
blocked config states go to `service-blocked.json`; app logs rotate at 10MB with
one retained `.1` file; launchd stdout/stderr also land under `.edge/local-prod/`).
Production runs from a sibling detached Git worktree with its own
`.env.production.local`, `node_modules`, and `.next`. Managed process metadata
lives under gitignored `.edge/local-prod/` in the development checkout; stop only
targets the recorded PID and refuses unmanaged port collisions on `:3000`.
Migrate/build load production env explicitly; migrate runs from the development
checkout (deps present) with `--env-file` targeting `edge_prod`.

Phase 4 adds explicit promotion and rollback via `scripts/deploy-local-prod.mts`
and `npm run local:prod:{deploy,rollback}`. Deploy requires `--revision`
(commit SHA or tag), runs `check:startup`, classifies pending SQL migrations for
destructive patterns, stops launchd, promotes the detached production worktree,
migrates/builds, restarts the LaunchAgent, and fail-closes on a health gate:
`/healthz`, `/readyz`, and `/api/market-data/health` with
`cache.kind=redis` and `cache.degraded=false`. Revision history lives in
gitignored `.edge/local-prod/deploy-revisions.json` (`currentSha`, `previousSha`,
`pendingSha`, `failedSha`, `promotedAt`, `buildId` — no secrets). Rollback
restores `previousSha`, rebuilds when `.next/BUILD_ID` is missing, and repeats
the same health gate before promoting rollback state to current.

Production configuration failures use fixed field/reason messages and never
print dotenv source lines, credentials, or connection URLs. See
[Local Development and Production Roadmap](../../../docs/roadmaps/local-dev-production-roadmap.md).

Phase 5 adds a redaction-safe concurrent-operations verifier
(`scripts/verify-local-environments.mts`) and
`npm run local:prod:verify -- <scenario|all>`. The default `all` matrix runs
non-disruptive scenarios (concurrent ports, build isolation, Postgres/Redis
isolation, database isolation, broker ownership) plus `reboot-prepare`.
Disruptive scenarios (`redis-outage`, `process-recovery`, `promotion`,
`rollback`) require `--allow-disruptive`. Host reboot proof is staged:
`reboot-prepare` checkpoints the boot marker under gitignored
`.edge/local-prod/verify-state.json`; after a manual reboot, run
`reboot-resume` to confirm Docker + launchd production recovery while
development stays stopped. Append evidence with `--output docs/evidence/...`.

### Container production successor (Phase 0 contract)

The [Local Production Containerization Roadmap](../../../docs/roadmaps/local-production-containerization-roadmap.md)
replaces the production worktree + LaunchAgent runtime with an immutable Docker
image while development stays host-native on `127.0.0.1:3003`. Phase 0 freezes
the contract only; image build, Compose app services, and cutover remain later
phases.

| Concern | Legacy (Passing) | Container successor |
|---------|------------------|---------------------|
| Production runtime | Sibling detached worktree + `next start` / LaunchAgent | `edge-app:<full-git-sha>` standalone Next.js container |
| Production secrets | `.env.production.local` in worktree (0600) | `.edge/local-prod/production.env` in dev checkout (0600) |
| Production Postgres/Redis | `localhost:5432/edge_prod`, `redis://localhost:6379` | Compose DNS `postgres:5432`, `redis://redis:6379` inside container |
| Development deps | `localhost` loopback | unchanged |
| Identity | worktree SHA + `.next/BUILD_ID` | image tag `edge-app:<full-git-sha>` + OCI `org.opencontainers.image.revision` label (+ digest in deploy state Phase 4) |
| Logs | `.edge/local-prod/local-prod.log` + launchd files | Docker stdout/stderr with rotation |
| Deploy state | `.edge/local-prod/deploy-revisions.json` (host CLI) | same file; tracks image SHA/digest instead of worktree promotion |
| Readiness watcher | host `npm run watch:readyz` on `:3000` | unchanged target URL |
| Port `:3000` ownership | LaunchAgent or manual PID | Docker container only after cutover; legacy + container must never both bind |

Static validation lives in `scripts/validate-local-deploy.mts`:
`validateLocalDeploy()` for the legacy paired profile;
`validateContainerLocalDeploy()` for the container successor. Both formatters
stay secret-free. Port-ownership guard rejects simultaneous LaunchAgent load and
container bind on `:3000`.

Phase 1 adds `Dockerfile`, `.dockerignore`, Next.js `output: 'standalone'`, and
`scripts/build-app-image.mts` (`npm run image:{build,inspect,migrate:build}`).
Runtime images are tagged `edge-app:<full-git-sha>`, run as non-root user
`edge`, expose `/healthz` for Docker healthchecks, and are scanned for forbidden
paths (`.git`, `node_modules`, env files, `.edge`, `.next`) before promotion.
Build-time allowlisted `NEXT_PUBLIC_*` values only; runtime secrets load from
`.edge/local-prod/production.env` at container start (Phase 2+).

Phase 2 adds `app-prod` and `app-prod-migrate` services to `docker-compose.yml`.
Production runs on loopback `127.0.0.1:3000` with runtime env from
`.edge/local-prod/production.env`, `depends_on` health conditions for Postgres
and Redis, Docker healthcheck on `/healthz`, json-file log rotation (10m × 3),
durable bind mounts for journal screenshots and copilot attachments, and
`host.docker.internal:host-gateway` for authenticated TWS bridge access.
The migrate service uses profile `migrate` and image suffix `-migrate`.
Operator sets `EDGE_APP_IMAGE=edge-app:<full-git-sha>` before
`docker compose up -d --wait app-prod`. Static contract validation:
`npm run compose:validate`.

Health/readiness contracts are unchanged: `/healthz` and `/readyz` remain cheap
and secret-free; production deploy health gate still requires Redis
`cache.kind=redis` and `cache.degraded=false`.

---

## Operator runbook

| Question | Check |
|----------|-------|
| Is the app up? | `GET /healthz` → 200 |
| Can it serve? | `GET /readyz` → 200; 503 shows fixed reason codes (`postgres_unavailable`, `redis_unavailable`, `tws_unavailable`) |
| What just broke? | stdout `http.access` JSON logs + `x-edge-request-id`; grep by request ID across API / AI / trading stderr |
| What happened to this order? | `npm run report:trading-audit -- --limit 20` or `GET /api/me/trading-audit` |
| Did users hit errors overnight? | `npm run report:production-errors -- --limit 50` or `GET /api/me/production-errors` |
| Do I need to wake up? | `npm run watch:readyz` (cron) + `EDGE_ALERT_WEBHOOK_URL`; Data Health UI for human triage after alert |
| Promote a tested revision? | `npm run local:prod:deploy -- --revision <sha>` then confirm `npm run local:prod:status` shows deploy.current + ready probes |
| Recover from a bad deploy? | `npm run local:prod:rollback` restores deploy.previous and re-runs the health gate |
| Prove concurrent dev + prod? | `npm run local:prod:verify -- all` then `--allow-disruptive <scenario>`; reboot: `reboot-prepare` → manual reboot → `reboot-resume` |

After a readiness alert: confirm `/readyz` reason codes, check Postgres/Redis/TWS sidecar, then `report:production-errors` and `report:trading-audit` for correlated failures.

---

## Env knobs (sketch)

Documented intent for later phases. Placeholders in [.env.example](../../../.env.example).

| Variable | Phase | Purpose |
|----------|-------|---------|
| `EDGE_REQUEST_ID_HEADER` | 2 | Response/request header name (default `x-edge-request-id`) |
| `DATABASE_URL` | 1 | When set, `/readyz` includes Postgres ping |
| `EDGE_REQUIRE_REDIS` / `REDIS_URL` | 1 | When Redis required, `/readyz` includes Redis ping |
| `EDGE_READYZ_REQUIRE_TWS` | 1 | When `1`, `/readyz` pings `TWS_SIDECAR_URL` `/health` if sidecar URL set |
| `EDGE_AUDIT_RETENTION_DAYS` | 3 | Trading audit Postgres retention (or row cap — Phase 3 picks default) |
| `EDGE_ERROR_RETENTION_DAYS` | 4 | Production error sink retention (Phase 4) |
| `EDGE_READYZ_URL` | 5 | Target URL for external readiness watcher (default local `/readyz`) |
| `EDGE_ALERT_WEBHOOK_URL` | 5 | Discord or Slack incoming webhook for readiness alerts |
| `EDGE_READYZ_ALERT_FAILURES` | 5 | Consecutive `/readyz` failures before notify (default 3) |
| `EDGE_ALERT_HOST` | 5 | Host label in alert text (default `edge`) |

Readiness reuses existing deploy profile knobs — do not invent parallel “observability-only” dependency flags beyond `EDGE_READYZ_REQUIRE_TWS`.

---

## Current baseline

| Piece | Location | Notes |
|-------|----------|-------|
| Liveness / readiness | `/healthz`, `/readyz`, `readiness.ts` | Public, secret-free JSON; fixed reason codes on 503 |
| Request IDs + access logs | `middleware.ts`, `requestId*.ts`, `accessLog*.ts`, `instrumentation.ts` | `/api/*` only; JSON `http.access` to stdout; ALS propagation |
| Redaction | `src/lib/api/redactDiagnostic.ts`, `safeErrorResponse.ts` | Reuse on all ops surfaces |
| Local errors | `localErrorLog*.ts`, `reportLocalError.ts`, `/api/dev/local-errors` | Prod **404**; gitignored `.edge/error-log.jsonl`; **Postgres dual-write** when `DATABASE_URL` set (Phase 4) |
| Production errors | `productionErrorPersist.ts`, `/api/me/production-errors`, `report:production-errors` | Auth-gated prod ingest + report; redacted durable rows |
| Free alerts | `readyzProbe.ts`, `readyzAlert*.ts`, `watch:readyz` | External `/readyz` watcher + webhook; state in `.edge/readyz-alert-state.json` |
| Client reporter | `src/app/components/observability/LocalErrorReporter.tsx` | Non-prod ingest |
| Market-data health | `/api/market-data/health`, Data Health UI | Solo UX; heavy for orchestrators |
| Process-local SLIs | `src/lib/marketData/state/operationalMetrics.ts` | 30m / 512 samples; not durable |
| MD trace IDs | `x-edge-md-trace-id` | Market-data scoped only |
| AI structured stderr | MCP + session bridge | No tool args in logs |
| Trading audit ring | `src/lib/trading/auditLog.ts` (500 entries) | Process-local ring; **Postgres dual-write** when `DATABASE_URL` set (Phase 3) |
| Order intents | Postgres `order_intents` | Durable intents; not full audit export |
| TWS sidecar health | `services/tws-sidecar` `/health` | Optional gate in `/readyz` when `EDGE_READYZ_REQUIRE_TWS=1` |
| Lab memory scorecard (L3–L8) | `npm run perf:memory` → `memory-baseline-latest.json`; `npm run report:memory` | Browser scenarios record CDP `JSHeapUsedSize`/`JSHeapTotalSize` (`cdpJsHeap*Mb`) and best-effort `measureUserAgentSpecificMemory()` (`uaSpecific*` or `uaSpecificUnavailableReason`). UA-specific memory requires cross-origin isolation — Edge does not enable COOP/COEP for this; explicit unavailable is expected. **L4 (Phase 2):** `processRss*Mb` via OS `ps` max-renderer RSS on the Playwright Chromium PID tree; `processSampleMethod`/`processSampleNote` record headless + platform; warns when process RSS &lt; JS heap. **L5 (Phase 3):** `canvasCount`, `webglContextCount`, best-effort `gpuMemoryMb`/`gpuMemoryNote` (DOM canvases + live WebGL counter; GPU null when extensions absent). **L6–L8 (Phase 4):** top-level `desk` object — `browserProcessRssMb` from B1/B2 L4, `nodeRssMb` from in-process `node-server-cache-warm` collector RSS (not Next.js PID), optional `sidecarRssMb` via sidecar `/health` `pid` + OS `ps`, optional `redisUsedMb` via `INFO memory` when `REDIS_URL` set; `totalKnownMb` sums non-null layers; `skippedNoSidecar` / `skippedNoRedis` explicit when absent; no secrets in output. **Phase 5:** `npm run report:memory` prints the L1–L8 cheat-sheet table + desk line from latest JSON; soft budgets warn via `MEMORY_BUDGET_HEAP_DELTA_MB` (default 50), `MEMORY_BUDGET_PROCESS_RSS_MB` (default 1200), `MEMORY_BUDGET_DESK_TOTAL_MB` (default 2500); caps failure warns `soft-budget: caps`; exit 0 on warnings only. **Phase 6 (L9):** B3 `browser-b3-live-tip` soak emits `soakDurationSec`, `soakHeapDeltaMb`, `soakProcessRssDeltaMb`, EventSource stability; duration from `MEMORY_SOAK_SEC` → `MEMORY_LIVE_TIP_SEC` → 60 (min 10); soak soft budgets via `MEMORY_BUDGET_SOAK_HEAP_DELTA_MB` (default 50) and `MEMORY_BUDGET_SOAK_PROCESS_RSS_DELTA_MB` (default 100); short soak `MEMORY_SOAK_SEC=10`, full local `MEMORY_SOAK_SEC=300`. |

Inventory also recorded in the roadmap [Current baseline](../../../docs/roadmaps/production-observability-roadmap.md#current-baseline-what-already-works) table.

---

## Redaction-first

All new ops surfaces **must** use `redactDiagnostic` / `safeErrorResponse` (or list helpers). Never log or persist:

- AI tool arguments or confirmation tokens
- API keys, session cookies, bridge secrets
- IB account IDs in plain audit exports (use intent/order refs)
- Raw provider payloads or connection strings

Audit/error read APIs require existing API auth / operator gates (Security Hardening).

---

## Explicit deferrals

| Item | Why |
|------|-----|
| Sentry / Datadog / New Relic / paid OTel SaaS | Violates free-stack contract |
| Full distributed tracing (OTel everywhere) | Request IDs cover immediate need |
| RUM / Core Web Vitals vendor | Chart perf stays on existing harnesses |
| Self-hosted GlitchTip / Grafana Loki | Allowed later if Postgres/stdout stop scaling — not required to close track |

---

## Phase map

| Phase | Delivers |
|-------|----------|
| 0 | This doc + CONSTRAINTS + env placeholders (docs only) |
| 1 | `/healthz`, `/readyz` routes + tests (**Passing**) |
| 2 | Request ID middleware + JSON access logs (**Passing**) |
| 3 | Durable trading audit (Postgres) — **Passing** |
| 4 | Production error sink (Postgres) — **Passing** |
| 5 | Free alerts + runbook — **Passing** |

Track status: [production-observability-roadmap.md](../../../docs/roadmaps/production-observability-roadmap.md).
