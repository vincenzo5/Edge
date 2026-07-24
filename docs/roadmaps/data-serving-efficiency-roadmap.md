# Data Serving & Caching Efficiency Roadmap

Close the gap between a mature **server** market-data cache stack and incomplete **client** reuse — without inventing a second caching philosophy, and without treating market payloads as durable user state.

**Last updated:** 2026-07-21

**Status:** **Track complete** (2026-07-21) — Phases 0–6 **Passing**; Phase 7 **Skipped** (2026-07-21 single-user / single-instance decision — historical). Launch Redis topology / fail-loud prod policy → [Shared Cache Topology Roadmap](./shared-cache-topology-roadmap.md). Server TTL + HotStore SWR and chart client SWR already ship; client reuse, poll hygiene, home remote truth, chart/screener/AI cache gaps closed. Deferred app-level walks → [app-level-verification-roadmap.md](./app-level-verification-roadmap.md) Phase 7.

**Related:** [Market Data Architecture](../../src/lib/marketData/ARCHITECTURE.md), [Data State Hardening](./data-state-hardening-roadmap.md), [Persistence Architecture](../../src/lib/persistence/ARCHITECTURE.md), [Journal Architecture](../../src/lib/journal/ARCHITECTURE.md), [Workspace State Persistence](./workspace-state-persistence-roadmap.md), [Screener Roadmap](./screener-roadmap.md), [Project Status](../PROJECT-STATUS.md), [Repository Constraints](../CONSTRAINTS.md).

**Origin:** 2026-07-20 data-serving efficiency audit (surfaces → models → cache layers). This roadmap is the durable source of truth for phasing.

---

## Intent Classification

- **Primary:** Feature — reduce redundant network/provider work and fix stale/divergent serving paths (home remote, journal poll, client caches).
- **Secondary:** Refactor — share one client cache/coalesce primitive across search/fundamentals/overlays; Testing — TTL, invalidation, and hidden-tab poll contracts need deterministic coverage.
- **Checklists applied:** `feature-planning-checklist.md`, `refactor-planning-checklist.md`, `testing-verification-checklist.md`, `harness-status-checklist.md`, `architecture-review-checklist.md`.
- **Assumptions:**
  - Persistence remains optional (`DATABASE_URL` unset → localStorage-only).
  - Caching market data ≠ persisting user state (see workspace-state ephemeral allowlist).
  - Prefer extending `coalesceInFlight` / `chartClientCache` / `HotStore` patterns over introducing TanStack Query as a default (Phase 6 is optional).
  - Redis / shared process cache was Phase 7 scale gate — **Skipped** (2026-07-21 single-user product); prod launch policy → [Shared Cache Topology Roadmap](./shared-cache-topology-roadmap.md).

---

## Checklist Review

- **Architecture review:** **Required** — self-review, **Passed for roadmap**. Implementation phases touch shared market-data serving, chart data-feed, journal sync, home bootstrap, screener technical path, AI ports, and optional HTTP/cache contracts. Each phase needs its own exit review.
- **Aligned:** Server `DataCache` + `HotStore` TTLs are documented and catalog-aware; chart feed already does client SWR; data-state hardening Phases 0–8 Passing establish freshness/trust vocabulary; offline-first persistence constraint is honored.
- **Missing:** None remaining in track — Phases 0–6 closed gaps; Phase 7 multi-instance Redis **Skipped** by product decision (single user).
- **Misalignments:** Strong server TTLs wasted by client remounts; home hub local-only vs chart bootstrap remote merge; dual layout keys (`tv-ai:layout:v1` + workspace-tabs); chart chrome vs Data Health stale models remain intentionally split (do not “unify” in this track — see data-state hardening).
- **Risks:** Over-caching live quotes past HotStore freshness; serving stale search after listing changes; journal poll changes missing new fills; home remote flash vs bootstrap timeout; screener rule changes invalidating technical cache incorrectly; `Cache-Control` on POST or auth-sensitive routes; Redis key drift from in-process contracts.
- **Recommendations:** ~~Phase 0–6 executed as planned.~~ Track complete; Phase 7 Redis **Skipped**. Do not persist candle/quote payloads into localStorage as “cache.”

---

## Product goal

At any moment Edge should:

1. Serve each dataset from the **nearest correct tier** (HotStore → DataCache → provider; client session → API).
2. Avoid repeating identical in-flight and recently answered reads for the same key.
3. Keep idle tabs from polling brokers/Postgres every few seconds without backoff.
4. Show home/workspace summaries that match optional cloud truth when persistence is on.
5. Preserve display vs trading trust rules from data-state hardening (cache hits stay labeled; fallback never authorizes trades).

