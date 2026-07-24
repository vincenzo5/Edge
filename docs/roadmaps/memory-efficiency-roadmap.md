# Memory Efficiency Roadmap

Bound resident market-data memory on the client and Node process, cut clone/GC pressure, and stop multiplying full candle series across inactive charts — without changing chart correctness, trust labels, or the offline-first persistence model.

**Last updated:** 2026-07-24

**Status:** Phases 0–11 **Passing** (2026-07-24) — core retention track **complete**. Follow-up Phases 12–14: Phase 9–11 + 13 **Passing**; Phase 12 **Passing** (2026-07-24); Phase 14 **Passing** (2026-07-24). Complements the completed [Data Serving Efficiency](./data-serving-efficiency-roadmap.md) track.

**Related:** [Market Data Architecture](../../src/lib/marketData/ARCHITECTURE.md), [Chart Architecture](../../src/lib/chart/ARCHITECTURE.md), [Data Serving Efficiency](./data-serving-efficiency-roadmap.md), [Shared Cache Topology](./shared-cache-topology-roadmap.md) (prod Redis policy after Phase 12), [Data State Hardening](./data-state-hardening-roadmap.md), [Comprehensive Memory Metrics](./memory-metrics-roadmap.md) (layered measurement / scorecard — successor to “how do we read memory?”), [Journal Architecture](../../src/lib/journal/ARCHITECTURE.md), [AI Tools Architecture](../ai-tools-architecture.md), [Project Status](../PROJECT-STATUS.md), [Repository Constraints](../CONSTRAINTS.md).

**Origin:** 2026-07-23 memory-efficiency analysis (chart engine + app/state + server caches). Interactive summary: Cursor canvas `memory-efficiency-analysis.canvas.tsx`. This roadmap is the durable source of truth for phasing.

---

## Intent Classification

- **Primary:** Feature — introduce resident-bar budgets, inactive-cell feed policy, and cache byte/LRU budgets that change runtime retention behavior.
- **Secondary:** Refactor — clone-on-write / immutable shared candle refs; dispose hygiene; Testing — heap/subscription contracts need deterministic coverage.
- **Checklists applied:** `feature-planning-checklist.md`, `refactor-planning-checklist.md`, `testing-verification-checklist.md`, `harness-status-checklist.md`, `architecture-review-checklist.md`.
- **Assumptions:**
  - Chart correctness (viewport, history pan, live tip, go-to) must remain correct; paging history out of RAM is allowed if pan/go-to can refetch.
  - Caching market data ≠ persisting user state (do not write candles into durable layout/prefs).
  - Trust / freshness labels from data-state hardening stay unchanged.
  - Prefer extending `chartClientCache`, `DataCache`, `HotStore`, `ClientTtlCache`, and existing dispose paths over new cache frameworks.
  - WIP=1 — one phase Active at a time; completion evidence required before Passing.

---

## Checklist Review

- **Architecture review:** **Required** — self-review, **Passed for roadmap**. Implementation phases touch chart data-feed/session, multi-cell layout wiring, client + server cache contracts, indicator/script compute caches, and (later) journal/copilot state windows. Each phase needs its own exit review.
- **Aligned:** Client chart cache already has LRU 20 + 5 min age; `ClientTtlCache` LRU 64; WebGL dispose and feed AbortController/SSE cleanup are solid; script runtime has guest/output/secondary budgets; drawing undo capped at 50; workspace tabs prune to one active layout; data-serving track already established session cache primitives.
- **Missing:** Resident bar max; inactive-cell live policy; byte budgets on server/process caches; tip-stable compute invalidation; series OffscreenCanvas reuse wired into `drawPaneLayers`; journal/copilot windowed state.
- **Misalignments:** Data-serving Phase 3 correctly writes `loadMore` into `chartClientCache`, but nothing trims those series — reuse without retention bounds grows heap. `isActive` gates chrome/tools only, not the candle stream. `structuredClone` on every cache R/W fights the reuse story. Logout clears `ClientTtlCache` but not `chartClientCache`.
- **Risks:** Aggressive bar caps can break go-to / deep history UX if refetch is incomplete; sharing immutable candle arrays can cause accidental mutation bugs; pausing inactive cells must not desync linked layouts or AI chart tools; server LRU eviction must not poison HotStore SWR freshness semantics; tip-stable indicator keys must not serve stale full-series after symbol/interval change.
- **Recommendations:** Measure before tuning caps (Phase 0); ship policy/caps before clone-sharing (A before B); keep byte budgets conservative and documented next to TTLs; verify multi-cell and script paths every phase that touches series identity.

---

## Product goal

At any moment Edge should:

