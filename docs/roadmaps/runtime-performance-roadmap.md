# Runtime Interaction Performance Roadmap

Make Edge charts and desks feel smooth under live quotes, crosshair scrubbing, drawings, and multi-cell layouts — without re-litigating memory retention or data-serving TTL work already shipped.

**Last updated:** 2026-07-24

**Status:** Phase 0 **Passing**. Phase 1 **Passing** (2026-07-24). Phase 2 **Passing** (2026-07-25). Phase 3 **Passing** (2026-07-25). Phase 4 **Passing** (2026-07-25). Phase 5 **Passing** (2026-07-25). Phases 6–8 **Pending**.

**Related:** [Chart Architecture](../../src/lib/chart/ARCHITECTURE.md), [Market Data Architecture](../../src/lib/marketData/ARCHITECTURE.md), [Chart perf baseline](../perf/chart-baseline-latest.json), [Market data performance](../perf/market-data-performance.md), [Project Status](../PROJECT-STATUS.md), [Repository Constraints](../CONSTRAINTS.md).

**Origin:** 2026-07-24 static performance audit + key-metric framing (frame time, crosshair cost, tip tick cost, React wakeups/quote, cold load).

---

## Intent Classification

- **Primary:** Feature — interaction smoothness and live-update cost changes user-visible chart feel (not a pure refactor).
- **Secondary:** Refactor — invalidation reasons, candle identity, and context subscription shape; Testing — harness scenarios + CI budgets.
- **Arch:** **Required** — self-review per phase. Touches chart runtime invalidation, React context fan-out, indicator compute identity, and optionally server cache write paths.
- **Assumptions:**
  - Memory Efficiency (resident ≤ ~5k bars, inactive engine unmount, tip-stable caches) and Data Serving Efficiency stay closed — this track does **not** reopen TTL/retention policy.
  - Cold load time is mostly provider/network-bound; this track optimizes **interaction** metrics, not broker RTT.
  - Chart harness uses up to 100k bars for stress; product soft-caps ~5k — gates use **both** stress and resident-typical scenarios.
  - Prefer fixing false work (invalidation / fan-out / fingerprint-on-hit) before micro draw-call polish or more WebGL.
  - WIP=1 — one phase Active; quote actual harness/command output before **Passing**.

---

## Checklist Review

- **Architecture review:** **Required** — self-review per phase (chart runtime + shared React providers).
- **Missing:** Documented interaction metric contract; series invalidation includes drawings/selection; crosshair/quote/Copilot fan-out into chart cells; full-series string fingerprints on cache hits; linear `pointToPlot`; pointer-rate drawing store mutations; unvirtualized watchlist/options/Copilot lists; Redis DataCache rewrite-on-touch; no CI perf budgets.
- **Misalignments:** Layered render scheduler + series cache exist, but invalidation reasons and React state still defeat them on common paths.
- **Risks:** Changing invalidation can leave stale series pixels; external-store quote selectors must not break SSE/trust labels; incremental tip compute must match full recompute numerically; per-cell layout stores must preserve persistence/revision sync.
- **Decisions:** Optimize for the five key metrics below; defer canvas stroke batching / WebGL geometry pooling until after Phases 1–4; server work is Phase 7 (secondary to chart feel).

---

## Product goal

After this track, on a typical live chart (≤ resident bar budget, several indicators, some drawings):

1. Crosshair scrubbing stays near the frame budget without occasional multi-hundred-ms spikes.
2. Drawing hover/select/drag does not rebuild the candles+indicators bitmap.
3. Live tip updates recompute tip work, not full indicator histories + full-series hashes.
4. Quote ticks wake only the cells/rows that need that symbol.
5. Long watchlist / options / Copilot lists do not re-render every off-screen row on each tick.
6. Perf harness + CI budgets catch regressions on the metrics below.

### Success criteria (track-level)

