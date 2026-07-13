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
| `stale` | Data no longer trustworthy |
| `error` | Recoverable or fatal stream error |
| `reconnect` | Reserved for future push reconnects |

### Polling (default)

- Client polls REST endpoints on interval-aware cadence (`pollStreamAdapter.ts`).
- Diffing via shared `streamDiff.ts`.
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
2. **Provider routing** (unchanged): IBKR when enabled → Yahoo/Tradier fallback; warnings in `meta`. REST candle/quote responses also carry trust metadata (`meta.usage`, `meta.readiness`) from `marketData/trust/enrichResponseMeta.ts` — display/analysis fallbacks are labeled `display-only` and are not trading-safe.
3. **SSE unavailable** (SSR/tests): server-proxied transport emits non-recoverable error; chart keeps last REST snapshot.
4. **Stream failures**: After 3 consecutive poll failures, emit `stale` (client polling and server SSE sessions).

## TWS display connection preference

`createApiChartDataFeed` reads `edge:marketData:connectionId` via `readDataConnectionPreference()` and attaches optional `connectionId` (`ib-paper` \| `ib-live`) on REST `loadCandles` (`/api/candles`) and `loadQuotes` (`/api/quotes`). Watchlist SSE/REST in `MarketDataProvider` threads the same preference on `/api/quotes` and `/api/stream/quotes`. Non-TWS providers ignore the field; order-account trading quotes stay on the order environment (see `src/lib/marketData/ARCHITECTURE.md`).

## Client SWR cache

`useChartDataFeed` keeps a session memo in `chartClientCache.ts` (in-memory plus `sessionStorage` under `edge:chart-cache:v1:`) so re-opening or hard-reloading a recently viewed chart paints cached candles immediately while a background REST fetch refreshes them.

| Behavior | Detail |
|----------|--------|
| Key | `symbol\|exchange\|interval\|range\|sessionMode` via `buildChartClientCacheKey` |
| Bounds | 20 entries (LRU by `asOf`), 5 min max age; persisted in `sessionStorage` for hard reload |
| First paint | Cached entry → `loading: false`, `refreshing: true`, `stale: true` |
| Refresh | Always fetches in background; full replace on success (never merge with cached series) |
| `reloadKey` bump | Bypasses cache (force fresh load); overwrites cache on success |
| Errors | If cached paint occurred, candles stay visible with `stale: true` |
| Out of scope | `loadMore` prepended history is not cached |

History pagination (`loadMoreCandles`) requests **500 bars** per page by default (`HISTORY_FETCH_BAR_COUNT` in `@edge/chart-core`). `@edge/chart-react` prefetches older pages with a 50% visible-window lookahead, one background page after initial paint, and at most one queued follow-up while a fetch is in flight.

Only the initial `loadCandles` snapshot is cached. Stream subscription still starts after the background fetch completes (unchanged).

## Key Files

| File | Role |
|------|------|
| `streamTransport.ts` | Transport interface + mode resolution |
| `pollingStreamTransport.ts` | Default client polling |
| `serverProxiedStreamTransport.ts` | EventSource client |
| `streamDiff.ts` | Shared candle diff → stream events |
| `apiChartDataFeed.ts` | ChartDataFeed wiring |
| `chartClientCache.ts` | Session SWR memo for `useChartDataFeed` |
| `useChartDataFeed.ts` | React hook: cache paint + background refresh + stream subscription |
| `src/lib/marketData/stream/` | Server SSE sessions + IBKR smd quote adapter |
| `src/app/components/watchlist/useWatchlistQuoteStream.ts` | Watchlist SSE client (`/api/stream/quotes`) |
| `src/app/api/stream/*/route.ts` | SSE endpoints |

## Verification

```bash
npm test -- --run src/lib/chartDataFeed/
npm test -- --run src/lib/marketData/stream/
npm test -- --run src/app/api/stream/
```
