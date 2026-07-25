# Chart Data Feed — Live Streaming Architecture

App-owned adapter between Next.js market-data routes and `@edge/chart-core` `ChartDataFeed`.

## Layers

```
Chart engine (useChartDataFeed)
  → ChartDataFeed (createApiChartDataFeed)
      → StreamTransport (polling | server-proxied SSE)
          → REST /api/candles + /api/quotes  (initial load + polling)
          → SSE /api/stream/candles + /api/stream/quotes  (server-proxied)
              → MarketDataService (IBKR-first, Yahoo fallback)
```

## StreamTransport

Pluggable transport behind `subscribeCandles` / `subscribeQuotes`. Both implementations emit the same typed events from `@edge/chart-core`:

| Event | Meaning |
|-------|---------|
| `snapshot` | Full candle page reset |
| `append` | New bar closed |
| `replace-latest` | In-progress bar updated |
| `update` | Quote batch refresh |
| `refresh` | Successful delivery with unchanged quotes (metadata-only heartbeat) |
| `stale` | Data no longer trustworthy |
| `error` | Recoverable or fatal stream error |
| `reconnect` | Reserved for future push reconnects |

### Polling (default)

- Client polls REST endpoints on interval-aware cadence (`pollStreamAdapter.ts`).
- Live candle polls use a **short poll range** (`pollRangeForInterval`) — not the chart display range — so a 1y chart does not re-download 1y every poll tick.
- Initial paint and scroll-back still use full `loadCandles` / `loadMoreCandles`.
- Diffing via shared `streamDiff.ts`; short trailing poll pages that end before the chart last bar emit no snapshot wipe. When the provider remaps the forming tip (old timestamp disappears, newer tip appears), emit `replace-latest` instead of `append` so the chart does not keep duplicate identical bars.
- No server connection beyond normal REST.

### Server-proxied SSE (opt-in)

- Browser opens `EventSource` to `/api/stream/candles` or `/api/stream/quotes`.
- Server runs `createCandleStreamSession` / `createQuoteStreamSession`.
- **Quote sessions:** when TWS is configured, `createTwsQuoteStreamSession` subscribes to the sidecar SSE stream and falls back to throttled HTTP snapshots on disconnect. When IBKR is configured (and TWS is not), `createIbkrSmdQuoteStreamSession` subscribes to IBKR WebSocket `smd` for live ticks and falls back to throttled batch HTTP snapshots on disconnect. Otherwise the session polls `MarketDataService` internally.
- Credentials, provider routing, and cache policy stay server-side.

Enable chart transport with:

```bash
NEXT_PUBLIC_STREAM_TRANSPORT=server-proxied
```

Enable watchlist live quotes (independent of chart transport):

```bash
NEXT_PUBLIC_WATCHLIST_STREAM=1
```

Or pass explicitly:

```ts
createApiChartDataFeed({
  streamTransport: createServerProxiedStreamTransport,
});
```

## Fallback Rules

1. **Transport mode**: `polling` unless `NEXT_PUBLIC_STREAM_TRANSPORT=server-proxied` or options override.
2. **Provider routing** (unchanged): TWS/IBKR when configured → Yahoo fallback for equities; Massive/TWS/IBKR for options; warnings in `meta`. REST candle/quote responses also carry trust metadata (`meta.usage`, `meta.readiness`) from `marketData/trust/enrichResponseMeta.ts` — display/analysis fallbacks are labeled `display-only` and are not trading-safe.
3. **SSE unavailable** (SSR/tests): server-proxied transport emits non-recoverable error; chart keeps last REST snapshot.
4. **Stream failures**: After 3 consecutive poll failures, emit `stale` (client polling and server SSE sessions).
5. **Unchanged successful polls**: When a poll returns the same candle series, emit `refresh` so `useChartDataFeed` advances `lastUpdateAt` and clears transport stale/error without replacing candles.

## Display freshness

Chart overlay stale badges and Data Health chart rows share one delivery-age policy via `isChartMetaDisplayFresh()` / `chartDeliveryAgeMs()` in `src/lib/marketData/trust/dataTrust.ts`. Display freshness uses **delivery time** (`ChartDataMeta.lastUpdateAt` / `receivedAt`), not bar `asOf`. Provider/cache `stale` flags remain for diagnostics.

## TWS display connection preference

`createApiChartDataFeed` reads `edge:marketData:connectionId` via `readDataConnectionPreference()` and attaches optional `connectionId` (`ib-paper` \| `ib-live`) on REST `loadCandles` (`/api/candles`) and `loadQuotes` (`/api/quotes`). Watchlist SSE/REST in `MarketDataProvider` threads the same preference on `/api/quotes` and `/api/stream/quotes`. Non-TWS providers ignore the field; order-account trading quotes stay on the order environment (see `src/lib/marketData/ARCHITECTURE.md`).

## Client SWR cache

`useChartDataFeed` keeps a session memo in `chartClientCache.ts` (in-memory plus `sessionStorage` under `edge:chart-cache:v1:`) so re-opening or hard-reloading a recently viewed chart paints cached candles immediately while a background REST fetch refreshes them.

