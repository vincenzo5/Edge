# Market Data Layer

Provider-neutral stocks/options data foundation for the closed Edge app.

## Layout

```
src/lib/marketData/
  contracts/     Edge-owned normalized types + DataResult envelope
  schemas/       Zod request/response validation
  validation/    parse helpers and legacy mappers
  cache/         Shared TTL cache and freshness policy
  ports/         Domain port interfaces
  providers/     Vendor adapters (yahoo, sec, fred, fmp, tradier, ibkr)
  events/        Canonical registry, normalizers, dedupe, filters
  router/        Provider capability registry and preferences
  service/       MarketDataService + server singleton
  trust/         Data usage policy, provenance, readiness evaluation
```

## Data trust model

Market data responses carry shape metadata (`DataResult`) plus **usage policy** so display/analysis data cannot silently authorize future trades.

```
DataResult / ChartDataMeta
  -> DataProvenance (source, stale, warnings, isFallback)
  -> DatasetPolicy (DATASET_POLICIES in trust/dataTrust.ts)
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

- **Default:** client polling over REST (`pollStreamAdapter.ts`).
- **Opt-in:** server-proxied SSE via `/api/stream/candles` and `/api/stream/quotes` (`src/lib/marketData/stream/`). Enable with `NEXT_PUBLIC_STREAM_TRANSPORT=server-proxied`.
- **Watchlist:** `WatchlistPanel` uses `/api/stream/quotes` when `NEXT_PUBLIC_WATCHLIST_STREAM=1` (or auto when `EventSource` is available); set `NEXT_PUBLIC_WATCHLIST_STREAM=0` to force REST polling in tests.

See [chartDataFeed/ARCHITECTURE.md](../chartDataFeed/ARCHITECTURE.md) for transport details and fallback rules.

## Provider routing (candles, quotes & options)

When `MASSIVE_API_KEY` or `POLYGON_API_KEY` is configured, `MarketDataService` routes **options expirations and chains** through Massive Options Advanced first (`meta.source: "massive"`). TWS/IBKR option paths remain available for diagnostics and probe routes only — normal UI analysis does not silently fall back to broker login when Massive is configured.

When Massive is not configured, options route `tws → ibkr` with explicit warnings when falling back. **Options have no Yahoo/Tradier fallback.**

When `IBKR_ENABLED=true`, `MarketDataService` attempts IBKR first for candles and watchlist quotes. **Watchlist quotes** use batched IBKR snapshots and return partial results — symbols that fail IBKR resolution are filled per-symbol from Yahoo with `meta.source: "mixed"`.

When `TWS_ENABLED=true`, `MarketDataService` attempts **TWS first** via the local sidecar, then falls back to Client Portal IBKR, then Yahoo for candles/quotes.

**TWS performance:** Chart-critical candle/quote requests use short sidecar timeouts (`TWS_CANDLES_TIMEOUT_MS`, `TWS_QUOTES_TIMEOUT_MS`, default 3s). A process-local health gate (`providers/tws/healthGate.ts`) opens a short cooldown after sidecar/Gateway/timeout failures so fresh charts skip repeated slow TWS attempts and fall back immediately. **Quote SSE** (`/api/stream/quotes`) uses the same TWS health gate as REST quotes — when the circuit is open, the sidecar is unreachable/wedged, or `/health` lacks current route capabilities, the stream route falls back to REST poll (Yahoo/IBKR) with connect/first-frame timeouts. A cached Gateway status probe can open the circuit before the first candle/quote attempt when IB Gateway is disconnected. A parallel IBKR auth health gate (`providers/ibkr/healthGate.ts`) skips repeated Client Portal 401/auth failures during quote and candle waterfalls. The sidecar uses priority job queues (candles/status/warmup before options) and persistent `reqMktData` quote subscriptions. Overlay enrichment (events/news/options expirations) loads after candle paint and requests options expirations after faster event sources.

**Warmup:** `/api/market-data/warmup` is best-effort and bounded. TWS sidecar `/warmup` pre-subscribes quote symbols; **batch quote fetch is client-owned** via `MarketDataProvider` (no `getQuotes` phase in warmup). Active chart cell candles run first, then secondary cells in parallel; options expirations defer when Massive/TWS/IBKR are unavailable (options have no Yahoo fallback). When Massive is configured, options warmup uses Massive and does not require broker login.

**Hot data (stale-while-revalidate):** UI-critical reads (quotes, candles, options expirations/chains) pass through an in-process `HotStore` in `hotStore.ts`. `MarketDataService` returns fresh or stale snapshots immediately and revalidates in the background. On the client, `useChartDataFeed` mirrors the same SWR shape via `chartClientCache.ts` so re-opened charts paint cached candles instantly (`stale: true`, `refreshing: true`) while the server HotStore serves the background refresh. Partial hot quote batches are served immediately — missing symbols are fetched per-symbol without waiting for the full watchlist batch. `StockApp` resolves local + remote bootstrap before mounting providers, then `MarketDataProvider` keeps one quote SSE stream alive, calls `/api/market-data/warmup` for visible chart cells + watchlist symbol subscriptions, and prefetches active-symbol **option expirations only** (chain loads on demand from the chart-header options dialog or API). Sidecar `/warmup` retains quote subscriptions for warmed symbols. Options chain requests pass `strikeWindow.spot` from the active chart when available; the TWS sidecar uses that spot for ATM strike selection instead of re-fetching equity spot, and caches secdef option parameters per underlying for reuse across expirations.

Cache keys are namespaced per provider (`massive`, `ibkr`, `tws`, `yahoo` / `tradier`) so a fallback cached while the Gateway is logged out does not block a later provider fetch after credentials recover.

API routes return optional `meta: { source, warnings, stale, asOf, usage, readiness }` alongside legacy `{ candles }` / `{ quotes }` payloads. Candles and quotes attach trust fields via `trust/enrichResponseMeta.ts` (see [Data trust model](#data-trust-model)). Probe routes under `/api/market-data/ibkr/*` remain available for diagnostics.

## Providers

| Provider | Env | Capabilities |
|----------|-----|--------------|
| Yahoo | none (dev) | candles, quotes, search, fundamentals |
| SEC EDGAR | `SEC_USER_AGENT` | company facts, recent filings |
| FRED | `FRED_API_KEY` | macro series, economic releases |
| FMP | `FMP_API_KEY` | gap-fill fundamentals/context: profile, estimates, financials, executives, calendars (earnings/dividends/splits), economic calendar (macro event cards), SEC filing search, market movers, **company screener** (`/company-screener`), news (Premium) |
| Massive | `MASSIVE_API_KEY` or `POLYGON_API_KEY` | **Options Advanced** expirations + chain snapshots (`/v3/reference/options/contracts`, `/v3/snapshot/options/{underlying}`); Daily Market Summary grouped US equities (full-universe screener store), Custom Bars per-symbol fallback, Universal Snapshot; API host `https://api.massive.com` |
| Tradier | `TRADIER_ACCESS_TOKEN` | (legacy; not used for options analysis) |
| IBKR | `IBKR_ENABLED`, Client Portal Gateway login | candles, quotes, options diagnostics/fallback when Massive unavailable |
| TWS | `TWS_ENABLED`, `TWS_MANAGED` (`local` \| `external`), IB Gateway paper + sidecar | candles, quotes, options diagnostics/fallback when Massive unavailable |

### Market calendar

`src/lib/marketData/marketCalendar.ts` is the single source of truth for **latest completed US trading day** (YYYY-MM-DD). Daily-bar consumers — universe store warm/backfill, Massive aggregate `to` dates — must use `latestCompletedTradingDate()` or `recentTradingDays()` instead of rolling their own weekday logic.

- **US market close:** 20:00 UTC (4pm ET during standard time). Before close on a weekday, "today" is excluded so Massive grouped-daily requests do not 403 on restricted plans.
- **Weekends:** Saturday/Sunday walk back to the prior Friday.
- **Deferred:** US market holidays (NYSE closed weekdays) are not yet modeled; holiday requests may return empty bars without a 403.

Screener warning UX: provider notices stay in `meta.warnings`; per-symbol candle-fetch skips are typed as `meta.skippedSymbols` and rendered separately in the screener results table.

**IBKR note:** This app uses the **Client Portal Web API** (`clientportal.gw` on HTTPS, port 5001 by default). That is **not** the same as **IB Gateway 10.x** (TWS socket API on 4001/7497). If you only run IB Gateway, our Client Portal probes will not work until Client Portal Gateway is installed and running (`npm run ibkr:setup` / `npm run ibkr:gateway`).

**TWS note:** When `TWS_ENABLED=true`, Edge prefers the **IB Gateway socket API** via a local Python sidecar (`services/tws-sidecar/`). Start IB Gateway paper (default port `4002`; live Gateway uses `4001`), run `npm run tws:sidecar-setup` once, then `npm run tws:sidecar`. Routing becomes `tws → ibkr → yahoo` for candles/quotes and `tws → ibkr` for options. Sidecar `/health` exposes `startedAt`, version, effective host/port, and route capabilities for stale-process detection. Optional fast-fail timeouts: `TWS_CANDLES_TIMEOUT_MS`, `TWS_QUOTES_TIMEOUT_MS` (default 3000). Sidecar `/warmup` pre-resolves contracts without blocking chart loads. Historical candles accept `sessionMode`: `regular` (default, `useRTH=true`) or `extended` (`useRTH=false` for intraday pre/post-market bars).

### Live quote vs candle close

- **Watchlist `LAST`** and the chart **current-price marker** use the same live quote stream (`QuoteSnapshot.regularMarketPrice` / TWS `reqMktData` last).
- **Candle OHLC** remains historical bar data; the last bar close can differ from the live quote after hours or between bar updates.
- Chart settings **`symbol.sessionMode`**: `regular` (RTH candles only) or `extended` (include pre/post-market intraday bars from TWS). Session classification and badges live in `@edge/chart-core/marketSession`.

### IBKR client optimizations

| Mechanism | Location | Purpose |
|-----------|----------|---------|
| Request throttle (8 req/s) | `providers/ibkr/requestThrottle.ts` | Stay under IBKR 10 req/s global limit |
| Contract cache (TTL) | `providers/ibkr/contractCache.ts` | Avoid re-resolving conids/secdef/strikes on every poll |
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
| `/api/market-data/health` | GET | none (provider status summary) |
| `/api/market-data/context` | GET | `marketContextQuerySchema` |

### API hardening (local-first)

| Control | Env | Behavior |
|---------|-----|----------|
| Sensitive-route API key | `EDGE_API_KEY` | Middleware gates `/api/brokerage/*`, `/api/ai/*`, TWS recover/warmup, and `/api/market-data/health`. Loopback requests skip the key when `EDGE_TRUST_LOCALHOST=true` (default). |
| Rate limits | `EDGE_RATE_LIMIT=1` | In-process limits on screener, warmup, recover, AI routes, and concurrent SSE streams. |
| Sidecar secret | `TWS_SIDECAR_SECRET` | Next.js TWS/brokerage clients send `X-Edge-Sidecar-Secret`; sidecar `/health` stays open for liveness probes. |
| Production errors | `NODE_ENV=production` | Route helpers use `src/lib/api/safeErrorResponse.ts` to avoid leaking provider internals. |

Implementation: [src/middleware.ts](../../../middleware.ts), [src/lib/api/](../../../lib/api/), [src/lib/marketData/providers/tws/sidecarAuth.ts](providers/tws/sidecarAuth.ts).

## Stock screener

The lean Phase 1 screener filters US equities and ETFs through FMP `/company-screener` server-side, with mover presets reusing existing `getFmpMarketMovers`. **Phase 1.5** adds a two-step pipeline when `ScreenQuery.technical` is set: FMP prefilter → per-candidate Yahoo daily candles → `@edge/chart-core/indicators/math` rule evaluation. **Phase 4 (Massive full-universe)** when `MASSIVE_API_KEY` is configured and `ScreenQuery.technical` is set: Massive Daily Market Summary universe store + FMP paginated descriptors (~8k) → local descriptive filter → local indicator scan (removes 200-candidate cap).

| Layer | Path | Notes |
|-------|------|-------|
| API route | `src/app/api/screener/run/route.ts` | POST body validated with `screenQuerySchema` (optional `technical`, `maxResults`); **registry-aware** semantic validation via `validateScreenQueryTechnical()` for `kind: "indicator"` rules before service call; returns `{ results, meta }` via `fmpJsonResponse` |
| Service | `MarketDataService.getScreenerResults()` | Cache namespace `screener` (60s TTL); **Massive path** when `technical` + Massive configured: `ensureScreenerUniverseWarm` → `fetchUniverseDescriptors` → `applyDescriptiveFilters` → `runTechnicalFilter` with universe-backed candles; **fallback path** FMP prefilter (max 200 candidates) + per-symbol candles (range tailored via `rangeForTechnicalRule`); perf phases include `screener.universe.warm`, `screener.universe.descriptors`, `screener.technical.*`, `screener.total` |
| Universe store | `src/lib/marketData/screenerUniverse/universeDailyStore.ts` | Rolling 252-day grouped daily bars in cache namespace `universe_daily` (24h TTL); lazy warm on first screen + background backfill; FMP descriptor pagination in `screener_universe` (24h TTL) |
| Massive adapter | `providers/massive/adapter.ts` | `getDailyMarketSummary(date)`, `getAggregates`, `getSnapshotAllTickers`, `getOptionExpirationsWithWarnings`, `getOptionsChainWithWarnings`; options submodule in `providers/massive/options.ts` with paginated reference/snapshot fetch |
| Technical pass | `src/lib/screener/technicalFilter.ts`, `technicalMath.ts` | Universe path: unbounded candidates, concurrency 16; fallback path: max 200 candidates, concurrency 6 (TWS-bound) or 20 (Massive Custom Bars fallback); optional `maxResults` early-exit; per-symbol cache namespace `screener_technical` (15 min TTL) |
| FMP adapter | `providers/fmp/adapter.ts` → `runStockScreener()` | Translates `ScreenQuery` to FMP flat params via `screenerParams.ts` (ignores `technical`) |
| Client feed | `src/lib/chartDataFeed/apiScreenerFeed.ts` | `fetchScreenerResults()` + `fetchMarketMoverResults()`; parses `meta.phases` into screener phase summary |
| Persistence | `src/lib/persistence/schemas/screenerLibrary.ts`, `/api/me/screener-library` | Whole `ScreenerState` JSONB per user; optimistic sync via `useScreenerLibraryRemoteSync`; localStorage fallback |
| UI | `src/app/components/screener/` | `ScreenerProvider` + `ScreenerDialog`; nested AND/OR `QueryBuilder` with **registry-driven technical rule editor** (`TechnicalQueryRule` round-trip via `compileQuery.ts`); implemented indicators from `@edge/chart-core` registry with typed `inputSchema`/`outputs`; named kinds (`rsi`, `goldenCross`, `fiftyTwoWeekProximity`) render read-only; group watchlist actions; CSV + clipboard export; live quote overlay on first 32 visible rows via `MarketDataProvider` |
| Query compile | `src/lib/screener/compileQuery.ts`, `validateIndicatorRule.ts` | `groupFromScreenQuery` / `compileScreenQueryFromGroup` round-trip `query.technical`; `validateIndicatorRule()` checks indicator exists, series in plugin outputs, inputs match `ParamDef`; client + API gate before run/save |

**Phase 2** (shipped): Postgres screener library sync, group watchlist actions, live quote overlay coalesced into `MarketDataProvider` SSE (32-symbol stream cap), AND/OR query groups with FMP comma-separated text filters, export utilities. `screen_runs` snapshots deferred.

**Phase 3** (shipped): Custom-indicator rules via chart-core `IndicatorPlugin` (`ScreenQuery.technical.kind === "indicator"`) delivered through presets; Bollinger `%B` derived in screener evaluator; comparison table for multi-selected rows; `summarize_screen` read-only AI tool. **Technical rule builder (v1)** (shipped): registry-driven `QueryBuilder` technical editor + `validateIndicatorRule` semantic gate; one technical rule per screen; named kinds preserved for backward compat. Scheduled re-runs/alerts deferred — see [docs/screener-roadmap.md](../../../docs/screener-roadmap.md).

## Data health center

The app exposes a user-facing **Data Health** dropdown from a compact overlay badge on the active chart cell (`src/app/components/data-health/`, `src/app/components/chart-cell/ChartOverlayStatusStack.tsx`). It combines:

- **Client-observed dataset metadata** from active chart `ChartDataMeta`, watchlist quote `meta`, and optional options panel meta.
- **Server provider probes** from `/api/market-data/health`, which summarizes IB Gateway (TWS sidecar) status plus process-local circuit-breaker snapshots. **IBKR Client Portal is not shown** in Data Health — use IB Gateway + sidecar only for live market data status. Optional-provider configured flags (`FMP`, `FRED`, `SEC`) are booleans only — no secrets are returned.

Severity (`healthy` / `degraded` / `offline` / `unknown`) is derived in `src/lib/marketData/health.ts` from **dataset readiness** (`evaluateReadiness` in `src/lib/marketData/trust/dataTrust.ts`), provenance (source, fallback, partial symbol coverage), and provider connection state — **not** from raw warning counts. **Display market data** (watchlist quotes, active chart candles, options chain/expirations) use **age-based display freshness** via `maxDisplayAgeMs` in `DATASET_POLICIES`, aligned with `HOT_STALE_MS` in `hotStore.ts`:

| Dataset | Display max | Notes |
|---------|-------------|-------|
| `watchlist_quotes` | 60s | Oldest quote `updatedAt` drives row age |
| `chart_candles` | 5 min | Active chart `ChartDataMeta.asOf` |
| `options_chain` | 5 min | When chain meta is registered |
| `options_expirations` | 24 h | When only expirations meta is registered |

TWS data within the display window stays **healthy** even when served from `hot-stale` SWR cache; internal `stale` and cache tier stay out of user-facing dataset lines. `resolveTrustDataset()` picks the options policy (`options_chain` vs `options_expirations`). Account feed severity remains connection-based. Transport recovery events (SSE timeout → REST success) are recorded in a session **Issues** log via `src/lib/marketData/healthEvents.ts` and do not downgrade the badge when datasets are display-fresh. Incident warnings (Yahoo fallback, TWS skip, circuit open) still surface under **Issues** and drive degraded severity when they affect current provenance. `MarketDataProvider` silently revalidates aged watchlist quotes (~3s debounce) and the watchlist table shows muted per-row age hints after 30s.

**Chart chrome:** On the active chart cell, `ChartOverlayStatusStack` stacks feed status (when stale/stream/error) above an icon-only `DataHealthButton` (severity dot only; session label removed from chart chrome). Hover shows the compact source summary via tooltip; click opens the Data Health panel. The chart legend suppresses the duplicate market session label when the overlay stack is shown. Dataset rows in the panel use structured chips from `buildDatasetChips()` in `health.ts`; idle datasets collapse to `Not open`; provider details collapse when healthy.

### TWS-only mental model

When `TWS_ENABLED=true` and `IBKR_ENABLED=false` (default in `.env.example`):

- **Primary live data path:** IB Gateway socket API → local Python sidecar → `MarketDataService` routing (`tws → yahoo`).
- **Data Health provider row:** **IB Gateway** (TWS sidecar + Gateway connection).
- **IBKR Client Portal** is not surfaced in Data Health. Adapter code may remain for optional routing fallback elsewhere; diagnostics use `/api/market-data/ibkr/*` probe routes.

### TWS sidecar recovery

When IB Gateway is manually restored after a disconnect, the Data Health dropdown can run recovery when `TWS_ENABLED=true`:

1. `POST /api/market-data/tws/recover` with visible symbols, chart candle requests, and active options symbol.
2. If the sidecar is unreachable, Edge spawns the static local command `npm run tws:sidecar`.
3. The sidecar `POST /control/reconnect` drops stale IB socket state and reconnects to IB Gateway. Sidecar `/health` and `/status` are **control-plane only** (non-blocking; no IB worker queue). `/status` exposes worker diagnostics (`queueDepth`, `activeJob`, `workerWedged`, recovery phase) plus connection supervisor fields (`connectionState`, `activeClientId`, `lastIbErrorCode`, `subscriptionsLost`, `restartRequired`).
4. When the IB worker is wedged or the API client ID is stuck, Edge restarts the managed sidecar process (`npm run tws:sidecar`) before retrying reconnect. Stale `clientId` after restart surfaces a manual action: restart IB Gateway or change `TWS_CLIENT_ID`.
5. The sidecar supervisor handles IB error codes: `1100` → disconnected, `1101` → connected but subscriptions lost (resubscribe quotes/account), `1102` → connected with subscriptions maintained. Wedged-worker reconnect bypasses the IB worker queue via async reconnect thread.
6. The recover response includes `commandState`: `accepted`, `timed_out`, `failed`, or `confirmed`, plus `recoveryPhase`. A reconnect HTTP timeout (`timed_out`) or async accept (`accepted`) is **not** a final failure — the UI polls `GET /api/market-data/tws/recover/status` for phase messages and late Gateway confirmation.
7. `finalizeTwsRecoveryIfNeeded()` resets TWS/brokerage gates, clears stale cache keys, and runs `primeMarketData()` once per recovery session when Gateway health is confirmed (sync or via status poll). Recovery session context (`symbols`, `candleRequests`, `optionsSymbol`) is started by the recover route and preserved through status-poll finalization.
8. During active recovery, `/api/market-data/health?recovery=1` bypasses the TWS circuit breaker for fresh sidecar truth.
9. The client bumps `MarketDataProvider.reloadToken` (and refreshes account state when brokerage is enabled) after confirmed recovery or after status poll finalization. Data Health shows precise phase messages (sidecar restart, client ID stuck, resubscribing, Gateway not logged in).

**Startup coupling:** When `TWS_ENABLED=true` and `TWS_MANAGED=local` (default), root `instrumentation.ts` calls `ensureSidecarOnServerBoot()` on Node runtime boot (fire-and-forget). That reuses `recoverTwsSidecar` to spawn the sidecar via `scripts/tws-sidecar.sh` if unreachable, restart if wedged/stuck, call `POST /control/reconnect` to prime IB Gateway, and reset the TWS circuit breaker on confirmed success. Spawned sidecars set `TWS_MANAGED_BY=edge-local` and `EDGE_INSTANCE_ID` for ownership verification via `/health`. `SIGTERM`/`SIGINT`/`beforeExit` handlers call `killManagedSidecar()` (local mode only) so repeated `next dev` restarts do not leave orphaned sidecar processes.

**Management modes (`TWS_MANAGED`):**

| Mode | Next spawn/kill | Boot ensure | Use when |
|------|-----------------|-------------|----------|
| `local` | Yes | Yes | Default dev — Next owns one sidecar |
| `external` | No | No | Manual `npm run tws:sidecar`, systemd, or launchd |

Docker Compose is **not** used for the sidecar. External mode means run `npm run tws:sidecar` yourself (or a host supervisor).

**Brokerage readiness:** `awaitSidecarForBrokerage()` gates `/api/brokerage/*` and `BrokerageService` only — chart/quote routes keep fast Yahoo fallback.

**Lifecycle API:** `GET /api/market-data/health` includes `health.lifecycle` (`ready`, `gateway_disconnected`, `recovering`, `wedged`, etc.) derived from sidecar `/health` + `/status`.

**Sidecar shutdown:** FastAPI `lifespan` disconnects IB on exit; `scripts/tws-sidecar.sh` uses PID file + port check + single-instance lock (flock on Linux, mkdir on macOS).

**Source labels:** The active-chart overlay shows an icon-only severity dot; hover tooltip summarizes chart candle source and watchlist quote source (e.g. `TWS · LIVE · REST`). The Data Health menu shows structured dataset chips. Account feed state remains its own Data Health dataset row via `AccountProvider`.

This section is read-only with respect to brokerage operations — no orders or account mutations here. Place/cancel/modify go through `src/lib/trading/` and `/api/trading/*`.

### Brokerage / account tracking

Live IB account data (positions, PnL, summary, orders, executions) is a **separate vertical** in `src/lib/brokerage/` and is always attempted through the local TWS sidecar when the app is running.

- **Sidecar endpoints** (`services/tws-sidecar/main.py`): `/account/*` REST + `/stream/account` SSE via `ib_insync`, plus `/trading/*` for order commands used by `TradingService`. Live account updates use non-blocking `ib.client.reqAccountUpdates(True, account)` plus `reqPnL`, summaries, positions, and executions. Cold positions load synchronously seeds `_account_portfolio` from `ib.portfolio()` with a one-shot `reqMktData` fallback for missing MKT/PnL; executions cache upserts by `execId` (commission reports merge into existing rows, cap 200) and `/account/trades` snapshots `ib.fills()` atomically. When `TWS_READONLY=true`, open-order snapshot requests are skipped and what-if preview returns 403; verify order/what-if behavior only with `TWS_READONLY=false`.
- **Connection scoping**: `getBrokerageClient(connectionId)` and stream URLs pass `connectionId` (`ib-paper` default); `BrokerageService.getSnapshot(environment)` resolves paper/live via `resolveConnectionByEnvironment`.
- **Execution contract** (`contracts/brokerage.ts`): `AccountOrder` / `AccountExecution` include `orderRef` (journal correlation). What-if accepts `MKT` / `LMT` / `STP` / `STP LMT` with optional `stopPrice`. `formatExecutionLabel()` renders OPT-aware fill labels for account UI and journal review.
- **App routes**: `/api/brokerage/*` proxy the sidecar with Zod-validated contracts in `src/lib/marketData/contracts/brokerage.ts`. Journal live fill sync maps brokerage executions via `src/lib/journal/mapExecutionToFill.ts` → `/api/me/journal/fills`.
- **UI**: `AccountProvider` + Account sidebar panel (account-filtered orders, cancel via trading API); chart Trade ticket (`TradeTicketModal`); chart position overlays when `chartSettings.trading.showPositions` is enabled.
- **Read-only posture preserved on brokerage path**: no `placeOrder` in `BrokerageService`; what-if preview returns margin/commission impact without transmitting orders. Order mutations use the trading command path.

### Risk settings (app-wide sizing source)

User-configurable risk sizing is a separate app concern in `src/lib/risk/riskSettings.ts` + `src/app/components/RiskSettingsProvider.tsx`:

- **Persistence**: localStorage key `edge.riskSettings.v1` (no Postgres resource in v1). Settings include sizing mode (`percent` | `absolute`), `riskPercent`, `absoluteRisk`, `accountBasis` (`NetLiquidation` | `AvailableFunds` | `EquityWithLoanValue` | `Manual`), and `manualCapital` fallback.
- **Resolution**: `resolveDollarRisk(settings, accountSummary)` is pure — percent mode uses `parseSummaryTagNumber` on the chosen IB summary tag; absolute mode returns `absoluteRisk`. `toRiskAccount()` bridges to `@edge/chart-core`'s `RiskAccount` for risk ruler presets.
- **Propagation**: `RiskSettingsProvider` mounts inside `AccountProvider` in `StockApp.tsx`. It reads `useAccountOptional()` and exposes `dollarRisk`, `riskAccount`, and `basisStale` via `useRiskSettings()`. When the account disconnects, percent sizing sets `basisStale: true` and keeps the last resolved `dollarRisk` visible; `riskAccount.capital` falls back to `manualCapital`.
- **Consumers**: Risk sidebar panel (`sidebar/panels/RiskSettingsPanel.tsx`), options risk calculator max-risk input (prefills from `dollarRisk` and stays in sync until the user edits the field), and options chain risk ruler presets (`useOptionsChainModel` passes `riskAccount` into `createRiskRulerPreset.ts`).
- **Deferred**: Postgres `/api/me/risk-settings` resource, server-side access for AI tools, what-if margin preview tied to risk settings.

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