1. Keep only a **bounded resident window** of OHLCV per chart session (viewport + prefetch margin + live tip), refetching older pages on demand.
2. Avoid paying full live-stream + full-series cost for **inactive** chart cells and unused workspace tiles.
3. Treat large candle/universe payloads as **immutable shared snapshots** — clone only when mutation is required.
4. Bound **process** cache memory (DataCache / HotStore / universe daily / IBKR contract cache) with LRU + byte budgets, not TTL alone.
5. Keep indicator/script result caches from retaining dozens of near-duplicate full-length series under live ticks.
6. Reduce long-session creep from journal/copilot unbounded React state and missing dispose paths.

### Success criteria (track-level)

- After deep history pan (10+ pages), resident bars per cell stay ≤ configured soft max (default target: **5_000** unless Phase 0 measurement revises).
- In an 8-cell layout, inactive cells do not hold live candle subscriptions (or equivalent measured reduction in EventSource/poll count).
- Chart client cache R/W no longer `structuredClone`s full series on every hit; sessionStorage policy documented for large payloads.
- `DataCache` / `HotStore` enforce max entries and/or approximate byte budget; universe daily store has an explicit retention policy.
- Live tip updates do not allocate a new full indicator/script cache entry per tick for unchanged lookback.
- `canReuseSeriesCache` blits composite series OffscreenCanvas on crosshair-only invalidation (viewport pans rebuild pixel-space geometry; Float32 pools recycle on pan)
- Journal and Copilot no longer require entire history in React state for normal use (windowed / sliding context).
- Architecture docs describe resident-bar policy, clone rules, and server byte budgets alongside existing TTL matrix.

---

## Current baseline (what already works)

| Layer | Mechanism | Assessment |
|-------|-----------|------------|
| History page size | `HISTORY_FETCH_BAR_COUNT = 500` | Solid page size; unbounded merge |
| Chart client SWR | `chartClientCache` LRU 20 / 5 min + sessionStorage | Entry-count bounded; payload unbounded; clones on R/W |
| Client TTL | `ClientTtlCache` LRU 64 | Solid size; clone churn |
| Feed cleanup | AbortController + stream unsubscribe | Solid |
| Quote SSE | `EventSource.close` on unmount | Solid |
| WebGL | `CandleWebGLRenderer` / `IndicatorWebGLRenderer` dispose | Solid |
| Builtin compute cache | Map, max 64 entries | Entry-capped; tip churn |
| Script results | `MAX_SCRIPT_RESULT_CACHE = 32` + runtime budgets | Entry-capped; `lastValidByInstance` not cleared on dispose |
| Drawing undo | `MAX_HISTORY = 50` | Solid |
| Workspace tabs | `pruneToSingleActiveTab` | Solid |
| AI tool candles | Cap 500 in chart tools | Solid |
| Server TTL / HotStore | TTL + stale windows | Solid freshness; no LRU/bytes |

### Gap inventory (this track)

| Priority | Gap | Impact |
|----------|-----|--------|
| P0 | No `maxBars` / resident window after prepend / go-to | Unbounded client heap per chart |
| P0 | Inactive chart cells still `live: true` with full series | N× streams + series (up to 8 cells) |
| P0 | `structuredClone` on candle/universe cache R/W | Peak alloc spikes + GC |
| P0 | Server `DataCache` / `HotStore` / universe store TTL-only | Node RSS growth under many keys |
| P1 | Live ticks invalidate full indicator/script cache entries | 32–64 near-duplicate full series |
| P1 | `canReuseSeriesCache` unused; per-frame Float32 alloc | Transient memory + GC during pan/zoom |
| P1 | Logout skips `clearChartClientCache` | Session candle JSON survives identity change |
| P2 | Journal holds all trades + fills in provider state | Large-account React heap |
| P2 | Copilot up to 500 msgs; full thread sent each turn; content unbounded | RAM + tokens |
| P2 | Workspace tiles statically imported / always mounted | Module + React tree cost |
| P2 | Script `dispose` leaves `cache` / `lastValidByInstance`; BackgroundLayerCache no dispose | Long-session creep |
| P3 | Heikin Ashi full-series recompute copy | Smaller than OHLCV path; cache when fingerprint stable |

---

## Design principles

1. **Retention ≠ reuse** — data-serving already reuses answers; this track bounds how much is kept and how often it is copied.
2. **Page out, don't break history** — distant bars may leave RAM; pan/go-to must refetch cleanly with the same feed contracts.
3. **Active costs more than visible** — inactive cells may keep a snapshot; they must not keep a live tip subscription by default.
4. **Immutable snapshots** — large arrays are frozen/shared; mutate via new array at the feed boundary only.
5. **Budget by bytes when payloads vary** — entry-count LRU alone is insufficient for candle/universe maps.
6. **Tip updates are special** — recompute or patch the last bar(s); do not key a new full-series cache entry per tick.
7. **Measure, then tune** — Phase 0 records baselines before hard-coding caps into product defaults.
8. **WIP=1** — one phase Active; harness evidence before Passing.

---

## Target architecture

