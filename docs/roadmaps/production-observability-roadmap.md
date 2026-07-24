# Production Observability Roadmap (Free Stack)

Harden Edge so operators can tell whether production is healthy **without babysitting the UI** — using only **$0 SaaS** tooling (OSS libraries, Postgres you already run, stdout logs, optional self-hosted probes).

**Last updated:** 2026-07-24

**Status:** Phase 0 **Passing**. Phases 1–5 **Pending**. Phase 1 may start under WIP=1. Complements [Security Hardening](./security-hardening-roadmap.md) (fail-closed perimeter), [Shared Cache Topology](./shared-cache-topology-roadmap.md) (Redis health fields), [Data State Hardening](./data-state-hardening-roadmap.md) (Data Health / SLIs), [Trading Execution](./trading-execution-roadmap.md) (audit ring + `order_intents`), and solo local observability in [Market Data Architecture](../../src/lib/marketData/ARCHITECTURE.md).

**Related:** [Project Status](../PROJECT-STATUS.md), [Repository Constraints](../CONSTRAINTS.md), [Observability Architecture](../../src/lib/observability/ARCHITECTURE.md) (probe contract + env knobs + baseline).

**Origin:** 2026-07-24 observability assessment + free-stack constraint (no paid APM / Sentry SaaS / PagerDuty).

---

## Intent Classification

- **Primary:** Feature — production ops surfaces (probes, structured logs, durable audit/errors, free alerts) change deploy and operator contracts.
- **Secondary:** Testing — probe/auth/redaction coverage; Architecture — extend existing redaction and health patterns, do not add a parallel telemetry stack.
- **Assumptions:**
  - **Free-only:** no paid observability SaaS in this track. Allowed: OSS libs (`pino`), Postgres, stdout/Docker logs, Discord/Slack webhooks, optional self-hosted Uptime Kuma / GlitchTip later.
  - Solo local toolkit (Data Health, `.edge/error-log.jsonl`, `report:data-reliability`) **stays**; production adds durable, restart-safe paths.
  - Reuse `redactDiagnostic` / `safeErrorResponse` — never log tool args, tokens, IB account IDs, or raw provider payloads.
  - WIP=1 — one phase Active at a time; quote actual command output in harness evidence.
  - Process-local market-data SLIs remain informational until Phase 5 wires them into free alerts.

---

## Checklist Review

- **Architecture review:** **Required** — self-review per phase. Touches middleware, API probes, logging, trading audit persistence, error ingest, and ops docs.
- **Aligned:** Market-data health + SLIs; local error log (prod 404); MCP/session-bridge structured stderr; trading audit ring + `order_intents`; redaction helpers; security fail-closed gates.
- **Missing:** `/healthz` / `/readyz`; request IDs; structured access logs; durable/queryable trading audit; production error sink; free alerting; SLO/runbook docs.
- **Misalignments:** Market-data docs correctly defer “external telemetry” for the **solo** phase — this track owns the **production** successor without introducing paid vendors.
- **Risks:** Probe routes must stay cheap and auth-safe; logging must not reintroduce secret dumps; audit/error tables need retention caps; webhook alerts can spam if thresholds are naive.
- **Decisions:** Postgres for audit + errors (not Sentry); stdout JSON logs (not Datadog); cron/webhook or Uptime Kuma for alerts (not PagerDuty).

---

## Product goal

After this track:

1. Orchestrators can ask “is the process alive?” and “can it serve?” via cheap probes.
2. A single request can be followed across API → AI → trading via a request ID in structured logs.
3. Order preview/submit/cancel/blocked/failed history survives restarts and is readable by an operator.
4. Redacted client/server errors persist in production (not only local JSONL in non-prod).
5. Operators get notified on a small set of failure modes without paid paging products.
6. Solo local observability remains available for development.

### Success criteria (track-level)

- `GET /healthz` returns 200 when the process is up (no dependency fan-out).
- `GET /readyz` returns 200 only when required deps for the deploy profile pass (cheap checks); 503 otherwise — no `REDIS_URL` / secret leaks.
- Middleware assigns a request ID; JSON access logs include method, path, status, durationMs, requestId (redacted).
- Trading audit events are durable when Postgres is configured and listable via API or CLI (auth-gated).
- Production errors append to a durable store (Postgres when configured); readable via CLI/report; still redacted.
- At least one free alert path exists for: readiness fail, Redis degraded (when required), TWS recovery stuck (when brokerage expected), API 5xx spike or order-submit failure rate (documented threshold).
- No new paid SaaS dependency in `package.json` or deploy docs for this track.

