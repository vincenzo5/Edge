# Connections & Providers Roadmap

Phased path from today’s **solo `.env` + IB-only** setup to a product-ready model where users **connect brokers** and Edge serves **platform market data** by default — without training Settings (or synced prefs) to hold raw API keys.

**Last updated:** 2026-07-23

**Status:** Phase 0 **Passing** (2026-07-23); Phase 1 **Passing** (2026-07-23); Phase 2 **Passing** (2026-07-23); Phase 3 **Passing** (2026-07-24); Phase 4 **Passing** (2026-07-24); Phase 5 **Pending**. Deferred Settings/prefs/displayName walks → [app-level-verification-wave-2-roadmap.md](./app-level-verification-wave-2-roadmap.md) Phase 3. Does not replace [Trading Execution](./trading-execution-roadmap.md), [Dual Connection](./dual-connection-roadmap.md), [Broker Ledger](./broker-ledger-roadmap.md), or [Data State Hardening](./data-state-hardening-roadmap.md) — it productizes *how users manage* those seams.

**Related:** [Market Data Architecture](../../src/lib/marketData/ARCHITECTURE.md), [Trading Architecture](../../src/lib/trading/ARCHITECTURE.md), [Connections Domain](../../src/lib/connections/ARCHITECTURE.md), [Journal Architecture](../../src/lib/journal/ARCHITECTURE.md), [Persistence Architecture](../../src/lib/persistence/ARCHITECTURE.md), [App-level Verification Wave 2](./app-level-verification-wave-2-roadmap.md), [Edge Roadmap](../ROADMAP.md), [Project Status](../PROJECT-STATUS.md), [Repository Constraints](../CONSTRAINTS.md).

---

## Intent Classification

- **Primary:** Feature — user-facing Connections / provider preference management and (later) multi-tenant connection auth.
- **Secondary:** Refactor — config source abstraction and connection-domain normalization over IB-hardcoded ids; Testing — preference/waterfall and vault boundaries need focused contracts.
- **Checklists applied:** `feature-planning-checklist.md`, `refactor-planning-checklist.md`, `testing-verification-checklist.md`, `harness-status-checklist.md`, `architecture-review-checklist.md`.
- **Assumptions:**
  - Product default: **Edge-provided market data**; brokers are **user Connections**, not “paste Massive key.”
  - Secrets never enter `userPreferences` sync or localStorage; vault is server-only when introduced.
  - Local IB Gateway + TWS sidecar remains a first-class **self-hosted / power-user** connection type.
  - Existing ports (`BrokerTradingPort`, market-data ports, capability registry, trust/`trading_decision` gates) are the plug points — do not invent a parallel stack.
  - WIP=1 — one phase Active; completion evidence before Passing.

---

## Checklist Review

- **Architecture review:** **Required** — self-review, **Passed for roadmap**. Implementation phases touch settings UI, market-data waterfall, trading registry, (later) persistence/secrets, and brokerage ingest. Each phase needs its own exit review.
- **Aligned:** Provider adapters + capability registry already exist; charts consume `ChartDataFeed` not vendor SDKs; trading has `BrokerTradingPort` + stub adapter; header already splits data connection vs order account; Data Health surfaces provider/broker status; trust policy blocks Yahoo for submit.
- **Missing:** Connection domain as a product object; Settings IA for Connections/Data; runtime preference store for waterfall; config-source interface beyond `process.env`; OAuth/vault; second real broker; multi-broker journal.
- **Misalignments:** `TradingBroker` is `"ib" | "stub"` only; brokerage/journal/Flex/margin are IB-shaped; Application settings are palette + timezone only; “configured” providers are env-gated with no user preference layer.
- **Risks:** Putting API keys in client prefs; letting display-data preference authorize trades; multi-broker UI before ledger normalization; SaaS OAuth conflicting with local Gateway mental model; preference changes poisoning cache keys or trust labels.
- **Recommendations:** Ship Connections UI + preference store before any secret vault; keep platform data as product default; require a real second adapter (or hosted IB auth) before “Add broker” is enabled; defer multi-broker journal until Connection ids normalize fills.

---

## Product goal