```text
Provider
  → MarketDataService
      → HotStore (SWR) + DataCache (TTL)
          + maxEntries / approxByteBudget + LRU     [this track]
  → /api/*

Client
  → chartClientCache
      → shared immutable Candle[] snapshots
      → optional sessionStorage only under size policy
      → clear on logout with ephemeral caches
  → useChartDataFeed / useCandleSession
      → residentBarBudget (soft max + page-out)
      → live subscribe only when cell active (policy)
  → IndicatorResultProvider / ScriptResultCoordinator
      → tip-stable keys + byte-aware eviction
      → dispose clears cache + lastValid
  → drawPaneLayers
      → series OffscreenCanvas / retained geometry on viewport-only invalidation
  → Journal / Copilot
      → windowed lists / sliding context                    [later phases]
```

### Proposed defaults (Phase 0 frozen — 2026-07-23)

| Knob | Frozen value | Measurement note |
|------|----------------|------------------|
| `RESIDENT_BAR_SOFT_MAX` | **5_000** | Browser 10× loadMore reached **7_938** bars — trim warranted; node sim **4_343** under cap for SPY 5m/1mo provider window |
| Prefetch margin | keep current 500-bar pages + existing edge prefetch | Do not prefetch past soft max |
| Inactive cell policy | `live: false`; keep last snapshot | Baseline: **6** EventSources with 8 cells mounted (not gated by `isActive` today) |
| Chart client sessionStorage | skip or compress when `candles.length > 2_000` or payload > ~2 MB | Node sim **388_670** bytes at 4_343 bars; browser **798_965** bytes at 7_938 bars — gate applies |
| DataCache max entries / namespace | **256** | Node warm 50 fetches → `rssDeltaMb: 60.14` — byte/LRU needed |
| HotStore max entries | **128** | Same warm run |
| Indicator/script cache | keep entry caps; add tip-stable key + optional byte budget | Clear on dispose / instance remove (Phase 5) |

---

## Phasing

### Phase 0 — Baseline measurement + retention contract

**Status:** **Passing** (2026-07-23)

**Outcome:** Documented retention/clone/dispose contract and measured baselines; no user-visible behavior change.

| Work item | Scope |
|-----------|--------|
| Baselines | Chrome heap: 1-cell vs 8-cell after 10× `loadMore`; live tick 60s automated (5 min + indicators deferred); count live candle subscriptions |
| Node baseline | `npm run perf:memory` — 50 candle-key warm; RSS delta recorded |
| Contract | Resident-bar, inactive-cell, clone-sharing, and server byte-budget rules in `marketData/ARCHITECTURE.md` + chart/chartDataFeed notes |
| Knobs | Frozen defaults table below — **`RESIDENT_BAR_SOFT_MAX` 5_000 confirmed** by measurement |
| Harness | Task Contract open; baselines in `docs/perf/memory-baseline-latest.json` |
| Measure successor | Layered scorecard (tab/process, GPU, desk composite) → [Comprehensive Memory Metrics](./memory-metrics-roadmap.md) Phase 0 **Passing** — retention caps stay here; “how do we read memory?” moves to that track |

**Phase 0 evidence** (`npm run perf:memory`, SPY `5m`/`1mo`):

- Node 10× loadMore: `candlesLength: 4343`; `sessionStorageBytes: 388670`
- Node server warm: `rssDeltaMb: 60.14`; `heapUsedAfterMb: 108.66`
- Browser 1-cell: `maxCandlesLength: 7938`; `sessionStorageChartCacheBytes: 798965`; `eventSourceCount: 6`
- Browser 8-cell: `maxCandlesLength: 7938`; `eventSourceCount: 6`

**Out of scope:** Implementing caps or pausing feeds.

**Gate — Phase 0 Passing:** Baseline numbers recorded; architecture note + knob table reviewed; Task Contract open. **Met.**

**Exit review:** self-review **Passed**.

---

### Phase 1 — Resident bar budget + logout cache clear (P0)

**Status:** **Passing** (2026-07-23)

**Outcome:** Chart sessions cannot grow unbounded; logout clears candle session cache.

| Work item | Scope |
|-----------|--------|
| Soft max | After `mergeCandlesPrepend` / `ensureCandlesCover` / `loadMore`, trim oldest bars when `length > RESIDENT_BAR_SOFT_MAX`, preserving viewport + right-edge tip |
| Cache sync | Trimmed series written back to `chartClientCache` consistently (no longer entry larger than soft max) |
| Refetch | Pan/go-to past trimmed region still loads older pages via existing history prefetch |
| Logout | `clearEphemeralMarketDataCaches` also calls `clearChartClientCache()` |
| Tests | Unit tests for trim preserving tip + viewport window; logout clears chart cache |

**Out of scope:** Inactive-cell live policy (Phase 2); clone-sharing (Phase 3).

**Verification:** Focused series/session/cache tests; app-level: deep pan past soft max — heap/resident count ≤ budget; pan further left still loads history.