| Metric | Meaning | Track target (resident-typical ~1–5k bars) | Stress note (100k harness) |
|--------|---------|---------------------------------------------|----------------------------|
| **Frame time p50 / p95** | One chart update while panning / scrubbing / ticking | p50 **&lt; 16 ms**; p95 **&lt; 33 ms** for crosshair + tip-tick scenarios | Pan/zoom may remain above budget at 100k; record deltas vs Phase 0 baseline |
| **Crosshair cost** | Extra work when only the crosshair moves | Series layers **blit / skip**; no `'data'` full rebuild | p95 should approach p50 (today p50 ~14 ms, p95 ~520 ms @ 100k) |
| **Tip tick cost** | Work when the latest bar updates | Fingerprint/lookup **≪ compute**; tip path O(period)-class for builtins | Microbench: tip replace ≪ full cold compute |
| **React wakeups / quote** | Components re-rendering per quote frame | Inactive chart cells **0**; active cell only if it needs that symbol’s quote | Multi-cell layout proof |
| **Cold load time** | First useful candles | **Out of scope** for regression gates (provider-bound); do not regress warm revisit (~1 ms) | Track separately in `perf:market-data` |

---

## Current baseline (what already works)

| Piece | Assessment |
|-------|------------|
| Resident bar soft max (~5k), inactive live policy, inactive engine unmount | Shipped (Memory Efficiency) |
| RAF `RenderScheduler`, background + series offscreen caches, tip-stable builtin/script caches | Shipped |
| Optional WebGL candles/indicators | Shipped behind flags |
| Client coalesce + chartClientCache SWR; server HotStore/DataCache | Shipped (Data Serving) |
| `npm run perf:chart` / `perf:market-data` baselines | Collect only — **no CI budgets** |
| Journal trades table virtualization | Pattern to reuse |

### Gap inventory

| Priority | Gap | Target phase | Primary metric |
|----------|-----|--------------|----------------|
| P0 | No frozen interaction metric contract / fresh baseline after Memory track | 0 | All |
| P0 | `'drawings'` / `'selection'` in `SERIES_INVALIDATING` | 1 | Crosshair / frame time |
| P0 | Crosshair React state + possible `'data'` redraw | 1–2 | Crosshair cost |
| P0 | Quote / Copilot / account context fan-out into every `ChartCell` | 2 | React wakeups / quote |
| P0 | Full-series string fingerprint on indicator cache hits | 3 | Tip tick + frame time |
| P0 | Live tip misses cache → full `plugin.compute()` | 3 | Tip tick cost |
| P1 | `pointToPlot` linear `findIndex`; hit-test/drag at pointer rate | 4 | Frame time (drawings) |
| P1 | Auto-scale + duplicated indicator resolve every pan event | 5 | Frame time (pan/zoom) |
| P1 | Watchlist / options / Copilot lists unvirtualized | 6 | React wakeups |
| P2 | Workspace/layout updates re-render app root; full JSON stringify | 7 | Frame time + jank |
| P2 | Redis rewrite-on-touch; server miss coalescing; quote key fragmentation | 8 | Server CPU / cold spikes |
| P2 | Perf scripts have no p50/p95 budgets | 8 | Guardrails |
| P3 | Canvas stroke batching, session `Intl` hoist, WebGL typed-array polish | Deferred | Draw-phase ms |

---

## Design principles

1. **Metrics first** — Phase 0 freezes definitions and records baselines before behavior changes.
2. **Remove false work before clever work** — invalidation and fan-out before algorithm micro-opts.
3. **Revision identity over hashing** — candle body/tip revisions beat O(N) string fingerprints on the hot path.
4. **Volatile data stays out of React** — crosshair, per-symbol quotes, and drag previews prefer refs / external stores + narrow selectors.
5. **Layer caches must mean what they say** — drawing/selection/crosshair must not imply series rebuild.
6. **Resident-typical gates + stress deltas** — ship against ~5k feel; keep 100k harness for regressions.
7. **Do not reopen memory/TTL tracks** — no changing resident caps or HotStore TTLs here unless a phase explicitly needs a doc-only cross-link.
8. **WIP=1** — one phase Active; harness evidence before Passing.

---

## Target architecture (interaction path)

```text
Quote / tip / crosshair (volatile)
  → external store or refs + selectors
  → only subscribed UI (Data Window, active cell chrome)

Pointer / drawings
  → RAF-coalesced hit-test
  → imperative drag preview → one store commit on pointer-up
  → DrawReason: drawings | selection  (NOT series-invalidating)

Candles
  → bodyRevision + tipRevision at ingestion
  → indicator / script / HA caches key on revisions
  → tip path: replaceTip / append (builtins); full recompute on body change

RenderScheduler
  → series cache blit on crosshair-only
  → series rebuild on data | size | theme | settings | viewport (as today, minus drawings/selection)
```