1. Users manage **Connections** (broker accounts / environments) and **data preferences** in Settings — not by editing `.env` for day-to-day use.
2. **Brokers** are connectable identities (paper/live, status, reconnect, scopes).
3. **Market data** is primarily **platform-owned**; broker quotes/candles may enrich when entitled; BYO vendor keys are optional power-user only.
4. Trading and brokerage-truth paths stay behind trust gates (`trading_decision` / broker-backed only).
5. Architecture stays adapter-based so adding a broker or data vendor is registry + adapter work, not a UI rewrite.

### Success criteria (track-level)

- Settings exposes **Connections** and **Market data** sections with status, preferences, and reconnect — without accepting raw secrets in v1–v2.
- `MarketDataService` waterfall order can be influenced by persisted preferences among **configured** providers.
- Adapters resolve configuration through a **ConfigSource** (env first; vault later) rather than scattered `process.env` reads growing unbounded.
- Product docs describe: platform data default, Connection model, self-hosted IB vs hosted OAuth paths.
- At least one path exists (design + stub or real) for a non-env “Connect broker” flow before claiming multi-user readiness.
- Secrets (when introduced) never appear in health JSON, userPreferences sync, or client storage.

---

## Product principles

1. **Connections ≠ API keys** — connecting a broker is identity + auth; enabling Massive is entitlement/config.
2. **Platform data by default** — most users never see FMP/Massive/Yahoo keys.
3. **Display never authorizes trades** — preference order cannot weaken `trading_decision` readiness.
4. **Configured ≠ healthy** — Settings and Data Health keep that distinction (already in data-state hardening).
5. **Self-host and SaaS can coexist** — local Gateway connection type vs hosted OAuth connection type.
6. **One broker deeply, then widen** — IB remains the reference implementation until Connection domain is stable.
7. **WIP=1** — do not start vault/OAuth while Connections UI + preference store lack evidence.

---

## Verified today vs gaps

| Capability | Status | Notes |
|------------|--------|-------|
| Provider adapters (Yahoo, TWS, IBKR, Massive, FMP, FRED, SEC) | **Shipped** | `src/lib/marketData/providers/*` |
| Capability registry + governance lint | **Shipped** | `state/capabilities.ts`, `lint:data-state-contracts` |
| Trust / readiness (display vs trading) | **Shipped** | `trust/`, pre-trade gates |
| Chart/watchlist data connection preference (IB paper/live) | **Shipped** | Header **Data** chip; `edge:marketData:connectionId` |
| Trading account picker + aliases | **Shipped** | Header Account menu |
| Data Health status + TWS recover | **Shipped** | Chart badge / menu |
| Application settings shell | **Partial** | Palette + timezone only (`AppSettingsShell`) |
| Runtime provider preference / disable | **Missing** | Waterfall largely hardcoded in `MarketDataService` |
| Connection domain (product object) | **Phase 0** | `src/lib/connections/` — `Connection`, `ConnectionKind`, `DataProviderPreference`, `SEED_CONNECTIONS` |
| ConfigSource / secret vault | **Phase 3** | `EnvConfigSource` default; vault in Phase 6 |
| Second real broker adapter | **Missing** | Stub only; backlog on trading roadmap |
| In-settings key entry | **Out of scope for early phases** | Vault phase only |
| Multi-broker journal consolidation | **Deferred** | Explicit out of scope on broker-ledger roadmap |

---

## Target architecture

```text
Settings
  Connections[]          Market data prefs         (optional BYO vault UI)
        |                        |
        v                        v
ConnectionRegistry        ProviderPreferenceStore
  broker + auth kind        order / disable among
  environment + status      configured providers
        |                        |
        v                        v
TradingService            MarketDataService
  BrokerTradingPort         ports + waterfall + trust
        |                        |
        v                        v
ConfigSource              ConfigSource
  env | vault | oauth       env | platform | optional BYO
```

**Hard rules:**

- UI and AI tools never import vendor clients; they use ports / API routes.
- Cache keys remain provider-namespaced.
- Brokerage truth and order submit stay on broker-backed connections only.

---

## Phases

### Phase 0 — Contracts + IA freeze

**Outcome:** Shared vocabulary and settings information architecture agreed before UI/code sprawl.

**Status:** **Passing** (2026-07-23)

