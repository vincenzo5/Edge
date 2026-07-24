# Connections Domain

Product vocabulary for **broker Connections** and **market-data provider preferences**. Phase 0 froze contracts; Phase 1 adds Settings UI (Connections + Market data read-only status) without waterfall or vault changes.

**Track:** [Connections & Providers Roadmap](../../../docs/roadmaps/connections-providers-roadmap.md)

## Ownership

| Concept | Module | Phase |
|---------|--------|-------|
| Product `Connection` / `ConnectionKind` | `src/lib/connections/` | 0 (this) |
| Runtime IB Gateway wiring | `src/lib/trading/connectionRegistry.ts` | Shipped |
| TWS display connection pref | `src/lib/marketData/dataConnectionPreference.ts` | Shipped |
| Provider waterfall prefs | `DataProviderPreference` here → store in Phase 2 | 2 |
| Durable user connections | Postgres `connections` + `/api/me/connections` | 4 |

**Rule:** `SEED_CONNECTIONS` and `ConnectionSchema` describe product identity. `listIbConnections()` and the sidecar remain the runtime source of truth for ports/clientIds. Durable `connections` rows (Phase 4) store user-scoped display metadata and last-known status — live socket health still comes from `/api/market-data/health`.

## Platform data policy (Phase 4)

1. **Edge platform default** — Yahoo, FMP, Massive, FRED, SEC via server `ConfigSource` (env today; optional vault Phase 6). Most users never manage vendor keys.
2. **Broker-sourced** — TWS/IBKR when entitled and connected; `trading_decision` readiness stays broker-backed only.
3. **BYO (power users)** — optional server vault keys in Phase 6; never in `userPreferences`, localStorage, or connection `metadata`.

Selection prefs (`edge:marketData:connectionId`, trading env/account) reference connection **ids**; the connection catalog is `/api/me/connections` with `SEED_CONNECTIONS` fallback when Postgres is absent.

## AuthKind (Phase 4)