---

## Phasing

### Phase 0 — Metric contract + refreshed baseline

**Status:** **Passing** (2026-07-24)

**Outcome:** The five key metrics are defined, instrumented where missing, and recorded in a new baseline artifact. No user-visible behavior change required.

| Work item | Scope |
|-----------|--------|
| Contract | Document metric definitions + targets (table above) in this roadmap + short note in `src/lib/chart/ARCHITECTURE.md` |
| Harness | Extend `examples/chart-perf-harness` / `npm run perf:chart` to report crosshair-only, tip-tick (if feasible), and pan/zoom with **drawingCount &gt; 0** scenarios; tag resident-typical (~5k) vs stress (100k) |
| Wakeups | Dev-only or test helper to count React re-renders of `ChartCell` / watchlist rows per quote frame (or document manual React Profiler protocol) |
| Baseline | Write `docs/perf/runtime-interaction-baseline-latest.json` (+ dated snapshot) from a clean run after Memory track |
| Docs | Link from [ROADMAP.md](../ROADMAP.md) Charting Stage 1 and [market-data-performance.md](../perf/market-data-performance.md) “related” |

**Out of scope:** Behavior fixes; CI fail gates (Phase 8).

**Gate — Phase 0 Passing:** Baseline artifact committed; metric definitions frozen; Task Contract opened for the track.

**Exit review:** self-review.

---

### Phase 1 — Stop false series invalidation (P0)

**Status:** **Passing** (2026-07-24)

**Outcome:** Drawing hover/select/drag and crosshair-only updates do not rebuild the candles+indicators series composite.

| Work item | Scope |
|-----------|--------|
| Invalidation | Remove `'drawings'` and `'selection'` from `SERIES_INVALIDATING` in `packages/chart-react/src/engine/renderScheduler.ts` (keep layers’ own invalidation metadata in sync in `layers.ts`) |
| Crosshair draw | Ensure crosshair path requests `'crosshair'` (or overlay-only), not `'data'`, in `useCanvasRenderer` / coordinator |
| Drawing layer | Confirm drawings + price-axis drawing annotations redraw without series cache bust; add regression tests on reason → cache reuse helpers |
| Verify | Focused scheduler/layer-cache tests; harness: drawing hover/select frame times vs Phase 0; app-level: hover drawings while watching series blit |

**Out of scope:** Hit-test algorithm changes (Phase 4); React fan-out (Phase 2).

**Gate — Phase 1 Passing:** Quoted harness or phase-timing evidence that drawing/selection reasons do not invalidate series cache; focused tests green.

**Exit review:** self-review.

---

### Phase 2 — Cut React wakeups on volatile streams (P0)

**Status:** **Passing** (2026-07-25)

**Outcome:** Quote ticks, Copilot token streaming, and account snapshots do not re-render inactive chart cells.

| Work item | Scope |
|-----------|--------|
| Quotes | Move `quotesBySymbol` to an external store (or equivalent) with per-symbol `useSyncExternalStore` selectors; split actions/meta from quote data in `MarketDataProvider.tsx` |
| Layout deps | Derive stream symbol keys from stable primitives; stop restarting warmup/SSE when only viewport/drawings change |
| Copilot | Split stable actions (`openAnnotationInChat`, etc.) from thread/message state; `ChartCell` consumes actions only |
| Account | Per-symbol position selector for `EdgeChart` reference lines — not full account context |
| Crosshair UI | Keep crosshair in ref/external store; subscribe Data Window / overlays only (`useCellCrosshair`) |
| Verify | Wakeups metric: inactive cells **0** on quote for another symbol; focused provider tests; app-level multi-cell + Copilot stream |

**Out of scope:** Per-cell layout persistence store (Phase 7).

**Gate — Phase 2 Passing:** Quoted wakeup evidence (test spy or Profiler protocol) + focused tests.

**Exit review:** self-review.

---

### Phase 3 — Candle revision identity + tip incremental compute (P0)

**Status:** **Passing** (2026-07-25)

**Outcome:** Indicator/script/HA cache hits do not hash the full series; live tip updates avoid full-history recompute for builtins.