| # | Deliverable | Status |
|---|-------------|--------|
| 0.1 | Define `Connection` / `ConnectionKind` / `DataProviderPreference` types (docs + thin Zod/TS in `src/lib/connections/` — no behavior change) | **Done** |
| 0.2 | Map today’s `ib-paper` / `ib-live` as Connection instances of kind `ib_gateway_sidecar` | **Done** — `SEED_CONNECTIONS` |
| 0.3 | Settings IA: Application settings gains **Connections** and **Market data** sections (documented; production UI in Phase 1) | **Done** — roadmap § Settings IA + `connections/ARCHITECTURE.md` |
| 0.4 | Explicit non-goals for Phases 1–3: no key entry, no OAuth, no second broker UI affordance enabled | **Done** |
| 0.5 | Cross-link trading “second broker” backlog and market-data “provider preference” backlog to this track | **Done** |

**Exit evidence:** **Focused:** `Test Files 2 passed (2)`, `Tests 9 passed (9)` (`src/lib/connections/`); **Architecture review:** self-review **Passed**; harness Phase 0 row **Passing**.

---

### Phase 1 — Settings: Connections console (IB-only, no secrets)

**Outcome:** Users manage what already exists from Settings — status, paper/live data preference, account aliases, reconnect — without opening `.env`.

**Status:** **Passing** (2026-07-23)

| # | Deliverable | Status |
|---|-------------|--------|
| 1.1 | Extend `AppSettingsShell` with **Connections** and **Market data** sections (Edge tokens/primitives) | **Done** |
| 1.2 | Connections: list IB paper/live from registry + health/status (reuse Data Health / sidecar probes; no new secrets) | **Done** |
| 1.3 | Relocate or deep-link existing controls: data connection preference, account aliases, Reconnect TWS | **Done** |
| 1.4 | Market data: read-only table of providers from capability registry + configured flags from `/api/market-data/health` | **Done** |
| 1.5 | Copy: “API keys stay in server environment for now”; point self-host operators at `.env.example` concepts | **Done** |
| 1.6 | Focused tests for settings sections; no change to waterfall behavior yet | **Done** |

**Exit evidence:** **Focused:** `Test Files 3 passed (3)`, `Tests 19 passed (19)` (`src/app/components/home/AppSettingsShell`, `connectionStatusLabel`, `AppTopHeader`); **Architecture review:** self-review **Passed**; **App-level:** settings gear → Connections + provider status walkthrough deferred.

---

### Phase 2 — Market-data preference store

**Outcome:** Among **configured** providers, users (or operators) can set preference order / disable fallbacks for display datasets — without breaking trust gates.

**Status:** **Passing** (2026-07-23)

| # | Deliverable | Status |
|---|-------------|--------|
| 2.1 | Persist `DataProviderPreference` (localStorage + `userPreferences` sync — order/disable only) | **Done** |
| 2.2 | `MarketDataService` reads preferences when building candle/quote/options waterfalls | **Done** |
| 2.3 | Settings UI: reorder / disable toggles; disable only applies when ≥1 alternate remains for that capability | **Done** |
| 2.4 | Trading-decision and brokerage-truth datasets **ignore** user disable of broker-backed sources (or surface blocked-with-reason) | **Done** |
| 2.5 | Cache invalidation / provenance: preference changes bump relevant HotStore namespaces or document TTL wait | **Done** |
| 2.6 | Tests: preference order changes `meta.source`; Yahoo cannot become trading-safe via prefs | **Done** |

**Exit evidence:** **Focused:** `Test Files 7 passed (7)`, `Tests 103 passed (103)` (`providerWaterfall`, `dataProviderPreference`, `marketDataService`, `userPreferences`, `MarketDataSettingsSection`, `apiChartDataFeed`, `workspaceStatePersistencePhase0`); **Architecture review:** self-review **Passed**; **App-level:** Settings preference → chart `meta.source` walkthrough deferred.

---

### Phase 3 — ConfigSource abstraction

**Outcome:** Adapters resolve “am I configured?” and credentials through one interface; env remains the only backend, but vault/OAuth can plug in later without rewriting adapters.

**Status:** **Passing** (2026-07-24)

| # | Deliverable | Status |
|---|-------------|--------|
| 3.1 | `ConfigSource` interface: `get(key) / isSet(key)` with `EnvConfigSource` default | **Done** |
| 3.2 | Migrate Massive/FMP/FRED/SEC/TWS/IBKR gate reads behind ConfigSource (incremental, tested) | **Done** |
| 3.3 | Document key catalog (which env vars map to which provider) in market-data architecture | **Done** |
| 3.4 | No UI for writing secrets yet; Settings continues to show configured booleans only | **Done** |
| 3.5 | Redaction unchanged: health/API never echo secret values | **Done** |