| AuthKind | Meaning | Phase |
|----------|---------|-------|
| `local_gateway` | Self-hosted IB Gateway + sidecar (today's seeds) | 4 shipped |
| `oauth` | Hosted broker OAuth (stub enum only) | 5+ |
| `api_token_vault` | Server vault token (stub enum only) | 5–6 |

## Durable connections (Phase 4)

| Layer | Module / route |
|-------|----------------|
| Schema | `connections` table (`0027_connections.sql`) — composite PK `(user_id, id)` |
| Repository | `connectionsRepository.ts` — `ensureSeeded`, list/get/patch/disconnect |
| API | `GET/PATCH /api/me/connections/[id]`; `POST …/reconnect`, `POST …/disconnect` |
| Client | `useConnectionsList`, `connectionsClient` patch/reconnect/disconnect |
| UI | `ConnectionsSettingsSection`, `MarketDataConnectionMenu` |

**Seed:** first `GET /api/me/connections` upserts missing rows from `SEED_CONNECTIONS` + `listIbConnections()` host/port into non-secret `metadata`. **Reconnect** delegates to existing TWS recover; **disconnect** is soft (status only — does not kill shared sidecar).

## Types

### `Connection`

User-facing broker/environment identity for Settings and header pickers.

- `id` — stable string (`ib-paper`, `ib-live`, future broker ids)
- `kind` — hosting model (`ib_gateway_sidecar` in Phase 0)
- `broker` — `TradingBroker` (`ib` | `stub`)
- `environment` — `paper` | `live`
- `displayName` — Settings / list label
- `status` — `unknown` | `configured` | `connected` | `degraded` | `disconnected`
- `metadata` — optional non-secret host/port only

### `ConnectionKind` (Phase 0)

| Kind | Meaning |
|------|---------|
| `ib_gateway_sidecar` | Local IB Gateway + TWS sidecar (paper/live ports) |

Future kinds (`oauth`, `api_token_vault`) land in Phase 4+ — not in Phase 0 schema.

### `DataProviderPreference` (Phase 2 shipped)

Persisted order/disable among **configured** display-data providers:

```ts
{ orderedProviders: DataProviderId[]; disabledProviders: DataProviderId[] }
```

| Layer | Module / key |
|-------|----------------|
| Client storage | `edge:marketData:providerPreference:v1` (`dataProviderPreference.ts`) |
| User prefs sync | `userPreferencesSnapshot.dataProviderPreference` |
| API request body | `providerPreference` on `/api/candles`, `/api/quotes`, quote stream query |
| Service | `MarketDataReadOptions.providerPreference` → `resolveReadWaterfall()` |

**Not** the same as `ProviderPreferences` in `marketData/router/dataRouter.ts` — static domain defaults only.

**Trust:** Display preference order must never weaken `trading_decision` readiness. Pre-trade paths pass `respectProviderPreference: false` + `trustUsage: "trading_decision"`. User disable of `tws`/`ibkr` is ignored on brokerage/trading paths.

**Cache:** Preference writes clear client chart cache + server HotStore display namespaces (`invalidateHotDisplayDataCaches`).

## Seed mapping (today)

| id | kind | environment | displayName |
|----|------|-------------|-------------|
| `ib-paper` | `ib_gateway_sidecar` | paper | IB Gateway (Paper) |
| `ib-live` | `ib_gateway_sidecar` | live | IB Gateway (Live) |

Exported as `SEED_CONNECTIONS` from `seedConnections.ts`, reusing `IB_*_CONNECTION_ID` from `connectionRegistry`.

## Settings information architecture (frozen)

**Application settings** (`AppSettingsShell`) — Phase 1 shipped:

1. **Appearance** — palette (shipped)
2. **Defaults** — timezone (shipped)
3. **Connections** — IB paper/live list + live status from `/api/market-data/health`, chart data pref, account aliases, TWS reconnect (Phase 1)
4. **Market data** — read-only provider table + display preference order/disable (Phase 2 shipped); BYO keys masked (Phase 6)

Settings fetches health via `useSettingsMarketDataHealth` when the slide-over opens — it does **not** require chart `DataHealthProvider` (home shell has no chart health context).

Header **Data** and **Account** chips remain shortcuts into the same preference/alias stores (not a second source of truth after Phase 4).

## Phase 5 — hosted IB OAuth (Path A, chosen 2026-07-24)

**MVP:** User clicks **Connect IB** in Settings → IB OAuth in browser → Edge stores tokens server-side → connection row with `authKind: oauth`.

| Keep | Add in Phase 5 |
|------|----------------|
| `ib_gateway_sidecar` + `local_gateway` for self-host | OAuth connection kind + IB OAuth adapter |
| Phase 4 durable rows + `/api/me/connections` | Connect / Disconnect UI; token vault (server-only) |
| Platform market data default | Trading + trust on OAuth connection accounts |

Paths **B** (second broker) and **C** (Gateway wizard only) are deferred. See [Connections & Providers Roadmap](../../../docs/roadmaps/connections-providers-roadmap.md) § Phase 5.

## Phase 1 non-goals (Phases 5–6)

- No API key entry or BYO vendor vault UI (Phase 6)
- No second-broker Connect affordance (Path B deferred)
- ~~No OAuth or enabled **Connect broker** button~~ — **Phase 5 Path A** adds hosted IB OAuth Connect
- ~~No `ConfigSource` migration~~ — **Phase 3 shipped** (env-only `ConfigSource`; vault in Phase 6)

## Phase 1 UI modules

| Module | Role |
|--------|------|
| `ConnectionsSettingsSection.tsx` | IB connections list, data pref, aliases, TWS recover |
| `MarketDataSettingsSection.tsx` | Provider status table + display preference reorder/disable |
| `useSettingsMarketDataHealth.ts` | Fetch `/api/market-data/health` when settings open |

## Related docs

- [Market Data Architecture](../marketData/ARCHITECTURE.md) — provider adapters, trust, display vs trading
- [Trading Architecture](../trading/ARCHITECTURE.md) — order routing, connection registry
- [Dual Connection Roadmap](../../../docs/roadmaps/dual-connection-roadmap.md) — paper/live data vs orders (UI → Connections Phase 1)