### Success criteria (track-level)

- Reopening symbol search, fundamentals, overlays, and market context for the same key within TTL does not hit the network (client hit + server still authoritative on miss).
- Journal ingest polling is visibility-aware and backs off on failure; successful idle tabs do not hammer `/api/cron/brokerage-ingest` every 30s forever without reason.
- Home workspace cards reflect remote chart-workspaces when Postgres + session exist.
- Chart history prepend (`loadMore`) survives in `chartClientCache` for the session TTL window.
- Screener technical runs document and meet a cost budget (candidate cap + cache hit rate or universe_daily preference).
- Architecture docs describe the client cache primitive and TTLs alongside `ttlPolicy.ts`.
- Multi-instance shared cache: **Skipped** with rationale (single-user / single Node) — process-local HotStore/DataCache remain the server acceleration layer.

---

## Current baseline (what already works)

| Layer | Mechanism | Assessment |
|-------|-----------|------------|
| Server TTL | `globalDataCache` + `ttlPolicy.ts` | Solid |
| Server SWR | `globalHotStore` (quotes/candles/options) | Solid |
| Chart client SWR | `chartClientCache` + `coalesceInFlight` | Solid — initial range + `loadMore` prepend merge (Phase 3) |
| Watchlist quotes | `MarketDataProvider` Map + SSE/poll | Solid as session state |
| Persistence | localStorage + revisioned `/api/me/*` | Solid for user state |
| Data-state / trust | Catalog, HotStore transport labels, health projection | Solid (separate track) |

### Gap inventory (this track)

| Priority | Gap | Impact |
|----------|-----|--------|
| P0 | No client TTL for search / fundamentals / overlays / market context | Repeat round-trips despite server cache |
| P0 | Journal ingest `setInterval(30s)` no backoff / hidden-tab skip | Idle load, fill reload churn |
| P0 | Home summaries localStorage-only | Stale vs Postgres / other device |
| P1 | `loadMore` not written to chart client cache | History pan re-fetches |
| P1 | Chart cell vs watchlist quote path overlap | Duplicate quote work (partially mitigated server-side) |
| P1 | Screener technical up to ~200 candle fetches | Latency + provider pressure |
| P2 | Missing private `Cache-Control` on safe GETs | Browser cannot help back/forward |
| P2 | AI client `MarketDataPort` + pattern taxonomy uncached | Agent/tool repeat I/O |
| P2 | Legacy `tv-ai:layout:v1` still in play | ~~Dual layout truth risk~~ **Phase 6 closed** — migrate-on-load only; write lock test |
| P3 | No Redis / shared cache | ~~Cold-start + multi-instance duplicate provider calls~~ **Phase 7 Skipped** — single-user / single Node; process-local cache sufficient |
| P3 | Optional TanStack Query for `/api/me/*` | ~~Ad hoc fetch loops~~ **Phase 6 closed** — `ClientTtlCache` memo for journal/pattern GETs; TanStack declined |

---

## Design principles

1. **Extend existing primitives** — one client `TtlLruCache` (or equivalent) shared by search/fundamentals/overlays/context; reuse `coalesceInFlight` for burst dedupe.
2. **TTL align with server** — client max-age ≤ server `CACHE_TTL_MS` / hot stale windows unless documented otherwise.
3. **Cache ≠ user state** — never write candles/quotes/fundamentals into durable layout/prefs stores.
4. **Visibility-aware background work** — `document.visibilityState` gates journal/account poll loops.
5. **Trust labels unchanged** — cached deliveries remain `transport: cache` where instrumentation exists; trading gates stay on raw observations.
6. **WIP=1** — one phase Active at a time; completion evidence required before Passing.

---

## Target architecture

```text
Provider
  → MarketDataService
      → HotStore (SWR) + DataCache (TTL)     [shipped]
  → /api/* (+ optional private Cache-Control on safe GETs)

Client
  → coalesceInFlight (in-flight only)        [shipped]
  → ClientTtlCache (search, fundamentals,
       overlays, market_context, optional AI) [this track]
  → chartClientCache (candles SWR + loadMore) [extend]
  → Domain providers (quotes Map, journal, etc.)
  → localStorage / IDB                        [user state only]
```

Key namespaces (client) should mirror server where practical:

| Client namespace | Suggested TTL | Aligns with |
|-----------------|---------------|-------------|
| `search` | 60s | `CACHE_TTL_MS.search` |
| `fundamentals` | 6h | `CACHE_TTL_MS.fundamentals` |
| `events` | 15m | `CACHE_TTL_MS.events` |
| `news` | 5m | `CACHE_TTL_MS.news` |
| `options_expirations` | 60s | server options exp |
| `market_context` | 6h | `CACHE_TTL_MS.market_context` |

