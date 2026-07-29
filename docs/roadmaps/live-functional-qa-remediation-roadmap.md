# Live Functional QA Remediation Roadmap

Phased closure of issues found during the 2026-07-28 live functional QA pass on local dev (`http://localhost:3003`). Source evidence: [live-functional-qa-2026-07-28.txt](../evidence/live-functional-qa-2026-07-28.txt).

**Last updated:** 2026-07-29

**Status:** Phase 0 **Passing** (2026-07-28); Phase 1 **Passing** (2026-07-28); Phase 2 **Passing** (2026-07-28); Phase 3 **Passing** (2026-07-29); Phase 4 **Passing** (2026-07-29); Phase 5 **Passing** (2026-07-29); Phases 6–8 **Pending**.

**Related:** [Project Status](../PROJECT-STATUS.md), [Testing Verification Checklist](../checklists/testing-verification-checklist.md), [Feature Roadmaps index](./README.md), [Market Data Architecture](../../src/lib/marketData/ARCHITECTURE.md), [Persistence Architecture](../../src/lib/persistence/ARCHITECTURE.md), [Research Architecture](../../src/lib/research/ARCHITECTURE.md), [Repository Constraints](../CONSTRAINTS.md).

---

## Intent Classification

- **Primary:** Bugfix — eliminate console errors, silent persistence failures, and noisy degradation paths surfaced by live QA.
- **Secondary:** Testing — re-verify fixed surfaces with app-level evidence (Wave 3).
- **Branch:** APP (secondary: AGENT, ENGINE, DATA, LIVE).
- **Architecture review:** **Required** per phase when touching shared state, persistence contracts, provider polling, or chart runtime.
- **Assumptions:**
  - No P0 blockers were found; core chart loop is usable with Yahoo fallback.
  - One phase **Active** at a time (WIP=1).
  - Env-blocked items (TWS not running, FMP account suspended) get product fixes for *behavior when down*, not ops tickets to restore credentials.
  - Fixes do not reopen closed Wave 1/2 verification tracks; Phase 8 is a targeted regression pass only.

---

## Product Goal

Restore a clean dev-session baseline: no React errors on Copilot/workspace happy paths, reliable remote layout sync, calm broker polling when sidecar is down, and visible provider warnings when screener/data paths degrade.

### Success criteria (track-level)

- Phases 1–7 each **Passing** with quoted focused and/or app-level evidence.
- Phase 8 re-run of the QA checklist shows **0 P1** console errors on documented happy paths.
- P2 items either fixed or explicitly **Skipped** with accepted-risk note in harness.

### Non-goals

- New Copilot features, screener presets, or trading execution scope.
- Restoring FMP billing or IB Gateway credentials (ops).
- Prod HTTPS / `edge.local` smoke (OPS side door).
- Automated Playwright e2e suite (defer unless Phase 8 gaps justify a follow-on track).

---

## Finding inventory (source QA)

| ID | Priority | Issue | Lane |
|----|----------|-------|------|
| QA-01 | P1 | `useResearchEvidence` uncached `getServerSnapshot` → infinite loop warning on Copilot | AGENT/APP |
| QA-02 | P1 | `StockApp` updates `ChartCell` during render | APP/ENGINE |
| QA-03 | P1 | Stale chart-workspace ID → repeated `PUT …/chart-workspaces/{id}` **404** | APP/DATA |
| QA-04 | P1 | Broker endpoints polled when sidecar down (`503`/`403` storms) | DATA/LIVE |
| QA-05 | P2 | FMP screener suspended → empty results without strong UI warning | DATA |
| QA-06 | P2 | Cold market-data context/warmup ~2–3s on first SPY load | DATA |
| QA-07 | P2 | Flaky `POST /api/me/scripts/import` (503 then 200) | APP |
| QA-08 | P2 | Multi-cell legend shows stale peer symbol (SPY) while active cell AAPL | ENGINE |
| QA-09 | P2 | Indicators + Data menus open together → brief chrome collapse | APP |
| QA-10 | P2 | Quote stream occasionally ~15s | DATA |
| QA-11 | P3 | Copilot empty hero not re-verified after New chat (thread auto-restore) | AGENT |
| QA-12 | P3 | TWS/Gateway not running — expected env gap | LIVE |
| QA-13 | P3 | Dev Next.js sourcemap overlay noise | OPS |

---

## Phasing

### Phase 0 — Inventory freeze

**Status:** **Passing** (2026-07-28)

**Outcome:** Single authoritative finding list + severity; this roadmap indexed.

