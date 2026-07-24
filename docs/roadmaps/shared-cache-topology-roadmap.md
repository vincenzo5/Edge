# Shared Cache Topology Roadmap

Make Redis the mandated production server cache for market-data HotStore/DataCache — without deleting the in-memory adapter — and close the silent-fallback, boot-order, ops, and multi-instance coordination gaps that Phase 12 left open.

**Last updated:** 2026-07-24

**Status:** Phase 0 **Passing** (2026-07-24). Phase 1 **Passing** (2026-07-24). Phase 2 **Passing**. Phase 3 **Passing**. Phase 4 **Passing** (repo ops profile; CI job **Skipped** — no workflow). Adapters already ship (Memory efficiency Phase 12 **Passing**); this track owns topology policy, fail-loud production behavior, key isolation, ops flip, and conditional multi-instance coordination. Manual `redis:up` health flip (Phase 2 residual) → [app-level-verification-wave-2-roadmap.md](./app-level-verification-wave-2-roadmap.md) Phase 4.

**Related:** [Market Data Architecture](../../src/lib/marketData/ARCHITECTURE.md), [Memory Efficiency](./memory-efficiency-roadmap.md) (Phase 12 adapters), [Data Serving Efficiency](./data-serving-efficiency-roadmap.md) (Phase 7 skip superseded), [Data State Hardening](./data-state-hardening-roadmap.md), [Security Hardening](./security-hardening-roadmap.md), [App-level Verification Wave 2](./app-level-verification-wave-2-roadmap.md), [Project Status](../PROJECT-STATUS.md), [Repository Constraints](../CONSTRAINTS.md).

**Origin:** 2026-07-24 enterprise cache topology review (Opus 5 + parent synthesis). Memory Phase 12 shipped flagged Redis adapters with default memory and always-on soft fallback; public/multi-user launch needs a stricter contract.

---

## Intent Classification

- **Primary:** Feature — production topology and fail-loud Redis policy change runtime behavior and deploy contracts.
- **Secondary:** Bugfix — silent memory substitution when Redis is configured; Testing — boot-order + parity CI job.
- **Architecture review:** **Required** — self-review per phase; Phase 1 touches boot/cache composition; Phase 5 touches rate-limit/coalesce coordination.
- **Assumptions:**
  - Keep **both** adapters; memory remains CI/local default; Redis is staging/prod.
  - Market-data keys stay **global** (symbol/interval/etc.) — never `userId`-scoped.
  - Entitlements (when tiers exist) filter **after** cache read — out of this track.
  - WIP=1 — one phase Active at a time; quote actual command output in harness evidence.
  - Phase 5 is gated on Phase 0’s recorded prod instance count.

---

## Checklist Review

- **Missing:** Prod fail-loud; boot-order guarantee when Redis configured; health backend kind; env/schema key isolation; Redis ops profile (`maxmemory` without desyncing app LRU); shared rate-limit / single-flight when N>1.
- **Misalignments:** Data-serving Phase 7 still reads as “Redis not needed”; Memory Phase 12 documents soft fallback always; `ensureServerCacheBackendsInitialized` early-returns on any `cachedBackends`, so a pre-instrumentation proxy touch can permanently stick memory even when env=`redis`.
- **Risks:** Fail-loud breaks local `dev` if misconfigured; `allkeys-lru` desyncs `redisEviction.ts` ZSET indexes; L1 process cache reintroduces cross-instance staleness if TTL is careless; sharing one Redis across staging/prod without env prefixes poisons cache.
- **Decisions:** Soft fallback local/dev only; fail loud when Redis required; post-boot Redis errors fail open to providers + degraded flag; Phase 5 only if prod instances >1.

---

## Product goal

After this track:

1. Staging and production always run HotStore/DataCache on Redis (or refuse to serve).
2. Local/CI keep the memory adapter for hermetic, fast tests — Redis parity is one explicit CI job, not every unit run.
3. No silent memory substitution when Redis is the configured backend in production.
4. Cache keys cannot cross environments or survive incompatible payload shape changes unnoticed.
5. Redis ops match the app’s own eviction (no server `allkeys-lru` fighting ZSET indexes).
6. If (and only if) prod runs >1 Node instance, rate limits and provider single-flight are shared.

### Success criteria (track-level)