---

## Phasing

### Phase 0 — Client cache contract freeze

**Status:** **Passing** (2026-07-21)

**Outcome:** One documented client cache primitive and key/TTL matrix; no user-visible behavior change required.

| Work item | Scope |
|-----------|--------|
| Primitive | Design `ClientTtlCache` (module Map + optional sessionStorage policy, LRU cap, `get/set/invalidate`, test helpers) — may live under `src/lib/marketData/cache/` or `src/lib/chartDataFeed/` |
| Matrix | Document namespaces, key shapes, TTLs, and “do not cache” list (live quote streams, brokerage snapshots, order previews) |
| Coalesce | Confirm which paths use `coalesceInFlight` vs TTL cache vs both |
| Docs | Update `marketData/ARCHITECTURE.md` cache section; link this roadmap |
| Tests | Unit tests for TTL expiry, LRU eviction, key normalization |

**Out of scope:** Wiring consumers (Phase 1); Redis; TanStack Query.

**Gate — Phase 0 Passing:** Architecture note + primitive (or approved sketch + failing-red tests that lock API) reviewed; harness Task Contract opened for the track.

**Exit review:** self-review.

---

### Phase 1 — Client reuse for high-churn reads (P0)

**Status:** **Passing** (2026-07-21)

**Outcome:** Search, fundamentals, chart overlays, and market context reuse session answers within TTL.

| Work item | Scope |
|-----------|--------|
| Symbol search | `useSymbolSearch` — normalize query key; hit `ClientTtlCache` before `/api/search` |
| Fundamentals | `useWatchlistFundamentalsCache` / `fundamentalsClient` — session map keyed by symbol; survive panel remount |
| Overlays | `apiChartDataFeed` `loadEvents` / news / options pins — per `{symbol, from, to, kinds}` (or equivalent) + coalesce |
| Market context | `MarketContextBreadcrumb` — per-symbol cache for `/api/market-data/context` |
| Invalidation | Document explicit clear hooks (symbol change is natural key miss; logout/session reset clears all) |

**Out of scope:** Changing server TTLs; caching SSE quote ticks.

**Verification:** Focused unit/integration tests for hit/miss; app-level: type “AAPL” twice, reopen fundamentals/overlays — network panel shows cache hits (or equivalent test spy).

**Exit review:** self-review.

---

### Phase 2 — Background poll hygiene + home remote truth (P0)

**Status:** **Passing** (2026-07-21)

**Outcome:** Idle work is cheap; home matches optional cloud workspaces.

| Work item | Scope |
|-----------|--------|
| Journal ingest | `JournalSyncProvider` — skip when `document.hidden`; exponential backoff on failure; keep mount + visibility-return kick |
| Trades reload | Avoid full trades+fills refetch when ingest reports no-op / unchanged cursor (if API already exposes signal; else add lightweight `changed` flag) |
| Home summaries | `useHomeWorkspaceSummaries` — when persistence enabled, merge `/api/me/chart-workspaces` (same timeout/local-first spirit as `resolveAppBootstrap`) |
| Account poll (optional stretch) | Align live 15s snapshot poll with visibility skip if not already |

**Out of scope:** Replacing ingest with pure push (nice-to-have later); workspace-state Phase 2 shell cloud sync.

**Verification:** Hidden tab does not fire ingest on interval; failure backs off; home shows remote-only workspace after Postgres save from another path.

**Exit review:** self-review.

---

### Phase 3 — Chart feed completeness + quote path sharing (P1)

**Status:** **Passing** (2026-07-21)

**Outcome:** History pan and overlapping symbols reuse client state.

| Work item | Scope |
|-----------|--------|
| loadMore cache | Merge prepended bars into `chartClientCache` entry (or adjacent history keys) with same 5min max-age / LRU 20 |
| Quote reuse | Chart cells prefer `MarketDataProvider.quotesBySymbol` for last price / tab quote when symbol ∈ active watchlist; candle path unchanged |
| Docs | Note loadMore behavior in `marketData/ARCHITECTURE.md` + chart data-feed notes |

**Out of scope:** Cross-tab BroadcastChannel quote bus (defer unless needed).

**Verification:** Focused chartClientCache tests for prepend merge; pan-back does not re-POST identical history page within TTL; watchlist+chart same symbol does not double REST quote storm when SSE healthy.

**Exit review:** self-review.

---