| # | Deliverable |
|---|-------------|
| 0.1 | [live-functional-qa-2026-07-28.txt](../evidence/live-functional-qa-2026-07-28.txt) |
| 0.2 | Prioritized in-chat report (P0–P3) |
| 0.3 | This roadmap authored |

**Exit:** Docs only; no runtime change.

---

### Phase 1 — Copilot React stability (QA-01)

**Status:** **Passing** (2026-07-28)

**Outcome:** Copilot surfaces load without `getServerSnapshot` infinite-loop warnings.

| # | Work | Primary paths |
|---|------|---------------|
| 1.1 | Cache stable empty server snapshot in `useSyncExternalStore` | `src/app/components/research/useResearchEvidence.ts` |
| 1.2 | Regression test: hook mounts without snapshot identity churn | co-located test or `CopilotPanel.test.tsx` |
| 1.3 | App-level: `/copilot` + workspace Copilot sidebar — no Next.js issues overlay on load | browser |

**Gate — Phase 1 Passing:**

- **Focused:** test file passes with snapshot stability assertion.
- **App-level:** load `/copilot` and open workspace Copilot — dev console has no `getServerSnapshot should be cached` line.
- **Architecture review:** self-review **Passed** (contained hook fix).

**Closes:** QA-01.

---

### Phase 2 — Workspace render hygiene (QA-02)

**Status:** **Passing** (2026-07-28)

**Outcome:** No `setState during render` violation when workspace/chart loads or symbol changes.

| # | Work | Primary paths |
|---|------|---------------|
| 2.1 | Locate `StockApp` → `ChartCell` update during render | `src/app/components/StockApp.tsx`, chart grid/cell wiring |
| 2.2 | Move update to effect or event boundary; preserve behavior | same |
| 2.3 | Focused characterization test if feasible | `StockApp` / `ChartCell` tests |

**Gate — Phase 2 Passing:**

- **Focused:** targeted tests pass.
- **App-level:** symbol change SPY → AAPL — no `Cannot update a component (ChartCell) while rendering StockApp` in dev console.
- **Architecture review:** self-review **Passed** (state ownership unchanged; timing only).

**Closes:** QA-02.

---

### Phase 3 — Chart-workspace persistence recovery (QA-03)

**Status:** **Passing** (2026-07-29)

**Outcome:** Layout persist no longer hammers 404; stale local workspace IDs self-heal.

| # | Work | Primary paths |
|---|------|---------------|
| 3.1 | On `PUT /api/me/chart-workspaces/{id}` **404**, adopt/create via default or POST | `src/lib/persistence/client/chartWorkspaceClient.ts`, bootstrap callers |
| 3.2 | Prune stale workspace id from localStorage / tile binding | `src/lib/appWorkspace/storage.ts`, layout bootstrap |
| 3.3 | Focused API + client tests for 404 → recover path | `src/app/api/me/chart-workspaces/` tests, client tests |

**Gate — Phase 3 Passing:**

- **Focused:** 404 recovery tests pass.
- **App-level:** reload `/workspace`, edit symbol — network shows **200** on workspace persist (no repeated 404 for old id).
- **Architecture review:** self-review **Passed** (persistence contract: single-user adopt, no dual truth).

**Closes:** QA-03.

---

### Phase 4 — Broker poll calmness (QA-04)

**Status:** **Passing** (2026-07-29)

**Outcome:** When TWS sidecar circuit is open, UI stops spamming failing brokerage polls; live snapshot suppressed in paper-only dev.

| # | Work | Primary paths |
|---|------|---------------|
| 4.1 | Gate `/api/trading/accounts` and `/api/brokerage/snapshot` client polls on health circuit | account/brokerage hooks, `AccountProvider.tsx` |
| 4.2 | Respect dev paper-only lock — do not request live snapshot in dev | trading env validation, snapshot fetchers |
| 4.3 | Surface calm disconnected state (existing Reconnect) without error storms | header connection UX |

**Gate — Phase 4 Passing:**

- **Focused:** poll gating unit tests pass.
- **App-level:** sidecar down — ≤1 brokerage snapshot attempt per backoff window; no live **403** in dev session log.
- **Architecture review:** self-review **Passed** (DATA/LIVE seam: display ≠ order path unchanged).

**Closes:** QA-04. **Blocked** app-level subset if Gateway intentionally up — record separately.

---

### Phase 5 — Screener provider resilience (QA-05)

**Status:** **Passing** (2026-07-29)

**Outcome:** Screener runs with suspended FMP show explicit warning in UI, not silent empty grid.

