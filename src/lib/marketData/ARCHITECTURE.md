# Market Data Layer

Provider-neutral stocks/options data foundation for the closed Edge app.

**Productization track:** Phase 0 contracts in [`src/lib/connections/`](../connections/ARCHITECTURE.md); Settings Connections, provider preference order, and ConfigSource/vault path → [Connections & Providers Roadmap](../../../docs/roadmaps/connections-providers-roadmap.md). **Phase 3 (2026-07-24):** `ConfigSource` + `EnvConfigSource` in [`config/`](config/) — adapters resolve gate/credential reads through `getConfigSource()`; env-only backend today; vault plugs in later without adapter rewrites.

## Layout

```
src/lib/marketData/
  config/         ConfigSource abstraction + provider env key catalog (Phase 3)
  contracts/     Edge-owned normalized types + DataResult envelope
  schemas/       Zod request/response validation
  validation/    parse helpers and legacy mappers
  cache/         Shared TTL cache and freshness policy
  ports/         Domain port interfaces
  providers/     Vendor adapters (yahoo, sec, fred, fmp, massive, tws, ibkr)
  events/        Canonical registry, normalizers, dedupe, filters
  router/        Provider capability registry and preferences
  service/       MarketDataService façade, route modules (candles/quotes/options/FMP/events/screener/probes), server singleton
  trust/         Data usage policy, provenance, readiness evaluation
```

## Canonical data catalog

The authoritative dataset inventory, provider capability matrix, vocabulary, timestamp glossary, route trace, and gap register live in [docs/roadmaps/data-state-hardening-roadmap.md](../../../docs/roadmaps/data-state-hardening-roadmap.md) (Phase 1). **Executable catalog and state contracts** live in `src/lib/marketData/state/` (Phase 2): typed `DatasetId` rows, provider capabilities, delivery observations, incidents, reducers, and compatibility adapters. Do not duplicate catalog tables in this file — link and update the roadmap when contracts change.

## Data state ownership (Phase 2)

```
state/catalog.ts + state/capabilities.ts   (definitions)
  -> state/observation.ts + state/adapters.ts (facts at service/feed boundaries)
  -> state/reducer.ts + state/incidents.ts   (pure monotonic transitions)
  -> health.ts / chartDataFeed projections   (UI + API consumers)
```

| Concern | Owner | Notes |
|---------|-------|-------|
| Dataset definitions | `state/catalog.ts` | 43 Phase 1 rows; policy resolution via `state/policies.ts` + `trust/policyEvaluator.ts` |
| Freshness / readiness policy | `trust/policyEvaluator.ts` | Catalog-driven cadence, session multipliers, completeness, anomalies; `dataTrust.ts` compatibility façade |
| Provider capabilities | `state/capabilities.ts` | Regenerated matrix; `router/providerCapabilities.ts` re-exports for compatibility |
| Delivery timestamps | `state/timestamps.ts` + `DataResult` | `requestedAt/receivedAt/asOf` adapters to canonical names |
| Server health revision | `/api/market-data/health` + `healthRevision.ts` | `{ epoch, sequence, generatedAt }`; client merge via `mergeMonotonicServerHealth` |
| Display health projection | `healthProjection.ts` + `health.ts` + `DataHealthProvider` | Phase 6 user projection from `DataHealthSnapshot`; Phase 5 supervisor merge via `buildConnectionSupervision()`; trading gates on raw observations |
| Connection supervision | `state/connectionSupervisor.ts` | Per-socket observations, route/circuit gates, recovery session projection |
| Recovery warmup context | `twsRecoveryContext.ts` | Shared symbols/candles/options for header, chart, Data Health recovery |
| Chart transport meta | `@edge/chart-core` `ChartDataMeta` | Slim boundary; app adapters in `state/adapters.ts` |
| Bounded state retention | `state/adapters.ts` `STATE_RETENTION` | Max 32 dataset keys, 8 route attempts, no per-symbol universe store |
| Runtime delivery registry | `state/deliveryRegistry.ts` | Process-local bounded observations; sanitized snapshot accessor for tests/diagnostics |
| Operational reliability | `state/operationalMetrics.ts` + `DeliveryRegistry` | Process-local 30-minute / 512-sample window; sanitized SLI report on health API |
| Onboarding governance | `state/governance.ts` + `scripts/validate-data-state-contracts.mts` | Dataset cadence/recovery metadata, route registration/exclusions, active adapter reconciliation |

Phase 3 will instrument providers and feeds to emit `DeliveryObservation` at runtime; Phase 2 adds types, registries, adapters, and tests only.

**Phase 3 (2026-07-18):** Runtime instrumentation ships via `state/deliveryRegistry.ts`, `state/routeCollector.ts`, and `state/serviceInstrumentation.ts`. `MarketDataService` waterfalls for candles/quotes record full `RouteAttempt[]`; hot-store/cache hits record `transport: cache`; stream poll sessions emit quote `refresh` heartbeats and record `transport: streaming|polling`. Diagnostics remain internal — health API UX unchanged until Phase 5/6.

**Phase 4 (2026-07-18):** `trust/policyEvaluator.ts` evaluates every catalog dataset for cadence/session-aware freshness, completeness, provenance, and usage readiness. Display health and API trust metadata delegate through `dataTrust.ts`; trading gates use provider/account content timestamps (not request time). Derived metrics in `getDerivedMetric()` carry bounded upstream refs. Provider routing order and Data Health UX unchanged.

**Phase 5 (2026-07-19):** `state/connectionSupervisor.ts` reconciles per-socket TWS observations, circuit/route availability, and recovery session state with monotonic revisions. Display connection rows use bounded hysteresis; trading and brokerage gates continue to read raw sidecar observations. `twsRecoveryContext.ts` centralizes recovery warmup payloads; recover API routes expose `sessionId`/`revision` for stale-response rejection.

**Phase 6 (2026-07-19):** `healthProjection.ts` derives one user-facing projection (`current | fallback | delayed | unavailable`) from `DataHealthSnapshot` for badge, tooltip, accessible name, menu sections, recovery CTA, and chart overlay feed status. `DataHealthMenu` renders three primary sections (current data, broker connections, recent active incident) with providers/events/routes/latency under collapsed diagnostics. `/api/market-data/health` additively exposes bounded `deliveryDiagnostics` from `DeliveryRegistry`. Trading gates and provider routing unchanged.

**Phase 7 (2026-07-19):** `coverage.ts` assigns executable dispositions to every active catalog row (`unclassified: 0`). `healthDatasets.ts` + extended `mergeHealthSnapshot()` add demand-gated rows (options, screener, research/fundamentals), brokerage sub-datasets, pre-trade readiness, and cloud-sync when Postgres is expected. Provider rows for Massive/IBKR/FMP/FRED/SEC derive from delivery diagnostics — configured without delivery evidence surfaces as degraded, not healthy. `MarketDataPort` returns `PortDelivery<T>` with bounded trust meta for AI tools. Tradier dead paths removed from `marketDataService`. Primary badge semantics remain chart/watchlist-only via `deriveUserStatus()`.

**Phase 8 (2026-07-19):** `operationalMetrics.ts` derives delivery success, freshness compliance, partial coverage, fallback duration, and recovery-time measures from a bounded process-local sample window. `/api/market-data/health` exposes the sanitized additive `operationalReliability` report; `npm run report:data-reliability` renders text or JSON. `governance.ts` plus `npm run lint:data-state-contracts` rejects unregistered API routes, adapters without active capability metadata, and datasets without cadence/recovery ownership. Shared fault fixtures cover timeout/auth/rate-limit/empty/partial/stale/fallback/recovery/late-observation transitions. Diagnostic text is centrally redacted before logs or route diagnostics. Tradier, Alpha Vantage, and Alpaca dead type/adapter/config entries are retired.

**Post-review hardening (2026-07-19):** The health route publishes a sanitized TWS DTO and redacts every warning boundary; instrumentation conversion/finalization is no-throw. Display hysteresis starts its hold at disconnect onset, timestamp-required datasets stay unknown without an anchor, provider rows degrade on old delivery or recent terminal failure, and heartbeat/fallback/failure state is bounded. A connected order account alone now reports pre-trade readiness as blocked until quote evidence exists.

## Operational reliability and governance

SLIs are informational process-local measures, not durable SLOs:

- **Delivery success:** successful/available terminal deliveries divided by all retained terminal delivery outcomes.
- **Freshness compliance:** current observations divided by observations that carry a freshness evaluation.
- **Partial coverage:** partial observations divided by retained delivery outcomes.
- **Fallback duration:** time from the first fallback/mixed observation until preferred provenance returns, reported as bounded episode percentiles.
- **Recovery time:** successful TWS recovery finalization time minus recovery session start.

No samples are reported as `no_samples`, never as 100% success. The window retains at most 512 samples for 30 minutes and excludes symbols, account ids, payloads, trace ids, credentials, and raw errors. Run `npm run report:data-reliability -- --fixture` for deterministic evidence, or `npm run report:data-reliability -- --url http://localhost:3003/api/market-data/health` against a running app. External telemetry, alerting, and persistent history are intentionally outside this phase.

### Local observability (solo)

For the single local environment, use these tools together:

- **Data Health UI** — user-facing freshness, source, fallback, and recovery status on the active chart.
- **Latency export** — dev telemetry panel / Data Health latency section, plus `npm run perf:market-data` baselines.
- **Reliability snapshot** — `npm run report:data-reliability` against `/api/market-data/health`.
- **Persistent error log** — redacted failures append to gitignored `.edge/error-log.jsonl` via `/api/dev/local-errors` (production **404**; non-production loopback or `EDGE_API_KEY`); read with `npm run report:local-errors`. Sources: chart boundary, API 5xx (`safeErrorResponse`), script runtime failures, and uncaught browser errors.