| Behavior | Detail |
|----------|--------|
| Key | `symbol\|exchange\|interval\|range\|sessionMode` via `buildChartClientCacheKey` |
| Bounds | 20 entries (LRU by `asOf`), 5 min max age; persisted in `sessionStorage` for hard reload |
| First paint | Cached entry → `loading: false`, `refreshing: true`, `stale: true` |
| Refresh | Always fetches in background; merges fresh right edge with cached/prepended left history on success |
| `loadMore` | Prepends older pages into the same cache key via `mergeCandlesPrepend`; empty page sets `hasMore: false` |
| `reloadKey` bump | Bypasses cache paint (force fresh load); full replace on success without merging prior prepended history |
| Errors | If cached paint occurred, candles stay visible with `stale: true` |

History pagination (`loadMoreCandles`) requests **500 bars** per page by default (`HISTORY_FETCH_BAR_COUNT` in `@edge/chart-core`). `@edge/chart-react` prefetches older pages with a 50% visible-window lookahead, one background page after initial paint, and at most one queued follow-up while a fetch is in flight.

Initial `loadCandles` and prepended `loadMore` pages share one cache entry under the same key. Stream subscription still starts after the background fetch completes (unchanged). Stream tip updates remain React-only (not written to cache on every tick).

## Memory retention contract (Phase 0)

Full track: [Memory Efficiency Roadmap](../../../docs/roadmaps/memory-efficiency-roadmap.md). Baselines: [docs/perf/memory-baseline-latest.json](../../../docs/perf/memory-baseline-latest.json).

| Knob | Frozen default | Notes |
|------|----------------|-------|
| `RESIDENT_BAR_SOFT_MAX` | **5_000** | Phase 1 **shipped** — trims oldest bars after merge/prefetch when exceeded; preserve live tip |
| History page size | **500** (`HISTORY_FETCH_BAR_COUNT`) | Unchanged; do not prefetch past soft max once Phase 1 ships |
| Inactive cell `live` | **`false`** on non-primary chart tiles | Primary Desk tile: all visible cells stream live; identical tuples share one transport |
| Inactive cell engine | **Unmounted** only on resource-gated surfaces (research board off-focus, explicit `mountChartEngine={false}`) | Desk `ChartGrid` passes `mountChartEngine` for every visible cell; `InactiveChartSurface` remains for gated callers; flush viewport/drawings to `CellConfig` before genuine teardown |
| sessionStorage gate | skip when `candles.length > 2_000` or payload ≳ **2 MB** | Phase 3 **shipped** — memory cache still works |
| Cache entry LRU | 20 entries / 5 min | Entry-count bounded; resident trim + immutable shared refs |

**Clone rule (Phase 3 shipped):** `readChartClientCache` returns shared frozen `Candle[]` refs (no deep clone on hit). `writeChartClientCache` freezes trimmed series at the store boundary; feed merge/tip helpers allocate new arrays before write.

**Logout (Phase 1 + 8 shipped):** `clearChartClientCache()` and `clearHeikinAshiCache()` run with `clearEphemeralMarketDataCaches()` on session identity reset.

**Lazy tiles (Phase 8 shipped):** `SurfaceHost` dynamically imports Journal / Screener / Scripts / Copilot / Alerts tile surfaces; chart tile stays static. Screener + Copilot sidebar panels are also code-split.

Server-side byte/LRU budgets for `DataCache` / `HotStore` are documented in [marketData/ARCHITECTURE.md](../marketData/ARCHITECTURE.md) memory contract.

**General client TTL (Phase 1):** Search, fundamentals, overlays, and market context reuse `ClientTtlCache` via `getOrFetchClientTtl` / per-loader cache in `apiChartDataFeed.ts`. Candles remain on `chartClientCache.ts` only — see [marketData/ARCHITECTURE.md](../marketData/ARCHITECTURE.md) client cache section.

`postCandles` / `postQuotes` coalesce identical in-flight REST requests via `coalesceInFlight.ts`. Loads with an explicit `AbortSignal` bypass coalesce so symbol/range changes can cancel stale fetches.

## Key Files

| File | Role |
|------|------|
| `streamTransport.ts` | Transport interface + mode resolution |
| `pollingStreamTransport.ts` | Default client polling |
| `serverProxiedStreamTransport.ts` | EventSource client |
| `streamDiff.ts` | Shared candle diff → stream events |
| `apiChartDataFeed.ts` | ChartDataFeed wiring |
| `coalesceInFlight.ts` | In-flight dedupe for identical candle/quote POSTs |
| `chartClientCache.ts` | Session SWR memo for `useChartDataFeed` |
| `useChartDataFeed.ts` | React hook: cache paint + background refresh + stream subscription |
| `sharedCandleStreamRegistry.ts` | Ref-counted fan-out for identical live candle stream tuples |
| `src/lib/marketData/stream/` | Server SSE sessions + IBKR smd quote adapter |
| `src/app/components/watchlist/useWatchlistQuoteStream.ts` | Watchlist SSE client (`/api/stream/quotes`) |
| `src/app/api/stream/*/route.ts` | SSE endpoints |

## Verification

```bash
npm test -- --run src/lib/chartDataFeed/
npm test -- --run src/lib/marketData/stream/
npm test -- --run src/app/api/stream/
```