---

## Free stack contract (non-negotiable for this track)

| Need | Allowed (free) | Forbidden in this track |
|------|----------------|-------------------------|
| Liveness / readiness | First-party `/healthz`, `/readyz` | Paid uptime SaaS as the only path |
| Logs | `pino` (or equivalent OSS) → stdout/stderr; host/Docker log capture | Datadog / paid log shippers as required deps |
| Request correlation | App-generated request ID header | Paid APM as prerequisite |
| Trading audit | Postgres table (+ optional CLI/API) | Vendor audit products |
| Error sink | Postgres table (+ report CLI); optional later self-hosted GlitchTip | Sentry / Bugsnag / paid error SaaS |
| Alerts | Cron hitting probes + Discord/Slack webhook; optional self-hosted Uptime Kuma | PagerDuty / paid incident SaaS |
| Metrics pipeline | Reuse process-local SLIs + health JSON; optional later Prometheus/Grafana OSS | Datadog / New Relic / paid OTel SaaS |

**Infra note:** Postgres/Redis hosting is application infrastructure, not observability SaaS. This track assumes those already exist for production Edge.

---

## Current baseline (what already works)

| Piece | Location | Assessment |
|-------|----------|------------|
| Market-data health | `/api/market-data/health`, Data Health UI | Strong solo operator UX; heavy for orchestrators |
| Process-local SLIs | `operationalMetrics.ts` | Informational; 30m / 512 samples; not durable |
| Redaction | `redactDiagnostic.ts`, `safeErrorResponse.ts` | Strong foundation — reuse everywhere |
| Local errors | `src/lib/observability/*`, `/api/dev/local-errors` | Solo/dev; **404 in production** |
| MD trace IDs | `x-edge-md-trace-id` | Market-data scoped only |
| AI structured stderr | MCP + session bridge | No args; HTTP AI path quieter |
| Trading audit ring | `auditLog.ts` (500) | Lost on restart; no operator API |
| Order intents | Postgres `order_intents` | Durable intents; not full audit export |
| TWS sidecar health | `services/tws-sidecar` `/health` | Exists; not folded into app `/readyz` |

---

## Gap inventory

| Priority | Gap | Target phase |
|----------|-----|--------------|
| P0 | No cheap liveness/readiness for deploy/LB | 1 |
| P0 | No free-stack / probe contract documented | 0 |
| P1 | No structured access logs or app-wide request IDs | 2 |
| P1 | Trading audit not durable / queryable | 3 |
| P1 | Production has no durable error sink | 4 |
| P2 | No free alerts on existing health/SLI signals | 5 |
| P3 | AI HTTP quieter than MCP; confirm-gate not audited | Deferred |
| P3 | RUM / Web Vitals / full OTel | Deferred |
| P3 | Paid APM / Sentry SaaS | Explicitly out of scope |

---

## Design principles

1. **Free-only** — no paid observability product required to complete any phase.
2. **Redaction-first** — same sanitizers as health and local errors; never log tool args or secrets.
3. **Cheap probes, rich health** — `/healthz`/`/readyz` for machines; keep `/api/market-data/health` + Data Health for humans.
4. **Extend existing seams** — `src/lib/observability/`, `auditLog.ts`, `safeErrorResponse`, middleware — not a second telemetry framework.
5. **Fail closed on ops surfaces** — audit/error read APIs require existing API auth / operator gates (see Security Hardening).
6. **Bounded retention** — audit and error tables have caps or TTL so free Postgres does not grow unbounded.
7. **Solo toolkit preserved** — local JSONL + Data Health remain for `dev` / `dev:lite`.
8. **WIP=1** — one phase Active; harness evidence before Passing.

---

## Proposed Plan

### Phase 0 — Free-stack contract and baseline

**Band:** Now (docs + inventory)  
**Status:** **Passing** (2026-07-24)

**Outcome:** One recorded free-stack contract and baseline so later phases do not invent paid vendors or duplicate solo tooling.