| # | Work | Primary paths |
|---|------|---------------|
| 5.1 | Propagate `meta.warnings` from `/api/screener/run` to Screener tile | `src/lib/chartDataFeed/apiScreenerFeed.ts`, screener UI |
| 5.2 | Fallback or disable FMP-only presets when provider suspended | `src/lib/screener/`, provider registry |
| 5.3 | Focused test: warning surfaces when FMP returns 403 | screener route/UI tests |

**Gate — Phase 5 Passing:**

- **Focused:** warning propagation tests pass.
- **App-level:** run cheap preset — UI shows provider warning banner when FMP suspended.
- **Architecture review:** self-review **Passed**.

**Closes:** QA-05 (behavior when down; FMP account restore is ops).

---

### Phase 6 — Cold load + script import efficiency (QA-06, QA-07, QA-10)

**Status:** **Pending**

**Outcome:** First workspace load avoids redundant warmup; script import does not 503-retry on happy path.

| # | Work | Primary paths |
|---|------|---------------|
| 6.1 | Dedupe or coalesce `/api/market-data/warmup` + context on workspace boot | market data service, workspace bootstrap |
| 6.2 | Investigate script import 503 — fail loud once or queue retry with backoff | `/api/me/scripts/import`, import client |
| 6.3 | Optional: cap quote stream connect time or log slow path | quote stream client |

**Gate — Phase 6 Passing:**

- **Focused:** bootstrap/import tests pass.
- **App-level:** cold load — single warmup wave; no 503→200 double on script import in one navigation.
- **Perf note:** record context p50 in evidence (target: improve vs ~2.4s baseline, not a hard SLO).

**Closes:** QA-06, QA-07, QA-10 (partial — stream if still >10s, document accepted risk).

---

### Phase 7 — Chart grid + chrome polish (QA-08, QA-09)

**Status:** **Pending**

**Outcome:** Linked cells reflect symbol changes; overlapping menus do not collapse chrome.

| # | Work | Primary paths |
|---|------|---------------|
| 7.1 | When `linkSymbol` on, peer cell legends refresh with active symbol | `ChartGrid`, `ChartSyncProvider`, cell config propagation |
| 7.2 | Mutual exclusivity or z-index for Data vs Indicators popovers | chart chrome components |
| 7.3 | Focused sync test + app-level multi-cell check | chart-cell tests |

**Gate — Phase 7 Passing:**

- **Focused:** link-symbol propagation test passes.
- **App-level:** 2×2 layout, change symbol — no stale SPY legend on active AAPL cell; open Data then Indicators — no 5s chrome blanking.

**Closes:** QA-08, QA-09.

---

### Phase 8 — Regression verification (Wave 3)

**Status:** **Pending**

**Outcome:** Repeat live QA checklist; confirm P1 closed; file Wave 3 evidence.

| # | Item | Pass criteria |
|---|------|---------------|
| 8.1 | Route smoke | All primary routes 200, no white-screen |
| 8.2 | Trader loop | Symbol, indicator, reload persist |
| 8.3 | Copilot | No React errors; empty hero verified via New chat + `data-testid="copilot-empty-brand"` |
| 8.4 | Screener/journal/research | Tiles load; screener warning visible if FMP still down |
| 8.5 | Connections | Broker poll calm when sidecar down |

**Gate — Phase 8 Passing:**

- Evidence file: `docs/evidence/live-functional-qa-wave3-YYYY-MM-DD.txt`
- **0 open P1** from QA inventory; P2 either fixed or **Skipped** with reason.
- Harness Active Work row **Passing** with quoted app-level lines.

**Closes:** QA-11 (empty hero walk), track-level verification debt.

---

## Explicit deferrals

| Item | Reason |
|------|--------|
| QA-12 TWS not running | Ops/env — Phase 4 covers product behavior when down |
| QA-13 Dev sourcemap noise | Next.js dev-only; no prod impact |
| Playwright e2e | Out of scope unless Phase 8 finds repeat regressions |
| FMP account reactivation | External billing — not engineering |

---

## Execution order (recommended)

```text
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8
```

Phases 1–2 are independent and small — may ship back-to-back in one session. Phase 3 before Phase 7 (persistence affects multi-cell restore). Phase 4 can run parallel to Phase 5 if WIP=1 allows pausing one.

---

## Harness integration

Activate Active Work as `APP — Live functional QA remediation — Phase N` per phase. On track complete:

- Update this file **Status** line.
- Refresh [README.md](./README.md) table row.
- Refresh [ROADMAP.md](../ROADMAP.md) Near-Term line.
- Run `npm run roadmaps:status-check`.
