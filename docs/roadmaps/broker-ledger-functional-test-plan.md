# Broker Ledger + Sync — Functional Test Plan

**Scope:** App-level proof for shipped Phases 0–4 (server fill ingest, cursors, snapshots, cron, client demotion, Data Health age).  
**Date:** 2026-07-16  
**Based on:** `docs/roadmaps/broker-ledger-roadmap.md`, `src/lib/brokerage/ingest/runBrokerageIngest.ts`, Task Contract in `docs/PROJECT-STATUS.md`  
**Audience:** One LLM agent session per scenario (WIP=1). Prefer API curls over browser; mock nothing in Tier B.

## Overview

Unit tests already cover ingest mapping, cron auth stubs, and JournalSyncProvider trigger wiring. This plan proves the **live stack**: Next + Postgres + TWS sidecar (+ optional Flex) end-to-end. Highest product risk is silent miss of portal fills when Journal UI is not mounted.

## Trust Boundary

**Verified by this plan:**

- Cron / session auth → `runBrokerageIngestAll` → Postgres cursors + journal fills
- Snapshot-route debounce trigger advances `lastIngestAt`
- Account snapshot API after connected sidecar
- Client Sync button / Data Health ledger age surface server state
- Idempotent re-ingest (`duplicates`, unique `execId`)

**Assumed correct (not tested here):**

- Sidecar IB protocol correctness (use `/status` connectivity only)
- Flex Web Service vendor availability beyond env-gated C1
- Journal trade-grouping UI presentation (only fill presence)
- 24/7 ingest when Next is down (explicitly out of scope)

## Preconditions (all tiers)

| Requirement | Check |
|-------------|-------|
| Postgres up + migrations 0006–0008 | `npm run dev` (or `npm run db:up && npm run db:migrate`) |
| Next on `:3003` | `curl -sS -o /dev/null -w '%{http_code}' http://localhost:3003/api/market-data/health` → `200` |
| `.env.local` | `DATABASE_URL`, `EDGE_AUTH_SECRET` set |
| Tier B only | Sidecar `:8765` + Gateway: `curl -sS http://localhost:8765/status` → `gatewayConnected:true` |
| Tier C only | `IB_FLEX_TOKEN` + `IB_FLEX_QUERY_ID` in `.env.local` |

**Auth notes:**

- Cron: `x-edge-cron-secret: $EDGE_CRON_SECRET` **or** session cookie **or** (dev) no secret + `DATABASE_URL` → `ensureDevAppUser()`.
- `/api/me/*`: cookie jar after `GET /api/auth/dev-session` (or any `withPersistenceAuth` bootstrap).

**Evidence rule:** Quote actual HTTP status + JSON fields (or UI text). One scenario → one harness / Session Log bullet. After each tier, run focused unit tests.

```bash
npm test -- --run src/lib/brokerage/ingest src/app/api/cron/brokerage-ingest src/app/components/journal/JournalSyncProvider.test.tsx
```

---

## Tier A — API oracles (no IB trade required)

### A1 — Cron auth + ingest results

**Contract:** Given Postgres + Next up, when POST `/api/cron/brokerage-ingest` with valid auth, then HTTP 200 and `results[]` with per-connection ingest fields.

**Steps:**

```bash
# Cookie jar (works with or without EDGE_CRON_SECRET)
curl -sS -c /tmp/edge-cookies.txt -b /tmp/edge-cookies.txt \
  http://localhost:3003/api/auth/dev-session >/dev/null

curl -sS -c /tmp/edge-cookies.txt -b /tmp/edge-cookies.txt \
  -X POST http://localhost:3003/api/cron/brokerage-ingest \
  -H 'Content-Type: application/json' | tee /tmp/a1-cron.json

# Optional if EDGE_CRON_SECRET set:
# curl -sS -X POST http://localhost:3003/api/cron/brokerage-ingest \
#   -H "x-edge-cron-secret: $EDGE_CRON_SECRET"
```

**Oracle / pass:**

- HTTP **200**
- Body has `results` array
- Each element includes `connectionId`, `added` (number), `duplicates` (number)
- Optional fields present: `environment`, `skipped`, `flexBackfilled`, `snapshotsCaptured`, `error`