**Exit evidence:** **Focused:** `Test Files 34 passed (34)`, `Tests 139 passed (139)` (`src/lib/marketData/config`, `src/lib/marketData/providers`); **`lint:data-state-contracts`:** 24 pre-existing route-registration issues (unchanged); **Architecture review:** self-review **Passed**; behavior parity with env-only setup.

---

### Phase 4 — Product Connection model (multi-user ready shape)

**Outcome:** Connections become durable, user-scoped records (even if only one IB self-host connection exists in practice). Design hosted auth without implementing every broker.

**Status:** **Passing** (2026-07-24)

| # | Deliverable | Status |
|---|-------------|--------|
| 4.1 | Persistence schema for `connections` (userId, broker, kind, environment, status, displayName, non-secret metadata) | **Done** |
| 4.2 | Server APIs: list/get/patch connection metadata; actions: reconnect / disconnect (IB sidecar path first) | **Done** |
| 4.3 | AuthKind enum: `local_gateway` \| `oauth` \| `api_token_vault` (oauth/token unimplemented stubs ok) | **Done** |
| 4.4 | Platform data policy doc: Edge default vendors vs broker-sourced vs BYO | **Done** |
| 4.5 | Settings Connections UI binds to connection records; header pickers consume the same source | **Done** |
| 4.6 | Migration: seed connections from today’s `ib-paper` / `ib-live` env topology | **Done** |

**Exit evidence:** **Focused:** `Test Files 6 passed (6)`, `Tests 31 passed (31)`; **Architecture review:** self-review **Passed**; **App-level:** displayName reload walkthrough deferred.

---

### Phase 5 — First product-grade broker connect path

**Outcome:** A user can **Connect** IB through hosted OAuth — sign in in the browser, Edge stores tokens server-side, accounts/trades route through that connection.

**Status:** Pending — **MVP path chosen: (A) hosted IB OAuth** (2026-07-24)

**Phase 5 MVP decision (5.1): Path A — hosted IB OAuth**

| Item | Choice |
|------|--------|
| **Path** | **(A)** Hosted/OAuth IB — not (B) second broker, not (C) local Gateway wizard only |
| **User flow** | Settings → **Connect IB** → browser OAuth → connection row created/updated with `authKind: oauth` |
| **Secrets** | Refresh/access tokens in server vault only (extends Phase 3 `ConfigSource` / Phase 6 vault seam — not prefs or client storage) |
| **Coexistence** | `ib_gateway_sidecar` + `local_gateway` remains for self-host operators; OAuth is an additional connection kind, not a replacement |
| **Trading** | IB OAuth adapter + registry; paper/live accounts from entitled IB session; pre-trade trust on broker-backed quotes only |
| **Out of scope for 5.x** | Alpaca/second broker UI; BYO vendor keys; multi-broker journal merge (Phase 7) |

| # | Deliverable | Status |
|---|-------------|--------|
| 5.1 | Record MVP path **(A) hosted IB OAuth** in roadmap | **Done** |
| 5.2 | IB OAuth adapter + registry; extend `ConnectionKind` / trading registry as needed | Pending |
| 5.3 | Account list / positions / orders for OAuth connection (Trade + Account panel minimum) | Pending |
| 5.4 | Settings: **Connect IB** / **Disconnect** / status; local Gateway connections unchanged | Pending |
| 5.5 | Pre-trade readiness + trust: OAuth connection quotes authorize submit on that connection only | Pending |
| 5.6 | Journal: single-broker ok; document fill `account` / `connectionId` for OAuth rows | Pending |

**Exit evidence:** Focused trading + connection + OAuth-boundary tests; app-level: Connect IB → paper account visible → preview/submit with readiness green (or documented dry-run).

---

### Phase 6 — Optional BYO data-vendor vault (power users)

**Outcome:** Pro/self-host users may supply Massive/FMP (etc.) keys via secure server vault — never via synced prefs.

**Status:** Pending

| # | Deliverable |
|---|-------------|
| 6.1 | Server-side encrypted secret store (or OS keychain for solo) behind ConfigSource |
| 6.2 | Gated write API (session + `EDGE_API_KEY` / future auth); audit log of set/clear (no value logged) |
| 6.3 | Settings: masked “Key set” / Rotate / Clear per optional provider |
| 6.4 | Platform tenants: admin-managed keys remain default; BYO is opt-in entitlement |
| 6.5 | Hot-reload or documented restart policy when keys change |

