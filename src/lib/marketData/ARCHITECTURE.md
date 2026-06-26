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
```

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

When `IBKR_ENABLED=true`, `MarketDataService` attempts IBKR first for candles, watchlist quotes, option expirations, and options chains. **Options remain IBKR-only** (no Tradier/Yahoo fallback). **Watchlist quotes** use batched IBKR snapshots and return partial results — symbols that fail IBKR resolution are filled per-symbol from Yahoo with `meta.source: "mixed"`.

When `TWS_ENABLED=true`, `MarketDataService` attempts **TWS first** via the local sidecar, then falls back to Client Portal IBKR, then Yahoo for candles/quotes. Options route `tws → ibkr` with explicit warnings when falling back.

**TWS performance:** Chart-critical candle/quote requests use short sidecar timeouts (`TWS_CANDLES_TIMEOUT_MS`, `TWS_QUOTES_TIMEOUT_MS`, default 3s). A process-local health gate (`providers/tws/healthGate.ts`) opens a short cooldown after sidecar/Gateway/timeout failures so fresh charts skip repeated slow TWS attempts and fall back immediately. A cached Gateway status probe can open the circuit before the first candle/quote attempt when IB Gateway is disconnected. A parallel IBKR auth health gate (`providers/ibkr/healthGate.ts`) skips repeated Client Portal 401/auth failures during quote and candle waterfalls. The sidecar uses priority job queues (candles/status/warmup before options) and persistent `reqMktData` quote subscriptions. Overlay enrichment (events/news/options expirations) loads after candle paint and requests options expirations after faster event sources.

**Hot data (stale-while-revalidate):** UI-critical reads (quotes, candles, options expirations/chains) pass through an in-process `HotStore` in `hotStore.ts`. `MarketDataService` returns fresh or stale snapshots immediately and revalidates in the background. Partial hot quote batches are served immediately — missing symbols are fetched without waiting for the full watchlist batch. `StockApp` mounts `MarketDataProvider`, which keeps one quote SSE stream alive, calls `/api/market-data/warmup` for visible chart cells + watchlist symbols, and prefetches active-symbol **option expirations only** (chain loads on demand from the Options panel or API). Sidecar `/warmup` retains quote subscriptions for warmed symbols.

Cache keys are namespaced per provider (`ibkr` vs `yahoo` / `tradier`) so a fallback cached while the Gateway is logged out does not block a later IBKR fetch after login.

API routes return optional `meta: { source, warnings, stale, asOf }` alongside legacy `{ candles }` / `{ quotes }` payloads. Probe routes under `/api/market-data/ibkr/*` remain available for diagnostics.

## Providers

| Provider | Env | Capabilities |
|----------|-----|--------------|
| Yahoo | none (dev) | candles, quotes, search, fundamentals |
| SEC EDGAR | `SEC_USER_AGENT` | company facts, recent filings |
| FRED | `FRED_API_KEY` | macro series, economic releases |
| FMP | `FMP_API_KEY` | gap-fill fundamentals/context: profile, estimates, financials, executives, calendars (earnings/dividends/splits), economic calendar (macro event cards), SEC filing search, market movers, news (Premium) |
| Tradier | `TRADIER_ACCESS_TOKEN` | (no longer used for options; IBKR is required) |
| IBKR | `IBKR_ENABLED`, Client Portal Gateway login | candles, quotes, options (required when configured) |
| TWS | `TWS_ENABLED`, IB Gateway paper + sidecar | candles, quotes, options (preferred when configured) |

**IBKR note:** This app uses the **Client Portal Web API** (`clientportal.gw` on HTTPS, port 5001 by default). That is **not** the same as **IB Gateway 10.x** (TWS socket API on 4001/7497). If you only run IB Gateway, our Client Portal probes will not work until Client Portal Gateway is installed and running (`npm run ibkr:setup` / `npm run ibkr:gateway`).

**TWS note:** When `TWS_ENABLED=true`, Edge prefers the **IB Gateway socket API** via a local Python sidecar (`services/tws-sidecar/`). Start IB Gateway paper (default port `4002`), run `npm run tws:sidecar-setup` once, then `npm run tws:sidecar`. Routing becomes `tws → ibkr → yahoo` for candles/quotes and `tws → ibkr` for options. Optional fast-fail timeouts: `TWS_CANDLES_TIMEOUT_MS`, `TWS_QUOTES_TIMEOUT_MS` (default 3000). Sidecar `/warmup` pre-resolves contracts without blocking chart loads.

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
| `/api/market-data/ibkr/status` | GET | none (probe) |
| `/api/market-data/ibkr/contracts` | GET | `ibkrSymbolQuerySchema` |
| `/api/market-data/ibkr/quote` | GET | `ibkrSymbolQuerySchema` |
| `/api/market-data/ibkr/candles` | GET | `ibkrCandlesQuerySchema` |
| `/api/market-data/tws/status` | GET | none (probe) |
| `/api/market-data/tws/contracts` | GET | `twsSymbolQuerySchema` |
| `/api/market-data/tws/quote` | GET | `twsSymbolQuerySchema` |
| `/api/market-data/tws/candles` | GET | `twsCandlesQuerySchema` |
| `/api/market-data/warmup` | POST | `warmupRequestSchema` |

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

Reusable `@edge/chart-core` data-feed contracts live in `packages/chart-core/src/dataSource.ts` (`ChartDataFeed`, overlay channels, stream event types). Vendor routing, caching, credentials, and entitlements stay in this app-owned market-data module and `src/lib/chartDataFeed/`.