### Phase 4 — Screener technical serving cost (P1)

**Status:** **Passing** (2026-07-21)

**Outcome:** Technical screens stay correct with lower provider fan-out.

| Work item | Scope |
|-----------|--------|
| Prefer universe_daily | Route more technical rules through rolling daily store when interval/rule allows |
| Cache hit metrics | Log/count `screener_technical` hit rate in diagnostics or tests; keep 15m TTL |
| Candidate policy | Revisit `TECHNICAL_FILTER_MAX_CANDIDATES` + concurrency with documented budget |
| Coalesce | Ensure parallel identical symbol/rule candle fetches coalesce under load |

**Depends on:** Existing screener roadmap Phase 3 features remain compatible; coordinate if both Active (WIP=1 — do not run in parallel).

**Verification:** Focused technicalFilter tests; representative screen run shows fewer provider candle calls vs baseline (record numbers in harness evidence).

**Exit review:** self-review; architect agent if changing screener API contracts.

---

### Phase 5 — HTTP headers, AI port memo, pattern taxonomy (P2)

**Status:** **Passing** (2026-07-21)

**Outcome:** Safe GETs and tool/disk reads stop repeating free work.

| Work item | Scope |
|-----------|--------|
| Cache-Control | Add `private, max-age=…` on safe GET routes (fundamentals, market-data context, search if GET exists / or document POST-only) matching server TTL; never on SSE, brokerage, trading, or auth cookie mutations |
| AI client port | Wrap `createFetchMarketDataPort` read tools with session TTL map (candles/quotes/search) |
| Pattern taxonomy | In-memory cache in `patternLibrary/storage.ts` with mtime or version check |
| MCP | Confirm server MDS path already benefits from HotStore; no double-cache layer |

**Verification:** Header tests or route snapshot; taxonomy second read is memory hit; AI port second `search_symbols` in-session hits memo.

**Exit review:** self-review.

---

### Phase 6 — Layout truth + optional `/api/me` client cache (P2)

**Status:** **Passing** (2026-07-21)

**Outcome:** One layout write path; persistence GET session memo via existing `ClientTtlCache` (TanStack Query declined).

| Work item | Scope |
|-----------|--------|
| Legacy layout | Deprecate `saveLayout`/`clearLayout` (test-only); migration-only reads; import lock test |
| Sync compare | `layoutContentFingerprint` for dirty keys + remote merge equality |
| `/api/me` client cache | `journal_trades`/`journal_fills`/`pattern_library_records` namespaces + explicit invalidation |

**Out of scope:** Workspace-state per-tile charts (owned by [workspace-state-persistence-roadmap.md](./workspace-state-persistence-roadmap.md)); TanStack Query.

**Verification:** **Focused:** `Test Files 7 passed (7)`, `Tests 45 passed (45)`; **Build:** `✓ Compiled successfully`; legacy write lock + fingerprint + persistence GET memo tests.

**Exit review:** self-review **Passed** — TanStack Query not adopted; existing TTL primitive extended.

---

### Phase 7 — Multi-instance shared cache (P3 / scale gate)

**Status:** **Skipped** (2026-07-21)

**Outcome (original):** Process-local HotStore/DataCache contracts can run on Redis (or equivalent) when deploying >1 Node.

**Skip rationale:** Product is single-user; production topology remains one Node process. Process-local `globalHotStore` + `globalDataCache` already cover the serving path. Redis would only help multi-instance duplicate-provider avoidance and cross-instance TWS recovery fan-out — neither applies.

| Work item | Scope |
|-----------|--------|
| Decision gate | **Closed — skip** (single-user / single Node) |
| Key parity | N/A — no shared-cache adapter |
| Invalidation | N/A — process-local `resetTwsRecoveryState` sufficient |
| Fallback | Process-local remains the only and correct path |

**Out of scope (unchanged):** External telemetry SaaS; changing provider adapters; Redis implementation.

**Verification:** Decision recorded in this roadmap + harness; Redis implementation deferred to [Memory Efficiency Phase 12](./memory-efficiency-roadmap.md) (2026-07-24 **Passing** — flagged adapters, default memory).

**Superseded by:** [Memory efficiency Phase 12](./memory-efficiency-roadmap.md) (flagged Redis adapters, 2026-07-24 **Passing**). **Prod topology / fail-loud / ops flip** owned by [Shared Cache Topology Roadmap](./shared-cache-topology-roadmap.md) — Phase 7 skip rationale (single-user) no longer governs public-launch cache policy.

**Exit review:** self-review **Passed** — skip justified for 2026-07-21 topology; Redis path added under Memory track; launch hardening moved to shared-cache topology track.