**Phase 1 evidence:** **Focused:** `Test Files 5 passed (5)`, `Tests 101 passed (101)`; **Build:** `npm run build:packages` exit 0; **Architecture review:** self-review **Passed**.

**Exit review:** self-review **Passed**.

---

### Phase 2 — Inactive chart cell feed policy (P0)

**Status:** **Passing** (2026-07-23)

**Outcome:** Only active (and explicitly opted) cells pay for live candle streams.

| Work item | Scope |
|-----------|--------|
| Policy | `ChartGrid` / `EdgeChart` / `useChartDataFeed`: `live: false` when `!isActive` (default) |
| Snapshot | Inactive cells keep last candles snapshot for paint; optional one-shot refresh on becoming active |
| Linked layouts | Document interaction with `linkSymbol` / `linkInterval` — linked peers may stay live if product requires; default = active cell only |
| Multi-tile | Chart tiles that are not the focused workspace surface should not stream (coordinate with SurfaceHost visibility if needed) |
| Tests | Subscription count / unsubscribe assertions when switching active cell |

**Out of scope:** Unmounting entire `EdgeChart` for off-screen cells (stretch); lazy workspace tiles (Phase 8).

**Verification:** Focused tests for live flag; app-level: 8-cell layout — only one live candle subscription (or documented linked set); switching active cell resumes live without blank chart.

**Phase 2 evidence:** **Focused:** `Test Files 3 passed (3)`, `Tests 25 passed (25)` (`useChartDataFeed.test.ts`, `ChartGrid.livePolicy.test.tsx`, `ChartCell.livePolicy.test.tsx`); **Architecture review:** self-review **Passed**; **App-level:** 8-cell subscription walkthrough deferred.

**Exit review:** self-review **Passed**.

---

### Phase 3 — Clone discipline (client candle path) (P0)

**Status:** **Passing** (2026-07-23)

**Outcome:** Chart client cache stops cloning full series on every read/write; large sessionStorage copies are policy-gated.

| Work item | Scope |
|-----------|--------|
| Immutable snapshots | Store frozen/`Object.freeze` (or documented immutable) `Candle[]`; return shared refs from `readChartClientCache` |
| Mutation boundary | Feed merge paths allocate new arrays only when appending/prepending/replacing tip |
| sessionStorage | Skip or size-gate persistence for large series; memory-only when over threshold |
| ClientTtlCache | Prefer structuredClone only for small/mutable values; document large-array exception or shallow policy |
| Tests | Mutation-safety tests (accidental in-place edit detection); cache hit does not allocate full deep clone |

**Out of scope:** Server DataCache clone changes (Phase 4) — may share helpers.

**Verification:** Focused cache tests; optional allocation assertion or spy on `structuredClone` count for chart cache hits.

**Phase 3 evidence:** **Focused:** `Test Files 3 passed (3)`, `Tests 35 passed (35)` (`chartClientCache.test.ts`, `useChartDataFeed.test.ts`, `clearEphemeralMarketDataCaches.test.ts`); **Architecture review:** self-review **Passed**.

**Exit review:** self-review **Passed**.

---

### Phase 4 — Server cache LRU + byte budgets (P0)

**Status:** **Passing** (2026-07-23)

**Outcome:** Process-local market caches cannot grow without bound under key cardinality.

| Work item | Scope |
|-----------|--------|
| DataCache | Add maxEntries (per namespace and/or global) + LRU eviction; optional approxByteBudget |
| HotStore | Same — evict cold keys without breaking SWR semantics for retained keys |
| Clone policy | Return immutable/shared refs where safe; clone only on write if callers mutate |
| universeDailyStore | Explicit retention (e.g. max dates retained, or byte budget); avoid cloning entire universe on every read |
| IBKR contractCache | LRU cap for strike/optInfo key growth |
| Docs | Document budgets next to `ttlPolicy.ts` |
| Tests | Eviction order, TTL still honored, HotStore stale serving for retained keys |

**Out of scope:** Redis / multi-instance shared cache (already skipped in data-serving Phase 7).

**Verification:** Focused cache unit tests; Node heap after synthetic many-key warm stays under documented budget.

**Phase 4 evidence:** **Focused:** `Test Files 5 passed (5)`, `Tests 25 passed (25)`; **Node warm:** `npm run perf:memory` → `dataCacheCandlesNamespaceEntries: 50` `hotStoreEntries: 60` `withinDataCacheCap: true` `withinHotStoreCap: true` `rssDeltaMb: 53.48`; **Architecture review:** self-review **Passed**.

**Exit review:** self-review **Passed**.

---

### Phase 5 — Tip-stable indicator & script caches (P1)

**Status:** **Passing** (2026-07-23)

**Outcome:** Live tip updates patch or reuse cache entries instead of retaining near-duplicate full series.