- With Redis required, missing `REDIS_URL` or failed ping → process fails at boot (no memory fallback).
- Boot-order test: proxy touch before instrumentation still ends on Redis when configured.
- `/api/market-data/health` reports backend kind + degraded state (no `REDIS_URL` leak).
- Keys use `edge:{env}:{schemaVersion}:md:…`; two envs against one Redis show zero cross-reads.
- Staging completes one release cycle on Redis with health green before prod flip.
- Phase 5 skipped or Passing per Phase 0 topology answer.

---

## Topology gate (Phase 0 fills this)

| Environment | Backend | Require | Notes |
|-------------|---------|---------|-------|
| Unit / default CI | `memory` | off | No Redis required |
| CI Redis parity job | `redis` | off | Manual `EDGE_TEST_REDIS=1` locally — **no CI workflow** (Phase 4 Skipped) |
| Local `dev:lite` | `memory` | off | Optional Redis |
| Local full stack | `redis` recommended | off | `npm run redis:up`; warn+fallback until Phase 1 |
| Staging | `redis` | **on** | `EDGE_REQUIRE_REDIS=1` if not `NODE_ENV=production` |
| Production | `redis` | **on** | `NODE_ENV=production` or `EDGE_REQUIRE_REDIS=1` |

**`EDGE_REQUIRE_REDIS` semantics (Phase 1 implements):** on when `EDGE_REQUIRE_REDIS=1` or `NODE_ENV=production`; when on, missing `REDIS_URL` or Redis ping fail → boot throw (no memory substitute); when off, keep Phase 12 warn + memory fallback. Still set `EDGE_MARKET_DATA_CACHE_BACKEND=redis` + `REDIS_URL` for the Redis path.

**Prod instance count at launch:** **1** (recorded 2026-07-24 in harness).  
Phase 5 triggers only when recorded count **> 1** (or deploy platform can spawn multiple workers without an explicit single-process pin). **Phase 5: Skipped** at N=1 unless topology changes.

---

## Non-goals

| Item | Why |
|------|-----|
| Delete the memory adapter | Breaks hermetic tests and parity baseline |
| Redis for every Vitest run | Iteration tax with no product gain |
| L1 process cache in front of Redis | Reintroduces cross-instance staleness unless TTL ≪ shortest hot freshness; revisit only with profiles |
| Entitlement / billing tiers | Separate product track; constraint only: filter after cache |
| Managed Redis vendor bake-off | Deployment checkbox inside Phase 4 |
| Persist market payloads in Redis/Postgres as durable user state | Ephemeral cache only |
| Browser / client TTL redesign | Out of scope |

**Forbidden ops default:** Do **not** set Redis `maxmemory-policy allkeys-lru` while using app-owned ZSET LRU in `redisEviction.ts` — server eviction drops entry keys without cleaning index members and corrupts byte accounting. Prefer `maxmemory` + `noeviction` or `volatile-ttl`, and let the app evict.

---

## Current baseline (what already works)

| Piece | Location | Assessment |
|-------|----------|------------|
| Adapter interfaces | `cacheBackendTypes.ts` | Solid seam |
| Memory HotStore/DataCache | `memoryHotStore.ts`, `dataCache.ts` | Default; budgets Phase 4 |
| Redis adapters | `redisHotStore.ts`, `redisDataCache.ts`, `redisEviction.ts` | Parity suite exists |
| Backend switch + soft fallback | `serverCacheBackends.ts` | Works; silent fallback always |
| Boot hook | `instrumentation.ts` | Calls `ensureServerCacheBackendsInitialized` |
| Global market keys | `hotStoreConstants.ts` | No tenant segment — correct |
| Process coalesce | `coalesceInFlight.ts` | Single-process only |
| Process rate limit | `src/lib/api/rateLimit.ts` | Single-process `Map` |
| Compose Redis | `docker-compose.yml` | `maxmemory` + `noeviction`; ephemeral (no volume) |
| Health surface | `/api/market-data/health` | Providers/trust + `cache` backend kind/degraded/last ping |

---

## Gap inventory

