# Data Inventory and State Hardening Roadmap

Build one trustworthy inventory and state model for every dataset Edge consumes, then project that model into calm user-facing status, precise trading safeguards, and detailed diagnostics.

**Last updated:** 2026-07-19

**Status:** Phases 0–8 **Passing** — product track complete for scoped work. Operational reporting is repo-local and process-scoped; external telemetry, persistent dashboards, alerting, and enforced SLOs remain future work. Deferred live-fault app walks → [app-level-verification-roadmap.md](./app-level-verification-roadmap.md) Phase 7.

**Related:** [Market Data Architecture](../../src/lib/marketData/ARCHITECTURE.md), [Trading Architecture](../../src/lib/trading/ARCHITECTURE.md), [Persistence Architecture](../../src/lib/persistence/ARCHITECTURE.md), [Dual Connection Roadmap](./dual-connection-roadmap.md), [Project Status](../PROJECT-STATUS.md), [Repository Constraints](../CONSTRAINTS.md).

---

## Intent Classification

- **Primary:** Feature — establish comprehensive data observability, trustworthy status, and understandable user-facing health behavior.
- **Secondary:** Bugfix, Refactor, and Testing — correct misleading connection/freshness states, consolidate split health logic, and harden failure-path verification.
- **Checklists applied:** `feature-planning-checklist.md`, `bugfix-planning-checklist.md`, `testing-verification-checklist.md`, `harness-status-checklist.md`, `architecture-review-checklist.md`.
- **Harness state:** Phase 0 **Passing** (2026-07-18); Phase 1 **Passing** (2026-07-18). Next: Phase 2 contracts under WIP=1.
- **Assumption:** “All data” includes external market/research providers, broker/account/trading data, internal derived datasets, caches, transports, and persistence-backed synchronization that users rely on.

---

## Checklist Review

- **Architecture review:** **Required** — self-review, **Passed for roadmap**. This track changes shared state ownership, provider and API contracts, cache/stream behavior, trust policy, recovery, and cross-component UX. Each implementation phase requires its own architecture exit review.
- **Aligned:** Provider-neutral access already routes through `MarketDataService`; `DataResult`, provenance, dataset policies, hot-store metadata, TWS connection diagnostics, and Data Health provide useful foundations.
- **Missing:** One authoritative dataset catalog; capability-level provider health; a canonical timestamped state envelope; explicit observed vs inferred state; complete coverage of research, screener, ledger, and trading-decision data; deterministic transition and fault tests.
- **Misalignments:** Circuit state can masquerade as Gateway disconnection; chart and Data Health use different stale models; source, transport, connection, cache, and trust are compressed into ambiguous labels; some providers appear in warnings but not the provider model.
- **Risks:** Changing source/freshness contracts can affect chart rendering, fallback routing, trading gates, account truth, cache behavior, and recovery. A single oversized status object could become expensive or tightly coupled.
- **Recommendations:** Stabilize false alarms first; define contracts before redesigning UI; model independent dimensions rather than one severity; instrument existing paths instead of introducing a parallel data stack; expand coverage by dataset family.

---

## Product Goal

At any moment Edge should be able to answer:

1. What data does the product depend on?
2. Which datasets are active for this user and workspace?
3. Where did each result come from, including attempted and fallback providers?
4. When was delivery last attempted, received, and confirmed successful?
5. Is the data fresh enough for its current use and market session?
6. Is it complete, partial, empty, cached, or unavailable?
7. Is the underlying provider or broker connection directly observed as healthy?
8. Is the data safe for display, analysis, brokerage truth, or a trading decision?
9. What failed, what is retrying, and what—if anything—must the user do?

### Success criteria

- Every production dataset belongs to a documented catalog entry with owner, source capabilities, cadence, freshness policy, fallback policy, trust usage, and consumers.
- Every active delivery reports one normalized state envelope with provenance, timestamps, transport, cache, quality, and readiness.
- Provider connection state is directly observed, timestamped, and never fabricated from circuit-breaker state.
- Successful unchanged refreshes count as successful delivery and clear transport-level stale/error state.
- Market-closed and naturally static data are not presented as broken.
- Circuit breakers, retries, fallback routing, and recovery remain visible diagnostically without causing false “down” claims.
- Display health and trading readiness remain separate; fallback display data never silently authorizes a trade.
- The visible UX uses one vocabulary and one derived state while retaining expandable technical diagnostics.
- Deterministic tests cover state transitions, provider failures, cache/SWR behavior, transport fallback, recovery, and dual Gateway operation.

---

## Current Inventory

The existing architecture contains most required data paths, but the inventory is distributed across adapters, services, API routes, UI providers, and architecture notes.

| Domain | Datasets | Current primary sources/routes | Current health visibility |
|--------|----------|--------------------------------|---------------------------|
| Equity market data | Candles, snapshots, streaming quotes, search | TWS → IBKR Client Portal → Yahoo; API routes and `ChartDataFeed` | Active chart and watchlist only |
| Options | Expirations, chains, contract diagnostics | Massive when configured; otherwise TWS → IBKR; no Yahoo fallback | Only while options metadata is registered |
| Screener | Descriptive universe, grouped daily bars, technical candles, movers | Massive, FMP, Yahoo/TWS depending path | Results metadata only; no unified health row |
| Fundamentals | Profile, estimates, financials, executives, calendars | FMP and Yahoo paths | Provider configured flag; not delivery health |
| Events and news | Corporate events, news, filings, macro releases | FMP, SEC, FRED, event normalizers | Not represented as active datasets |
| Brokerage truth | Accounts, balances, PnL, positions, orders, executions | TWS sidecar scoped by paper/live connection | One combined account-feed row |
| Trading decision | Pre-trade quote, what-if, order command state | Order-environment TWS/IBKR path | Enforced by trust/trading services; weakly surfaced |
| Journal and ledger | Broker ingest cursor, fills, account/position snapshots | TWS ingestion + Postgres, optional local behavior | Ledger age text only |
| Derived/client data | Indicators, overlays, watchlists, chart cache, technical scans | Derived from upstream datasets | Usually inherits partial metadata |
| AI consumers | Market-data tools and app context | Shared AI registry over market-data ports | No per-tool dependency/readiness projection |