| Work item | Scope |
|-----------|--------|
| Free-stack table | This doc’s contract is source of truth; link from market-data ARCHITECTURE “Local observability” → production successor |
| Probe contract | [Observability ARCHITECTURE](../../src/lib/observability/ARCHITECTURE.md) — `/healthz` (liveness) vs `/readyz` (deps) semantics and auth (public, secret-free) |
| Env knobs | Same ARCHITECTURE + `.env.example` placeholders — `EDGE_REQUEST_ID_HEADER`, readiness flags, audit/error retention |
| Baseline | Same ARCHITECTURE [Current baseline](../../src/lib/observability/ARCHITECTURE.md#current-baseline-prephase-1) + roadmap table above; no runtime change |

**Out of scope:** Runtime code.

**Exit evidence:** Docs cross-links resolve; `npm run lint:instructions` if AGENTS/CONSTRAINTS touched; harness note that Phase 1 may start.

**Gate — Phase 0 Passing:** Free stack + probe contract recorded; deferred paid tools listed.

---

### Phase 1 — Liveness and readiness probes

**Band:** Now  
**Status:** **Pending**

**Outcome:** Deployments and Docker/compose can green/red check the app without scraping full market-data health.

| Work item | Scope |
|-----------|--------|
| `GET /healthz` | Process up → 200; no DB/Redis/TWS fan-out |
| `GET /readyz` | Cheap checks for deploy profile (e.g. Postgres ping when `DATABASE_URL` set; Redis ping when Redis required; optional sidecar ping when brokerage expected); 503 + redacted reason codes when not ready |
| Auth / exposure | Prefer public probes with **no secrets in body**; align with Security Hardening (do not leak stacks or URLs) |
| Compose / docs | Document probe paths for Docker healthcheck and any deploy profile |

**Out of scope:** Structured access logs; alerting; changing market-data health payload shape beyond optional cross-link.

**Exit evidence:** Focused route tests (200/503 cases, redaction); optional compose healthcheck note; architecture note in market-data or new short ops section under `src/lib/observability/`.

**Gate — Phase 1 Passing:** Probes exist; readiness fails closed when a required dep is down; no secret leaks in JSON.

---

### Phase 2 — Structured logs and request IDs

**Band:** Now  
**Status:** **Pending**

**Outcome:** Operators can follow one request across API (and into AI/trading call sites that opt in) without paid APM.

| Work item | Scope |
|-----------|--------|
| Request ID | Middleware: accept incoming ID or mint one; set response header (e.g. `x-edge-request-id`) |
| Access log | OSS JSON logger to stdout: method, path, status, durationMs, requestId; no bodies/cookies/tokens |
| Propagation | Pass requestId into AI execute / trading service log fields where structured logs already exist or are added |
| Levels | info for access; warn/error via existing safe paths |

**Out of scope:** Shipping logs to a paid aggregator; full OpenTelemetry; changing MCP arg omission policy.

**Exit evidence:** Focused middleware/logger tests; sample log line in evidence (redacted); `npm run build` if middleware wiring changes.

**Gate — Phase 2 Passing:** Every API response carries request ID; one JSON access log line per request in non-test runs (or documented sampling if volume requires).

---

### Phase 3 — Durable trading audit

**Band:** Pre-launch  
**Status:** **Pending**

**Outcome:** Preview/submit/modify/cancel/blocked/failed history survives process restart and is operator-readable.

| Work item | Scope |
|-----------|--------|
| Persist | Write audit events to Postgres when `DATABASE_URL` set (alongside or from `auditLog.ts` ring); keep in-memory ring for local/no-DB |
| Schema | Bounded fields: time, action, result/code, orderRef/intent id, requestId; **no** raw broker payloads or account secrets |
| Read path | Auth-gated list API and/or `npm run report:trading-audit` (mirror local-errors pattern) |
| Retention | Cap rows or TTL (document default) |

**Out of scope:** Full brokerage fill ledger (owned by broker-ledger/journal tracks); public unauthenticated audit dump.

**Exit evidence:** Focused persistence + auth tests; report/CLI smoke; trading ARCHITECTURE note.

**Gate — Phase 3 Passing:** Restart after paper submit still shows the event via report/API when Postgres is on.

---

### Phase 4 — Production error sink (Postgres)

**Band:** Pre-launch  
**Status:** **Pending**

**Outcome:** Redacted client/server failures persist in production without Sentry SaaS.

| Work item | Scope |
|-----------|--------|
| Store | Postgres table for redacted errors when `DATABASE_URL` set; reuse `redactDiagnostic` |
| Ingest | Server: `safeErrorResponse` / existing append path; client: extend reporter to POST an auth-gated production ingest (not the open `/api/dev/local-errors` surface) |
| Keep solo path | Non-prod local JSONL + `/api/dev/local-errors` behavior unchanged |
| Read | `npm run report:local-errors` (or sibling) reads DB when configured |
| Retention | Cap / TTL |

**Out of scope:** GlitchTip/Sentry install (optional later, still free only if self-hosted); RUM.

**Exit evidence:** Focused ingest/redaction/auth tests; production mode does not 404 the durable path; evidence of one redacted row via report.

**Gate — Phase 4 Passing:** Forced API 5xx (test) appears in durable store under production-like env with Postgres.

---

### Phase 5 — Free alerts

**Band:** Pre-launch  
**Status:** **Pending**

**Outcome:** Operators are notified when readiness or key SLIs go bad — without paid paging.

| Work item | Scope |
|-----------|--------|
| Probe watcher | Document + ship a minimal cron/script **or** Uptime Kuma compose snippet that hits `/readyz` on an interval |
| Notify | Discord or Slack incoming webhook (free) on consecutive failures; include request-free, redacted reason codes |
| Signal set (minimum) | Readiness 503; optional: Redis degraded when required; TWS recovery stuck when brokerage expected; elevated order-submit failures (from audit) or API 5xx rate if cheap to compute |
| Runbook | Short “what to check” section in this doc or `src/lib/observability/` ARCHITECTURE — Data Health, `report:*`, probes, audit report |

**Out of scope:** PagerDuty; complex multi-window SLO burn alerts; product price alerts (existing `src/lib/alerts/`).

**Exit evidence:** Documented alert path exercised once in evidence (webhook test or dry-run); runbook linked from market-data local observability section.

**Gate — Phase 5 Passing:** One free alert path proven; runbook lists the five operator questions (up / broke / order / overnight errors / wake up).

---

## Explicit deferrals

| Item | Why |
|------|-----|
| Sentry / Datadog / New Relic / paid OTel SaaS | Violates free-stack contract |
| Full distributed tracing (OTel everywhere) | High cost/complexity; request IDs cover the immediate need |
| RUM / Core Web Vitals vendor | Chart UX perf can stay on existing perf harnesses for now |
| AI token/cost dashboards | Product analytics; not required for “is prod up?” |
| Confirm-gate decision audit stream | Useful; schedule after Phase 3–4 if still needed |
| Self-hosted GlitchTip / Grafana Loki | Allowed later if Postgres/stdout stop scaling — not required to close this track |

---

## Verification Plan

| Phase | Focused | Broader | App-level / ops |
|-------|---------|---------|-----------------|
| 0 | Docs / lint:instructions if entry files touch | — | Cross-links resolve |
| 1 | Probe route tests | `npm run build` if route wiring | Compose/docs healthcheck note |
| 2 | Middleware + logger tests | `npm run build` if middleware | Sample JSON log line in evidence |
| 3 | Audit persist + auth + report | Migration + focused trading tests | Restart still lists event |
| 4 | Ingest + redaction + auth | Migration | Production-like env shows durable row |
| 5 | Script/cron dry-run or Kuma config test | — | Webhook test + runbook |

Architecture self-review **Required** each phase. Do not mark **Passing** without quoted harness evidence in `docs/PROJECT-STATUS.md`.

---

## Harness Update

When a phase becomes Active or Passing:

1. Active Work row: behavior, state, completion evidence (quoted command output).
2. Track file `**Status:**` line + this phase’s **Status** field.
3. [README.md](./README.md) table row for this track.
4. [ROADMAP.md](../ROADMAP.md) Near-Term Execution Order headline status.
5. Prefer `npm run harness:closeout -- --name "…" --evidence-file … --roadmap docs/roadmaps/production-observability-roadmap.md` when available.

**Suggested activation order:** Phase 0 → 1 → 2 → 3 → 4 → 5 (do not skip probes/logs before durable sinks).

---

## Mental model (operator questions)

| Question | Answered by |
|----------|-------------|
| Is the app up? | Phase 1 `/healthz` |
| Can it serve? | Phase 1 `/readyz` |
| What just broke? | Phase 2 logs + request ID |
| What happened to this order? | Phase 3 durable audit |
| Did users hit errors overnight? | Phase 4 Postgres error sink |
| Do I need to wake up? | Phase 5 free alerts |