| Priority | Gap | Target phase |
|----------|-----|--------------|
| P0 | Silent Redis→memory fallback in all envs | 1 |
| P0 | Pre-init proxy touch can permanently stick memory (`ensure…` early-return on any `cachedBackends`) | 1 |
| P0 | No env/docs contract for staging/prod Redis | 0 |
| P1 | Health omits backend kind / degraded | 2 |
| P1 | No env/schemaVersion in Redis key prefix | 3 |
| P1 | Compose persistence + no maxmemory policy | 4 **closed** |
| P1 | Redis parity CI opt-in only (`EDGE_TEST_REDIS=1`) | 4 **Skipped** (no workflow) |
| P2 | Process-local rate limit multiplies by instance count | 5 (if N>1) |
| P2 | Process-local coalesce duplicates provider work across instances | 5 (if N>1) |
| P3 | `enableOfflineQueue: true` turns outages into latency spikes | 1 |
| P3 | Shared provider quota counters | 5 sub-item if metered |

---

## Phases

### Phase 0 — Topology gate and env contract

**Band:** Now (docs only)  
**Status:** **Passing** (2026-07-24)

**Outcome:** One recorded answer for prod instance count and per-environment backend that later phases read.

| Work item | Scope |
|-----------|--------|
| Topology decision | Record expected prod Node instance count at public launch in `docs/PROJECT-STATUS.md` |
| Env matrix | Codify local / CI / staging / prod → memory vs redis (table above) |
| Require knob | Define `EDGE_REQUIRE_REDIS` (or equivalent) semantics for fail-loud |
| Docs | Update `.env.example`, `src/lib/marketData/ARCHITECTURE.md` fallback row, `AGENTS.md` Redis note; supersede pointers on Memory Phase 12 + Data-serving Phase 7 |

**Out of scope:** Any runtime code change.

**Verification:** `npm run lint:instructions`; docs cross-links resolve; harness topology line present.

**Gate — Phase 0 Passing:** Topology + env matrix recorded; Phase 5 trigger explicit (N>1 or not).

---

### Phase 1 — Deterministic backend resolution and fail-loud

**Band:** Now  
**Status:** **Passing** (2026-07-24)

**Outcome:** When Redis is configured/required, the process either uses Redis or refuses to serve — never silently substitutes memory in production.

| Work item | Scope |
|-----------|--------|
| Init guard | `serverCacheBackends.ts` — do not early-return memory when resolved kind is `redis`; never cache a memory instance for redis kind |
| Fail-loud | Missing `REDIS_URL` or ping fail → throw when `NODE_ENV=production` or `EDGE_REQUIRE_REDIS`; warn+fallback only for local/dev |
| Offline queue | `redisClient.ts` — `enableOfflineQueue: false` in production/require mode |
| Post-boot policy | Redis errors mid-request: fail open to providers, mark degraded (market data has a source of truth) |
| Boot await | `instrumentation.ts` / callers — Redis path initialized before serving hot/data cache |

**Out of scope:** Key namespace changes; compose ops; health payload fields.

**Verification:** Extend `serverCacheBackends.test.ts` for prod-throw, dev-fallback, and pre-init proxy ordering; focused cache tests; `npm run build` if wiring changes.

**Gate — Phase 1 Passing:** Boot-order test proves Redis engages even when the proxy is touched before instrumentation; prod-require path throws without fallback.

---

### Phase 2 — Backend observability

**Band:** Now (small)  
**Status:** **Passing** (2026-07-24)

**Outcome:** Operators can see which backend is live and whether it is degraded without shell access.

| Work item | Scope |
|-----------|--------|
| Health fields | Extend `ServerHealthPayload` / `/api/market-data/health` with backend kind, last ping/ok, degraded flag |
| Redaction | Reuse existing redaction — never leak `REDIS_URL` |

**Out of scope:** External dashboards, paging, SaaS telemetry.

**Verification:** Focused health tests; manual `npm run redis:up` flip shows kind change.

**Gate — Phase 2 Passing:** Health reports `redis` on Redis boot and `memory` on memory boot.

---

### Phase 3 — Key namespace and environment isolation

**Band:** Pre-launch  
**Status:** **Passing** (2026-07-24)

**Outcome:** Staging and prod (or laptop vs staging) can share Redis infrastructure without poisoning each other; payload shape changes invalidate cleanly.

| Work item | Scope |
|-----------|--------|
| Key prefix | `redisKeys.ts` (+ consumers) → `edge:{env}:{schemaVersion}:md:{hot\|dc}:…` |
| Global keys | Confirm logical keys stay symbol/interval scoped — no `userId` |
| Bump procedure | Document schemaVersion bump in `ARCHITECTURE.md` |