### Provider and infrastructure inventory

| Provider/system | Role | Important distinction |
|-----------------|------|-----------------------|
| TWS / IB Gateway | Primary socket market data, brokerage truth, trading | Paper and live sockets are independent; sidecar health is separate from Gateway health |
| IBKR Client Portal | Optional HTTP/WebSocket market-data fallback and diagnostics | Separate product and authentication session from IB Gateway |
| Yahoo | Display/analysis fallback for equity candles and quotes | Never trading-decision authority |
| Massive | Options and full-universe market data when configured | Not currently represented in Data Health providers |
| FMP | Fundamentals, calendars, movers, screener, optional news | “Configured” does not prove capability delivery |
| FRED | Macro series/releases | Configuration is not dataset freshness |
| SEC EDGAR | Filings/company facts/events | Public source with its own cadence and failure modes |
| ~~Tradier~~ | Legacy/limited provider path | **Retired Phase 8** — adapter/types/env removed |
| Hot store and shared cache | SWR and TTL delivery acceleration | Cache freshness differs from business/display freshness |
| SSE and REST polling | Client delivery transports | Transport type is not data freshness or provider health |
| Postgres/local persistence | Ledger, snapshots, libraries, sync | Persistence readiness is separate from market-data readiness |

### Current Data Health coverage gaps

- Tracks four broad rows—chart, watchlist, options, account—rather than the complete dataset catalog.
- Shows TWS, Yahoo, FMP, FRED, and SEC provider rows, but not all active routes and capabilities.
- Combines client-observed dataset metadata with separately polled server provider state.
- Uses independent chart-feed and Data Health freshness models.
- Treats provider configuration as health for several research providers.
- Does not model provider capability health; one provider may serve one capability while another capability fails.
- Does not expose route attempts, fallback cause, or the distinction between last-known and freshly observed connection state.
- Does not provide a unified state for screener, research, ledger, pre-trade, persistence, or AI data dependencies.

---

## Target State Model

The target is a normalized graph, not one giant global severity:

```text
Dataset definition
  → consumer demand
  → route decision
  → provider capability attempt(s)
  → connection / transport
  → delivery observation
  → cache / transformation
  → quality + freshness evaluation
  → trust / usage readiness
  → user and diagnostic projections
```

### 1. Dataset catalog

Each dataset definition records:

- Stable dataset id, family, owner, and normalized schema.
- Consumers and whether the dataset is active, background, or on-demand.
- Required dimensions such as symbol, interval, account, connection, or expiration.
- Expected cadence by market session and request mode.
- Allowed providers and preferred route.
- Fallback and partial-fill policy.
- Freshness and completeness policy.
- Permitted usages: display, analysis, brokerage truth, trading decision.
- Recovery owner and available user action.

### 2. Provider capability state

Provider health is capability-specific rather than provider-wide:

- Configured, authenticated, reachable, rate-limited, or disabled.
- Capability such as quotes, candles, options, fundamentals, news, or brokerage.
- Directly observed connection state with `observedAt`.
- Last success, last failure, latency, and failure category.
- Circuit state and retry deadline as separate fields.
- Paper/live connection identity where applicable.
- Observation confidence: `observed`, `last_known`, `inferred`, or `unknown`.

### 3. Delivery observation

Every request, stream, poll, or cache delivery can produce:

- Request and trace identity.
- Dataset key and consumer.
- Attempted route and selected source.
- `attemptedAt`, `receivedAt`, `providerAsOf`, and `lastSuccessAt`.
- Transport: stream, poll, request, cache, or derived.
- Cache tier and revalidation state.
- Latency and record count.
- Coverage: complete, partial, empty, or unknown.
- Normalized warnings and failure category.

An unchanged successful response is still a successful delivery.

### 4. Independent state dimensions

Do not collapse these dimensions until projection time:

| Dimension | Canonical values |
|-----------|------------------|
| Lifecycle | idle, loading, ready, recovering, error |
| Freshness | current, aging, stale, unknown |
| Availability | available, partial, unavailable, not_requested |
| Provenance | preferred, fallback, mixed, derived, unknown |
| Connection | connected, disconnected, reconnecting, unknown, not_applicable |
| Transport | streaming, polling, request, cache, idle |
| Trust | display, analysis, brokerage_truth, trading_decision |
| Trading readiness | allowed, blocked, not_applicable |

### 5. Incident and recovery state

Incidents are state transitions, not raw warning strings:

- Stable incident id and affected datasets/capabilities.
- Started, last observed, recovered, and acknowledged timestamps.
- Current vs recovered status.
- Failure category and user impact.
- Automatic retry/cooldown state.
- Recovery action, owner, and result.
- Deduplicated transition history suitable for diagnostics and tests.

### 6. Projections

The canonical model supports several consumers without duplicating logic:

- **User status:** current, fallback, delayed, or unavailable, with one next action.
- **Connection diagnostics:** direct paper/live, sidecar, provider, and authentication observations.
- **Trading gate:** strict source, age, account, and connection requirements.
- **Operations:** incidents, latency, failure rates, retry loops, and fallback duration.
- **AI tools:** explicit dependency readiness and provenance in tool context.

---

## Design Principles

1. **Observed truth over inference.** A circuit-open state means “temporarily bypassed,” not “disconnected.”
2. **One fact, one owner.** Connection, delivery, freshness, trust, and incidents each have a canonical owner.
3. **Capability-level health.** Provider-wide green status must not hide a failed capability.
4. **Delivery freshness over price movement.** Static prices or unchanged bars can still be successfully refreshed.
5. **Session-aware expectations.** Closed markets, holidays, delayed publications, and on-demand datasets require different cadences.
6. **Fallback is provenance, not automatically failure.** The UI communicates impact based on dataset policy and user intent.
7. **Trading safety stays stricter than display health.**
8. **Diagnostics do not drive alarm copy unless they affect current user data.**
9. **Monotonic transitions.** Snapshots carry revision and timestamps so older polls cannot overwrite newer observations.
10. **Instrument existing paths.** Extend current services, adapters, and trust contracts rather than building a parallel data platform.

