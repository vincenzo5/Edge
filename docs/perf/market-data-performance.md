# Market Data Performance Report

**Generated:** 2026-06-26  
**Baseline artifact:** [market-data-baseline-latest.json](./market-data-baseline-latest.json)  
**Collection command:** `npm run perf:market-data`

This report documents how market data flows through Edge today, where time is spent, and what to optimize next. It complements chart rendering baselines in `chart-baseline-latest.json` (Canvas/WebGL draw loop), which measure a different layer.

## Methodology

### Instrumentation

Dev-only telemetry (`NEXT_PUBLIC_MARKET_DATA_TELEMETRY=1` or development mode) records correlated events in the browser via:

- `src/lib/marketData/telemetry/collector.ts`
- `MarketDataTelemetryPanel` (bottom-right dev overlay)
- `window.__edgeMarketDataTelemetry.exportJson()`

Server/API responses include optional phase metadata when `MARKET_DATA_PERF=1` or in development:

| Layer | Examples |
|-------|----------|
| `client` | `candles.fetch`, `chart.candles.firstPaint`, `quotes.firstPaint`, `warmup.request/response` |
| `api` | `api.validate`, `api.service.*`, `api.total` |
| `cache` | `cache.hot.read` |
| `service` | `service.fetchCandlesFresh`, `service.fetchQuotesFresh` |
| `provider` | `provider.tws.candles`, `provider.ibkr.quotes`, `provider.yahoo.candles` |

Each workflow carries a `traceId` (`x-edge-md-trace-id` header) so client and server timings can be joined in one snapshot.

### Baseline scenarios

`scripts/run-market-data-perf.mts` runs repeatable server-side scenarios:

1. **Cold chart candles** — AAPL 1d / 1y with empty hot store  
2. **Warm chart revisit** — same request immediately after cold load  
3. **Watchlist quotes** — 10 symbols batch  
4. **Warmup** — 5 symbols + 2 chart cells + options prewarm  
5. **Options expirations** — AAPL (IBKR-only when configured)  
6. **TWS-unavailable fallback** — when TWS enabled but Gateway disconnected  

Re-run anytime:

```bash
npm run perf:market-data
```

## Environment (latest collection)

| Setting | Value |
|---------|-------|
| Git | `f21a666` on `main` |
| Node | v24.16.0 / darwin arm64 |
| `TWS_ENABLED` | true |
| `IBKR_ENABLED` | true |
| TWS Gateway connected | **true** |
| IBKR authenticated | **false** |

Live TWS timing was captured in this run. IBKR Client Portal remains unauthenticated, so IBKR Web API timing is not represented.

## Results summary

| Scenario | Total | Source | Cache tier | Notes |
|----------|------:|--------|------------|-------|
| Cold chart candles (AAPL 1y) | **184 ms** | tws | cold | TWS returned 251 bars |
| Warm chart revisit (AAPL 1y) | **1 ms** | tws | hot-fresh | Hot store served fresh TWS candles |
| Watchlist quotes (10 symbols) | **825 ms** | mixed | cold | TWS 9 quotes; IBKR skipped via auth probe; Yahoo filled 1 missing symbol |
| Warmup (layout core) | **309 ms** | mixed | — | Expirations-only options prewarm; no blocking chain fetch |
| Options expirations (AAPL) | **0 ms** | tws | hot-fresh | 25 expirations |
| Options chain (AAPL nearest expiry) | **2751 ms** | tws | cold | On-demand chain scenario (not part of warmup) |

Raw baseline: `docs/perf/market-data-baseline-2026-06-26T02-11-28-095Z.json`.

**Shipped since prior baseline:** deferred options-chain warmup, IBKR auth health gate + proactive auth probe, partial hot quote serving, TWS Gateway status probe before candle/quote attempts, TWS stream missing-symbol fill-in.

## Phase breakdown (cold chart load)

Cold AAPL 1y candle load (`184 ms` total):

```
cache.hot.read          0 ms   miss
provider.tws.candles    259 ms  251 bars OK
```

**Takeaway:** With Gateway connected, TWS-first chart candles are fast and avoid the previous ~3s timeout/fallback path.

## Phase breakdown (warm revisit)

Warm AAPL 1y (`1 ms` total):

```
cache.hot.read          0 ms   HIT (fresh, tws)
```

Hot store now serves broker-sourced candles immediately on revisit.

