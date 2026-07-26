# IBKR Hosted OAuth Roadmap

Standalone track for **browser “Connect IB”** via Interactive Brokers’ **hosted Web API OAuth** (third-party / institutional path) — not local Gateway, and not a phase of [Connections & Providers](./connections-providers-roadmap.md).

**Last updated:** 2026-07-25

**Status:** Phase 0 **Pending** (feasibility + IB onboarding). Implementation phases gated on IB credentials / approval. Does not replace [Connections & Providers](./connections-providers-roadmap.md) (local Gateway Connections UI), [Trading Execution](./trading-execution-roadmap.md) (TWS sidecar execution today), or [Dual Connection](./dual-connection-roadmap.md).

**Related:** [Connections Domain](../../src/lib/connections/ARCHITECTURE.md), [Trading Architecture](../../src/lib/trading/ARCHITECTURE.md), [Market Data Architecture](../../src/lib/marketData/ARCHITECTURE.md), [Edge Roadmap](../ROADMAP.md), [Project Status](../PROJECT-STATUS.md).

**Source of former scope:** Connections & Providers Phase 5 Path A (chosen 2026-07-24) — **extracted to this track** on 2026-07-25 so vendor OAuth is not mixed with solo/self-host Connections work.

---

## Intent Classification

- **Primary:** Feature — hosted IB connect + Web API trading adapter for multi-user / SaaS-shaped productize.
- **Secondary:** Refactor — extend Connection kind / trading registry beyond `ib_gateway_sidecar`; Testing — OAuth boundary + vault + trust contracts.
- **Checklists applied:** `feature-planning-checklist.md`, `refactor-planning-checklist.md`, `testing-verification-checklist.md`, `harness-status-checklist.md`, `architecture-review-checklist.md`.
- **Assumptions:**
  - Retail IBKR Pro clients are **not** the primary audience for this track; they use local Gateway (already shipped).
  - Hosted OAuth targets **third-party vendor** (other clients authorize Edge) and/or **first-party institutional** Self Service credentials.
  - Tokens stay server-side only; never in `userPreferences`, localStorage, or connection `metadata`.
  - Local `ib_gateway_sidecar` + TWS sidecar remain supported forever; this track adds a parallel auth kind.
  - WIP=1 — do not activate implementation phases until Phase 0 exit (IB path confirmed or explicitly dry-run).

---

## Checklist Review

- **Architecture review:** **Required** — self-review per phase; touches Connections persistence, trading ports, brokerage snapshot, trust gates, and secret storage.
- **Aligned:** Durable `connections` + `/api/me/connections` (Connections Phase 4); `AuthKind` includes `oauth` stub; `BrokerTradingPort` + registry plug points; ConfigSource seam for vault later.
- **Missing:** IB consumer keys / Compliance approval; `ConnectionKind` for OAuth; Web API trading adapter; token vault; Connect UI; trust source for OAuth quotes.
- **Misalignments:** [Trading Execution](./trading-execution-roadmap.md) still lists Client Portal / Web API **execution** as excluded (TWS sidecar only) — this track **lifts that exclusion for OAuth connections only** when Phase 2+ starts; update trading docs at that gate.
- **Risks:** Retail-only accounts cannot obtain OAuth; third-party onboarding slow/rejected for personal tools; dual stacks (sidecar vs Web API) drift; secrets leak into health/prefs.
- **Recommendations:** Complete Phase 0 before any adapter code; keep Connections track on local Gateway polish; treat dry-run shell as optional only after Phase 0 records “no credentials yet.”

---

## Product goal

1. A user (or Edge tenant) can **Connect IB** in Settings via browser OAuth against IBKR Web API.
2. Edge stores access/refresh (or live session) material **server-side only**.
3. Accounts, positions, orders, and submit route through an **OAuth `BrokerTradingPort`**, with pre-trade trust scoped to that connection.
4. Self-host Gateway connections remain unchanged and first-class.

### Success criteria (track-level)