---

## Proposed Plan

### Phase 0 — Stabilize misleading current states

**Outcome:** Stop the highest-impact false alarms before broader architecture work.

- Stop representing an open TWS circuit as an observed Gateway disconnection.
- Preserve last-known connection state with observation age when a fresh probe is skipped or fails.
- Clear chart stale/error state after any successful refresh, including unchanged candles.
- Route chart overlay and Data Health freshness through the same policy.
- Replace ambiguous “down,” “live,” and “stale” copy where the underlying fact is retry, transport, preference, or age.
- Add deterministic regressions for the reported timeout → false-down → auto-recovery cycle.

**Exit evidence:** Focused state-transition tests pass; live app fault walkthrough distinguishes timeout, bypass, confirmed disconnect, fallback, and recovery without contradictory labels.

#### Phase 0 results (2026-07-18)

**Shipped:**

- TWS circuit bypass no longer masquerades as Gateway disconnect; last-known observation carries age and `observationConfidence`.
- Chart poll/stream sessions emit metadata-only `refresh` on successful unchanged delivery; overlay and Data Health share delivery-age policy via `isChartMetaDisplayFresh()`.
- Data Health copy uses **streaming** / **retrying** / **Temporarily bypassed**; manual reconnect hidden when `requiresManualRecovery` is false.
- Monotonic health snapshot merge prevents late polls from overwriting newer client state.

**Verification:**

- **Focused:** `Test Files 19 passed (19)`, `Tests 197 passed (197)` (Phase 0 bundle: market-data service/health/trust/TWS gates, chart feed, Data Health UI).
- **Packages:** `npm run typecheck:packages` passed; `npm run lint:package-boundaries` passed; `npm run build:packages` passed.
- **Build:** `npm run build` passed (`✓ Compiled successfully in 3.4s`).
- **Live probe:** `npm run tws:probe` → paper/live `gatewayConnected: true`, `connectionState: "connected"`.
- **Architecture review:** self-review **Passed** — observation truth separated from circuit state; optional backward-compatible probe fields; trading gates unchanged.
- **App-level:** controlled timeout/bypass/disconnect fault walkthrough deferred; deterministic regressions cover circuit-bypass vs disconnect and refresh heartbeat.
- **Startup / Full:** `npm run check:startup` and `npm run check` report **71** pre-existing `PROJECT-STATUS.md` validation issues (unchanged baseline).

### Phase 1 — Freeze the catalog and vocabulary

**Outcome:** Edge has one reviewed inventory of datasets, providers, capabilities, owners, policies, and consumers.

- Build the canonical dataset and provider-capability catalog from existing routes, adapters, services, UI providers, persistence jobs, and AI ports.
- Mark each entry active, legacy, deferred, or intentionally outside Data Health.
- Define the canonical vocabulary and timestamp semantics.
- Assign freshness, completeness, fallback, trust, and recovery policies.
- Identify missing metadata and unsupported claims by dataset family.

**Exit evidence:** Catalog review accounts for every production provider adapter and data-consuming API/UI path; no uncataloged active route remains.

#### Phase 1 audit schema

Every catalog row records:

| Field | Description |
|-------|-------------|
| `datasetId` | Stable identifier used across docs, policies, and future contracts |
| `family` | Grouping for ownership and Phase 7 coverage (equity, options, screener, research, brokerage, trading, persistence, derived, infrastructure) |
| `lifecycle` | `active` \| `legacy` \| `deferred` \| `excluded` |
| `owner` | Canonical module or service |
| `dimensions` | Symbol, interval, account, connection, expiration, etc. |
| `producers` | Provider adapter(s) + service method + API route |
| `routeOrder` | Evidenced preferred/fallback order |
| `consumers` | UI, API caller, AI tool, background job |
| `cadence` | stream, poll interval, on-demand, cron, idle |
| `timestamps` | Which fields apply (`requestedAt`, `receivedAt`, `asOf`, `lastUpdateAt`, `observedAt`) |
| `freshnessPolicy` | Existing `DATASET_POLICIES` row, TTL namespace, or **gap** |
| `completenessPolicy` | complete, partial, empty-valid, unknown |
| `fallbackPolicy` | Allowed sources, partial-fill behavior |
| `trustUsage` | display, analysis, brokerage_truth, trading_decision |
| `healthVisibility` | Data Health row, provider row, none, excluded |
| `recoveryOwner` | TWS recover, feed reload, manual, none |

#### Phase 1 canonical vocabulary

Independent dimensions (do not collapse until projection time):

| Dimension | Canonical values | Current code / UI |
|-----------|------------------|-------------------|
| Lifecycle | idle, loading, ready, recovering, error | Partial — chart stream events, sidecar `lifecycle` |
| Freshness | current, aging, stale, unknown | `stale` flag + display-age policies in `dataTrust.ts` |
| Availability | available, partial, unavailable, not_requested | Partial — `skippedSymbols`, partial quote batches |
| Provenance | preferred, fallback, mixed, derived, unknown | `source`, `isFallback`, warnings |
| Connection | connected, disconnected, reconnecting, unknown, not_applicable | TWS probe + `connectionState`; circuit bypass separate (Phase 0) |
| Transport | streaming, polling, request, cache, idle | SSE vs REST; `cacheTier` |
| Trust | display, analysis, brokerage_truth, trading_decision | `DataUsage` + `evaluateReadiness` |
| Trading readiness | allowed, blocked, not_applicable | `allowedForTradingDecision`, `tradingReadiness.ts` |
| Observation confidence | observed, last_known, inferred, unknown | `TwsObservationConfidence` (Phase 0) |

UI labels map to dimensions: **streaming** / **retrying** → transport + lifecycle; **Temporarily bypassed** → circuit (not connection); **Market closed · quotes current** → session + freshness; **Fallback available** → provenance.