**Production successor (free stack):** probes, structured logs, durable audit/errors, and free alerts are owned by [Production Observability Roadmap](../../../docs/roadmaps/production-observability-roadmap.md) — no paid APM/Sentry SaaS. Operator runbook: [Observability ARCHITECTURE — Operator runbook](../observability/ARCHITECTURE.md#operator-runbook). This solo toolkit remains for local/dev.

### Provider and dataset onboarding

1. Add or update the `DatasetId` and definition in `state/catalog.ts`.
2. Add cadence, entrypoint, and recovery ownership in `state/governance.ts`; add every API route to `DATA_ROUTE_REGISTRATIONS` or a justified `API_ROUTE_EXCLUSIONS` row.
3. For a provider, add its adapter and active capability row together; configuration alone must not claim delivery health.
4. Register freshness/trust policy or an explicit reviewed gap, coverage disposition, route instrumentation, and deterministic fault cases.
5. Run `npm run lint:data-state-contracts`, focused market-data tests, and the appropriate build/app/live tiers.

### Incident debugging

1. Start with the user projection and active incident, then inspect bounded delivery diagnostics and the reliability report.
2. Distinguish provider connection, circuit state, selected route, cache transport, freshness, and trading readiness; do not infer disconnect from fallback or circuit bypass.
3. Reproduce with deterministic fault fixtures before using optional `npm run smoke:data-providers`; unconfigured providers must be reported as skipped.
4. Sanitize any copied diagnostics through the shared redaction path. Never attach raw provider responses, credentials, account ids, symbols, or trace ids to operational reports.

## Data trust model

Market data responses carry shape metadata (`DataResult`) plus **usage policy** so display/analysis data cannot silently authorize future trades.

```
DataResult / ChartDataMeta
  -> DataProvenance (source, stale, warnings, isFallback)
  -> evaluateDatasetPolicy (trust/policyEvaluator.ts) + DatasetPolicy (DATASET_POLICIES)
  -> DataReadiness (ok | blocked + reasons)
```

| Dataset | Allowed usage | Fallback | Trading decision |
|---------|---------------|----------|------------------|
| Chart candles | display, analysis | yes (Yahoo) | no |
| Watchlist quotes | display, analysis | yes | no |
| Options chain | analysis | no | no |
| Account / positions | brokerage_truth | no | yes (TWS only) |
| Pre-trade quote | trading_decision | no | yes (TWS/IBKR, max 5s age) |

- **API:** `/api/candles` and `/api/quotes` attach `meta.usage` and `meta.readiness` via `trust/enrichResponseMeta.ts`.
- **Data Health:** dataset rows include `usage`, `allowedForTradingDecision`, and `display-only` in `formatDatasetLine` when not trading-safe.
- **Order execution:** command path lives in `src/lib/trading/` (`TradingService`, connection registry, `/api/trading/*`) — separate from this read layer. Display readiness helpers remain in `src/lib/tradingSafety/tradingReadiness.ts`.

Brokerage truth remains in `src/lib/brokerage/` (TWS sidecar only, no fallback). Clients are scoped by connection id (`ib-paper` / `ib-live` via `connectionRegistry`).

## Data flow

```
API routes / AI MarketDataPort
  → getServerMarketDataService()
  → MarketDataService (cache + DataResult envelope)
  → provider adapters
  → vendor APIs
```

# Market data latency telemetry and baselines — see [docs/perf/market-data-performance.md](../../../docs/perf/market-data-performance.md). Collect with `npm run perf:market-data`.

Charts and watchlists consume data through the app-owned `ChartDataFeed` adapter in `src/lib/chartDataFeed/`, which wraps `/api/*` routes. The reusable contract lives in `@edge/chart-core` (`ChartDataFeed`, `ChartDataMeta`, overlay channels). Provider routing, credentials, and cache policy remain in this market-data module.

Live updates use a pluggable `StreamTransport` in `src/lib/chartDataFeed/`:

- **Default:** client polling over REST (`pollStreamAdapter.ts`); candle polls use interval-aware short ranges, not the chart display range.
- **Opt-in:** server-proxied SSE via `/api/stream/candles` and `/api/stream/quotes` (`src/lib/marketData/stream/`). Enable with `NEXT_PUBLIC_STREAM_TRANSPORT=server-proxied`.
- **Watchlist:** `WatchlistPanel` uses `/api/stream/quotes` when `NEXT_PUBLIC_WATCHLIST_STREAM=1` (or auto when `EventSource` is available); set `NEXT_PUBLIC_WATCHLIST_STREAM=0` to force REST polling in tests.

See [chartDataFeed/ARCHITECTURE.md](../chartDataFeed/ARCHITECTURE.md) for transport details and fallback rules.

## Provider routing (candles, quotes & options)

When `MASSIVE_API_KEY` or `POLYGON_API_KEY` is configured, `MarketDataService` routes **options expirations and chains** through Massive Options Advanced first (`meta.source: "massive"`). TWS/IBKR option paths remain available for diagnostics and probe routes only — normal UI analysis does not silently fall back to broker login when Massive is configured.

When Massive is not configured, options route `tws → ibkr` with explicit warnings when falling back. **Options have no Yahoo fallback.**

When `IBKR_ENABLED=true`, `MarketDataService` attempts IBKR first for candles and watchlist quotes. **Watchlist quotes** use batched IBKR snapshots and return partial results — symbols that fail IBKR resolution are filled per-symbol from Yahoo with `meta.source: "mixed"`.

When `TWS_ENABLED=true`, `MarketDataService` attempts **TWS first** via the local sidecar, then falls back to Client Portal IBKR, then Yahoo for candles/quotes.

**TWS performance:** Chart-critical candle/quote requests use short sidecar timeouts (`TWS_CANDLES_TIMEOUT_MS`, `TWS_QUOTES_TIMEOUT_MS`, default 3s). A process-local health gate (`providers/tws/healthGate.ts`) opens a short cooldown after sidecar/Gateway/timeout failures so fresh charts skip repeated slow TWS attempts and fall back immediately. **Quote SSE** (`/api/stream/quotes`) uses the same TWS health gate as REST quotes — when the circuit is open, the sidecar is unreachable/wedged, or `/health` lacks current route capabilities, the stream route falls back to REST poll (Yahoo/IBKR) with connect/first-frame timeouts. A cached Gateway status probe can open the circuit before the first candle/quote attempt when IB Gateway is disconnected. A parallel IBKR auth health gate (`providers/ibkr/healthGate.ts`) skips repeated Client Portal 401/auth failures during quote and candle waterfalls. The sidecar uses priority job queues (candles/status/warmup before options) and persistent `reqMktData` quote subscriptions. Overlay enrichment (events/news/options expirations) loads after candle paint and requests options expirations after faster event sources.

**Warmup:** `/api/market-data/warmup` is best-effort and bounded. TWS sidecar `/warmup` pre-subscribes quote symbols; **batch quote fetch is client-owned** via `MarketDataProvider` (no `getQuotes` phase in warmup). Active chart cell candles run first, then secondary cells in parallel; options expirations defer when Massive/TWS/IBKR are unavailable (options have no Yahoo fallback). When Massive is configured, options warmup uses Massive and does not require broker login.

**Hot data (stale-while-revalidate):** UI-critical reads (quotes, candles, options expirations/chains) pass through an in-process `HotStore` in `hotStore.ts`. `MarketDataService` returns fresh or stale snapshots immediately and revalidates in the background. On the client, `useChartDataFeed` mirrors the same SWR shape via `chartClientCache.ts` so re-opened charts paint cached candles instantly (`stale: true`, `refreshing: true`) while the server HotStore serves the background refresh. Partial hot quote batches are served immediately — missing symbols are fetched per-symbol without waiting for the full watchlist batch. `StockApp` resolves local + remote bootstrap before mounting providers, then `MarketDataProvider` keeps one quote SSE stream alive, calls `/api/market-data/warmup` for visible chart cells + watchlist symbol subscriptions, and prefetches active-symbol **option expirations only** (chain loads on demand from the chart-header options dialog or API). Sidecar `/warmup` retains quote subscriptions for warmed symbols. Options chain requests pass `strikeWindow.spot` from the active chart when available; the TWS sidecar uses that spot for ATM strike selection instead of re-fetching equity spot, and caches secdef option parameters per underlying for reuse across expirations.

Cache keys are namespaced per provider (`massive`, `ibkr`, `tws`, `yahoo`) so a fallback cached while the Gateway is logged out does not block a later provider fetch after credentials recover.

**Client TTL cache (Phase 0–1):** General high-churn reads use `ClientTtlCache` in `cache/clientTtlCache.ts` (memory-only, LRU cap 64, clone-on-read/write for **small mutable payloads** — search, fundamentals, overlays, journal/pattern summaries). Policy matrix and key helpers live in `cache/clientCachePolicy.ts`; TTLs mirror `CACHE_TTL_MS` via `CLIENT_CACHE_TTL_MS`. Read-through helper: `cache/getOrFetchClientTtl.ts`. Session reset clears via `cache/clearEphemeralMarketDataCaches.ts` (dev session unlock). **Large `Candle[]` stay on `chartClientCache.ts` only** (immutable shared snapshots + sessionStorage gate) — do not route candle payloads through `ClientTtlCache`.

| Client namespace | TTL | Key shape (Phase 1) |
|------------------|-----|---------------------|
| `search` | 60s | `search\|{normalizedQuery}` |
| `fundamentals` | 6h | `fundamentals\|{SYMBOL}` |
| `events` | 15m | `events\|{symbol}\|{from}\|{to}\|{kinds}` |
| `news` | 5m | `news\|{symbol}\|…` |
| `options_expirations` | 60s | `options_exp\|{symbol}` |
| `market_context` | 6h | `market_context\|{symbol}` |
| `quotes` | 30s | `quotes\|{sortedSymbols}` — AI fetch port REST snapshots only (not SSE) |
| `ai_candles` | interval-based (`candleCacheTtlMs`) | `ai_candles\|{SYMBOL}\|{range}\|{interval}\|{before}\|{barCount}` — AI tools only; chart candles stay on `chartClientCache` |
| `journal_trades` | 15s | `journal_trades\|{status}\|{symbol}\|{secType}\|{tag}` — `/api/me/journal/trades` remount memo (Phase 6) |
| `journal_fills` | 15s | `journal_fills\|all` — `/api/me/journal/fills` remount memo (Phase 6) |
| `pattern_library_records` | 60s | `pattern_library_records\|list` — pattern sidebar list (Phase 6) |

**Persistence GET memo (Phase 6):** Journal trades/fills and pattern library record summaries reuse `ClientTtlCache` via `journalClient.ts` and `patternLibraryRecordsClient.ts`. Invalidate on ledger change (`JournalSyncProvider` → `invalidateJournalPersistenceCache`), journal mutations, and pattern capture/metadata edits. **TanStack Query declined** — extend existing TTL/coalesce primitives instead of a new QueryClient dependency.

**Layout sync fingerprints (Phase 6):** Chart workspace dirty keys and remote merge equality use `layoutContentFingerprint` (WeakMap + FNV-1a over full layout JSON) instead of storing full `JSON.stringify` in `workspaceActiveContentKey`. Legacy `tv-ai:layout:v1` is migrate-on-load read-only; production writes go to `tv-ai:workspace-tabs:v1` only.

**HTTP Cache-Control (Phase 5):** Safe GET market routes return `private, max-age=…` aligned with `CACHE_TTL_MS` via `src/lib/api/cacheControl.ts` — currently `GET /api/fundamentals` and `GET /api/market-data/context`. Symbol search is **POST-only** (`/api/search`); browser back/forward cache does not apply; session reuse is via `ClientTtlCache` (UI + AI fetch port share the `search` namespace).

**AI fetch port memo (Phase 5):** In-app AI uses `createFetchMarketDataPort` with `getOrFetchClientTtl` for `searchSymbols`, `getQuotes`, and `getCandles`. MCP and `/api/ai/tools/execute` use `createServiceMarketDataPort` → `MarketDataService` (HotStore + DataCache) — no extra client cache layer.

**Pattern taxonomy (Phase 5):** `patternLibrary/storage.ts` keeps an in-memory taxonomy cache keyed by file mtime; `saveTaxonomy` updates the cache after write.

**Do not cache on client:** live quote SSE/ticks, brokerage account snapshots, order previews/submits, trading readiness, ingest/cron responses, auth/session payloads (`CLIENT_CACHE_DO_NOT_CACHE`).

**Coalesce vs TTL:**

| Path | `coalesceInFlight` | Client cache | Notes |
|------|-------------------|--------------|-------|
| Chart candles (initial) | yes | `chartClientCache` | shipped |
| Chart `loadMore` | yes | `chartClientCache` | **Phase 3 wired** — same-key prepend merge + refresh-preserving merge |
| Search / fundamentals / overlays / context | yes on miss | `ClientTtlCache` | **Phase 1 wired** — `searchClient`, `fundamentalsClient`, `marketContextClient`, overlay loaders in `apiChartDataFeed` |
| Server candles / search / fundamentals / market_context | yes on cold miss | `globalDataCache` / HotStore | **Runtime interaction Phase 8** — `coalesceInFlight` in `marketData/service/` wraps provider fetch on cache miss |
| AI fetch port (in-app) | yes on miss | `ClientTtlCache` | **Phase 5 wired** — `createFetchMarketDataPort` search/quotes/ai_candles |
| Quote streams | n/a | never | `MarketDataProvider` Map — chart cells + tab title read `quotesBySymbol` via `resolveChartLiveQuotePrice`; layout cell symbols stream-first (cap 32) |

**Data serving efficiency track:** Phases 0–6 **Passing**; Phase 7 multi-instance Redis was **Skipped** (single-user / single Node) and is **superseded by Memory Phase 12** (flagged Redis adapters, default memory). See [Data Serving Efficiency Roadmap](../../../docs/roadmaps/data-serving-efficiency-roadmap.md). Complementary freshness/trust inventory: [Data State Hardening](../../../docs/roadmaps/data-state-hardening-roadmap.md).

**Server cache backend (Memory Phase 12 adapters — 2026-07-24; topology policy — [Shared Cache Topology Roadmap](../../../docs/roadmaps/shared-cache-topology-roadmap.md)):**

| Knob | Default | Notes |
|------|---------|-------|
| `EDGE_MARKET_DATA_CACHE_BACKEND` | `memory` | Set `redis` for shared HotStore/DataCache across Node processes |
| `REDIS_URL` | unset | Required when backend=`redis` (e.g. `redis://localhost:6379`; `npm run redis:up`) |
| `EDGE_REQUIRE_REDIS` | off | **Enforced (Phase 1):** on when `=1` or `NODE_ENV=production` — boot throw if Redis unavailable; off → warn + memory fallback |
| `EDGE_CACHE_ENV` | unset | **Phase 3:** deploy env segment in Redis keys (`staging`, `prod`, …); overrides `NODE_ENV` mapping when set |
| Fallback (runtime) | memory when require off | Missing URL or Redis ping failure: **throw** when require on; warn + memory when require off |
| Env matrix | see roadmap | Unit/default CI + `dev:lite` → memory; manual parity (`EDGE_TEST_REDIS=1`) + local full stack → redis recommended; staging/prod → redis + require |
| Key prefixes | `edge:{env}:{schemaVersion}:md:hot:entry:*`, `edge:{env}:{schemaVersion}:md:dc:entry:{namespace}:*` | Env from `EDGE_CACHE_ENV` (override) or `NODE_ENV` map (`production`→`prod`, `development`→`dev`, `test`→`test`); schema from `REDIS_MD_SCHEMA_VERSION` in `redisKeys.ts` |
| Schema bump | increment `REDIS_MD_SCHEMA_VERSION` in `redisKeys.ts` | No dual-read — old keys orphan until TTL/eviction; deploy staging first, then prod |
| Boot init | `instrumentation.ts` | `ensureServerCacheBackendsInitialized()` when Node runtime starts |

**Redis ops profile (Phase 4 — [Shared Cache Topology Roadmap](../../../docs/roadmaps/shared-cache-topology-roadmap.md)):**

| Policy | Contract |
|--------|----------|
| Memory limit | Set `maxmemory` on the dedicated cache instance; use **`noeviction`** (or `volatile-ttl` if TTL keys are added later) — **never `allkeys-lru`** while app ZSET LRU runs in `redisEviction.ts` |
| Persistence | Ephemeral cache only — disable RDB/AOF; local compose uses no `redis_data` volume |
| Placement | Dedicated Redis co-located with the app (not shared with unrelated workloads) |
| Auth / TLS | Staging/prod `REDIS_URL` with password when required; `rediss://` when deploy mandates TLS — `ioredis` reads URL credentials |
| Local dev | Passwordless `redis://localhost:6379` via `npm run redis:up` |
| Parity verification | Manual: `REDIS_URL=… EDGE_TEST_REDIS=1 npm test -- --run src/lib/marketData/cache/cacheParity.test.ts` — no CI workflow |
| Hit touch (Phase 8) | `RedisDataCache` / `RedisHotStore` | On cache hit, **ZADD LRU only** — no `SET`/`JSON.stringify` payload rewrite; key TTL unchanged |
| Operator flip (staging → prod) | Set `EDGE_MARKET_DATA_CACHE_BACKEND=redis` + `REDIS_URL` + require-on; confirm `/api/market-data/health` `cache.kind: redis` and no degraded storms for one release cycle on staging before prod |

**Memory efficiency track (Phase 0 contract — 2026-07-23; Phases 1–9 shipped; Phases 10–14 pending):** Baselines in [docs/perf/memory-baseline-latest.json](../../../docs/perf/memory-baseline-latest.json); full phasing in [Memory Efficiency Roadmap](../../../docs/roadmaps/memory-efficiency-roadmap.md). Data-serving reuse stays; this track bounds **retention, clone pressure, and live subscription multiplication**.

| Policy | Contract | Phase |
|--------|----------|-------|
| Resident bar budget | Per chart session, keep ≤ **`RESIDENT_BAR_SOFT_MAX` (5_000)** OHLCV bars in RAM after merge/prefetch/go-to; drop oldest outside viewport + prefetch margin; pan/go-to refetches older pages via existing history prefetch | 1 **shipped** |
| Inactive chart cells | **`live: false`** when `!isActive` or on non-primary chart tile; keep last candle snapshot for paint; only active cell on primary tile streams; journal trade fork uses explicit `live={true}` override; linked peers do not stay live | 2 **shipped** |
| Client clone discipline | Large `Candle[]` are immutable shared snapshots in `chartClientCache`; no deep clone on cache hit; skip `sessionStorage` when `candles.length > 2_000` or payload ≳ **2 MB** | 3 **shipped** |
| Logout / ephemeral clear | `clearEphemeralMarketDataCaches()` clears `ClientTtlCache`, `chartClientCache`, and `clearHeikinAshiCache()` on identity reset | 1 + 8 **shipped** |
| Server `DataCache` | **max 256 entries per namespace** + LRU by `touchedAt`; soft byte budget **48 MiB** (`candles`, `universe_daily`) / **8 MiB** (other namespaces); shared immutable refs on read; `prepareServerSnapshot` on write | 4 **shipped** |
| Server `HotStore` | **max 128 entries** + LRU; soft byte budget **32 MiB**; evict cold keys without breaking SWR for retained keys; shared refs on read | 4 **shipped** |
| Universe daily store | Prune `byDate` / `tradingDates` to `MASSIVE_UNIVERSE_LOOKBACK_DAYS` (default **252**) on merge/write; COW merge (no in-place mutation of cached maps) | 4 **shipped** |
| IBKR contract cache | **max 512 entries** + LRU; prefer evicting `strikes:` / `optInfo:` before stable stock/secdef rows | 4 **shipped** |
| Indicator/script caches | Keep entry caps (64 builtin / 32 script); tip-stable Map keys (`bodyFingerprint` + `tipRevision` dirty check) so live ticks overwrite one slot; soft byte budget **16 MiB** each; `dispose` clears `cache` + `lastValidByInstance`; prune lastValid on instance remove | 5 **shipped** |
| Series layer retain | `SeriesLayerCache` + crosshair-only `canReuseSeriesCache` blit; viewport pans rebuild; grow-only WebGL `GeometryBufferPool`; dispose caches + `RenderScheduler` on unmount | 6 **shipped** |
| Journal / Copilot | Windowed runtime state and bounded request payloads; persistence may still store full threads server-side | 7 **shipped** — Journal provider: open+closed limit 500 + compact fill-account index; Copilot: last 40 msgs / 4k content on send |
| Lazy workspace tiles | `SurfaceHost` code-splits Journal / Screener / Scripts / Copilot / Alerts; Screener + Copilot sidebar panels lazy; chart tile stays static | 8 **shipped** |
| Chart hot-path slimming | `JournalChartOverlayProvider` dynamic only when URL has `journalTrade`; thin `useChartDeepLinkBootstrap` + `journalChartOverlayContext`; `ScriptLibraryMountGate` sticky-mounts library for scripts tile, restored script indicators, or picker/scripts entry | 9 **shipped** |
| Heikin Ashi cache | LRU **8** entries keyed by `length\|candleValueFingerprint`; frozen shared refs; `clearHeikinAshiCache()` on ephemeral logout | 8 **shipped** |
| Notification runtime caps | Inbox already capped (API 50 / localStorage 100); runtime toasts max **5**; seen-id set pruned to **200** | 8 **shipped** |
| Journal list virtualization | `@tanstack/react-virtual` on trades table; full sorted list scroll; pagination removed | 10 **shipped** |
| Inactive cell unmount | `ChartCell` unmounts `EdgeChart` when inactive (Phase 2 `live: false` baseline); skeleton placeholder; flush + remount from layout/cache | 11 **shipped** |
| Script worker candle bus | Transferable `f64x6` packed buffers on `postMessage` (`candleTransferBuffer.ts`); `resolveWorkerCandles` in worker; structured-clone `Candle[]` fallback; no SAB/COOP/COEP | 13 **shipped** |

**Follow-up (Phase 14):** app-level verification walks — see [Memory Efficiency Roadmap](../../../docs/roadmaps/memory-efficiency-roadmap.md). **Phase 12 Redis adapters:** flagged behind `EDGE_MARKET_DATA_CACHE_BACKEND=redis` + `REDIS_URL` (default in-process memory). **Shared cache topology:** Phase 0–4 **Passing** (fail-loud + boot-order + health backend kind + env/schema key isolation + compose ops profile); operator staging soak / prod flip → [Shared Cache Topology Roadmap](../../../docs/roadmaps/shared-cache-topology-roadmap.md).

**Phase 0 baseline highlights** (`npm run perf:memory`, SPY `5m`/`1mo`, 2026-07-23):

| Scenario | Key numbers |
|----------|-------------|
| Node 10× loadMore simulation | `candlesLength: 4343`; `sessionStorageBytes: 388670` |
| Node server cache warm (50 candle fetches) | `rssDeltaMb: 60.14`; `heapUsedAfterMb: 108.66` |
| Browser 1-cell 10× loadMore | `maxCandlesLength: 7938`; `sessionStorageChartCacheBytes: 798965`; `eventSourceCount: 6` |
| Browser 8-cell 10× loadMore | `maxCandlesLength: 7938`; `eventSourceCount: 6` (inactive cells still live today) |

**Do not:** persist candles into durable layout/prefs; weaken data-state trust labels when serving shared cache refs; introduce a parallel cache framework — extend `chartClientCache`, `DataCache`, `HotStore`, and existing dispose paths.

API routes return optional `meta: { source, warnings, stale, asOf, usage, readiness }` alongside legacy `{ candles }` / `{ quotes }` payloads. Candles and quotes attach trust fields via `trust/enrichResponseMeta.ts` (see [Data trust model](#data-trust-model)). Probe routes under `/api/market-data/ibkr/*` remain available for diagnostics.

## Providers

| Provider | Env | Capabilities |
|----------|-----|--------------|
| Yahoo | none (dev) | candles, quotes, search, fundamentals — intraday chart windows are clamped in `yahooFinance` to Yahoo retention (1m ≤ 7d, 5m/15m/30m ≤ 60d, 1h ≤ 730d) so oversized `1y`+`5m` requests fall back cleanly instead of hard-failing |
| SEC EDGAR | `SEC_USER_AGENT` | company facts, recent filings |
| FRED | `FRED_API_KEY` | macro series, economic releases |
| FMP | `FMP_API_KEY` | gap-fill fundamentals/context: profile, estimates, financials, executives, calendars (earnings/dividends/splits), economic calendar (macro event cards), SEC filing search, market movers, **company screener** (`/company-screener`), news (Premium) |
| Massive | `MASSIVE_API_KEY` or `POLYGON_API_KEY` | **Options Advanced** expirations + chain snapshots (`/v3/reference/options/contracts`, `/v3/snapshot/options/{underlying}`); Daily Market Summary grouped US equities (full-universe screener store), Custom Bars per-symbol fallback, Universal Snapshot; API host `https://api.massive.com` |
| IBKR | `IBKR_ENABLED`, Client Portal Gateway login | candles, quotes, options diagnostics/fallback when Massive unavailable |
| TWS | `TWS_ENABLED`, `TWS_MANAGED` (`local` \| `external`), IB Gateway paper + sidecar | candles, quotes, options diagnostics/fallback when Massive unavailable |

### Market calendar

`src/lib/marketData/marketCalendar.ts` is the single source of truth for **latest completed US trading day** (YYYY-MM-DD). Daily-bar consumers — universe store warm/backfill, Massive aggregate `to` dates — must use `latestCompletedTradingDate()` or `recentTradingDays()` instead of rolling their own weekday logic.

- **US market close:** 20:00 UTC (4pm ET during standard time). Before close on a weekday, "today" is excluded so Massive grouped-daily requests do not 403 on restricted plans.
- **Weekends:** Saturday/Sunday walk back to the prior Friday.
- **Deferred:** US market holidays (NYSE closed weekdays) are not yet modeled; holiday requests may return empty bars without a 403.

Screener warning UX: provider notices stay in `meta.warnings`; per-symbol candle-fetch skips are typed as `meta.skippedSymbols` and rendered separately in the screener results table.

**IBKR note:** This app uses the **Client Portal Web API** (`clientportal.gw` on HTTPS, port 5001 by default). That is **not** the same as **IB Gateway 10.x** (TWS socket API on 4001/7497). If you only run IB Gateway, our Client Portal probes will not work until Client Portal Gateway is installed and running (`npm run ibkr:setup` / `npm run ibkr:gateway`).

**TWS note:** When `TWS_ENABLED=true`, Edge prefers the **IB Gateway socket API** via a local Python sidecar (`services/tws-sidecar/`). Start IB Gateway paper (default port `4002`; live Gateway uses `4001`), run `npm run tws:sidecar-setup` once, then `npm run tws:sidecar`. Routing becomes `tws → ibkr → yahoo` for candles/quotes and `tws → ibkr` for options. Sidecar `/health` exposes `startedAt`, version, effective host/port, and route capabilities for stale-process detection. Optional fast-fail timeouts: `TWS_CANDLES_TIMEOUT_MS`, `TWS_QUOTES_TIMEOUT_MS` (default 3000). Sidecar `/warmup` pre-resolves contracts without blocking chart loads. Historical candles accept `sessionMode`: `regular` (default, `useRTH=true`) or `extended` (`useRTH=false` for intraday pre/post-market bars). **Wedge prevention (2026-07-23):** sidecar `reqHistoricalData` uses `HISTORICAL_DATA_TIMEOUT_SEC` (12s, under the 15s IB job waiter) so stuck historical calls cannot occupy the single worker indefinitely; warm primary `/account/status` returns cached `managedAccounts` without queuing on the IB worker; user Recover kills standalone sidecar listeners on `TWS_SIDECAR_PORT` when Node does not track the child process (`TWS_MANAGED=external`).

**Sidecar package layout (2026-07-23 refactor):** `services/tws-sidecar/main.py` (≤150 lines) is the test facade — re-exports shared runtime state and HTTP helpers. Domain code lives under `tws_sidecar/`:

```
services/tws-sidecar/
  main.py                         # thin entrypoint + test re-exports
  tws_sidecar/
    config.py, util.py, auth.py, mapping.py, app.py
    runtime/                      # state, worker, connections, supervisor, resolve
    market_data/                  # contracts, candles, quotes, options, models
    account/                      # cache, payloads, pricing
    trading/                      # models, guards, orders
    routes/                       # health, control, market_data, account, trading
```

Concurrency (Phase 6): `/stream/quotes` and `/stream/account` read caches under locks and schedule background IB refresh (no per-tick `run_on_ib_thread`); per-connection IB error/disconnect handlers on paper + live; waiter timeout abandons orphan worker jobs; quote subscription setup resolves contracts outside `_quote_sub_lock`.

### Live quote vs candle close

- **Watchlist `LAST`** and the chart **current-price marker** use the same live quote stream (`QuoteSnapshot.regularMarketPrice` / TWS `reqMktData` last).
- **Candle OHLC** remains historical bar data; the last bar close can differ from the live quote after hours or between bar updates.
- Chart settings **`symbol.sessionMode`**: `regular` (RTH candles only) or `extended` (include pre/post-market intraday bars from TWS). Session classification and badges live in `@edge/chart-core/marketSession`.

### IBKR client optimizations

| Mechanism | Location | Purpose |
|-----------|----------|---------|
| Request throttle (8 req/s) | `providers/ibkr/requestThrottle.ts` | Stay under IBKR 10 req/s global limit |
| Contract cache (TTL + LRU) | `providers/ibkr/contractCache.ts` | Avoid re-resolving conids/secdef/strikes on every poll; max **512** entries with preferential eviction of strike/optInfo keys |
| Secdef-first resolver | `providers/ibkr/contractResolver.ts` | US primary exchange stock conid; options-capable conid for OPT months |
| Batch snapshots (≤100 conids) | `providers/ibkr/client.ts` | Single HTTP call for watchlist quote batches |
| Accounts preflight | `providers/ibkr/client.ts` | `/iserver/accounts` once per session before snapshots |
| WebSocket `smd` stream | `providers/ibkr/smdSession.ts` | Live quote ticks when Gateway WS is available |
| Quote stream session | `stream/ibkrQuoteStreamSession.ts` | smd push + HTTP poll fallback for `/api/stream/quotes` |

Optional providers degrade gracefully when keys are missing — the service returns empty data with warnings rather than throwing.

## API routes

| Route | Method | Validation |
|-------|--------|------------|
| `/api/candles` | POST | `candlesRequestSchema` |
| `/api/search` | POST | `searchRequestSchema` |
| `/api/quotes` | POST | `quotesRequestSchema` |
| `/api/fundamentals` | GET | `fundamentalsQuerySchema` |
| `/api/fundamentals` | POST | `fundamentalsBatchRequestSchema` (`symbols[]`, max 50) |
| `/api/options/expirations` | GET | `optionsExpirationsQuerySchema` |
| `/api/options/chain` | GET | `optionsChainQuerySchema` |
| `/api/events` | GET | `eventsQuerySchema` |
| `/api/news` | GET | `newsQuerySchema` |
| `/api/macro/series` | GET | `macroSeriesQuerySchema` |
| `/api/sec/filings` | GET | `secFilingsQuerySchema` |
| `/api/market-data/fmp/profile` | GET | `fmpSymbolQuerySchema` |
| `/api/market-data/fmp/estimates` | GET | `fmpEstimatesQuerySchema` |
| `/api/market-data/fmp/financials` | GET | `fmpFinancialsQuerySchema` |
| `/api/market-data/fmp/executives` | GET | `fmpExecutivesQuerySchema` |
| `/api/market-data/fmp/filings` | GET | `fmpSecFilingsQuerySchema` |
| `/api/market-data/fmp/movers` | GET | `fmpMoversQuerySchema` |
| `/api/screener/run` | POST | `screenQuerySchema` |
| `/api/market-data/ibkr/status` | GET | none (probe) |
| `/api/market-data/ibkr/contracts` | GET | `ibkrSymbolQuerySchema` |
| `/api/market-data/ibkr/quote` | GET | `ibkrSymbolQuerySchema` |
| `/api/market-data/ibkr/candles` | GET | `ibkrCandlesQuerySchema` |
| `/api/market-data/tws/status` | GET | none (probe) |
| `/api/market-data/tws/contracts` | GET | `twsSymbolQuerySchema` |
| `/api/market-data/tws/quote` | GET | `twsSymbolQuerySchema` |
| `/api/market-data/tws/candles` | GET | `twsCandlesQuerySchema` |
| `/api/market-data/tws/recover` | POST | `twsRecoverRequestSchema` (requires `TWS_ENABLED=true`) |
| `/api/market-data/warmup` | POST | `warmupRequestSchema` |
| `/api/market-data/health` | GET | none (provider status summary + server cache backend kind/degraded/ping) |
| `/api/market-data/context` | GET | `marketContextQuerySchema` |

### API hardening (local-first)

| Control | Env | Behavior |
|---------|-----|----------|
| Sensitive-route API key | `EDGE_API_KEY` | Middleware gates `/api/brokerage/*`, `/api/ai/*`, TWS recover/warmup, and `/api/market-data/health`. Loopback requests skip the key when `EDGE_TRUST_LOCALHOST=true` (default). |
| Rate limits | `EDGE_RATE_LIMIT=1` | In-process limits on screener, warmup, recover, AI routes, and concurrent SSE streams. |
| Sidecar secret | `TWS_SIDECAR_SECRET` | Next.js TWS/brokerage clients send `X-Edge-Sidecar-Secret`; sidecar `/health` stays open for liveness probes. **Required** when `TWS_SIDECAR_URL` is non-loopback; loopback `http://127.0.0.1` may omit secret (plaintext local exception). |
| IBKR TLS verify | `IBKR_SSL_VERIFY` | Defaults **on** (`!== "false"`). Set `false` only for local self-signed Client Portal Gateway certs. |
| HTTP transport | Next `headers()` | App routes: enforced CSP + baseline frame/MIME/referrer/permissions headers; HSTS when `NODE_ENV=production`. Demo HTML under `/animations` and `/brand` uses a looser CSP (Google Fonts). See `src/lib/security/httpHeaders.mjs`. |
| Production errors | `NODE_ENV=production` | Route helpers use `src/lib/api/safeErrorResponse.ts` to avoid leaking provider internals. |

Implementation: [src/middleware.ts](../../../middleware.ts), [src/lib/api/](../../../lib/api/), [src/lib/marketData/providers/tws/sidecarAuth.ts](providers/tws/sidecarAuth.ts).

## ConfigSource and provider key catalog (Phase 3)

Adapters resolve **configured?** and credentials through [`config/`](config/) — not scattered `process.env` reads. Default backend is `EnvConfigSource` (`getConfigSource()`). Phase 6 BYO vault will implement the same `ConfigSource` interface server-side; Settings and `/api/market-data/health` continue to expose **configured booleans only** — never secret values.

| Provider | Env keys | Purpose |
|----------|----------|---------|
| **Massive** | `MASSIVE_API_KEY`, `POLYGON_API_KEY` (legacy fallback), `MASSIVE_BASE_URL` | API credential; base URL (default `https://api.massive.com`) |
| **FMP** | `FMP_API_KEY` | API credential |
| **FRED** | `FRED_API_KEY` | API credential |
| **SEC** | `SEC_USER_AGENT` | Required User-Agent header (default `EdgeChart/1.0 (contact@example.com)`); always configured |
| **TWS** | `TWS_ENABLED`, `TWS_SIDECAR_URL`, `TWS_SIDECAR_PORT`, `TWS_SIDECAR_SECRET`, `TWS_SIDECAR_TIMEOUT_MS`, `TWS_CANDLES_TIMEOUT_MS`, `TWS_QUOTES_TIMEOUT_MS`, `TWS_OPTIONS_TIMEOUT_MS`, `TWS_MANAGED` | Enable gate; sidecar URL/port; auth secret; request timeouts; spawn mode (`local` \| `external`) |
| **IBKR** | `IBKR_ENABLED`, `IBKR_BASE_URL`, `IBKR_SSL_VERIFY`, `IBKR_READ_ONLY`, `IBKR_COMPETE_SESSION` | Enable gate; Client Portal URL; TLS verify; read-only session; compete session |
| **Yahoo** | _(none)_ | Always-on display fallback; no config keys |

Canonical key constants live in [`config/providerKeys.ts`](config/providerKeys.ts). Operational tuning keys outside adapter gates (e.g. `MASSIVE_UNIVERSE_LOOKBACK_DAYS`) remain direct env reads until a later phase.

## Stock screener

The lean Phase 1 screener filters US equities and ETFs through FMP `/company-screener` server-side, with mover presets reusing existing `getFmpMarketMovers` (enriched via cached `fetchUniverseDescriptors` join for sector/marketCap/beta/volume). **Phase 1.5** adds a two-step pipeline when `ScreenQuery.technical` is set: FMP prefilter → per-candidate Yahoo daily candles → `@edge/chart-core/indicators/math` rule evaluation. **Phase 4 (Massive full-universe)** when `MASSIVE_API_KEY` is configured and `ScreenQuery.technical` is set: Massive Daily Market Summary universe store + FMP paginated descriptors (~8k) → local descriptive filter → local indicator scan (removes 200-candidate cap).

| Layer | Path | Notes |
|-------|------|-------|
| API route | `src/app/api/screener/run/route.ts` | POST body validated with `screenQuerySchema` (optional `technical`, `maxResults`); **registry-aware** semantic validation via `validateScreenQueryTechnical()` for `kind: "indicator"` rules before service call; returns `{ results, meta }` via `fmpJsonResponse` |
| Service | `MarketDataService.getScreenerResults()` | Cache namespace `screener` (60s TTL); **Massive path** when `technical` + Massive configured: `ensureScreenerUniverseWarm` → `fetchUniverseDescriptors` → `applyDescriptiveFilters` → `runTechnicalFilter` via `createScreenerDailyCandleFetcher`; **fallback path** FMP prefilter (max 200 candidates) + same fetcher (reads warm `universe_daily` when present); perf phases include `screener.universe.warm`, `screener.universe.descriptors`, `screener.technical.*`, `screener.total` |
| Universe store | `src/lib/marketData/screenerUniverse/universeDailyStore.ts` | Rolling 252-day grouped daily bars in cache namespace `universe_daily` (24h TTL); lazy warm on first screen + background backfill; FMP descriptor pagination in `screener_universe` (24h TTL) |
| Daily candle resolver | `src/lib/marketData/screenerUniverse/resolveScreenerDailyCandles.ts` | Universe-first daily fetch: `getCandlesFromUniverseStore` → coalesced Massive `getAggregates` → coalesced `getCandles`; key `screener-candles:{symbol}:1d:{range}`; provider miss budget **50** (`TECHNICAL_FILTER_PROVIDER_MISS_BUDGET`) when store misses |
| Massive adapter | `providers/massive/adapter.ts` | `getDailyMarketSummary(date)`, `getAggregates`, `getSnapshotAllTickers`, `getOptionExpirationsWithWarnings`, `getOptionsChainWithWarnings`; options submodule in `providers/massive/options.ts` with paginated reference/snapshot fetch |
| Technical pass | `src/lib/screener/technicalFilter.ts`, `technicalMath.ts` | Universe path: unbounded candidates, concurrency 16; fallback path: max 200 candidates, concurrency 6 (TWS-bound) or 20 (Massive Custom Bars fallback); optional `maxResults` early-exit; per-symbol cache namespace `screener_technical` (15 min TTL); aggregate detail exposes `candleHitRate` / `indicatorHitRate` |
| FMP adapter | `providers/fmp/adapter.ts` → `runStockScreener()` | Translates `ScreenQuery` to FMP flat params via `screenerParams.ts` (ignores `technical` and local-only `dollarVolume`) |
| Dollar volume | `ScreenQuery.dollarVolume` + `rowDollarVolume` / `applyDescriptiveFilters` | Local `price × volume` filter; FMP path over-fetches (limit 1000) then trims. Preset: `liquid-tradeable` ($5+, $2M+/day). |
| Client feed | `src/lib/chartDataFeed/apiScreenerFeed.ts` | `fetchScreenerResults()` + `fetchMarketMoverResults()`; parses `meta.phases` into screener phase summary |
| Persistence | `src/lib/persistence/schemas/screenerLibrary.ts`, `/api/me/screener-library` | Whole `ScreenerState` JSONB per user; optimistic sync via `useScreenerLibraryRemoteSync`; localStorage fallback |
| UI | `src/app/components/screener/` | Split-pane Screens + results (`ScreenerPanelContent` / workspace `ScreenerTileSurface`); dedicated `/screener` module (Review / Screens / Results / Keepers) with `BroadcastChannel` chart drive; nested AND/OR `QueryBuilder` with **registry-driven technical rule editor** (`TechnicalQueryRule` round-trip via `compileQuery.ts`); implemented indicators from `@edge/chart-core` registry with typed `inputSchema`/`outputs`; named kinds (`rsi`, `goldenCross`, `fiftyTwoWeekProximity`) render read-only; group watchlist actions; CSV + clipboard export; live quote overlay on first 32 visible rows via `MarketDataProvider`; legacy `ScreenerDialog` thin modal wrapper |
| Query compile | `src/lib/screener/compileQuery.ts`, `validateIndicatorRule.ts` | `groupFromScreenQuery` / `compileScreenQueryFromGroup` round-trip `query.technical`; `validateIndicatorRule()` checks indicator exists, series in plugin outputs, inputs match `ParamDef`; client + API gate before run/save |

**Phase 2** (shipped): Postgres screener library sync, group watchlist actions, live quote overlay coalesced into `MarketDataProvider` SSE (32-symbol stream cap), AND/OR query groups with FMP comma-separated text filters, export utilities. `screen_runs` snapshots deferred.

**Phase 3** (shipped): Custom-indicator rules via chart-core `IndicatorPlugin` (`ScreenQuery.technical.kind === "indicator"`) delivered through presets; Bollinger `%B` derived in screener evaluator; comparison table for multi-selected rows; `summarize_screen` read-only AI tool. **Technical rule builder (v1)** (shipped): registry-driven `QueryBuilder` technical editor + `validateIndicatorRule` semantic gate; one technical rule per screen; named kinds preserved for backward compat. Scheduled re-runs/alerts deferred — see [docs/roadmaps/screener-roadmap.md](../../../docs/roadmaps/screener-roadmap.md).

## Data health center

The app exposes a user-facing **Data Health** dropdown from a compact overlay badge on the active chart cell (`src/app/components/data-health/`, `src/app/components/chart-cell/ChartOverlayStatusStack.tsx`). Phase 6 projection (`healthProjection.ts`) drives badge tooltip/accessible name, menu primary copy, recovery visibility, and chart overlay feed status from one `DataHealthSnapshot`. The menu presents three primary sections — **Current data**, **Broker connections**, **Recent active incident** — with providers, recovered events, route attempts, latency, and copy-json under collapsed **Diagnostics**.

- **Client-observed dataset metadata** from active chart `ChartDataMeta`, watchlist quote `meta`, and optional options panel meta.
- **Server provider probes** from `/api/market-data/health`, which summarizes IB Gateway (TWS sidecar) status plus process-local circuit-breaker snapshots. **IBKR Client Portal is not shown** in Data Health — use IB Gateway + sidecar only for live market data status. Optional-provider configured flags (`FMP`, `FRED`, `SEC`) are booleans only — no secrets are returned.
- **Server cache backend** from `/api/market-data/health` `cache` object: `kind` (`memory` | `redis`), `degraded`, `lastPingOk`, `lastPingAt`. Probed via `getServerCacheHealthSnapshot()` on each health request — never exposes `REDIS_URL` or credentials.

Severity (`healthy` / `degraded` / `offline` / `unknown`) is derived in `src/lib/marketData/health.ts` from **dataset readiness** (`evaluateReadiness` in `src/lib/marketData/trust/dataTrust.ts`), provenance (source, fallback, partial symbol coverage), and provider connection state — **not** from raw warning counts. **Display market data** (watchlist quotes, active chart candles, options chain/expirations) use **age-based display freshness** via `maxDisplayAgeMs` in `DATASET_POLICIES`, aligned with `HOT_STALE_MS` in `hotStore.ts`:

| Dataset | Display max | Notes |
|---------|-------------|-------|
| `watchlist_quotes` | 60s | **Delivery** freshness uses `lastUpdateAt` / `receivedAt` (successful fetch time). Per-symbol `updatedAt` still drives row age chips. |
| `chart_candles` | 5 min | **Delivery** freshness uses `lastUpdateAt` / `receivedAt`; bar `asOf` stays diagnostic |
| `options_chain` | 5 min | When chain meta is registered |
| `options_expirations` | 24 h | When only expirations meta is registered |

TWS data within the display window stays **healthy** even when served from `hot-stale` SWR cache; internal `stale` and cache tier stay out of user-facing dataset lines. `resolveTrustDataset()` picks the options policy (`options_chain` vs `options_expirations`). Account feed severity remains connection-based. Transport recovery events (SSE timeout → REST success) are recorded in session diagnostics via `src/lib/marketData/healthEvents.ts` and do not downgrade the badge when datasets are display-fresh. Incident warnings (Yahoo fallback, TWS skip, circuit open) surface as the single **Recent active incident** row when active; recovered transport events move under collapsed **Diagnostics**. `MarketDataProvider` keeps a non-overlapping REST refresh loop after SSE fallback (~15s during pre/regular/post, ~30s when closed) and skips duplicate silent revalidation while on REST transport. Closed-market healthy state shows **Market closed · quotes current** separately from connection labels like **Live data**. Exchange holidays are not modeled yet — session classification uses NY clock + optional provider `marketState`.

**TWS observation vs circuit (Phase 0):** `TwsStatusProbe` carries `observationConfidence` (`observed` | `last_known` | `unknown`), `observedAt`, and `circuitBypassed`. `MarketDataService.getTwsStatusProbe()` stores the latest direct observation and, when the health gate skips I/O, returns last-known Gateway state with age instead of fabricating `gatewayConnected: false`. `buildProviderRows()` labels circuit bypass as **Temporarily bypassed** with retry deadline and last-observed age; confirmed disconnects still read **Gateway disconnected**. `requiresManualRecovery` suppresses the reconnect affordance during automatic retry when last-known Gateway was connected. `DataHealthProvider` ignores older health snapshots via monotonic `generatedAt` merge.

**Chart chrome (Phase 6 + calm connection UX):** On the active chart cell, `ChartOverlayStatusStack` uses one projection-driven row: optional unified feed-status pill (delayed/unavailable only — not hot-stale display-fresh) and icon-only `DataHealthButton` (severity dot; tooltip/accessible name from projection). **No recover CTA on the chart** — manual reconnect lives in the app header and Data Health / Settings (`recoveryLabel` ops copy such as `Start TWS sidecar`). Header incident chrome (`Broker disconnected` / `Broker reconnecting` + user **Reconnect**) is owned by `AppTopHeader` on every `AppModuleShell` route (Talk `/copilot`, Board `/research`, Desk `/workspace`, home, journal): `useShellBrokerConnectionChrome` polls `/api/market-data/health` and derives labels via `chromeConnectionFromHealth()` in `healthProjection.ts`. Workspace `DataHealthProvider` remains for chart overlay and Data Health menu only — not for header reconnect. When `showDataHealth=false`, legacy `ChartFeedStatusBadge` remains. `EdgeChart` derives overlay stale from `isChartMetaDisplayFresh()` so hot-stale cache with recent delivery does not flash stale.

### TWS-only mental model

When `TWS_ENABLED=true` and `IBKR_ENABLED=false` (default in `.env.example`):

- **Primary live data path:** IB Gateway socket API → local Python sidecar → `MarketDataService` routing (`tws → yahoo`).
- **Data Health Connections:** paper socket, live socket, and active chart data preference (`buildIbSocketRows` / `buildDataPreferenceRow` in `health.ts`); provider list still summarizes the TWS sidecar path (IBKR Client Portal omitted).
- **IBKR Client Portal** is not surfaced in Data Health. Adapter code may remain for optional routing fallback elsewhere; diagnostics use `/api/market-data/ibkr/*` probe routes.

### TWS sidecar recovery

When IB Gateway is manually restored after a disconnect, the Data Health dropdown can run recovery when `TWS_ENABLED=true`:

1. `POST /api/market-data/tws/recover` with visible symbols, chart candle requests, and active options symbol.
2. If the sidecar is unreachable, Edge spawns `scripts/tws-sidecar.sh` — in `TWS_MANAGED=local` with `TWS_MANAGED_BY=edge-local`, or on user-initiated recover in `TWS_MANAGED=external` with `TWS_MANAGED_BY=standalone` (boot-time auto-spawn remains local-only).
3. The sidecar `POST /control/reconnect` drops stale IB socket state and reconnects **both** configured Gateway sockets (`ib-paper` primary + `ib-live` extra). Sidecar `/health` and `/status` are **control-plane only** (non-blocking; no IB worker queue). `/status` exposes worker diagnostics (`queueDepth`, `activeJob`, `workerWedged`, recovery phase, `autoReconnectAttempt`) plus connection supervisor fields (`connectionState`, `activeClientId`, `lastIbErrorCode`, `subscriptionsLost`, `restartRequired`).
4. When the IB worker is wedged or the API client ID is stuck, Edge restarts the sidecar process before retrying reconnect. Stale `clientId` after restart surfaces a manual action: restart IB Gateway or change `TWS_CLIENT_ID`.
5. The sidecar supervisor handles IB error codes: `1100` → disconnected + bounded auto-reconnect (exponential backoff 2s→30s, max 5 attempts), `1101` → connected but subscriptions lost (resubscribe quotes/account), `1102` → connected with subscriptions maintained, `502`/`504` → disconnected + auto-reconnect. Auto-reconnect skips active trading mutations; wedged-worker manual reconnect bypasses the IB worker queue via async reconnect thread.
6. The recover response includes `commandState`: `accepted`, `timed_out`, `failed`, or `confirmed`, plus `recoveryPhase`. A reconnect HTTP timeout (`timed_out`) or async accept (`accepted`) is **not** a final failure — the UI polls `GET /api/market-data/tws/recover/status` for phase messages and late Gateway confirmation.
7. `finalizeTwsRecoveryIfNeeded()` resets TWS/brokerage gates, clears stale cache keys, and runs `primeMarketData()` once per recovery session when Gateway health is confirmed (sync or via status poll). Recovery session context (`symbols`, `candleRequests`, `optionsSymbol`) is started by the recover route and preserved through status-poll finalization.
8. During active recovery, `/api/market-data/health?recovery=1` bypasses the TWS circuit breaker for fresh sidecar truth.
9. The client bumps `MarketDataProvider.reloadToken` (and refreshes account state when brokerage is enabled) after confirmed recovery or after status poll finalization. Data Health shows precise phase messages (sidecar restart, client ID stuck, resubscribing, Gateway not logged in).

**Gateway daily restart:** `services/ib-gateway/docker-compose.yml` configures both containers for IB Gateway's native **soft restart** at `11:45 PM` (`AUTO_RESTART_TIME`) and a Sunday **cold restart** at `08:00` (`TWS_COLD_RESTART`) in `America/New_York`. Soft restart preserves the authenticated session on weekdays; IBKR requires a full shutdown + 2FA on Sundays — without cold restart, Sunday soft restart fails with `DISCONNECT_AUTHORIZATION_FAILED` and leaves Gateway stuck (no API, no 2FA push). Persisted `tws_settings_*/jts.ini` `TimeZone` must be `America/New_York` (the image's `TIME_ZONE` env is ignored once `jts.ini` exists; `Africa/Abidjan` made `11:45 PM` fire at 7:45 PM ET). VNC: live `localhost:5901`, paper `localhost:5902`. The sidecar's bounded supervisor reconnects both API sockets after the brief interruption.

**Manual recover affordances:** When TWS is degraded/offline (`shouldShowTwsRecovery`), the shared `TwsRecoverButton` appears in the **chart top-right overlay** (`ChartOverlayDataHealthRow`, beside the Data Health severity dot) and in the **Data Health menu** (full-width). When the app header cannot load trading accounts, the same button appears next to the header error alert. All surfaces call the shared client recovery flow (`runTwsRecoveryClient` in `twsRecoveryClient.ts`), which broadcasts lifecycle events on `twsRecoveryBus` so the chart overlay, Data Health snapshot, and market-data feeds refresh immediately when recovery completes from **any** surface (header or chart). While TWS is degraded, Data Health polls `/api/market-data/health` every 5s instead of 30s.

**Startup coupling:** When `TWS_ENABLED=true` and `TWS_MANAGED=local` (default), root `instrumentation.ts` calls `ensureSidecarOnServerBoot()` on Node runtime boot (fire-and-forget). That reuses `recoverTwsSidecar` to spawn the sidecar via `scripts/tws-sidecar.sh` if unreachable, restart if wedged/stuck, call `POST /control/reconnect` to prime IB Gateway, and reset the TWS circuit breaker on confirmed success. Spawned sidecars set `TWS_MANAGED_BY=edge-local` and `EDGE_INSTANCE_ID` for ownership verification via `/health`. `SIGTERM`/`SIGINT`/`beforeExit` handlers call `killManagedSidecar()` (local mode only) so repeated `next dev` restarts do not leave orphaned sidecar processes.

**Management modes (`TWS_MANAGED`):**

| Mode | Next spawn/kill | Boot ensure | User Reconnect spawn | Use when |
|------|-----------------|-------------|----------------------|----------|
| `local` | Yes | Yes | Yes (`edge-local`) | Default dev — Next owns one sidecar |
| `external` | No | No | Yes when port free (`standalone`) | Manual/systemd sidecar; Reconnect starts sidecar if down |

Docker Compose is **not** used for the sidecar. External mode skips boot ensure; user Reconnect still attempts spawn unless port 8765 is owned by another Edge dev instance — then stop that process or run `npm run tws:sidecar` yourself.

**Brokerage readiness:** `awaitSidecarForBrokerage()` gates `/api/brokerage/*` and `BrokerageService` only — chart/quote routes keep fast Yahoo fallback.

**Lifecycle API:** `GET /api/market-data/health` includes `health.lifecycle` (`ready`, `gateway_disconnected`, `recovering`, `wedged`, etc.) derived from sidecar `/health` + `/status`.

**Sidecar shutdown:** FastAPI `lifespan` disconnects IB on exit; `scripts/tws-sidecar.sh` uses PID file + port check + single-instance lock (flock on Linux, mkdir on macOS).

**Source labels:** The active-chart overlay shows an icon-only severity dot; hover tooltip summarizes chart candle source and watchlist quote source (e.g. `TWS · LIVE · REST`). The Data Health menu shows structured dataset chips. Account feed state remains its own Data Health dataset row via `AccountProvider`.

This section is read-only with respect to brokerage operations — no orders or account mutations here. Place/cancel/modify go through `src/lib/trading/` and `/api/trading/*`.

### Chart data entry path

Charts load market data through `ChartDataFeed` in `src/lib/chartDataFeed/apiChartDataFeed.ts`, not by importing provider adapters. The feed posts to `/api/candles` and `/api/quotes`, which delegate to `MarketDataService` and its provider waterfall. UI components must stay on this path.

### Brokerage / account tracking

Live IB account data (positions, PnL, summary, orders, executions) is a **separate vertical** in `src/lib/brokerage/` and is always attempted through the local TWS sidecar when the app is running.

- **Sidecar endpoints** (`services/tws-sidecar/main.py`): `/account/*` REST + `/stream/account` SSE via `ib_insync`, plus `/trading/*` for order commands used by `TradingService`. Live account updates use non-blocking `ib.client.reqAccountUpdates(True, account)` plus `reqPnL`, summaries, positions, and executions. Cold positions load synchronously seeds `_account_portfolio` from `ib.portfolio()` with a one-shot `reqMktData` fallback for missing MKT/PnL; executions cache upserts by `execId` (commission reports merge into existing rows, cap 200) and `/account/trades` snapshots `ib.fills()` atomically. When `TWS_READONLY=true`, open-order snapshot requests are skipped and what-if preview returns 403; verify order/what-if behavior only with `TWS_READONLY=false`.
- **Connection scoping**: `getBrokerageClient(connectionId)` and stream URLs pass `connectionId` (`ib-paper` default); `BrokerageService.getSnapshot(environment)` resolves paper/live via `resolveConnectionByEnvironment`. Chart/watchlist display data uses a separate persisted preference (`edge:marketData:connectionId`) threaded as `connectionId` on `/api/candles`, `/api/quotes`, and `/api/stream/quotes`. Pre-trade readiness quotes in `TradingService.assertPreTrade` always use the **order** environment's `connectionId`, not the display preference.
- **Execution contract** (`contracts/brokerage.ts`): `AccountOrder` / `AccountExecution` include `orderRef` (journal correlation). What-if accepts `MKT` / `LMT` / `STP` / `STP LMT` with optional `stopPrice`. `formatExecutionLabel()` renders OPT-aware fill labels for account UI and journal review.
- **App routes**: `/api/brokerage/*` proxy the sidecar with Zod-validated contracts in `src/lib/marketData/contracts/brokerage.ts`. Journal live fill sync maps brokerage executions via `src/lib/journal/mapExecutionToFill.ts` → `/api/me/journal/fills`.
- **UI**: `AccountProvider` + Account sidebar panel (account-filtered orders, cancel via trading API); chart Trade ticket (`TradeTicketModal`); chart position overlays when `chartSettings.trading.showPositions` is enabled.
- **Read-only posture preserved on brokerage path**: no `placeOrder` in `BrokerageService`; what-if preview returns margin/commission impact without transmitting orders. Order mutations use the trading command path.

### TWS-only connection preference (display data)

Chart and watchlist market data can target a specific IB Gateway socket independently of the order account. This preference is **TWS-specific** — other providers ignore it.

| Layer | Field | Values |
|-------|-------|--------|
| Client storage | `edge:marketData:connectionId` | `ib-paper` \| `ib-live` |
| API request body / query | `connectionId` | Same |
| `MarketDataService` internal | `twsConnectionId` | Same — scoped to TWS cache keys and adapter options only |
| TWS sidecar | `?connectionId=` | Routes to paper (4002) or live (4001) socket |

**Threading:** `ChartDataFeed` (`apiChartDataFeed.ts`) → `/api/candles|quotes|stream` → `MarketDataService` → TWS adapter `options.connectionId` → sidecar. Yahoo, IBKR Client Portal, Massive, FRED, and SEC paths never receive `connectionId`; the provider waterfall is unchanged.

**UI rule:** App components must not import `src/lib/marketData/providers/tws/*`. Use `dataConnectionPreference`, `MarketDataProvider`, and API routes only.

**Trading rule:** Display preference does not authorize submit. Pre-trade quotes follow the order environment (`ib-paper` or `ib-live` per `draft.environment`), gated by `trading_decision` trust policy (TWS/IBKR only; Yahoo/mixed/display-only blocked).

**Data Health:** When dual Gateways are configured, Data Health shows paper socket, live socket, and active chart data preference as separate connection rows (see `health.ts` Connections section).

### Display provider preference (Phase 2)

Users reorder/disable **configured** providers for display datasets (candles, watchlist quotes, options). Trading and brokerage paths ignore user disable of broker-backed sources.

| Layer | Field | Notes |
|-------|-------|-------|
| Client storage | `edge:marketData:providerPreference:v1` | `orderedProviders` + `disabledProviders` only — no secrets |
| User prefs sync | `dataProviderPreference` on snapshot | Postgres pack when cloud sync enabled |
| API body / stream query | `providerPreference` | Zod-validated; threaded into `MarketDataReadOptions` |
| Waterfall | `providerWaterfall.ts` + `resolveReadWaterfall()` | Capability defaults when no user pref; user order when threaded from client |

**Invalidation:** Writes clear `chartClientCache` and server HotStore display entries so `meta.source` can flip without TTL wait.

**Settings:** `MarketDataSettingsSection` — reorder (↑/↓) and disable toggles with last-alternate guard.

**Trading rule:** `TradingService.assertPreTrade` calls `getQuotes` with `respectProviderPreference: false` and `trustUsage: "trading_decision"`.

### Risk calculator (app-wide sizing source)

User-configurable risk sizing is a separate app concern in `src/lib/risk/riskSettings.ts` + `src/app/components/RiskSettingsProvider.tsx`:

- **Persistence**: localStorage key `edge.riskSettings.v1` (no Postgres resource in v1). Settings include sizing mode (`percent` | `absolute`, default **absolute**), `riskPercent`, `absoluteRisk`, and `showLiquidationLine` (default **true**). Percent mode always sizes against IB `NetLiquidation`. Legacy stored `manualCapital` / `accountBasis` are stripped on load.
- **Resolution**: `resolveDollarRisk(settings, accountSummary)` is pure — percent mode requires a live IB summary tag via `parseSummaryTagNumber`; absolute mode returns `absoluteRisk`. `toRiskAccount()` bridges to `@edge/chart-core`'s `RiskAccount` for risk ruler presets (`capital` is `0` when no live basis).
- **Propagation**: `RiskSettingsProvider` mounts inside `AccountProvider` in `StockApp.tsx`. It reads `useAccountOptional()` and exposes `dollarRisk`, `riskAccount`, and `basisStale` via `useRiskSettings()`. In percent mode, when the account disconnects, `basisStale: true` and the last resolved `dollarRisk` stays visible until the user switches to `$ absolute` or reconnects.
- **Consumers**: Risk calculator sidebar panel (`sidebar/panels/RiskSettingsPanel.tsx`) including equity position-size calculator (`computeEquityPositionSize` from `src/lib/risk/equityPositionSize.ts`) with live bind to the newest long/short position drawing on the active chart via `RiskPositionBindingContext` + `useRiskDrawingBinding` (manual Entry/Stop soft-unlinks but keeps bind; Entry refresh sets last quote; levels refresh re-links from chart; drawing delete keeps last values); merged **Trade size card** (`RiskMarginCard` + `useRiskMarginContext`) combining hero shares, at risk/cost, a single stacked margin utilization bar (existing use then incremental trade), plain-language buying-power summary, inline hold-to-stop **Liq** readout under Margin (`projectHoldToStop` in `marginContext.ts`: approximate liquidation price vs stop from post-trade excess + maint ratio; shorts use `(1+m)` adverse math) plus **Show on chart** toggle, and IB technical fields in a Details disclosure; debounced brokerage what-if (`POST /api/brokerage/whatif`, MKT) for sized shares — display-only, does not alter share count; when what-if omits margin deltas, `estimateMarginImpactFromNotional` applies IBKR Reg T / house stock rules via `resolveIbkrStockMarginRates` (long overnight init 50%/maint 25%; short >$16.67 init 50%/maint 30%; lower short price tiers per IB published Stock Margins) instead of treating notional as 100% cash; while the Risk panel is open, `RiskLiquidationOverlayContext` publishes the projected price and app `EdgeChart` merges a dashed **MARGIN CALL** `ChartReferenceLine` when `showLiquidationLine` is enabled; options risk calculator max-risk input (prefills from `dollarRisk` and stays in sync until the user edits the field), options chain risk ruler presets (`useOptionsChainModel` passes `riskAccount` into `createRiskRulerPreset.ts`), and Trade ticket **Size for risk** (`TradeOrderForm.tsx` when linked to a position drawing).
- **Deferred**: Postgres `/api/me/risk-settings` resource, server-side access for AI tools.

## Verification

```bash
npm test -- --run src/lib/marketData
npm test -- --run src/lib/marketData/providers/ibkr src/app/api/market-data/ibkr
npm test -- --run src/app/api/candles/route.test.ts src/app/api/quotes/route.test.ts src/app/api/fundamentals/route.test.ts
npm run lint:package-boundaries
```

IBKR live probe (Client Portal Gateway on port 5001; not IB Gateway socket API):

```bash
npm run ibkr:setup    # download gateway once
npm run ibkr:gateway  # start gateway — log in at https://localhost:5001
npm run ibkr:probe    # status / contract / quote / candles for AAPL
npm run ibkr:options-probe  # AAPL expirations + one chain via IBKR secdef
```

TWS live probe (IB Gateway paper on port 4002 + local sidecar on 8765):

```bash
npm run tws:sidecar-setup   # create Python venv + install ib_insync
npm run tws:sidecar         # start sidecar — log in to IB Gateway paper first
npm run tws:probe           # status / contract / quote / candles for AAPL + TSLA + SPY
npm run tws:options-probe   # AAPL expirations + one ATM chain via TWS
```

FMP gap-fill live probe (requires `FMP_API_KEY` in `.env.local`):

```bash
npm run fmp:gap-probe  # profile, estimates, financials, executives, economic-calendar, filings, movers, news (Premium)
npm run events:coverage-probe  # corporate/filing events; full macro via FMP economic calendar when Premium configured
```

## Event system

Normalized market events live in `src/lib/marketData/events/`:

- `registry.ts` — canonical event ids (corporate, filing, priority macro)
- `providerMappings.ts` — vendor label/form → canonical id
- `normalizers/` — FMP (corporate + economic calendar), SEC, FRED → `MarketEvent`
- `dedupe.ts` — identity key + source ranking (SEC > economic_calendar/FMP macro > FMP > FRED)
- `filters.ts` — date/family/importance/canonical filters

`MarketDataService.getMarketEvents()` aggregates providers, dedupes, caches, and returns `DataResult<MarketEvent[]>`. When `includeMacro=true`, FMP `/stable/economic-calendar` is primary for US macro cards; FRED releases remain fallback/enrichment. `/api/events` exposes normalized events with legacy `type` for chart pins. Chart feed requests `families=corporate,filing` by default; benchmark/index symbols also request `macro` with `includeMacro=true`.

Economic-calendar providers plug in via adapter + registry mapping only — chart and API consumers stay unchanged.

## Market context (three-axis taxonomy)

Normalized market context for the active chart symbol lives in `src/lib/marketData/contracts/marketContext.ts` and is built by `MarketDataService.getMarketContext()`.

### Three axes

1. **Classification (Axis 1)** — GICS-style sector/industry labels describing what the company is. Rendered inline in the chart legend second line (`Sector › Industry`) as clickable crumbs when a mapped ETF exists; otherwise as muted non-interactive text.
2. **Membership (Axis 2)** — Which index baskets include the symbol, grouped by flavor: broad market, benchmark, style, strategy. Stored in curated tables in `relationshipMaps.ts` with explicit `confidence: "curated"` — not inferred from exchange listing.
3. **Wrappers (Axis 3)** — Tradable ETFs that track those baskets or sectors. Exposed as `tradableGroups` on `MarketContext` and rendered inline in the breadcrumb alongside classification labels.

### Resolution order

1. **TWS contract details** (`/contracts/details` sidecar endpoint → `reqContractDetails`) when `TWS_ENABLED=true`
2. **IBKR Client Portal contract info** (`/iserver/contract/{conid}/info`) when configured
3. **FMP company profile** fallback for sector/industry
4. **Yahoo fundamentals** fallback when FMP is unavailable
5. **Curated relationship maps** in `src/lib/marketData/context/relationshipMaps.ts` for sector/industry ETF mappings and seed index/style/strategy membership

`buildBreadcrumbChain()` projects classification-only crumbs (sector + industry labels, no hoisted ETF symbols). `buildTradableGroups()` builds the canonical navigation payload grouped by flavor (`sector_etf`, `industry_etf`, `broad_market`, `benchmark`, `style`, `strategy`). Provider classifications occasionally surface an industry as the sector (e.g. `Semiconductors`); `SECTOR_ETF_MAP` includes direct entries for the common ones and `buildTradableGroups()`/`buildCuratedRelationships()` fall back to `mapIndustryToEtf()` for unmapped sector labels so a Related ETF still resolves.

The app consumes `GET /api/market-data/context?symbol=AAPL` from the chart legend (`src/app/components/chart-chrome/MarketContextBreadcrumb.tsx`, rendered in the `ChartCell` legend second line via `legendContextSlot`). Sector › Industry labels plus every tradable in `tradableGroups` render as inline clickable breadcrumb crumbs; each navigable crumb shows a native hover tooltip (`title`) with the ETF name and symbol, and clicking a crumb loads that ETF via `onSymbolSelect`. Full density shows sector, industry, and all related tradables; compact density shows the sector crumb only. Non-navigable labels (no mapped ETF) render as muted text. Symbol back/forward history arrows render in the OHLCV legend top line via `legendLeadingSlot` (`SymbolNavArrows`), one per active chart cell via `useSymbolNavigationHistory`. Legacy cached contexts without `tradableGroups` fall back to navigable `relationships` rows rendered inline when present.

Reusable `@edge/chart-core` data-feed contracts live in `packages/chart-core/src/dataSource.ts` (`ChartDataFeed`, overlay channels, stream event types). Vendor routing, caching, credentials, and entitlements stay in this app-owned market-data module and `src/lib/chartDataFeed/`.
