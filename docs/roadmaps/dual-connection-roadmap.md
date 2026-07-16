# Dual Connection Roadmap — Live Data + Paper/Live Orders

Single roadmap for running **paper and live IB Gateway simultaneously**, decoupling **market-data connection** from **order-routing account**, and folding journal fills into real Gateway accounts (no synthetic journal-only picker rows).

**Last updated:** 2026-07-08

**Status:** Phase D abstraction hardening + Data Health split shipped (2026-07-12); Phase C data preference split shipped.

**Related:** [Trading Execution Roadmap](./trading-execution-roadmap.md) (Phases 0–5 shipped), [Market Data Architecture](../../src/lib/marketData/ARCHITECTURE.md), [Trading Architecture](../../src/lib/trading/ARCHITECTURE.md), [Edge Roadmap](../ROADMAP.md).

---

## Product Goal

Let Edge:

1. Run **paper (4002) and live (4001) Gateways at the same time** (Docker preferred).
2. Keep **chart/watchlist market data** on a stable preference (default: **live**) while the user switches **order account** between paper and live.
3. Show only **real Gateway accounts** in the header picker — fold journal history by fill `account` into those ids.
4. Preserve provider-neutral market-data abstraction so future vendors plug in without touching order code.

---

## Verified Today vs Gaps

| Capability | Status | Notes |
|------------|--------|-------|
| Order routing by `environment` / `connectionId` | **Shipped** | Phase 5 registry + adapters |
| Brokerage snapshot by `environment` | **Shipped** | `/api/brokerage/*?environment=` |
| Dual Gateway sockets in sidecar code | **Shipped** | `connectionId` on MD + account routes |
| Paper + live Gateways both listening | **Partial** | Docker compose shipped; app-level dual-port proof credential-gated |
| Chart/quotes on selectable connection | **Shipped** | Phase C — `edge:marketData:connectionId` |
| Independent data preference vs order account | **Shipped** | Phase C — header data chip vs order picker |
| Journal-only synthetic picker rows | **Removed** | Phase B — real Gateway ids only |
| Docker dual Gateway compose | **Shipped** | Phase A |
| Data Health paper/live/preference split | **Shipped** | Phase D — Connections section in health panel |

---

## Target Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ App UI                                                      │
│  dataConnectionPreference  (default: live)                  │
│  activeTradingAccount      (paper DUP… or live U…)          │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
                ▼                             ▼
┌───────────────────────────┐   ┌─────────────────────────────┐
│ MarketDataService         │   │ TradingService              │
│ ports + router + adapters │   │ BrokerTradingPort           │
│ preferred TWS connection  │   │ connectionRegistry          │
│ (pluggable vendors)       │   │ ib-paper / ib-live          │
└───────────────┬───────────┘   └──────────────┬──────────────┘
                │                              │
                ▼                              ▼