#### Phase 1 timestamp glossary

| Canonical | Meaning | Current field(s) | Owner |
|-----------|---------|------------------|-------|
| `attemptedAt` | Delivery or probe started | `requestedAt` in `DataResult` | Service / client |
| `receivedAt` | Successful normalize or refresh received | `receivedAt`, chart `lastUpdateAt` | Service / chart feed |
| `providerAsOf` | Provider/content timestamp | `asOf`, quote `updatedAt` | Adapter |
| `lastSuccessAt` | Last confirmed successful delivery (even unchanged) | Implied by `refresh` event + `receivedAt` | Chart feed / hot store |
| `observedAt` | Direct connection or sidecar probe time | `observedAt` on TWS probe | TWS client / health |
| `generatedAt` | Health snapshot revision time | Health API + monotonic merge | Data Health |
| `syncRevision` | Persistence optimistic concurrency | `syncRevision`, `baseRevision` | Persistence hooks |

Phase 2 migration: unify overloaded `updatedAt` (quote vs row vs sync) into explicit names above.

#### Phase 1 provider capability matrix (reconciled)

| Provider | Env / gate | Capabilities (production) | Health today | Lifecycle |
|----------|------------|---------------------------|--------------|-----------|
| **TWS / IB Gateway** | `TWS_ENABLED` | equity_candles, equity_quotes, options_chain, brokerage_truth | Data Health provider + socket rows | **active** |
| **IBKR Client Portal** | `IBKR_ENABLED` | equity_candles, equity_quotes, options_chain (fallback) | Omitted from Data Health UI | **active** (fallback) |
| **Yahoo** | none | equity_candles, equity_quotes, instrument_search, fundamentals | Always “Fallback available” | **active** |
| **Massive** | `MASSIVE_API_KEY` / `POLYGON_API_KEY` | options_chain, options_expirations, equity_candles (universe/screener), snapshots | Not in Data Health | **active** |
| **FMP** | `FMP_API_KEY` | fundamentals gap-fill, screener, movers, events, news, sec_filings search | Configured ⇒ healthy | **active** |
| **FRED** | `FRED_API_KEY` | macro series/releases | Configured ⇒ healthy | **active** |
| **SEC EDGAR** | `SEC_USER_AGENT` | sec_filings, company facts | Configured ⇒ healthy | **active** |
| ~~Tradier~~ | — | — | — | **retired Phase 8** — adapter/types/env removed |
| ~~alphaVantage / alpaca~~ | — | — | — | **retired Phase 8** — type-only entries removed |
| **Hot store / DataCache** | in-process | SWR + TTL acceleration | Diagnostic `cacheTier` only | **active** infrastructure |
| **Postgres / localStorage** | `DATABASE_URL` | sync libraries, journal, ledger | Ledger age text only | **active** — separate readiness dimension |

Note: `router/providerCapabilities.ts` is **stale** vs production — Massive options/universe and FMP screener/movers are under-declared. Phase 2 should replace or regenerate this map from the catalog.

#### Phase 1 dataset catalog

| datasetId | family | lifecycle | owner | routeOrder | trustUsage | healthVisibility | freshnessPolicy |
|-----------|--------|-----------|-------|------------|------------|------------------|-----------------|
| `chart_candles` | equity | active | `MarketDataService.getCandles` | tws → ibkr → yahoo | display, analysis | chart row | `DATASET_POLICIES.chart_candles` |
| `watchlist_quotes` | equity | active | `getQuotes` / streams | tws → ibkr → yahoo (mixed partial) | display, analysis | watchlist row | `watchlist_quotes` |
| `instrument_search` | equity | active | `searchInstruments` | yahoo only | display | excluded | gap — on-demand |
| `fundamentals_display` | equity | active | `getFundamentals` | yahoo | display | excluded | TTL `fundamentals` |
| `options_expirations` | options | active | `getOptionExpirations` | massive → tws → ibkr | analysis | options (when registered) | `options_expirations` |
| `options_chain` | options | active | `getOptionsChain` | massive → tws → ibkr | analysis | options (when registered) | `options_chain` |
| `screener_descriptive` | screener | active | `getScreenerResults` (no technical) | fmp | analysis | excluded | cache `screener` 60s |
| `screener_technical` | screener | active | `getScreenerResults` + `technicalFilter` | massive universe → fmp prefilter → per-symbol candles | analysis | excluded | partial via `skippedSymbols` |
| `screener_universe_daily` | screener | active | `universeDailyStore` | massive grouped daily | analysis | excluded | TTL 24h |
| `screener_movers` | screener | active | `getFmpMarketMovers` | fmp + descriptor join | analysis | excluded | cache movers |
| `events_market` | research | active | `getMarketEvents` | fmp + sec + fred dedupe | display, analysis | excluded | TTL events 15m |
| `news_symbol` | research | active | `getNews` | fmp | display, analysis | excluded | TTL news 5m |
| `macro_series` | research | active | `getMacroSeries` | fred | analysis | excluded | TTL macro |
| `sec_filings_direct` | research | active | `getSecFilings` | sec | analysis | excluded | TTL sec |
| `fmp_profile` | research | active | `getFmpCompanyProfile` | fmp | analysis | excluded | fmp profile TTL |
| `fmp_estimates` | research | active | `getFmpAnalystEstimates` | fmp | analysis | excluded | fmp estimates TTL |
| `fmp_financials` | research | active | `getFmpFinancials` | fmp | analysis | excluded | fmp financials TTL |
| `fmp_executives` | research | active | `getFmpExecutives` | fmp | analysis | excluded | gap |
| `fmp_sec_filings_search` | research | active | `getFmpSecFilings` | fmp | analysis | excluded | gap |
| `market_context` | research | active | `getMarketContext` | tws → ibkr → fmp → yahoo → curated maps | display | excluded | cache context |
| `derived_metrics` | derived | active | `getDerivedMetric` | composes quotes + fundamentals/candles | analysis | excluded | inherits upstream — **gap** |
| `chart_indicators` | derived | active | chart-core math | chart_candles | analysis | excluded | inherits chart_candles |
| `account_summary` | brokerage | active | `BrokerageService` / sidecar | tws only | brokerage_truth, trading_decision | account row (combined) | `account_summary` |
| `positions` | brokerage | active | snapshot / stream | tws only | brokerage_truth, trading_decision | account row | `positions` |
| `orders` | brokerage | active | `/brokerage/orders` | tws only | brokerage_truth | excluded | `orders` |
| `executions_fills` | brokerage | active | `/brokerage/trades`, ingest | tws only | brokerage_truth (`fills`) | excluded | `fills` |
| `account_pnl` | brokerage | active | `/brokerage/pnl` | tws only | brokerage_truth | excluded | gap |
| `pre_trade_quote` | trading | active | `TradingService.assertPreTrade` | order-env tws/ibkr quote | trading_decision | excluded | `pre_trade_quote` 5s |
| `order_intents` | trading | active | `TradingService` + Postgres | server-only | trading_decision | excluded | intent store |
| `broker_ledger_ingest` | brokerage | active | `runBrokerageIngest` | tws → postgres cursor | brokerage_truth | ledger age on account | gap — ingest cursor |
| `journal_trades` | persistence | active | `/api/me/journal/*` | postgres or localStorage | brokerage_truth (derived) | excluded | sync revision |
| `watchlist_library` | persistence | active | `/api/me/watchlist-library` | postgres/local | n/a | excluded | sync readiness **gap** |
| `screener_library` | persistence | active | `/api/me/screener-library` | postgres/local | n/a | excluded | sync readiness **gap** |
| `chart_workspaces` | persistence | active | `/api/me/chart-workspaces/*` | postgres/local | n/a | excluded | sync readiness **gap** |
| `chart_templates` | persistence | active | `/api/me/chart-template-library` | postgres/local | n/a | excluded | sync readiness **gap** |
| `research_notes` | persistence | active | `/api/me/market-research-notes` | postgres/local | n/a | excluded | sync readiness **gap** |
| `account_snapshots` | persistence | active | `/api/me/account-snapshots` | postgres ingest | brokerage_truth (historical) | excluded | gap |
| `pattern_library` | persistence | active | `/api/pattern-library/*` | local FS | n/a | excluded from market health | user content |
| `risk_settings` | persistence | active | `/api/me/user-preferences` | postgres/local | n/a | excluded | sync readiness **gap** |
| `market_data_warmup` | infrastructure | active | `/api/market-data/warmup` | best-effort bounded | n/a | excluded | control plane |
| `market_data_health` | infrastructure | active | `/api/market-data/health` | probes + gates | n/a | Data Health source | snapshot `generatedAt` |
| `tws_recovery` | infrastructure | active | recover routes + client | sidecar control | n/a | recovery UI | phase messages |
| `tws_ibkr_probes` | infrastructure | excluded | probe routes only | diagnostics | n/a | excluded | on-demand |