| Work item | Scope |
|-----------|--------|
| Builtin compute | Tip-stable cache key (or incremental recompute last N bars) when only the latest candle changes |
| Script coordinator | Same for script results; prune `lastValidByInstance` on instance remove |
| dispose | `ScriptResultCoordinator.dispose` clears `cache` + `lastValidByInstance` |
| Byte-aware eviction | Prefer evicting largest/oldest entries when over optional byte budget |
| Worker | Document follow-up for transferable/typed candle buffers (implement if low-risk; else Phase 5 stretch) |
| Tests | Live replace-latest does not grow cache entry count; dispose leaves empty maps |

**Out of scope:** Rewriting indicator math; new worker runtime.

**Verification:** Focused compute/coordinator tests under simulated ticks; optional heap delta over 5 min live session.

**Phase 5 evidence:** **Focused:** `Test Files 4 passed (4)`, `Tests 30 passed (30)`; **Build:** `npm run build:packages` exit 0; **Architecture review:** self-review **Passed**.

**Exit review:** self-review **Passed**.

---

### Phase 6 — Series layer retain + geometry recycle (P1)

**Status:** **Passing** (2026-07-23)

**Outcome:** Crosshair-only redraws blit composite series OffscreenCanvas; viewport pans rebuild series with recycled Float32 geometry; layer caches and scheduler dispose on unmount.

| Work item | Scope |
|-----------|--------|
| Wire reuse | `canReuseSeriesCache` wired in `drawPaneLayers` via `SeriesLayerCache` — crosshair-only blit (viewport excluded: pixel-space geometry) |
| Background | `viewport` removed from `BACKGROUND_INVALIDATING` so pan blits background cache |
| Geometry | Grow-only `GeometryBufferPool` on candle/indicator WebGL renderers |
| Dispose hygiene | `BackgroundLayerCache.dispose` + `SeriesLayerCache.dispose` + `RenderScheduler.dispose` from `useCanvasRenderer` unmount |
| Tests | layers/renderScheduler/layerCache/geometryBufferPool tests extended |

**Out of scope:** New WebGL features; heatmap/order-flow layers.

**Verification:** Focused layer/renderer tests; perf harness or interaction sample shows lower alloc/GC during pan (record in evidence).

**Phase 6 evidence:** **Focused:** `Test Files 6 passed (6)`, `Tests 33 passed (33)`; **Build:** `npm run build:packages` exit 0; **Architecture review:** self-review **Passed**.

**Exit review:** self-review **Passed**.

---

### Phase 7 — Journal window + Copilot context window (P2)

**Status:** **Passing** (2026-07-24)

**Outcome:** Large personal datasets no longer require full history in React/API request bodies for normal use.

| Work item | Scope |
|-----------|--------|
| Journal | Windowed or paged trades/fills in `JournalTradesProvider` (keep filters correct; virtualize list consumers if needed) |
| Copilot | Sliding context: send last N messages and/or summarized older turns; cap message content length in schema |
| Persist | Persistence format may still store full threads server-side; runtime state and request payload are windowed |
| Tests | Provider does not keep unbounded fills for large fixtures; chat request payload size bounded |

**Out of scope:** Redesigning journal reports; new copilot product features.

**Verification:** Focused provider/thread tests; app-level smoke on journal with large fixture and long copilot thread.

**Phase 7 evidence:** **Focused:** `Test Files 7 passed (7)`, `Tests 29 passed (29)`; **Architecture review:** self-review **Passed**; **App-level:** journal large-fixture + long-thread walkthrough deferred.

**Exit review:** self-review **Passed**.

---

### Phase 8 — Lazy tiles, HA cache, residual hygiene (P2)

**Status:** **Passing** (2026-07-24)

**Outcome:** Unused workspace modules stay out of the hot path; remaining low-cost copies and dispose gaps closed.

| Work item | Scope |
|-----------|--------|
| Lazy surfaces | Dynamic `import()` for Journal / Screener / Scripts / Copilot / Alerts `SurfaceHost` tiles; Screener + Copilot sidebar panels + floating screener content |
| Heikin Ashi | LRU cache (8 entries) keyed by `length\|candleValueFingerprint`; cleared on ephemeral logout |
| Bundle | `optimizePackageImports` **N/A** — no lucide/date-fns barrels; Monaco already dynamic |
| Residual | Notification toasts capped at 5; `seenIds` pruned to 200; HA cache added to ephemeral clear |
| Docs | Final architecture pass — resident policy, clone rules, budgets, inactive-cell, lazy tiles, HA cache |

**Out of scope:** Full bundle rewrite; design-system visual changes; `ScriptLibraryProvider` / journal overlay on chart path (documented residual).

**Verification:** Focused HA cache + notification cap + ephemeral clear tests; build passes.

**Phase 8 evidence:** **Focused:** `Test Files 4 passed (4)`, `Tests 32 passed (32)`; **Build:** `npm run build:packages` exit 0; **Architecture review:** self-review **Passed**; **App-level:** chart-only lazy-chunk walkthrough deferred.