┌───────────────────────────┐   ┌─────────────────────────────┐
│ TWS sidecar               │   │ TWS sidecar trading routes  │
│ /quotes /candles /stream  │   │ /trading/* /account/*       │
│ ?connectionId=ib-live     │   │ ?connectionId=…             │
└───────────────┬───────────┘   └──────────────┬──────────────┘
                │                              │
                ▼                              ▼
         IB Gateway live :4001          paper :4002 / live :4001
         (Docker TRADING_MODE=both)
```

**Hard rule:** Display market-data providers remain swappable. Trading-decision and brokerage-truth paths stay broker-backed (no Yahoo for submit).

---

## Proposed Plan (Phases)

### Phase A — Dual Gateway infra (Docker)

**Outcome:** Paper and live API sockets available locally without manually flipping one Gateway login.

**Status:** Implemented — compose + scripts shipped; app-level verification requires local IB credentials + 2FA.

| # | Deliverable |
|---|-------------|
| A.1 | Add `docker-compose` (or `services/ib-gateway/`) based on a pinned `gnzsnz/ib-gateway` (or equivalent) image with `TRADING_MODE=both` |
| A.2 | Map host `127.0.0.1:4001` → live, `127.0.0.1:4002` → paper; document VNC/2FA flow |
| A.3 | Env template: live + paper credentials via `.env` / secrets — **never commit**; extend `.env.example` with placeholder keys only |
| A.4 | npm scripts: `ib:gateway:up` / `ib:gateway:down` (or document `docker compose` commands in this roadmap + AGENTS optional section) |
| A.5 | Restart Edge sidecar from current source; verify `/account/status?connectionId=ib-paper` → `DUP586813` and `ib-live` → `U25026894` (or real live managed id) |
| A.6 | Document desktop fallback: two Gateway processes if Docker is unavailable |

**Exit evidence:** Both ports listening; distinct managed account ids per connectionId; sidecar does not return paper payload for `ib-live`.

#### Phase A ops (shipped)

**Files:** `services/ib-gateway/docker-compose.yml`, `services/ib-gateway/.env.example`, root `.env.example` (placeholder block), `npm run ib:gateway:up|down`.

**Setup:**

1. Copy `services/ib-gateway/.env.example` → `services/ib-gateway/.env` (gitignored).
2. Set live credentials (`TWS_USERID`, `TWS_PASSWORD`) and paper credentials (`TWS_USERID_PAPER`, `TWS_PASSWORD_PAPER`). Both are **required** for `TRADING_MODE=both`; omitting paper credentials causes port 4002 to refuse connections.
3. Set `VNC_SERVER_PASSWORD` for the container VNC server.
4. Stop any desktop IB Gateway already bound to 4001/4002 before starting Docker.
5. `npm run ib:gateway:up`
6. Open VNC at `localhost:5900` and complete IB 2FA / login for both live and paper sessions inside the container.
7. Confirm listeners: `lsof -nP -iTCP:4001 -sTCP:LISTEN` and `lsof -nP -iTCP:4002 -sTCP:LISTEN`.
8. Restart sidecar from current source: `npm run tws:sidecar` (kill stale sidecar first if one is running).
9. Verify distinct accounts:

```bash
curl -s "http://127.0.0.1:8765/account/status?connectionId=ib-paper" | jq '.accountId, .managedAccounts'
curl -s "http://127.0.0.1:8765/account/status?connectionId=ib-live"  | jq '.accountId, .managedAccounts'
```

**Port map (localhost-only):**

| Host port | Container | Mode |
|-----------|-----------|------|
| 4001 | 4003 | Live TWS API |
| 4002 | 4004 | Paper TWS API |
| 5900 | 5900 | VNC (2FA / session UI) |

**Image:** `ghcr.io/gnzsnz/ib-gateway:stable` with `TRADING_MODE=both`, `EXISTING_SESSION_DETECTED_ACTION=primary`, `READ_ONLY_API=no`.

**Desktop fallback (no Docker):** Run two IB Gateway processes — live API on port 4001, paper API on port 4002. Disable Read-Only API on each when testing place/cancel. Edge sidecar env (`TWS_PAPER_PORT=4002`, `TWS_LIVE_PORT=4001`) is unchanged.

**Known failures:**

- Paper port refuses connection when `TWS_USERID_PAPER` / `TWS_PASSWORD_PAPER` are missing in `both` mode.
- Stale sidecar process may ignore `connectionId` — always restart after Gateway changes.
- Port conflict if desktop Gateway still listening on 4001/4002.

### Phase B — Sidecar + account discovery honesty

**Outcome:** Connection routing is trustworthy; picker shows real accounts only.

| # | Deliverable |
|---|-------------|
| B.1 | Confirm/fix sidecar `connectionId` routing on all `/account/*` and trading routes (reject unknown ids; never fall through to primary silently) |
| B.2 | `listAccounts` returns paper + live rows when both Gateways are up; omit offline connection without fabricating ids |
| B.3 | Remove journal-only synthetic accounts from header picker (`buildAccountPickerOptions` journal union) |
| B.4 | Optional: `TWS_LIVE_ACCOUNT_ID` / known-account seed **only** when live Gateway is down — labeled `(live, offline)` for journal filter, never `(journal)` |
| B.5 | Journal filter unchanged (match fill `account`); verify live fills fold under live picker selection |

**Exit evidence:** Picker shows `DUP586813 (paper)` + `U25026894 (live)` (or actual ids); no `(journal)` row; selecting live scopes journal to that account id.

### Phase C — Decouple data preference from order account

**Outcome:** Live chart/quote data can stay live while orders target paper (or vice versa).

| # | Deliverable |
|---|-------------|
| C.1 | Introduce persisted `dataConnectionPreference` (or `edge:marketData:connectionId`) separate from `activeTradingAccount` |
| C.2 | Default preference: **live** when live Gateway connected; else paper; else Yahoo waterfall (existing) |
| C.3 | Sidecar market-data routes (`/quotes`, `/candles`, streams, warmup) accept `connectionId`; Next.js TWS client passes preference |
| C.4 | Header UX: account picker = **order/journal/account-panel** target; subtle data-source chip or settings control for data preference (avoid two competing primary pickers) |
| C.5 | `AccountProvider`: brokerage stream/snapshot follows **active trading account** environment (not data preference) |
| C.6 | Trading readiness / pre-trade quotes follow **order** environment (safety); chart display may use data preference |
| C.7 | Live brokerage SSE parity (or documented poll) — do not leave live account panel silently stale without UX |

**Exit evidence:** With both Gateways up — chart quotes `meta` / sidecar show live connection while placing a paper order on `DUP586813`; switching order account does not tear down live quote stream preference.

### Phase D — Abstraction hardening (pluggable data sources)

**Status:** Shipped 2026-07-12 — TWS-only preference docs/tests; Data Health Connections section (paper, live, preference).

**Outcome:** Future vendors plug in without coupling to IB paper/live sockets.

| # | Deliverable |
|---|-------------|
| D.1 | Document “connection preference” as TWS-specific adapter input; non-IB providers ignore it |
| D.2 | Keep `EquityMarketDataPort` / router as the only chart entry; no UI imports of TWS client |
| D.3 | Ensure trust/`trading_decision` policy still blocks Yahoo (and other display-only sources) for submit readiness |
| D.4 | Data Health shows paper socket, live socket, and active data preference separately |

**Exit evidence:** Focused tests prove preference is threaded to TWS adapter only; router still falls back per existing waterfall; trading readiness rejects display-only sources.

---

## Verification Plan

| Tier | When | What |
|------|------|------|
| **Focused** | Each phase | Sidecar unit tests for connectionId; trading `listAccounts`; account picker options (no journal-only); market-data TWS client connection query; AccountProvider preference split tests |
| **Build** | After C or D | `npm run build` |
| **App-level** | After A+B, then C | Docker both up; picker paper/live; journal fold; chart stays on live data while paper order preview/submit; live order still requires `LIVE` |
| **Full** | Before merge of C/D | `npm run check` when shared market-data + trading wiring changes |

Completion evidence in harness must quote actual command output (test counts, build line, or measured app-level ids/ports).

---

## Explicit Exclusions

| Excluded | Reason |
|----------|--------|
| Postgres intent store / options / brackets | Separate backlog; WIP=1 |
| Client Portal Web API as dual-session substitute | TWS socket path remains execution + primary live data |
| Rewriting MarketDataService plugin system | Ports/router already sufficient |
| Remapping historical fill account ids | Data already correct; discovery was wrong |
| Auto-login without user 2FA | IB requires interactive auth |

---

## Next Session Entry Point

1. ~~Start Phase A — Docker compose for `TRADING_MODE=both`, map 4001/4002, document secrets.~~ **Phase A infra shipped** — run local A.5 verification (credentials + 2FA).
2. Phase B — sidecar honesty + remove journal-only picker rows.
3. Phase C — data preference split (live chart data while paper orders).