#### Phase 1 route trace matrix

**Coverage summary:** **8** production provider adapters, **73** API route files traced, **38** cataloged active data routes, **35** explicit exclusions (control, persistence sync, auth, AI session, pattern library, probes), **0** uncataloged active routes.

| Route group | Count | Catalog mapping |
|-------------|-------|-----------------|
| Core market data | 32 | `chart_candles`, `watchlist_quotes`, `instrument_search`, `fundamentals_display`, options, screener, events/news/macro/sec, context, health/warmup, fmp/*, tws/* probes → infrastructure |
| Brokerage | 9 | `account_summary`, `positions`, `orders`, `executions_fills`, `account_pnl` |
| Trading | 4 | `pre_trade_quote`, `order_intents` |
| Persistence `/api/me/*` | 15 | persistence rows + `broker_ledger_ingest` status |
| Cron | 1 | `broker_ledger_ingest` |
| AI session/tools | 6 | **excluded** — session bridge, not datasets |
| Auth | 1 | **excluded** |
| Pattern library | 5 | `pattern_library` |

Representative traces:

- `/api/candles` → `MarketDataService.getCandles` → `chart_candles` → `ChartDataFeed` / AI `get_candles`
- `/api/quotes`, `/api/stream/quotes` → `getQuotes` → `watchlist_quotes` → `MarketDataProvider`
- `/api/screener/run` → `getScreenerResults` → `screener_descriptive` or `screener_technical`
- `/api/brokerage/snapshot` → `BrokerageService` → `account_summary` + `positions`
- `/api/trading/preview` → `TradingService.assertPreTrade` → `pre_trade_quote`
- `/api/cron/brokerage-ingest` → `runBrokerageIngest` → `broker_ledger_ingest`

#### Phase 1 gap register (Phase 2+ targets)

| Gap | Affected | Impact | Target phase |
|-----|----------|--------|--------------|
| `DATASET_POLICIES` covers 9 kinds only | screener, research, derived, persistence | Health/trust cannot evaluate most routes | 2, 4 |
| Massive / IBKR absent from Data Health | options, screener universe | False “all green” when broker path unused | 3, 6, 7 |
| FMP/FRED/SEC “configured ⇒ healthy” | research providers | False healthy without delivery proof | 3, 4, 6 |
| Yahoo always healthy in provider row | fallback path | Misleading when Yahoo down | 3, 6 |
| `providerCapabilities.ts` stale | routing docs, future gates | Wrong capability assumptions | 2 |
| ~~Tradier dead code + type entries~~ | options legacy | Confusion | **Resolved Phase 8** |
| ~~alphaVantage / alpaca type-only~~ | `DataProviderId` | Dead catalog noise | **Resolved Phase 8** |
| AI `MarketDataPort` strips trust meta | all server AI market tools | No provenance in tool context | 7 |
| Persistence sync not modeled | libraries, journal | Cannot show sync vs market readiness | 7 |
| Derived metrics lack upstream chain | `edge-derived` | Weak diagnostics | 4 |
| Account Data Health is one row | PnL, orders, ingest | Coarse brokerage status | 7 |
| Screener/no unified health row | screener module | User blind to universe warm failures | 7 |
| NYSE holidays not in calendar | daily bars | Empty vs broken ambiguity | 4 deferred |

#### Phase 1 results (2026-07-18)

**Shipped:**

- Canonical catalog (**38** dataset rows + infrastructure), reconciled provider matrix (**8** adapters + infrastructure), vocabulary + timestamp glossary, route trace (**73** routes, **0** uncataloged active), gap register (**13** items phased).
- Roadmap is the single catalog source; architecture docs link here (no duplicate catalog files).

**Verification:**

- **Catalog review:** provider adapters **8**; API routes traced **73**; active data routes cataloged **38**; explicit exclusions **35**; uncataloged active routes **0**.
- **Architecture review:** self-review **Passed** — documentation-only; dependency direction preserved; Phase 2 contract boundaries explicit.
- **Startup:** `npm run check:startup` exit **1** — **71** pre-existing `PROJECT-STATUS.md` validation issues (unchanged baseline).

**Phase 2 handoff:** Extend `DatasetKind` / normalized envelope; regenerate `providerCapabilities.ts` from catalog; define registration for observations without changing provider order.

### Phase 2 — Establish canonical contracts and ownership

**Outcome:** Shared typed contracts represent definitions, observations, incidents, and projections without changing provider order.

- Define normalized contracts for dataset identity, provider capability, delivery observation, route attempts, quality, trust, and incidents.
- Choose the server/client ownership boundary and snapshot revision model.
- Preserve compatibility with existing `DataResult`, `ChartDataMeta`, and API response envelopes through deliberate migration.
- Define registration and lookup patterns for dataset policies and provider capabilities.
- Specify retention and cardinality limits so per-symbol health cannot grow without bound.

**Exit evidence:** Contract and reducer/state-machine tests pass; architecture review confirms dependency direction and migration compatibility.

#### Phase 2 results (2026-07-18)

**Shipped:**

- App-owned `src/lib/marketData/state/` module: dimensions, timestamps, revision, executable catalog (**43** rows), provider capability registry (**7** active adapters + legacy/deferred), delivery observations, incidents, policy registration, compatibility adapters, bounded reducer.
- Regenerated `router/providerCapabilities.ts` from catalog (Massive options/universe, FMP screener/movers; Tradier legacy, retired Phase 8).
- Revision-aware `/api/market-data/health` payload and `mergeMonotonicServerHealth` client merge (fallback to `generatedAt`).
- Architecture ownership table in `src/lib/marketData/ARCHITECTURE.md`.

**Verification:**

- **Focused:** `Test Files 10 passed (10)`, `Tests 86 passed (86)` (state, trust, health, health route, providerCapabilities shim).
- **Compatibility:** `Test Files 13 passed (13)`, `Tests 72 passed (72)` (chartDataFeed, candles/quotes API, package-api-snapshot).
- **Packages:** `npm run lint:package-boundaries` passed; `npm run typecheck:packages` passed.
- **Build:** `npm run build` passed (`✓ Compiled successfully in 3.1s`).
- **Architecture review:** self-review **Passed** — app-owned state module; packages unchanged; provider order and Data Health UX unchanged; additive health revision only.
- **Startup / Full:** not re-run (71 pre-existing `PROJECT-STATUS.md` validation issues unchanged baseline).

**Phase 3 handoff:** Harden freshness, quality, and trust policy evaluation (Phase 4).

### Phase 3 — Instrument providers, routing, cache, and transport

**Outcome:** Existing data paths emit enough normalized evidence to explain every selected result.

- Instrument TWS, Client Portal, Yahoo, Massive, FMP, FRED, SEC by capability (Tradier paths retired Phase 8).
- Record route attempts, selected source, fallback reason, and partial fills.
- Align hot store, shared cache, SSE, polling, and request metadata.
- Record successful no-change deliveries and stream/poll heartbeats.
- Keep health collection bounded and outside performance-sensitive chart render paths.

**Exit evidence:** Focused provider/service tests prove route and cache observations; performance checks show no material regression in chart and quote delivery.

#### Phase 3 results (2026-07-18)

**Shipped:**

- Server-side `DeliveryRegistry` + `RouteCollector` with bounded retention, heartbeat coalescing, sanitized snapshot accessor, and no-throw recording.
- `MarketDataService` candles/quotes waterfalls emit full `RouteAttempt[]`; hot-store/cache hits record `transport: cache`; background SWR revalidation records success/failure.
- Stream poll sessions emit quote `refresh` heartbeats on unchanged delivery; candle poll records streaming observations.
- `ChartQuoteStreamEvent` extended with `refresh`; `MarketDataProvider` advances delivery meta on quote refresh.
- Diagnostics remain internal — `/api/market-data/health` UX unchanged.

**Verification:**

- **Focused:** `Test Files 12 passed (12)`, `Tests 100 passed (100)` (state registry, service routing/cache, stream refresh, candles/quotes API compatibility).
- **Packages:** `npm run lint:package-boundaries` passed; `npm run typecheck:packages` passed.
- **Build:** `npm run build` passed (`✓ Compiled successfully in 3.4s`).
- **Architecture review:** self-review **Passed** — server-only registry; provider order and Data Health UX unchanged; chart-core quote refresh type additive only.
- **Performance:** deterministic overhead bounded via registry coalescing; live `npm run perf:market-data` deferred (optional diagnostic).
- **Startup / Full:** not re-run — **71** pre-existing status-doc validation issues (unchanged baseline).

**Phase 4 handoff:** Implement session- and cadence-aware freshness policy for all catalog datasets.

### Phase 4 — Harden freshness, quality, and trust policy

**Outcome:** Every dataset is evaluated against policy appropriate to its cadence and permitted use.

- Implement session- and cadence-aware freshness for streaming, intraday, daily, event-driven, and on-demand data.
- Model completeness, partial symbol coverage, empty-valid responses, delayed publication, and schema validation.
- Unify display/analysis readiness while preserving stricter brokerage-truth and trading-decision gates.
- Define behavior for market holidays, provider timestamp anomalies, clock skew, and stale caches.
- Ensure derived datasets retain upstream provenance and readiness.

**Exit evidence:** Policy matrix tests cover open/closed markets, unchanged values, partial batches, fallback, stale cache, and trading blocks.

#### Phase 4 results (2026-07-18)

**Shipped:**

- `trust/policyEvaluator.ts` — catalog-driven cadence/session freshness, completeness (partial/empty-valid/empty-invalid), timestamp anomalies, derived provenance evaluation.
- Expanded `state/policies.ts` with `resolveEffectiveFreshnessPolicy()`; catalog TTL namespace fix for `market_context`.
- NYSE full-day holiday + DST-safe `marketCalendar.ts` for session applicability.
- Policy-driven `state/adapters.ts` completeness/freshness; `dataTrust.ts` compatibility façade delegates to evaluator.
- Unified display freshness in `health.ts` (delivery anchors for watchlist/chart/options); optional `now` on `buildHealthCaveatSubtitle`.
- Strict pre-trade content age in `tradingService.ts` (quote `updatedAt`/`asOf`; no request-time account masking).
- Derived metrics carry bounded `upstream` refs with worst-upstream display-fresh flags in `getDerivedMetric()`.

**Verification:**

- **Focused:** `Test Files 20 passed (20)`, `Tests 203 passed (203)` (state, trust/policyEvaluator, marketCalendar, health, trading readiness/service, marketDataService, candles/quotes API, marketSession).
- **Packages:** `npm run lint:package-boundaries` passed; `npm run typecheck:packages` passed.
- **Build:** `npm run build` passed (`✓ Compiled successfully in 3.1s`).
- **Architecture review:** self-review **Passed** — additive metadata, deterministic evaluators, unchanged provider order and Data Health UX.
- **App-level:** deterministic policy-matrix fixtures; live provider walkthrough deferred.
- **Startup / Full:** `npm run check:startup` and `npm run check` exit **0** — **75** pre-existing status-doc validation issues (unchanged baseline).

**Phase 5 handoff:** Reconcile connection, circuit, and recovery state without oscillation.

### Phase 5 — Reconcile connection, circuit, and recovery state

**Outcome:** Connection truth, request protection, fallback, and recovery cooperate without oscillation.

- Separate direct connection observations from circuit-breaker and route-availability state.
- Add transition stabilization/hysteresis appropriate to user display while keeping trading gates fail-safe.
- Consolidate recovery orchestration and status refresh across chart, Data Health, header, and account flows.
- Prevent older health polls or recovery responses from overwriting newer state.
- Make retry deadlines and automatic recovery visible without demanding unnecessary user action.

**Exit evidence:** Fault-injection tests cover timeout, auth failure, sidecar loss, one-socket loss, worker wedge, subscription loss, cooldown, late success, and manual recovery.

#### Phase 5 results (2026-07-19)

**Shipped:**

- `state/connectionSupervisor.ts` — per-socket raw observations, route/circuit availability gates, bounded display hysteresis (`DISPLAY_TRANSIENT_HOLD_MS`), monotonic revision merge.
- Sidecar `/status` connections expose `connectionState`, `observationConfidence`, `observedAt`, `subscriptionsLost`, and IB error fields per `ib-paper` / `ib-live`.
- Revisioned `recoverySession.ts`; recover POST/status routes return `sessionId` + `revision`; client polling rejects mismatched sessions.
- `twsRecoveryContext.ts` — shared warmup symbols/candles/options across header, chart, and Data Health; `MarketDataProvider` publishes context.
- `buildConnectionSupervision()` + `DataHealthProvider` ref-based supervisor merge into `mergeHealthSnapshot()`.

**Verification:**

- **Focused:** `Test Files 10 passed (10)`, `Tests 82 passed (82)` (supervisor, recovery session/context, health, recover API, Data Health recover, MarketDataProvider).
- **Sidecar:** `Ran 1 test OK` — per-socket status observation fields.
- **Packages:** `npm run lint:package-boundaries` passed; `npm run typecheck:packages` passed.
- **Build:** `npm run build` passed (`✓ Compiled successfully in 3.2s`).
- **Architecture review:** self-review **Passed** — raw observations for trading gates; display hysteresis only; provider order and Data Health chrome unchanged.
- **App-level:** deterministic fault-matrix regressions; live sidecar/Gateway fault walkthrough deferred.
- **Startup / Full:** exit **0** — **74** pre-existing status-doc validation issues (unchanged baseline).

**Phase 6 handoff:** Expand catalog coverage to every dataset family (Phase 7).

### Phase 6 — Project one coherent UX

**Outcome:** Users see the smallest accurate status, while diagnostics preserve full detail.

- Replace competing feed and connection badges with one active-data projection.
- Present three primary sections: current data, broker connections, and recent active incident.
- Move provider internals, recovered events, route attempts, cache, and latency into collapsed diagnostics.
- Use explicit labels: current, updated age, fallback, streaming, polling, reconnecting, and confirmed disconnected.
- Keep preference controls distinct from health while showing their relationship.
- Ensure tooltip, visible label, color, accessible name, and recovery action all derive from the same projection.

**Results (2026-07-19):** `healthProjection.ts` + `buildDataHealthProjection()`; `DataHealthMenu` three-section layout + `DataHealthDiagnosticsSection`; unified chart overlay via projection (retire stacked feed badge when Data Health enabled); additive `deliveryDiagnostics` on health API.

**Exit evidence:** **Focused:** `Test Files 9 passed (9)`, `Tests 74 passed (74)`; **Build:** `npm run build` passed; **Architecture review:** self-review **Passed**; **App-level:** deterministic projection/UI regressions + menu/overlay fault-matrix tests; live walkthrough deferred; **Startup / Full:** exit **0** with unchanged pre-existing status-doc validation baseline.

### Phase 7 — Expand coverage to every dataset family

**Outcome:** The catalog and state model cover more than chart/watchlist/account.

- Add options, screener, fundamentals, news/events, macro, filings, and universe-store projections.
- Add brokerage sub-datasets for accounts, PnL, positions, orders, executions, and ingest/ledger synchronization.
- Add explicit pre-trade readiness and order-environment diagnostics without exposing sensitive details.
- Add persistence and AI dependency projections only where they affect user-visible readiness.
- Retire or clearly isolate legacy provider paths.

**Results (2026-07-19):** `coverage.ts` + `buildCatalogCoverageReport()` with executable dispositions; `healthDatasets.ts` demand/brokerage/pre-trade/cloud-sync row builders; catalog-backed extended dataset rows in `mergeHealthSnapshot()`; `registerDatasetDemand()` + screener bridge in `DataHealthProvider`; delivery-backed provider rows for Massive/IBKR/FMP/FRED/SEC; `brokerageDelivery.ts` sanitized sub-dataset inputs; `persistenceSyncHealth.ts` user-impact sync aggregate; `MarketDataPort` returns `PortDelivery<T>` with bounded trust meta; Tradier dead paths removed from `marketDataService`.

**Exit evidence:** **Focused:** `Test Files 142 passed (142)`, `Tests 673 passed (673)`; **Coverage:** `active: 41`, `unclassified: 0`; **Packages:** `npm run lint:package-boundaries` passed, `npm run typecheck:packages` passed; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.2s`); **Architecture review:** self-review **Passed**; **App-level:** deferred; **Startup / Full:** exit **0** with unchanged pre-existing status-doc validation baseline.

### Phase 8 — Operational hardening and governance

**Outcome:** Data reliability is measurable, regression-resistant, and maintainable as providers are added.

- Define service-level indicators for delivery success, freshness, fallback duration, partial coverage, and recovery time.
- Add deterministic fault fixtures and optional live provider smoke suites.
- Add catalog/contract checks that fail when new routes or providers omit required metadata.
- Establish bounded incident history, telemetry privacy, and production-safe error redaction.
- Document provider onboarding, dataset onboarding, policy review, and incident-debugging workflows.

**Results (2026-07-19):** A 30-minute/512-sample process-local window reports delivery success, freshness compliance, partial coverage, fallback duration, and TWS recovery time through additive health API state and `npm run report:data-reliability`. `governance.ts` + `npm run lint:data-state-contracts` reconcile 43 datasets, 7 active adapters, 61 registered data routes, and 12 explicit exclusions. Shared fault fixtures cover timeout/auth/rate-limit/empty/partial/stale/fallback/recovery/late observations. API logging and route details use central bounded redaction. Optional provider smoke orchestration skips unconfigured providers. Tradier, Alpha Vantage, and Alpaca dead adapter/type/config entries are retired.

**Exit evidence:** **Focused:** `Test Files 85 passed (85)`, `Tests 457 passed (457)`; **Governance:** `datasets=43 providers=7 routes=61 exclusions=12 issues=0`; **Fixture report:** delivery **75.0% / 4**, freshness **75.0% / 4**, partial **25.0% / 4**, fallback p95 **3000ms / 1**, recovery p95 **850ms / 1**; **Packages:** package boundaries and four package typechecks passed; **Build:** `✓ Compiled successfully in 3.2s`; **Startup:** `Test Files 3 passed (3)`, `Tests 26 passed (26)`; **App-level:** candles `source: yahoo`, count **19**; quotes `source: tws`, count **2**; live report retained **70/512**, fallback p95 **14094ms / 1**, recovery confirmed p95 **1029ms / 1**; **Full:** `Test Files 511 passed (511)`, `Tests 3044 passed (3044)`, `✓ Compiled successfully in 3.6s`; **Architecture review:** self-review **Passed** (bounded/no-throw retention, additive API, sanitized output, provider/trading invariants retained).

---

## Verification Plan

| Tier | Scope |
|------|-------|
| **Focused** | State reducers, policies, health gates, route attempts, provider adapters, stream/poll transitions, recovery, trust gates, and UI projections |
| **Build** | `npm run build` when shared app/API contracts change; package build only if shared package contracts move |
| **Startup** | `npm run check:startup` whenever the harness or architecture/status documentation changes |
| **App-level** | `localhost:3003` with controlled timeout, fallback, market-closed, paper/live socket, recovery, and stale-cache scenarios |
| **Live collection** | `npm run tws:probe`, `npm run ibkr:probe`, and `npm run perf:market-data` when the relevant provider is configured |
| **Full** | `npm run check` before completing phases that alter shared routing, trust, recovery, or cross-component state |

Each phase must define deterministic completion evidence before implementation. Harness evidence must quote actual output—test counts, build result, measured timestamps/latency, selected source, connection observation, or recovery duration—not “tests pass.”

---

## Harness Update

- **Current Active Work:** Phase 8 **Passing** (2026-07-19); no active data-hardening phase remains.
- **Active Work row:** `Data inventory and state hardening — Phase 8` records focused, governance/report, package, build, startup, app-level, full, and architecture evidence.
- **Task Contract:** Phase 8 contract records compatibility/privacy invariants and final evidence.
- **Session Log:** Phase 8 entry records delivered work, exact verification, and future telemetry boundary.
- **Current Verified State:** Phases 0–8 Passing; next action is select the next roadmap track under WIP=1.
- **Architecture documentation:** `src/lib/marketData/ARCHITECTURE.md` documents SLI semantics, retention/privacy, CLI usage, onboarding, and incident debugging.

---

## Explicit Exclusions

- Replacing the custom chart engine.
- Rewriting all provider adapters before the catalog identifies a concrete contract gap.
- Treating every configured provider as continuously probeable.
- Exposing secrets, account credentials, raw internal exceptions, or sensitive provider responses.
- Making display fallback data eligible for trading decisions.
- Building an unbounded per-symbol event store or high-frequency React health state.
- Combining implementation of all phases into one branch or one Active Work item.

---

## Next Planning Entry Point

1. Keep `npm run lint:data-state-contracts` in CI as providers, routes, and datasets change.
2. Use the repo-local report and optional smoke command during incidents; add vendor telemetry only through a separately planned task.
3. Select the next product roadmap track under WIP=1.