- Phase 0 records which IB path applies (third-party / first-party / not available) and how Edge contacted IB.
- When credentials exist: Connect → connection row `authKind: oauth` → paper/live accounts visible → preview/submit readiness green (or documented dry-run with mock vault).
- Secrets never appear in health JSON, prefs sync, or client storage.
- Local Gateway path regressions: none.

---

## Feasibility (frozen 2026-07-25)

| Audience | IB-supported auth today | Fit for Edge |
|----------|-------------------------|--------------|
| **Retail / personal** (own account on own machine) | Client Portal Gateway or TWS/IB Gateway — **not** public browser OAuth | Use [Connections](./connections-providers-roadmap.md) + existing sidecar — **out of scope here** |
| **Organization / first-party** (firm’s own accounts) | Web API OAuth 1.0a; OAuth 2.0 beta; Self Service Portal credentials | In scope if Edge operator has institutional access |
| **Third-party vendor** (Edge trades unaffiliated IB clients) | OAuth **1.0a only** after Compliance + Legal | In scope for multi-user “Connect IB” product |

**Official entry points:**

- Docs: [Trading Web API](https://www.interactivebrokers.com/campus/ibkr-api-page/web-api-trading/), [OAuth 1.0a](https://www.interactivebrokers.com/campus/ibkr-api-page/oauth-1-0a-extended/)
- Third-party onboarding: email **`webapionboarding@interactivebrokers.com`** + questionnaire; Compliance → Legal agreement → RSA public keys + callback URL (~3–5 weeks IB-side after approval stages)
- Retail clarification: Client Services web ticket, category **API** (expect Gateway-only answer)

**Campus guidance (retail):** Web API for individuals is via **Client Portal Gateway**; OAuth 1.0a is expected to stay institutional; OAuth 2.0 for individuals has **no ETA**.

---

## Phases

### Phase 0 — Feasibility + IB onboarding

**Outcome:** Decide whether Edge pursues third-party, first-party, or parks the track; record contact + blocker.

**Status:** Pending

| # | Deliverable |
|---|-------------|
| 0.1 | Confirm product intent: multi-user Connect IB (third-party) vs org-only (first-party) vs park |
| 0.2 | Send appropriate IB contact (onboarding email or API ticket); archive reply / ticket id in harness |
| 0.3 | Record required artifacts: consumer key, RSA keys, callback URL(s), paper vs live, agreement status |
| 0.4 | If blocked/rejected: mark track **Parked** with reason; no Phase 1+ coding |
| 0.5 | If approved or dry-run chosen: write Task Contract + env catalog (`IBKR_OAUTH_*`) in `.env.example` (placeholders only) |

**Exit evidence:** Written path choice + IB contact evidence (or explicit Parked); architecture note in `connections/ARCHITECTURE.md` pointing here.

---

### Phase 1 — Contracts + token vault seam

**Outcome:** Durable OAuth connection shape and server-only token storage — no live IB calls required for unit tests.

**Status:** Pending (gate: Phase 0 not Parked)

| # | Deliverable |
|---|-------------|
| 1.1 | Extend `ConnectionKind` (e.g. `ib_web_api_oauth`) + seeds/tests; `authKind: oauth` |
| 1.2 | Server token store (encrypted at rest); never in connection `metadata` or prefs |
| 1.3 | OAuth start/callback route stubs with CSRF `state`; Zod-validated |
| 1.4 | Document key/token catalog; redaction in health/API |

**Exit evidence:** Focused connection + vault tests; no secrets in fixtures committed.

---

### Phase 2 — IB Web API OAuth adapter

**Outcome:** Real (or credential-gated) OAuth exchange + `BrokerTradingPort` over IBKR Web API.

**Status:** Pending

| # | Deliverable |
|---|-------------|
| 2.1 | OAuth 1.0a (or approved 2.0) request/authorize/access + live session token refresh |
| 2.2 | `BrokerTradingPort` adapter registered beside `IbTwsTradingAdapter` |
| 2.3 | Account list / positions / orders for OAuth connection (Trade + Account minimum) |
| 2.4 | Update trading ARCHITECTURE + lift Web API execution exclusion **for OAuth connections only** |

**Exit evidence:** Focused adapter tests (recorded fixtures ok); app-level Connect when credentials present, else documented dry-run.

---

### Phase 3 — Settings Connect / Disconnect

**Outcome:** Settings **Connect IB** / **Disconnect** / status for OAuth rows; Gateway rows unchanged.

**Status:** Pending

| # | Deliverable |
|---|-------------|
| 3.1 | Settings CTA starts OAuth; callback creates/updates connection |
| 3.2 | Disconnect clears server tokens + soft status |
| 3.3 | Header Account picker includes OAuth accounts when connected |

**Exit evidence:** Focused UI + API tests; app-level walkthrough when credentials exist.

---

### Phase 4 — Trust + journal documentation

**Outcome:** OAuth quotes authorize submit on that connection only; journal fill identity documented.

**Status:** Pending

| # | Deliverable |
|---|-------------|
| 4.1 | Pre-trade readiness: OAuth broker-backed quotes only for that connection |
| 4.2 | Display prefs cannot weaken OAuth trading trust |
| 4.3 | Journal: document fill `account` / `connectionId` for OAuth rows (schema optional until multi-broker) |

**Exit evidence:** Focused trust + trading tests; docs updated.

---

## Out of scope (this track)

- Replacing TWS sidecar for self-host operators
- Retail-only “fake OAuth” that scrapes Client Portal login
- Second non-IB broker (Alpaca etc.) — separate backlog
- BYO Massive/FMP vault — [Connections Phase 6](./connections-providers-roadmap.md)
- Multi-broker journal merge — Connections Phase 7 / [broker-ledger](./broker-ledger-roadmap.md)

---

## How to talk to Interactive Brokers

| Intent | Channel | What to say |
|--------|---------|-------------|
| Multi-user product (other IB clients authorize Edge) | `webapionboarding@interactivebrokers.com` | Request third-party onboarding questionnaire; describe Edge, APIs needed, callback URL, paper+live |
| Solo / retail “can I get OAuth?” | Client Services ticket → **API** | Ask whether Web API OAuth is available for retail IBKR Pro; expect Gateway-only |
| First-party org credentials | Self Service Portal + IB institutional contacts | Generate consumer materials per OAuth docs |

Do **not** use the vendor queue for personal Gateway questions.

---

## Verification

```bash
# Phase 1+
npm test -- --run src/lib/connections
npm test -- --run src/lib/trading

# Phase 2+
npm test -- --run src/lib/brokerage
npm run build
```

**App-level:** Settings → Connect IB → authorize → paper account in Account panel → preview/submit readiness green (or dry-run documented in harness).

---

## Harness

| Item | Value |
|------|-------|
| Active Work feature name | IBKR hosted OAuth — Phase N (…) |
| WIP | 1 phase Active at a time; do not steal WIP from Connections local-Gateway work without pause |
| Task Contract | Required when any phase Active or Pending for handoff |
| Completion evidence | Quote command output / IB ticket id in PROJECT-STATUS |

### Suggested activation order

1. Phase 0 (contact IB / park) — **do this before coding**
2. Phase 1 (contracts + vault) after credentials or explicit dry-run decision
3. Phases 2–4 when IB consumer is real

---

## Decision log

| Date | Decision |
|------|----------|
| 2026-07-24 | Connections track chose Path A (hosted IB OAuth) as former Phase 5 MVP. |
| 2026-07-25 | **Extract Path A to this standalone roadmap.** Connections no longer owns hosted OAuth. Retail/personal use stays on local Gateway via Connections. |
| 2026-07-25 | Feasibility: third-party OAuth needs IB Compliance; retail Web API is Gateway-only per IB Campus. |

---

## Related backlog pointers

- Connections & providers — durable Connection model, Settings, prefs, ConfigSource, BYO vault
- Trading execution — TWS sidecar remains default execution until this track ships an OAuth adapter
- Broker ledger — multi-broker consolidation after ≥2 live broker auth paths exist