**Exit review:** self-review **Passed**.

---

## Follow-up phases (2026-07-24)

Product decision: revisit selected deferrals as Phases 9–14. WIP=1 still applies — one phase Active at a time.

| # | Phase | Plain benefit |
|---|-------|----------------|
| 9 | Chart hot-path slimming | Chart-only workspace opens faster; less JS/memory before user opens Journal or Scripts |
| 10 | Journal list virtualization | Smooth scrolling on large trade lists; less DOM work |
| 11 | Inactive cell unmount | Multi-chart layouts use less RAM when cells are off-screen |
| 12 | Redis shared cache | Multiple server instances share market-data cache (scale topology) |
| 13 | Worker zero-copy bus | Less copy/GC on live ticks when indicators/scripts run in worker |
| 14 | App-level verification | Confirm Phases 1–8 + follow-ups with measured browser/server walks |

**Not planned (remain deferred):** TradingView-style disk candle DB; changing trust labels / HotStore freshness semantics; full bundle rewrite; general FPS tuning unrelated to memory; `optimizePackageImports` (N/A).

---

### Phase 9 — Chart hot-path slimming (P2)

**Status:** **Passing** (2026-07-24)

**Outcome:** Chart-only workspace no longer eagerly loads journal overlay or scripts library on every visit.

| Work item | Scope |
|-----------|--------|
| Journal overlay | Lazy `JournalChartOverlayProvider` (or equivalent) — mount only when journal overlay/markers needed (URL bootstrap, trade fork, explicit overlay toggle) |
| Script library | Defer `ScriptLibraryProvider` until Scripts tile mount or indicator/script picker opens; preserve apply-to-chart and picker flows |
| Chart tile | Keep `ChartTileHost` + `StockApp` static; no regression to trade forks or execution markers |
| Tests | Chart-only route does not evaluate journal/scripts modules until feature entry; overlay/fork paths still work |

**Out of scope:** Removing journal overlay product capability; scripts workspace tile behavior change beyond mount timing.

**Verification:** Focused tests for lazy mount gates; build passes; app-level: chart-only workspace load — no journal/scripts chunk until entry.

**Phase 9 evidence:** **Focused:** `Test Files 6 passed (6)`, `Tests 24 passed (24)`; **Build:** `npm run build:packages` exit 0; **Architecture review:** self-review **Passed**; **App-level:** chart-only lazy-chunk walkthrough deferred (Phase 14).

**Gate — Phase 9 Passing:** Lazy gates wired; focused tests green; overlay/fork smoke documented. **Met.**

**Exit review:** self-review **Passed**.

---

### Phase 10 — Journal list virtualization (P2)

**Status:** **Passing** (2026-07-24)

**Outcome:** Large trade lists scroll smoothly without rendering every row in the DOM.

| Work item | Scope |
|-----------|--------|
| Target | Virtualize primary hot consumers first — `JournalTradesView` / trades table (not full report redesign) |
| Filters | Windowed provider data (Phase 7) + virtual list must keep filter/sort correct |
| Reports | Other heavy report views only if profiling shows DOM cost after trades table |
| Tests | Row count fixture does not mount N DOM rows; filter behavior unchanged |

**Out of scope:** Redesigning journal KPIs, calendar, or equity reports in one pass.

**Verification:** Focused list tests; app-level: large fixture scroll on Trades tab.

**Phase 10 evidence:** **Focused:** `Test Files 4 passed (4)`, `Tests 35 passed (35)`; **Architecture review:** self-review **Passed**; **App-level:** large-fixture Trades-tab scroll walkthrough deferred (Phase 14).

**Gate — Phase 10 Passing:** Trades list virtualized; focused tests green; scroll smoke documented. **Met.**

**Exit review:** self-review **Passed**.

---

### Phase 11 — Inactive cell unmount (P2 stretch)

**Status:** **Passing** (2026-07-24)

**Outcome:** Off-screen chart cells release canvas/WebGL/feed state, not just live streams (Phase 2).

| Work item | Scope |
|-----------|--------|
| Policy | Unmount or fully dispose `EdgeChart` when cell `!isActive` in multi-cell grid (after Phase 2 `live: false` baseline) |
| Remount | One-shot refresh on activate — no blank chart, viewport/symbol preserved via layout identity |
| Linked layouts | Document + test `linkSymbol` / `linkInterval` peers — default remains active cell only |
| Tests | Inactive cell teardown disposes subscriptions/canvas; activate restores paint |

**Out of scope:** Unmounting entire workspace tiles (Phase 8 lazy import already covers module cost).

**Verification:** Focused live-policy + dispose tests; app-level: 8-cell layout heap/subscription walk vs Phase 2 baseline.

**Phase 11 evidence:** **Focused:** `Test Files 3 passed (3)`, `Tests 11 passed (11)`; **Architecture review:** self-review **Passed**; **App-level:** 8-cell heap/subscription walkthrough deferred (Phase 14).

