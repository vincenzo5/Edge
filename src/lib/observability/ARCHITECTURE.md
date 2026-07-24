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

Readiness reuses existing deploy profile knobs — do not invent parallel “observability-only” dependency flags beyond `EDGE_READYZ_REQUIRE_TWS`.

---

## Current baseline

| Piece | Location | Notes |
|-------|----------|-------|
| Liveness / readiness | `/healthz`, `/readyz`, `readiness.ts` | Public, secret-free JSON; fixed reason codes on 503 |
| Redaction | `src/lib/api/redactDiagnostic.ts`, `safeErrorResponse.ts` | Reuse on all ops surfaces |
| Local errors | `localErrorLog*.ts`, `reportLocalError.ts`, `/api/dev/local-errors` | Prod **404**; gitignored `.edge/error-log.jsonl` |
| Client reporter | `src/app/components/observability/LocalErrorReporter.tsx` | Non-prod ingest |
| Market-data health | `/api/market-data/health`, Data Health UI | Solo UX; heavy for orchestrators |
| Process-local SLIs | `src/lib/marketData/state/operationalMetrics.ts` | 30m / 512 samples; not durable |
| MD trace IDs | `x-edge-md-trace-id` | Market-data scoped only |
| AI structured stderr | MCP + session bridge | No tool args in logs |
| Trading audit ring | `src/lib/trading/auditLog.ts` (500 entries) | Lost on restart |
| Order intents | Postgres `order_intents` | Durable intents; not full audit export |
| TWS sidecar health | `services/tws-sidecar` `/health` | Optional gate in `/readyz` when `EDGE_READYZ_REQUIRE_TWS=1` |

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
| 2 | Request ID middleware + JSON access logs |
| 3 | Durable trading audit (Postgres) |
| 4 | Production error sink (Postgres) |
| 5 | Free alerts + runbook |

Track status: [production-observability-roadmap.md](../../../docs/roadmaps/production-observability-roadmap.md).