**Exit evidence:** Focused vault tests; app-level: set key → provider configured → candles/options source flips; clear → degrades cleanly; secrets absent from health payload.

---

### Phase 7 — Multi-broker ledger (later)

**Outcome:** Journal and account history normalize across Connection ids.

**Status:** Deferred until Phase 5 is real for ≥2 brokers

| # | Deliverable |
|---|-------------|
| 7.1 | Normalize ingest cursors and fills on `connectionId` + broker |
| 7.2 | Journal filters by connection; no synthetic cross-broker merge without explicit UX |
| 7.3 | Data Health / Connections show per-broker sync age |

**Exit evidence:** Defined when Phase 5 has two live brokers; coordinate with [broker-ledger-roadmap.md](./broker-ledger-roadmap.md).

---

## Out of scope (this track)

- Replacing the custom chart engine or TradingView embeds
- Client-side storage of API keys or OAuth refresh tokens
- “Bring any REST URL” generic provider without an adapter
- Multi-broker consolidation before Phase 5 proof
- Changing trust rules to allow Yahoo/mixed for order submit
- Full broker marketplace / app-store UX

---

## Settings IA (target)

**Application settings** (`AppSettingsShell`):

1. **Appearance** — palette (existing); theme remains header control
2. **Defaults** — timezone (existing)
3. **Connections** — list, status, connect/disconnect, aliases, reconnect (Phase 1+)
4. **Market data** — provider status; preference order (Phase 2+); BYO keys masked (Phase 6)

Header **Data** / **Account** chips remain shortcuts into the same Connection preference model (not a second source of truth after Phase 4).

---

## Verification

```bash
# Phase 1+
npm test -- --run src/app/components/home/AppSettingsShell
npm test -- --run src/lib/marketData/health

# Phase 2+
npm test -- --run src/lib/marketData/service
npm test -- --run src/lib/userPreferences

# Phase 3+
npm test -- --run src/lib/marketData/providers
npm run lint:data-state-contracts

# Phase 4–5+
npm test -- --run src/lib/trading
npm test -- --run src/lib/brokerage
npm run build
```

**App-level (representative):**

- Settings → Connections shows paper/live status; Reconnect recovers TWS when degraded.
- Settings → Market data preference changes chart `meta.source` without breaking Data Health trust labels.
- Submit still blocked on Yahoo/mixed quotes after preference changes.
- (Phase 5+) Connect flow yields a tradeable paper account with readiness green.

---

## Harness

| Item | Value |
|------|-------|
| Active Work feature name | Connections & providers — Phase N (…) |
| WIP | 1 phase Active at a time |
| Task Contract | Required while any phase is Active or Pending for handoff |
| Completion evidence | Focused tests + phase exit criteria; quote command output in PROJECT-STATUS |

### Suggested activation order

1. Phase 0 (contracts) — low risk, unblocks UI
2. Phase 1 (Settings console) — immediate user value for solo
3. Phase 2 (preferences) — addresses ROADMAP “provider preference configuration” gap
4. Phase 3 (ConfigSource) — prerequisite for vault/OAuth
5. Phase 4 → 5 when productizing for other users
6. Phase 6 only if BYO keys are a real customer requirement
7. Phase 7 after two brokers exist

---

## Decision log

| Date | Decision |
|------|----------|
| 2026-07-23 | Productize via **Connections + platform data**, not “keys in Settings.” |
| 2026-07-23 | Local IB Gateway remains a supported Connection kind alongside future OAuth. |
| 2026-07-23 | Phase 5 MVP path (A/B/C) deferred until Phase 4 lands — record choice before coding 5.x. |
| 2026-07-24 | **Phase 5 MVP = Path A (hosted IB OAuth).** User Connect flow in Settings; tokens server-side only; `local_gateway` sidecar path retained for self-host. Paths B (second broker) and C (Gateway wizard only) deferred. |

---

## Related backlog pointers

- Trading execution: “Second real broker adapter” → this roadmap Phase 5
- Market data ROADMAP: “provider preference configuration” → Phase 2
- Broker ledger: “Multi-broker consolidation” → Phase 7
- Dual connection: paper/live data vs orders → feeds Phase 1 Connections UI