**Fail:** 401 `unauthorized`, 503 `database_unavailable`, missing `results`, or non-numeric `added`/`duplicates`.

**Session size:** ~2 min.

---

### A2 — Ingest status cursors

**Contract:** Given A1 succeeded, when GET `/api/me/brokerage-ingest/status`, then `cursors[]` includes a recent `lastIngestAt`.

**Steps:**

```bash
curl -sS -c /tmp/edge-cookies.txt -b /tmp/edge-cookies.txt \
  http://localhost:3003/api/me/brokerage-ingest/status | tee /tmp/a2-status.json
```

**Oracle / pass:**

- HTTP **200**
- `cursors` is an array
- At least one cursor with non-null `lastIngestAt` ISO timestamp **after** A1 started (or equal to prior if ingest skipped with error recorded — note `lastIngestError`)

**Fail:** 401/503; empty cursors after successful A1 with sidecar connected and no error; malformed timestamps.

**Session size:** ~1 min (depends on A1).

---

### A3 — Account snapshots API

**Contract:** Given sidecar connected (preferred) and ingest ran, when GET `/api/me/account-snapshots?limit=5`, then response is a valid list (rows with equity fields **or** empty if summary tags absent).

**Steps:**

```bash
curl -sS http://localhost:8765/status | head -c 200   # prefer gatewayConnected:true
curl -sS -c /tmp/edge-cookies.txt -b /tmp/edge-cookies.txt \
  'http://localhost:3003/api/me/account-snapshots?limit=5' | tee /tmp/a3-snapshots.json
```

**Oracle / pass:**

- HTTP **200**
- Body `{ "snapshots": [...] }`
- If length > 0: each row has account identity + at least one of `netLiquidation` / cash / buying-power fields (names per schema)
- Empty array is **pass** only when sidecar summary lacks tags — record that in evidence

**Fail:** 401/503; non-array `snapshots`; rows missing account id when length > 0.

**Session size:** ~2 min.

---

### A4 — Postgres disabled → 503

**Contract:** Given process without `DATABASE_URL`, when POST cron ingest, then 503 `database_unavailable`.

**Steps (isolated — do not kill the main WIP stack):**

```bash
# One-shot next on alternate port with DATABASE_URL cleared
DATABASE_URL= EDGE_AUTH_SECRET="${EDGE_AUTH_SECRET:-dev-secret-for-a4}" \
  npx next dev -p 3013 &
sleep 5
curl -sS -w '\nHTTP %{http_code}\n' -X POST http://localhost:3013/api/cron/brokerage-ingest \
  | tee /tmp/a4-cron.json
# stop the 3013 process when done
```

**Oracle / pass:** HTTP **503** and JSON `error: "database_unavailable"` (and `results: []` if present).

**Fail:** 200 ingest, 401 without the database error, or crash.

**Session size:** ~5 min. **Skip** if port conflict / cannot spawn isolated server — mark **Blocked** with reason; do not unset `DATABASE_URL` on the primary `:3003` process mid-session.

---

## Tier B — Live IB (Gateway + sidecar required)

### B1 — Snapshot-route trigger advances cursor

**Contract:** Given Gateway connected, when GET brokerage snapshot then wait ≤30s, then status `lastIngestAt` advances (or stays equal only if ingest already ran within debounce and completed).

**Steps:**

```bash
BEFORE=$(curl -sS -b /tmp/edge-cookies.txt \
  http://localhost:3003/api/me/brokerage-ingest/status)
echo "$BEFORE" | tee /tmp/b1-before.json

curl -sS -b /tmp/edge-cookies.txt \
  'http://localhost:3003/api/brokerage/snapshot?environment=paper' \
  -o /tmp/b1-snapshot.json -w 'HTTP %{http_code}\n'

sleep 35

AFTER=$(curl -sS -b /tmp/edge-cookies.txt \
  http://localhost:3003/api/me/brokerage-ingest/status)
echo "$AFTER" | tee /tmp/b1-after.json
```

**Oracle / pass:** Snapshot HTTP 200 (or documented sidecar error); `lastIngestAt` for paper connection is ≥ before (strictly newer preferred after idle >30s).