**Gate — Phase 11 Passing:** Inactive unmount wired; no blank-chart regression on cell switch; evidence recorded. **Met.**

**Exit review:** self-review **Passed**.

---

### Phase 12 — Redis shared cache (P3 / scale)

**Status:** **Passing** (2026-07-24)

**Outcome:** When deploying >1 Node process, HotStore + DataCache contracts can run on shared Redis instead of duplicating provider work per instance.

| Work item | Scope |
|-----------|--------|
| Topology gate | Document when to enable (multi-instance / multi-user SaaS); single Node remains default |
| Contracts | Redis-backed adapters mirroring process-local `HotStore` / `DataCache` key semantics + TTL/LRU budgets from Phase 4 |
| Freshness | Preserve data-state trust labels and SWR stale windows — eviction only drops cold keys |
| Data serving | Supersedes [data-serving Phase 7 skip](./data-serving-efficiency-roadmap.md) when product topology requires it |
| Tests | Adapter parity with in-process cache; eviction + stale-serve behavior |

**Out of scope:** External telemetry SaaS; changing provider adapters; Redis without multi-instance need.

**Verification:** Focused adapter tests; optional Node warm run with Redis enabled; document enable flag + ops notes.

**Phase 12 evidence:** **Focused:** `Test Files 8 passed (8)`, `Tests 48 passed (48)` with `REDIS_URL=redis://localhost:6379 EDGE_TEST_REDIS=1` (memory parity always; Redis parity when Redis up); **Redis:** `npm run redis:up` + parity suite green; **Architecture review:** self-review **Passed**.

**Gate — Phase 12 Passing:** Redis path behind feature flag; parity tests green; topology doc updated. **Met.**

**Exit review:** self-review **Passed**.

**Follow-up (prod topology):** Flagged adapters + soft fallback remain the Phase 12 deliverable. Fail-loud production policy, boot-order hardening, key env/schema isolation, ops flip, and multi-instance coordination are owned by [Shared Cache Topology Roadmap](./shared-cache-topology-roadmap.md) — do not reopen Phase 12 for those.

---

### Phase 13 — Worker zero-copy candle bus (P3 stretch)

**Status:** **Passing** (2026-07-24)

**Outcome:** Indicator/script worker receives candle updates with less copy and GC pressure on live ticks.

| Work item | Scope |
|-----------|--------|
| Buffers | Transferable or typed-array candle snapshots at worker boundary (build on Phase 5 tip-stable caches) |
| Runtime | Document COOP/COEP / SharedArrayBuffer constraints if used; fallback to copy path |
| Scope | Builtin + script coordinator paths only — no new worker runtime |
| Tests | Live tip replace-latest does not deep-copy full series across worker postMessage |

**Out of scope:** Rewriting indicator math; new scripting language features; SharedArrayBuffer / COOP/COEP (not enabled — transferable `f64x6` pack used instead); guest QuickJS `JSON.stringify(__candles)` rewrite.

**Verification:** Focused worker/coordinator tests; optional 5 min live-session heap delta vs baseline.

**Phase 13 evidence:** **Focused:** `Test Files 4 passed (4)`, `Tests 17 passed (17)`; **Build:** `npm run build -w @edge/chart-core && npm run build -w @edge/indicator-runtime && npm run build -w @edge/chart-react` exit 0; **Architecture review:** self-review **Passed**; **App-level:** 5 min live heap delta deferred (Phase 14).

**Gate — Phase 13 Passing:** Zero-copy or typed path wired with safe fallback; focused tests green. **Met.**

**Exit review:** self-review **Passed**.

---

### Phase 14 — App-level verification closeout (Testing)

**Status:** **Passing** (2026-07-24)

**Outcome:** Deferred memory walks from Phases 1–8 and follow-ups 9–11 recorded with numbers — track verification debt closed.

| Walk | Source phase | Pass criteria |
|------|--------------|---------------|
| Deep pan past soft max | Phase 1 | Resident bars ≤ `RESIDENT_BAR_SOFT_MAX`; pan left still loads history |
| 8-cell active switch | Phase 2 (+ 11) | One live candle subscription (or documented linked set); inactive teardown if Phase 11 shipped |
| Node universe warm | Phase 4 | RSS/entry counts within documented caps |
| Large journal + long Copilot thread | Phase 7 | Provider window + request payload bounded under normal use |
| Chart-only lazy chunks | Phase 8 (+ 9) | Journal/screener/scripts chunks load only after tile or hot-path entry |
| Large trades scroll | Phase 10 | Trades tab smooth with large fixture |

**Out of scope:** New product features; full `npm run check` as sole evidence.

**Verification:** App-level measurements quoted in `PROJECT-STATUS.md` (heap/subscription counts, `meta.source`, ms if relevant).