| Work item | Scope |
|-----------|--------|
| Identity | Assign `bodyRevision` / `tipRevision` (or equivalent) at candle ingestion; plumb through chart-core compute + react providers |
| Fingerprint | Replace hot-path `candleValueFingerprint` / tip-stable body hashing with revision keys; keep value fingerprint only where needed for tests/debug |
| Tip path | Incremental `append` / `replaceTip` for EMA, SMA/MA, RSI, ATR, MACD, VWAP (and other builtins with clear recurrence); full recompute on body/input change |
| Consumers | Dedupe frame-level resolve where cheap (`indicatorResultProvider`, script coordinator, HA cache) |
| Verify | Microbench: `indicator-cache-key` ≪ today; tip replace ≪ cold compute; numeric parity tests vs full recompute; harness tip-tick scenario |

**Out of scope:** Rolling O(N×period) → deque math for every study (optional follow-up if tip path still hot).

**Gate — Phase 3 Passing:** Quoted microbench deltas vs Phase 0; parity tests green.

**Exit review:** self-review.

---

### Phase 4 — Drawing interaction hot path (P1)

**Status:** **Passing** (2026-07-25)

**Outcome:** Hit-testing and dragging scale with drawings, not `drawings × candles` linear scans at pointer rate.

| Work item | Scope |
|-----------|--------|
| Coords | Binary search (or stored `dataIndex`) in `pointToPlot` / related helpers in `packages/chart-core/src/drawingCoords.ts` |
| Hit-test | RAF-throttle hover hit-test in `useCanvasGestures`; reuse z-sorted pane lists; optional screen-space bounds before plugin tests |
| Drag | Imperative drag preview + single store commit on pointer-up, or RAF-coalesce store updates (`applyDrawingPointerTransition`, drawing store sync) |
| Verify | Harness with `drawingCount &gt; 0`; focused coords/hit-test tests; app-level drag trend line on dense series |

**Out of scope:** Spatial index overhaul beyond bounds culling unless measurements demand it.

**Gate — Phase 4 Passing:** Quoted drawing-interaction frame times vs Phase 0/1; focused tests green.

**Exit review:** self-review.

---

### Phase 5 — Pan/zoom scale + resolve once per frame (P1)

**Status:** **Passing** (2026-07-25)

**Outcome:** Pan/zoom does not rescan every indicator series and re-fingerprint on every pointer event.

| Work item | Scope |
|-----------|--------|
| Scale cache | Cache visible min/max by quantized index window; invalidate on data/viewport quantum change (`useCanvasGestures`, `indicatorScale.ts`) |
| Frame snapshot | Resolve indicators once per frame; pass snapshot to scale, draw, bar colors, annotations |
| Verify | Harness pan/zoom p50/p95 delta vs Phase 0 at 5k and 100k; focused scale tests |

**Out of scope:** Full GPU transform-in-shader viewport (deferred).

**Gate — Phase 5 Passing:** Quoted pan/zoom harness deltas; no correctness regressions on auto-scale.

**Exit review:** self-review.

---

### Phase 6 — Virtualize heavy lists (P1)

**Status:** **Pending**

**Outcome:** Large watchlist, options chain, and Copilot threads only mount visible rows.

| Work item | Scope |
|-----------|--------|
| Watchlist | Virtualize `WatchlistTable` with `@tanstack/react-virtual` (journal pattern); memoized rows |
| Options | Virtualize strike rows in `OptionsChainTable`; mount popovers only when open |
| Copilot | Memoize bubbles; window/virtualize older messages; isolate streaming message |
| Verify | Profiler/wakeup: quote tick with 200+ watchlist rows updates visible rows only; focused tests where practical |

**Out of scope:** Pattern library / day profiles until collections routinely exceed ~100.

**Gate — Phase 6 Passing:** Quoted list wakeup or render-count evidence; focused tests green.

**Exit review:** self-review.

---

### Phase 7 — Layout persistence fan-out (P2)

**Status:** **Pending**

**Outcome:** Drawing/viewport persistence for one cell does not re-render the entire StockApp tree; large snapshots avoid synchronous main-thread stalls.