**Fail:** Snapshot 5xx with no recovery; cursor never updates after 60s while sidecar healthy.

**Session size:** ~5 min.

---

### B2 — Portal / paper fill without Journal UI mounted

**Contract:** Given workspace open without Journal tile focused, when a fill lands at IB (portal or paper), within ≤30s the fill appears in ledger API (or Journal after open).

**Steps:**

1. Open `http://localhost:3003/workspace` with Chart/Screener only (no Journal tile).
2. Place a small paper fill (IBKR portal **or** Edge paper MKT/LMT that fills).
3. Wait ≤30s (do not open Journal sync UI).
4. Probe:

```bash
curl -sS -b /tmp/edge-cookies.txt \
  http://localhost:3003/api/me/journal/fills | tee /tmp/b2-fills.json
# Confirm new execId / symbol / time matches the trade
```

5. Optionally open Journal tile and confirm the same fill in UI.

**Oracle / pass:** New fill present in GET fills (or trades) with matching `execId` / symbol / side / qty; timestamp consistent with the trade.

**Fail / Blocked:** No fill at broker (after-hours LMT never filled) → **Blocked** with prerequisite; fill at broker but absent after 60s + manual cron → **Fail**.

**Session size:** ~15 min (RTH / fill-dependent).

---

### B3 — Journal Sync button triggers server ingest

**Contract:** Given Journal tile mounted, when user clicks Sync, then POST cron returns 200 and trades reload.

**Steps:**

1. Open workspace with Journal surface.
2. Click Sync in Journal header / empty state.
3. Observe network: `POST /api/cron/brokerage-ingest` → 200.
4. Or API-equivalent (same as client):

```bash
curl -sS -b /tmp/edge-cookies.txt -w '\nHTTP %{http_code}\n' \
  -X POST http://localhost:3003/api/cron/brokerage-ingest | tee /tmp/b3-sync.json
```

**Oracle / pass:** HTTP 200 + `results[]`; Journal list refreshes (no client fill upsert — only server trigger). Devtools must **not** show client POST of fill payloads to journal upsert routes for sync.

**Fail:** Sync 401/503; client still upserting fills on Sync.

**Session size:** ~5 min.

---

### B4 — Data Health shows ledger sync age

**Contract:** Given ingest has run (`lastIngestAt` set), when Data Health menu opens, account row includes `ledger sync Nm ago`.

**Steps:**

1. Ensure A1/A2 passed.
2. Open Data Health from app chrome.
3. Read account / connections section copy.

**Oracle / pass:** Visible text matching `ledger sync <n>m ago` (n ≥ 0).

**Fail:** Missing string after successful status API; wrong source (stale client-only sync).

**Session size:** ~3 min (browser).

---

### B5 — Idempotency on double cron

**Contract:** Given a prior ingest that added fills, when cron runs twice back-to-back, then second run reports `duplicates` covering prior adds and DB has unique `execId`s.

**Steps:**

```bash
curl -sS -b /tmp/edge-cookies.txt -X POST \
  http://localhost:3003/api/cron/brokerage-ingest | tee /tmp/b5-run1.json
curl -sS -b /tmp/edge-cookies.txt -X POST \
  http://localhost:3003/api/cron/brokerage-ingest | tee /tmp/b5-run2.json

# Optional SQL (docker exec into tv-ai-postgres):
# SELECT exec_id, COUNT(*) FROM journal_fills GROUP BY exec_id HAVING COUNT(*) > 1;
```

**Oracle / pass:**

- Both HTTP 200
- For each connection: run2 `duplicates` ≥ run1 `added` when the same execution window is re-read (or run2 `added: 0` with `duplicates` ≥ 0)
- No duplicate `execId` rows in DB

**Fail:** `added` keeps climbing for the same executions; duplicate `execId` in Postgres.

**Session size:** ~3 min.

---

## Tier C — Gap / Flex (optional)

### C1 — Flex gap backfill

**Contract:** Given Flex env configured and cursor stale (≥ gap threshold, empty/short sidecar window), when cron runs, then `flexBackfilled: true` and/or `lastFlexBackfillAt` set.