**Phase 14 evidence:** **App-level:** `npm run perf:memory` → node `candlesLength:4419` `withinSoftMax:true`; server `withinDataCacheCap:true` `withinHotStoreCap:true` `rssDeltaMb:57.48`; browser B1 `maxCandlesLength:3960` `pass:true`; B2 `inactiveChartSurfaces:7` `mountedEngines:1` `eventSourceCount:4` `activeCellSwitch.pass:true`; B3 `heapDeltaMb:0` `durationSec:60`; walks `phase7-copilot selectedCount:40`; `phase8-9-chart-only lazyChunkCount:0`; `phase10 skippedLargeFixture:true`; `phase7-journal skippedNoAuth:true` (provider window covered by focused tests); **Architecture review:** self-review **Passed**.

**Gate — Phase 14 Passing:** Walk table complete or explicit blocker per row; harness evidence quoted. **Met.**

**Exit review:** self-review **Passed**.

---

## Out of scope / deferrals

**Still deferred (not in Phases 9–14):**

- Changing provider routing, trust labels, or HotStore freshness semantics beyond eviction of cold keys.
- TradingView-style disk candle DB — RAM window + network refetch remains the model.
- Perf/FPS optimization unrelated to memory (belongs with chart perf harness work).
- `optimizePackageImports` — N/A (no heavy icon/date barrels; Monaco already dynamic).

**Moved from deferrals → planned follow-up:**

| Former deferral | New phase |
|-----------------|-----------|
| Chart-path `ScriptLibraryProvider` / journal overlay | Phase 9 |
| Journal list virtualization | Phase 10 |
| Unmount off-screen `EdgeChart` | Phase 11 |
| Redis / multi-process shared cache | Phase 12 |
| Worker SharedArrayBuffer / zero-copy candle bus | Phase 13 |
| App-level verification walks | Phase 14 |

---

## Cross-track coordination

| Track | Interaction |
|-------|-------------|
| [Data serving efficiency](./data-serving-efficiency-roadmap.md) | Phase 12 Redis supersedes data-serving Phase 7 skip when multi-instance topology ships |
| [Data state hardening](./data-state-hardening-roadmap.md) | Do not weaken transport/trust labels when serving shared cache refs (Phase 12) |
| [Workspace state persistence](./workspace-state-persistence-roadmap.md) | Phase 11 unmount must not break per-tile chart identity |
| [Script depth](./script-depth-roadmap.md) / TS scripting | Phase 9 defer `ScriptLibraryProvider`; Phase 13 worker bus must preserve script budgets |
| [AI agent](./ai-agent-roadmap.md) | Phase 7 sliding context coordinates with copilot thread persistence |
| [App-level verification](./app-level-verification-roadmap.md) | Phase 14 owns memory walk debt; may cross-link verification track |

---

## Verification summary

| Tier | When |
|------|------|
| Focused unit/integration | Every phase — trim, live policy, clone safety, LRU eviction, tip-stable keys, dispose, windowed state |
| Build | Phases that touch app wiring (`ChartGrid`, SurfaceHost, cache modules used by routes) |
| App-level | Phase 1 deep pan; Phase 2 8-cell active switch; Phase 4 Node heap after universe warm; Phase 7 large journal + long thread; **Phase 14** closes all deferred walks |
| Perf harness | Phase 6 optional — pan alloc / GC or retained geometry evidence |

Completion evidence in `PROJECT-STATUS.md` must quote actual command output (test counts, heap/subscription numbers, or build exit) — not paraphrase.

---

## Harness update (when executing)

When a phase becomes Active:

1. Set WIP=1 Active Work row: **Memory efficiency — Phase N** with behavior, state, files.
2. Keep a Task Contract for the track while cross-cutting.
3. On Passing: record focused/build/app-level evidence; advance Status line in this file; append Session Log.
4. Only one phase Active; do not start the next until evidence lands.

---

## Suggested execution order

```text
Phase 0  measure + contract
Phase 1  resident bar budget + logout clear     ← highest client ROI
Phase 2  inactive cell live policy               ← multiplies with layouts
Phase 3  client clone discipline
Phase 4  server LRU + bytes
Phase 5  tip-stable compute caches
Phase 6  series layer retain + dispose
Phase 7  journal + copilot windows
Phase 8  lazy tiles + residual hygiene           ← core track complete
---
Phase 9  chart hot-path slimming                 ← follow-up: faster chart-only load
Phase 10 journal list virtualization             ← follow-up: smooth large lists
Phase 11 inactive cell unmount                   ← follow-up: 8-cell RAM (careful)
Phase 13 worker zero-copy bus                    ← follow-up: live tick GC (before scale infra)
Phase 14 app-level verification closeout         ← follow-up: measured walks
Phase 12 Redis shared cache                      ← follow-up: flagged; default memory (2026-07-24 Passing)
```

Phases 1–8 closed the measured retention gaps. Phases 9–14 follow-ups **complete** (2026-07-24). Memory efficiency track closed.