| Work item | Scope |
|-----------|--------|
| Cell store | Per-cell or keyed external store / selectors for cell config slices used by grid cells |
| Persist | Dirty-slice persistence; fingerprint by revision; avoid full-workspace `JSON.stringify` on every drawing move (`useStockAppBootstrap`, workspace sync) |
| Drawing sync | Prefer store revision over `JSON.stringify` equality in `useDrawingLayoutSync` / drawing store sync |
| Verify | Multi-cell: edit drawings in cell A — cell B render count stays 0 (or chrome-only); persistence still restores |

**Out of scope:** IndexedDB migration unless stringify stalls remain after dirty slices.

**Gate — Phase 7 Passing:** Quoted multi-cell render evidence + persistence round-trip test.

**Exit review:** self-review.

---

### Phase 8 — Server amplification + CI budgets (P2)

**Status:** **Pending**

**Outcome:** Cache hits are cheap under Redis; duplicate cold misses coalesce; interaction budgets fail CI when regressing.

| Work item | Scope |
|-----------|--------|
| Redis | Touch LRU ZSET / TTL without rewriting full JSON payloads (`redisDataCache.ts`) |
| Coalesce | Server in-flight coalescing for candles/search/fundamentals/context misses |
| Quote keys | Canonical sorted batch keys; revalidation `Set` like candle path |
| Nested bridges | Ensure single `AiSessionBridge` / avoid duplicate Copilot provider poll stacks |
| Snapshot import | Dynamic-import `html-to-image` from chart snapshot path |
| Budgets | Add p50/p95 gates to `perf:chart` (and documented skip for provider-bound market-data cold paths); wire to CI |
| Verify | `npm run perf:chart` fails on intentional budget breach in test; Redis hit path unit test shows no payload rewrite |

**Out of scope:** Paid APM; changing provider routing; journal N+1 rebuild (separate journal track if needed).

**Gate — Phase 8 Passing:** CI budget evidence + Redis/coalesce focused tests; track success criteria table met or explicitly waived with numbers.

**Exit review:** self-review.

---

## Deferred (explicit)

| Item | Why deferred |
|------|----------------|
| Canvas wick/OHLC path batching; color-rule segment merge | Draw-phase polish after false work removed |
| Session `Intl.DateTimeFormat` hoist / precompute session kind | Medium; do if Phase 5 still session-bound |
| WebGL `bufferSubData` / shader viewport transforms | Optional after Canvas interaction budgets met |
| 100k-bar 60 fps pan as a hard product gate | Stress goal only; resident-typical is the ship bar |
| Cold-load broker RTT | Provider/network; track in market-data perf, not here |
| Pattern/day-profile virtualization | Wait until list sizes justify it |

---

## Execution order

```text
Phase 0  metric contract + baseline
   ↓
Phase 1  false series invalidation          ← highest chart ROI
   ↓
Phase 2  React wakeup fan-out
   ↓
Phase 3  revision IDs + tip incremental
   ↓
Phase 4  drawing hit-test / drag
   ↓
Phase 5  pan/zoom scale + frame resolve
   ↓
Phase 6  list virtualization
   ↓
Phase 7  layout persistence fan-out
   ↓
Phase 8  server amplification + CI budgets
```

---

## Verification cheat sheet

| Phase | Focused | App-level / harness |
|-------|---------|---------------------|
| 0 | Harness runs; artifact written | `npm run perf:chart` → `docs/perf/runtime-interaction-baseline-latest.json` |
| 1 | Scheduler / layer-cache unit tests | Drawing hover: series cache reuse; phase timings |
| 2 | Provider selector tests | Multi-cell quote + Copilot stream wakeups |
| 3 | Indicator parity + microbench | Tip-tick + cache-key scenarios |
| 4 | `drawingCoords` / gesture tests | Drag drawings on dense series |
| 5 | Scale unit tests | Pan/zoom harness 5k + 100k |
| 6 | List virtualization tests if present | 200-row watchlist quote tick |
| 7 | Persistence round-trip | Multi-cell render isolation |
| 8 | Redis/coalesce unit + budget test | CI job shows budget gate |

Use `npm run check` when shared chart-core / provider contracts change.

---

## Harness update (when executing)

Activate one phase at a time in `docs/PROJECT-STATUS.md` (WIP=1). On **Passing**, quote actual harness/test output; refresh this file’s **Status:** line and [README.md](./README.md) table via closeout. Commit: **yes** per phase unless docs-only Phase 0 decides otherwise.