**Steps:**

1. Confirm `IB_FLEX_TOKEN` + `IB_FLEX_QUERY_ID` in env; restart Next if newly added.
2. Simulate stale cursor (SQL update `broker_ingest_cursors.last_ingest_at` older than gap threshold) **or** wait 4h+ with idle ingest.
3. POST cron; inspect `results[].flexBackfilled` and GET status `lastFlexBackfillAt`.

**Oracle / pass:** `flexBackfilled: true` **or** status shows `lastFlexBackfillAt`; fills imported without corrupting cursors.

**Fail / Blocked:** Flex env missing → **Blocked** (optional tier); Flex API error without clear `lastIngestError` → **Fail**.

**Session size:** ~20 min (env + stale simulation).

---

## Execution order (LLM)

1. Write / refresh this plan (done when file exists).
2. Confirm preconditions table.
3. Run **A1 → A2 → A3**; A4 in isolated process if feasible.
4. Focused unit tests after Tier A.
5. Run **B1 → B5** as environment allows; **B2** only with a real fill.
6. **C1** only if Flex env present.
7. Update `docs/PROJECT-STATUS.md` Active Work + Session Log with quoted evidence; mark **Passing** only when app-level scenarios that define the track oracle pass or remaining gaps are explicitly **Blocked** with prerequisite.

## Risk summary

| # | Risk | P×I | Coverage |
|---|------|-----|----------|
| 1 | Portal fill missed when Journal not mounted | High | B2 |
| 2 | Auth / DB misconfig silent 401/503 | Med | A1, A4 |
| 3 | Duplicate fills on re-ingest | Med | B5 |
| 4 | Cursor never advances (debounce / sidecar) | Med | B1, A2 |
| 5 | Flex gap false confidence without env | Low | C1 optional |

## Coverage gaps (accepted)

| Gap | Severity | Reason |
|-----|----------|--------|
| Next down → no ingest | L | Product out of scope |
| Live vs paper both environments under load | M | Cron runs both; spot-check via A1 `results[]` |
| Multi-user production OAuth | L | Dev session + cron secret only |
| Sidecar execution cap (>100) without Flex | M | Documented; C1 mitigates when configured |

## Execution results (2026-07-16)

| ID | Result | Evidence (abbrev.) |
|----|--------|-------------------|
| A1 | **PASS** | POST cron 200; `ib-paper added:0 duplicates:0 snapshotsCaptured:true`; `ib-live error:"Internal Server Error"` |
| A2 | **PASS** | GET status `ib-paper lastIngestAt:2026-07-17T01:26:56.280Z` (later advanced) |
| A3 | **PASS** | snapshots `netLiquidation:1048544.05` cash/buyingPower present for DUP586813 |
| A4 | **Partial** | Isolated `next dev :3013` blocked (Next single-dev lock); unit: 503 `database_unavailable` |
| B1 | **PASS** | snapshot 200 → `lastIngestAt` `01:26:56.280Z`→`01:29:34.292Z` |
| B2 | **PASS** (RTH 2026-07-17) | F MKT `orderId=10190` `Filled` `permId=1041862008`; fills `46→47` new `execId=00025b44.6a5abe6c.01.01` @14.32; cron `duplicates:2` |
| B3 | **PASS** | POST `/api/cron/brokerage-ingest` 200 (Sync API path) |
| B4 | **PASS** | Data Health: `ledger sync 2m ago` on account feed |
| B5 | **PASS** | double cron `added:0`; SQL duplicate `exec_id` → 0 rows |
| C1 | **SKIP** | `IB_FLEX_TOKEN` / `IB_FLEX_QUERY_ID` unset |

Full harness quotes: [PROJECT-STATUS.md](../PROJECT-STATUS.md) Active Work + Session Log.

## Related

- [broker-ledger-roadmap.md](./broker-ledger-roadmap.md)
- [Journal Architecture — Ledger ingest](../../src/lib/journal/ARCHITECTURE.md)
- [PROJECT-STATUS.md](../PROJECT-STATUS.md)
- [testing-verification-checklist.md](../checklists/testing-verification-checklist.md)