## Watchlist quotes

10-symbol batch (`825 ms`):

```
cache.hot.read          0 ms    0/10 hot hits
provider.tws.quotes     114 ms  9 quotes
provider.ibkr.skipped   0 ms    auth probe skip
provider.yahoo.quotes   463 ms  1 quote filled
```

Watchlist cold start is now TWS quote subscription warmup plus Yahoo fill for missing symbols. IBKR auth probe removes the prior ~450 ms 401 hop when Client Portal is logged out.

## Warmup coordinator

`primeMarketData` layout warmup (`309 ms`):

| Phase | ms | Result |
|-------|---:|--------|
| tws.warmup | 16 | OK |
| candles AAPL | 0 | OK (hot-fresh tws) |
| candles MSFT | 195 | OK (cold tws) |
| quotes ×5 | 0 | OK (hot-fresh mixed) |
| options expirations AAPL | 74 | OK (cold tws) |

Warmup preloads candles, quotes, and expirations only. Options chain loads on demand when the Options panel or API requests it (~2751 ms cold in the separate chain scenario).

## Bottlenecks (ranked)

### 1. On-demand cold options chain

- **Impact:** ~2.8s when explicitly fetching the nearest ATM chain outside warmup
- **Evidence:** `options-chain:AAPL:2026-06-26` 2751 ms
- **Next optimization:** Defer chain fetch until Options panel open; consider narrower strike window for first paint

### 2. Yahoo fill for missing TWS quote symbols

- **Impact:** ~460 ms when one symbol misses TWS subscription on cold batch
- **Evidence:** `provider.yahoo.quotes` 463 ms fill after TWS partial batch
- **Next optimization:** Ensure sidecar warmup subscribes all watchlist symbols before first batch read

### 3. Gateway-down fallback remains important

- **Impact:** Prior baseline showed +~3s cold candle timeout when Gateway was down
- **Evidence:** Previous `provider.tws.candles` timeout path; now mitigated by cached Gateway status probe + circuit breaker
- **Next optimization:** Keep health-aware skip-before-timeout for disconnected Gateway states

## Recommendations

### Immediate (high ROI)

1. **Options panel lazy chain load:** Keep expirations in warmup; fetch chain only when panel opens or user selects expiration.
2. **Watchlist symbol subscription parity:** Verify sidecar `/warmup` covers every visible watchlist symbol to reduce Yahoo fill-ins.
3. **Authenticated IBKR baseline:** Re-run after Client Portal login to compare IBKR Web API against TWS-first routing.

### Medium term

4. **Baseline regression gate:** Add p95 thresholds to CI for Yahoo-only fallback paths (e.g. cold chart < 800 ms when TWS disabled).  
5. **Browser snapshot export in CI:** Playwright script hitting `/` with telemetry flag, exporting JSON artifact.

### Dev workflow

Enable telemetry panel:

```bash
# .env.local
NEXT_PUBLIC_MARKET_DATA_TELEMETRY=1
MARKET_DATA_PERF=1
npm run dev
```

Use the bottom-right **Market data latency** panel or console:

```js
__edgeMarketDataTelemetry.dump()
__edgeMarketDataTelemetry.exportJson()
```

## Related docs

- [market-data-baseline-latest.json](./market-data-baseline-latest.json) — raw scenario JSON  
- [src/lib/marketData/ARCHITECTURE.md](../src/lib/marketData/ARCHITECTURE.md) — provider routing & hot store  
- [src/lib/chartDataFeed/ARCHITECTURE.md](../src/lib/chartDataFeed/ARCHITECTURE.md) — chart feed transport  
- [chart-baseline-latest.json](./chart-baseline-latest.json) — chart *rendering* perf (separate concern)

## Verification

Focused tests for this instrumentation:

```bash
npm test -- --run src/lib/marketData/telemetry/collector.test.ts
npm test -- --run src/lib/chartDataFeed/apiChartDataFeed.test.ts src/lib/chartDataFeed/useChartDataFeed.test.ts
npm test -- --run src/lib/marketData/service/marketDataService.test.ts
npm test -- --run src/app/api/candles/route.test.ts
npm run perf:market-data
npm run check:startup
```

Latest run: **`perf:market-data` succeeded** after first-paint performance work (warmup 309 ms, watchlist 825 ms); **37 focused tests passed** in service + IBKR health gate suites.