**Out of scope:** Tenant scoping; entitlement filtering.

**Verification:** Key-format unit tests; parity suite with `EDGE_TEST_REDIS=1`.

**Gate — Phase 3 Passing:** Two envs against one Redis show zero cross-reads.

---

### Phase 4 — Redis ops profile and launch flip

**Band:** Pre-launch  
**Status:** **Passing** (2026-07-24) — repo ops profile + deploy docs; operator staging soak / prod flip is post-repo gate

**Outcome:** Correctly configured dedicated Redis that Edge has run on in staging for one release cycle before prod traffic.

| Work item | Scope | Status |
|-----------|--------|--------|
| Memory policy | `maxmemory` with `noeviction` — **not** `allkeys-lru` | **Passing** — `docker-compose.yml` |
| Ephemeral store | Disable persistence; drop `redis_data` volume | **Passing** — compose |
| Auth / TLS | `REDIS_URL` with AUTH; `rediss://` where deploy requires | **Passing** — `.env.example` + `ARCHITECTURE.md` |
| Placement | Dedicated instance co-located with app | **Passing** — docs |
| CI parity job | One CI job with Redis service | **Skipped** — no workflow (manual parity only) |
| Staging soak | Staging on Redis for **one release cycle** with health green | **Pending** — operator gate |
| Prod flip | Set backend=`redis` + require; confirm health | **Pending** — after staging soak |

**Out of scope:** Redis Cluster; vendor selection as a blocking research phase; GitHub Actions / CI workflow.

**Verification:** Manual `EDGE_TEST_REDIS=1` parity suite green; local health reports `cache.kind: redis` with redis backend; staging soak evidence before prod flip.

**Gate — Phase 4 Passing (repo):** Compose ops profile + deploy contract docs + manual parity. **Gate — track launch:** Staging clean for one release cycle → prod flipped with require-on.

---

### Phase 5 — Shared coordination primitives

**Band:** Later — **conditional on Phase 0 prod instance count > 1**  
**Status:** **Pending** (or **Skipped** if single-instance)

**Outcome:** Limits and provider calls behave the same at N instances as at one.

| Work item | Priority | Scope |
|-----------|----------|--------|
| Shared rate limit | (a) highest | Redis-backed store for `src/lib/api/rateLimit.ts` |
| Shared single-flight | (b) | Redis lock / shared in-flight for `coalesceInFlight.ts` provider fetches |
| Provider quota counters | (c) only if metered | Shared counters when a provider bills per call |

**Out of scope:** L1 process cache; entitlement filtering; rewriting provider adapters.

**Verification:** Two-instance local run: one shared limit window; one provider call per coalesce key under concurrent miss.

**Gate — Phase 5 Passing or Skipped:** Do not start while Phase 0 records single-instance prod; if skipped, record rationale in harness.

---

## Supersedes / relationship to prior tracks

| Prior | Status | Relationship |
|-------|--------|--------------|
| [Data serving Phase 7](./data-serving-efficiency-roadmap.md) | **Skipped** (single-user) | Superseded for topology — adapters exist; this track owns prod policy |
| [Memory efficiency Phase 12](./memory-efficiency-roadmap.md) | **Passing** (flagged adapters) | Foundation complete; this track owns fail-loud, keys, ops flip, coordination |
| Browser / client caches | N/A | Stay in-process; out of scope |

---

## Suggested execution order

```text
Phase 0 (docs/topology)
  → Phase 1 (fail-loud + boot fix)
  → Phase 2 (health)
  → Phase 3 (key isolation)
  → Phase 4 (ops + staging soak + prod flip)
  → Phase 5 only if Phase 0 says N>1
```

WIP=1: activate one phase at a time in `docs/PROJECT-STATUS.md`; quote focused/test evidence before **Passing**.

---

## Exit criteria (track complete)

- Phases 0–4 **Passing**
- Phase 5 **Passing** or **Skipped** with topology rationale
- `ARCHITECTURE.md` + `.env.example` describe Redis-required prod and memory-default tests
- No contradictory “Redis not needed / always soft-fallback” claims left as current truth in data-serving or memory Phase 12 follow-up notes