---

## Explicit deferrals

- Persisting market payloads (candles/quotes/fundamentals) as durable user state
- Unifying chart chrome stale UI with Data Health vocabulary (data-state hardening owns that)
- Global API rate limiter (separate ops track)
- Replacing SSE with a third-party realtime bus
- CDN/public caching of authenticated market responses
- Research UI for notes API (product track, not cache track)
- Multi-instance Redis / shared HotStore+DataCache (Phase 7 **Skipped** — single-user; prod follow-up → [shared-cache-topology-roadmap.md](./shared-cache-topology-roadmap.md))

---

## Proposed plan (execution order)

1. ~~Activate Phase 0 under WIP=1; land primitive + docs.~~ **Done**
2. ~~Phase 1 client reuse.~~ **Done**
3. ~~Phase 2 journal + home.~~ **Done**
4. ~~Phase 3 chart feed completeness.~~ **Done**
5. ~~Phase 4 screener cost.~~ **Done**
6. ~~Phase 5 headers / AI / taxonomy polish.~~ **Done**
7. ~~Phase 6 layout cleanup; TanStack declined.~~ **Done**
8. ~~Phase 7 multi-instance Redis.~~ **Skipped** — track complete.

---

## Verification plan

| Tier | When | Scope |
|------|------|--------|
| **Focused** | Every phase | TTL/LRU tests; consumer hit/miss; journal visibility/backoff; home remote merge; loadMore cache merge; screener call-count; header/taxonomy/AI memo as applicable |
| **Build** | Phases that touch API routes or shared exports | `npm run build` |
| **App-level** | Phases 1–3 | `/workspace` + `/home`: search twice, fundamentals reopen, overlay reopen, hidden-tab ingest quiet, home remote card, chart pan-back |
| **Full** | After Phase 1 or 4 shared contracts | `npm run check` when market-data/client feed shared behavior changes |

Completion evidence must quote actual command output (test counts, build exit, or measured network/call reductions).

---

## Harness update

**Track closed** (2026-07-21): Phases 0–6 **Passing**; Phase 7 **Skipped**. Task Contract → **Passing** / track complete. No further Active Work rows for this track.

| Section | Change |
|---------|--------|
| **Active Work** | Phase 7 **Skipped** row + track-complete row; no **Active** item |
| **Task Contract** | Status **Passing** — track complete |
| **Session Log** | Append Phase 7 skip / track closeout |
| **Current Verified State** | Data serving efficiency track complete |}

---

## Touch points (implementation)

| Area | Path |
|------|------|
| Server TTL / HotStore | `src/lib/marketData/cache/`, `hotStore.ts`, `service/marketDataService.ts`, `ttlPolicy.ts` |
| Chart feed | `src/lib/chartDataFeed/chartClientCache.ts`, `coalesceInFlight.ts`, `apiChartDataFeed.ts`, `useChartDataFeed.ts` |
| Search / fundamentals | `useSymbolSearch.ts`, `fundamentalsClient.ts`, `useWatchlistFundamentalsCache.ts` |
| Market context | `MarketContextBreadcrumb.tsx`, `/api/market-data/context` |
| Journal poll | `JournalSyncProvider.tsx`, journal client/ingest routes |
| Home | `useHomeWorkspaceSummaries.ts`, chart-workspaces API client |
| Quotes | `MarketDataProvider.tsx`, ChartCell / tab quote consumers |
| Screener | `technicalFilter.ts`, `universeDailyStore.ts` |
| AI / patterns | `marketDataPort.ts`, `patternLibrary/storage.ts` |
| Layout legacy | `layoutStorage.ts`, `workspaceTabsStorage.ts` |
| Docs | `marketData/ARCHITECTURE.md`, this roadmap, `PROJECT-STATUS.md` |

---

## Related docs

- [ROADMAP.md](../ROADMAP.md) — product direction; near-term tracks index
- [roadmaps/README.md](./README.md) — feature-track status table
- [data-state-hardening-roadmap.md](./data-state-hardening-roadmap.md) — freshness/trust (complementary; mostly shipped)
- [workspace-state-persistence-roadmap.md](./workspace-state-persistence-roadmap.md) — durable desk state (orthogonal to market cache)
- [screener-roadmap.md](./screener-roadmap.md) — coordinate Phase 4 technical cost work
- [marketData/ARCHITECTURE.md](../../src/lib/marketData/ARCHITECTURE.md) — cache/SWR ownership
- [journal/ARCHITECTURE.md](../../src/lib/journal/ARCHITECTURE.md) — ingest + trades loading
