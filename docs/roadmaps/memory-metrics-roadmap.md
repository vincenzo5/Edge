# Comprehensive Memory Metrics Roadmap

Give operators and agents a **layered, comparable snapshot** of Edge memory — not only JS heap — covering browser tab/process cost, GPU/chart surfaces, Node, and local sidecar/Redis when present. This track **measures and reports**; it does not reopen retention policy from [Memory Efficiency](./memory-efficiency-roadmap.md) (complete).

**Last updated:** 2026-07-24

**Status:** Phase 0 **Passing** (2026-07-24). Phase 1 **Passing** (2026-07-24). Phase 2 **Passing** (2026-07-25). Phases 3–6 **Pending**. Complements [Memory Efficiency](./memory-efficiency-roadmap.md) (bounds what we keep), [Runtime Interaction Performance](./runtime-performance-roadmap.md) (frame time / wakeups — not RSS), [Production Observability](./production-observability-roadmap.md) (ops probes/logs/alerts — free stack), and baselines in [docs/perf/](../perf/).

**Related:** [Market Data Architecture](../../src/lib/marketData/ARCHITECTURE.md), [Chart Architecture](../../src/lib/chart/ARCHITECTURE.md), [Observability Architecture](../../src/lib/observability/ARCHITECTURE.md), [memory-baseline-latest.json](../perf/memory-baseline-latest.json), [market-data-performance.md](../perf/market-data-performance.md), [Project Status](../PROJECT-STATUS.md), [Repository Constraints](../CONSTRAINTS.md).

**Origin:** 2026-07-24 conversation — current `perf:memory` JS-heap baselines are lean for a charting app, but do not answer “full Chrome tab cost” or a desk-wide footprint.

---

## Intent Classification

- **Primary:** Testing / Feature — new measurement surfaces and baseline fields change the verification contract (and optionally a CLI report), not product retention defaults.
- **Secondary:** Architecture — extend `scripts/run-memory-baseline.mts` + `docs/perf` + observability notes; do not add a parallel telemetry product.
- **Arch:** **Required** — self-review per phase. Touches Playwright/CDP harness, optional process sampling, and baseline schema.
- **Assumptions:**
  - Memory Efficiency Phases 0–14 stay **closed** — this track does not change soft max / inactive unmount / cache caps unless a metric proves a contract bug.
  - **Free / local only** for this track: Playwright + CDP + process RSS + existing Node `process.memoryUsage()`. No paid APM/RUM as a required dependency (aligns with Production Observability free-stack).
  - Chrome Task Manager “Memory” is the **user-facing** target; automated capture will approximate it (renderer/process RSS) and document any known delta.
  - Full GPU VRAM is often opaque in headless Chromium — Phase 3 is best-effort + explicit “unknown” fields, not fake precision.
  - WIP=1 — one phase Active; quote actual command output before **Passing**.

---

## Checklist Review

- **Architecture review:** **Required** — self-review per phase (perf harness + baseline schema; avoid `app` ← `lib` violations).
- **Missing:** Metric layer contract; tab/process RSS in baselines; UA-specific memory; GPU/surface accounting; sidecar/Redis in the same snapshot; human scorecard; soak/leak gate on process+heap; CI soft budgets.
- **Misalignments:** `perf:memory` already uses Playwright but only reads `performance.memory` (JS heap). Server RSS exists for Node warm only. Production Observability owns live ops probes — this track owns **lab/scorecard memory**, not `/healthz`.
- **Risks:** Process RSS sampling is OS/Chromium-version sensitive; headless ≠ headed Task Manager; `measureUserAgentSpecificMemory` may need isolation headers; over-fitting CI budgets to one Mac M-series machine.
- **Decisions:** Layers below are the source of truth; Phase 0 freezes names before code; soft budgets before hard CI fail; defer continuous production memory RUM.

---

## Product goal

After this track, one command (or short report) answers:

1. **How heavy is the tab?** (closest automated equivalent to Chrome Task Manager)
2. **How much of that is our JS?** (heap / UA-specific breakdown)
3. **Are charts multiplying cost?** (engines, canvases, EventSources, resident bars)
4. **How heavy is the local desk?** (Node + optional TWS sidecar + Redis)
5. **Is it leaking over time?** (soak delta on heap + process)

### Success criteria (track-level)

| Question | Metric layer | Evidence |
|----------|--------------|----------|
| App JS cost | `jsHeapUsedMb` (+ UA-specific when available) | In `memory-baseline-latest.json` |
| Tab-like cost | Renderer / browser process RSS (MB) | Automated in `perf:memory`; methodology documented |
| Chart surface cost | Mounted engines, canvas/WebGL counts, best-effort GPU | Baseline fields; unknowns explicit |
| Product bounds | Candles ≤ soft max; cache caps | Existing fields remain pass/fail |
| Desk footprint | Node RSS/heap + sidecar RSS + Redis used (when configured) | Composite section in baseline/report |
| Leak signal | Heap + process delta over soak | Phase 6 scenario with pass criteria |
| Operator UX | One scorecard (CLI or markdown summary) | `npm run perf:memory` summary and/or `report:memory` |

---

## Metric layers (source of truth)

Read top → bottom for a quick snapshot. Lower layers explain *why* an upper layer moved.

| # | Layer | What it means | Today | Target phase |
|---|-------|---------------|-------|--------------|
| L1 | **Product counters** | Candles, engines, EventSources, cache entry caps | Partial in `perf:memory` | Keep; enrich in 1–3 |
| L2 | **JS heap** | V8 heap used/total (`performance.memory` / Node `heapUsed`) | Yes | Keep as leak canary |
| L3 | **UA-specific memory** | Browser breakdown via `measureUserAgentSpecificMemory()` when available | No | 1 |
| L4 | **Tab / renderer process** | Closest to Chrome Task Manager “Memory” | No (manual only) | 2 |
| L5 | **GPU / WebGL surfaces** | Contexts, canvas pixels, best-effort GPU mem | Engines only | 3 |
| L6 | **Node process** | Server RSS + heap around cache warm | Partial | 4 (compose) |
| L7 | **Sidecar / Redis** | TWS sidecar RSS; Redis `used_memory` when configured | Separate / health only | 4 |
| L8 | **Desk composite** | Sum/view of L4–L7 for “whole local stack” | No | 4–5 |
| L9 | **Soak deltas** | Δ heap + Δ process over N minutes | Short live tip only | 6 |

**Not in scope for this track:** paid continuous RUM; shipping memory to Datadog/Sentry; changing Memory Efficiency caps; frame-time budgets ([runtime-performance-roadmap.md](./runtime-performance-roadmap.md)).

---

## Quick snapshot (operator cheat sheet)

After Phase 5, the scorecard should highlight these first:

1. **Tab/process MB** (L4) — “how heavy does this feel?”
2. **JS heap MB + Δ** (L2) — “is our app leaking?”
3. **maxCandlesLength / withinSoftMax** (L1) — “are we over the bar budget?”
4. **mountedEngines** (L1/L5) — “are inactive cells parked?”
5. **Node RSS + sidecar RSS** (L6/L7) — “is the desk backend fat?”
6. **withinDataCacheCap / withinHotStoreCap** (L1) — “server caches bounded?”

---

## Current baseline (what already works)

| Piece | Location | Assessment |
|-------|----------|------------|
| JS heap browser scenarios | `scripts/run-memory-baseline.mts` → `jsHeapUsedMb` | Strong leak canary; not tab memory |
| Node heap/RSS on cache warm | Same script → `heapUsed*Mb`, `rss*Mb` | Good server slice |
| Product counters | candles, EventSources, inactive surfaces, engines, cache caps | Strong for efficiency track |
| Playwright harness | Chromium launch in `perf:memory` | Ready to attach CDP / process sampling |
| Manual Task Manager | Chrome Shift+Esc | Ground truth for L4; not automated |
| Market-data latency telemetry | Dev Data Health | Latency, not memory |
| Production Observability | Probes / logs track | Ops health; not memory scorecard |

### Gap inventory

| Priority | Gap | Target phase |
|----------|-----|--------------|
| P0 | No frozen layer contract / field names | 0 |
| P0 | No automated tab/process MB | 2 |
| P1 | No UA-specific memory / CDP Performance metrics | 1 |
| P1 | No GPU/surface accounting beyond engines | 3 |
| P1 | No desk composite (Node + sidecar + Redis) | 4 |
| P2 | No single human scorecard / report command | 5 |
| P2 | No soft CI budgets on memory fields | 5 |
| P2 | Soak only covers short tip; no process Δ gate | 6 |
| P3 | Continuous production memory RUM | Deferred (free-stack later / out of scope) |

---

## Design principles

1. **Layers over one magic number** — always report L1–L4 together; never replace heap with process-only.
2. **Name the methodology** — every automated L4/L5 field cites how it was sampled and how it differs from Task Manager.
3. **Unknown &gt; fake** — if GPU VRAM cannot be read, store `null` + `note`, not 0.
4. **Extend `perf:memory`** — prefer enriching `docs/perf/memory-baseline-latest.json` over a second baseline format.
5. **Free / local** — Playwright, CDP, `ps`/proc sampling, Redis INFO; no paid SaaS required.
6. **Soft budgets first** — warn in report before failing CI.
7. **WIP=1** — one phase Active; harness evidence before Passing.

---

## Proposed Plan

### Phase 0 — Metric contract and scorecard skeleton

**Band:** Now  
**Status:** **Passing** (2026-07-24)

**Outcome:** Everyone agrees what “comprehensive” means before code changes.

| Work item | Scope |
|-----------|--------|
| Layer table | This doc’s Metric layers section is source of truth; link from `docs/perf/market-data-performance.md` memory bullet and Memory Efficiency “measure” notes |
| Field schema | Planned JSON keys for L3–L8 in **Planned baseline JSON keys** below (no separate contract file) |
| Scorecard template | Markdown table in **Scorecard template** below |
| Manual ground truth | **Manual ground truth (L4)** procedure below |
| Boundary notes | **Phase 0 non-goals** below |

**Out of scope:** Runtime code.

**Exit evidence:** Cross-links resolve; `npm run lint:roadmap-status` / `lint:instructions` if indexes touched; Phase 1 unblocked.

**Gate — Phase 0 Passing:** Contract + cheat sheet + gaps accepted; no metric rename churn in later phases without doc bump. **Met.**

#### Planned baseline JSON keys (L3–L8)

Frozen field names for Phases 1–4. Extend existing scenario objects in `docs/perf/memory-baseline-*.json`; keep all current L1/L2 keys (`jsHeapUsedMb`, `jsHeapTotalMb`, `heapBeforeMb`, `heapAfterMb`, `heapDeltaMb`, `rssBeforeMb`, `rssAfterMb`, `rssDeltaMb`, `heapUsedBeforeMb`, `heapUsedAfterMb`, `maxCandlesLength`, `withinSoftMax`, `mountedEngines`, `inactiveChartSurfaces`, `eventSourceCount`, `withinDataCacheCap`, `withinHotStoreCap`, …).

**Rule:** unknown → `null` + `*Note` or `*UnavailableReason`; never fake `0` for missing GPU/process data.

| Layer | Keys | Phase | Notes |
|-------|------|-------|-------|
| **L3 — UA-specific** | `uaSpecificMemoryBytes`, `uaSpecificMemoryMb`, `uaSpecificUnavailableReason` | 1 | From `performance.measureUserAgentSpecificMemory()` when available |
| **L3 — CDP Performance** | `cdpJsHeapUsedSizeMb`, `cdpJsHeapTotalSizeMb` | 1 | From CDP `Performance.getMetrics`; optional siblings only when clearly useful |
| **L4 — Tab / process** | `processRssBeforeMb`, `processRssAfterMb`, `processRssDeltaMb`, `processSampleMethod`, `processSampleNote` | 2 | Closest automated analogue to Chrome Task Manager “Memory”; `processSampleNote` records headless vs headed |
| **L5 — GPU / surfaces** | `canvasCount`, `webglContextCount`, `gpuMemoryMb`, `gpuMemoryNote` | 3 | `gpuMemoryMb` nullable; best-effort WebGL debug extensions |
| **L6–L8 — Desk composite** | Top-level `desk` object: `browserProcessRssMb`, `nodeRssMb`, `sidecarRssMb`, `redisUsedMb`, `totalKnownMb`, `skippedNoSidecar`, `skippedNoRedis` | 4 | Sum/view of local stack; skips explicit when sidecar/Redis absent |
| **L9 — Soak deltas** | `soakDurationSec`, `soakHeapDeltaMb`, `soakProcessRssDeltaMb` | 6 | Dual delta gate; extends existing B3 live-tip fields |

**Sanity (Phase 2+):** when both L4 and L2 present on the same scenario, expect `processRssAfterMb` ≥ `jsHeapUsedMb`; warn if inverted (sampling bug).

#### Scorecard template

Phase 5 will print this from `memory-baseline-latest.json`. Until then, operators fill manually after `npm run perf:memory`:

| Tab MB (L4) | Heap MB (L2) | Δ Heap | Candles (L1) | Engines (L1) | Node RSS (L6) | Sidecar RSS (L7) | Caps OK (L1) |
|-------------|--------------|--------|----------------|--------------|---------------|------------------|--------------|
| _Phase 2_ | e.g. 73.05 | e.g. 0 | e.g. 3960 | e.g. 1 | e.g. 342.22 | _Phase 4_ | e.g. yes |

**Caps OK** = `withinSoftMax` ∧ `withinDataCacheCap` ∧ `withinHotStoreCap` for the relevant scenarios (browser + node-server-cache-warm).

#### Manual ground truth (L4)

Compare future automated L4 to Chrome Task Manager on a **headed** desktop run (headless CI values will differ — record both in evidence when calibrating Phase 2):

1. `npm run dev` → open `http://localhost:3003` workspace with one chart cell (matches `browser-b1-1cell-10x-loadMore`).
2. Run 10× chart load-more (or full `npm run perf:memory` and note the B1 post-scenario state).
3. Chrome → **Shift+Esc** (Task Manager) → find the Edge tab/renderer row → record **Memory** column (MB).
4. Store reading in evidence as `taskManagerMemoryMb`; Phase 2 will compare to `processRssAfterMb` from the same scenario.
5. Optional: repeat for `browser-b2-8cell-10x-loadMore` (8-cell layout, one mounted engine expected).

#### Phase 0 non-goals

- **Runtime interaction performance** — frame time / wakeups belong in [runtime-performance-roadmap.md](./runtime-performance-roadmap.md), not this track.
- **Production observability probes** — `/healthz`, `/readyz`, request logs belong in [production-observability-roadmap.md](./production-observability-roadmap.md); this track owns lab/scorecard memory only.
- **Retention retune** — do not change `RESIDENT_BAR_SOFT_MAX`, inactive unmount, or cache caps from [memory-efficiency-roadmap.md](./memory-efficiency-roadmap.md) unless a metric proves a contract bug.
- **Absolute MB CI fail** — soft budgets only until Phase 5 calibration; no hard fail on process RSS across machines in Phase 0–4.

#### Phase 0 results (2026-07-24)

- Layer table (L1–L9), planned JSON keys, scorecard template, and manual L4 procedure frozen in this doc.
- Cross-links: [market-data-performance.md](../perf/market-data-performance.md) memory bullet; [memory-efficiency-roadmap.md](./memory-efficiency-roadmap.md) measure successor note.
- Evidence: [memory-metrics-phase-0.txt](../evidence/memory-metrics-phase-0.txt).
- **Architecture review:** self-review **Passed** — docs-only contract freeze; no runtime or boundary change.
- **Next:** Phase 1 — UA-specific + CDP in-page browser metrics.

---

### Phase 1 — Richer in-page browser metrics

**Band:** Now  
**Status:** **Passing** (2026-07-24)

**Outcome:** Baseline captures more than `performance.memory`, still inside the page.

| Work item | Scope |
|-----------|--------|
| CDP Performance metrics | Via Playwright CDP session: `Performance.getMetrics` (JSHeapUsedSize, etc.) alongside existing fields |
| UA-specific memory | Call `performance.measureUserAgentSpecificMemory()` when available; record bytes + `unavailableReason` otherwise |
| Schema | Add fields under each browser scenario; keep old keys for continuity |
| Tests | Unit/helper tests for metric normalization (MB rounding, null handling) |

**Out of scope:** Process RSS (Phase 2); GPU (Phase 3).

**Exit evidence:** Focused tests for helpers; `npm run perf:memory` writes new fields; architecture note in chart or observability doc (one paragraph).

**Gate — Phase 1 Passing:** Latest JSON includes L3 (or explicit unavailable) and CDP heap metrics without breaking existing pass flags. **Met.**

#### Phase 1 results (2026-07-24)

- `scripts/memory-baseline-metrics.ts` — MB normalization + UA/CDP field mappers with Vitest.
- `scripts/run-memory-baseline.mts` — L3 collection on browser B1/B2/B3 via CDP + `measureUserAgentSpecificMemory()`.
- `src/lib/observability/ARCHITECTURE.md` — lab L3 paragraph (UA unavailable without COOP/COEP).
- Evidence: [memory-metrics-phase-1.txt](../evidence/memory-metrics-phase-1.txt).
- **Architecture review:** self-review **Passed** — measurement-only; no product retention or header changes.
- **Next:** Phase 2 — tab/renderer process RSS (Task Manager analogue).

---

### Phase 2 — Tab / renderer process memory (Task Manager analogue)

**Band:** Now  
**Status:** **Passing** (2026-07-25)

**Outcome:** Automated **L4** number comparable to Chrome Task Manager for the Edge tab/renderer.

| Work item | Scope |
|-----------|--------|
| Process sampling | From Playwright Chromium: sample renderer or tab-associated process RSS (CDP and/or OS `ps`/proc on the browser PID tree) |
| Scenario hooks | Record `processRssBeforeMb` / `processRssAfterMb` / `processRssDeltaMb` on B1/B2/B3 (and note headless) |
| Methodology doc | In this roadmap or `docs/perf/market-data-performance.md`: how to reproduce manually in Task Manager; known headless vs headed delta |
| Sanity | L4 ≥ L2 when both present (warn if inverted — sampling bug) |

**Out of scope:** Forcing headed CI; GPU VRAM.

**Exit evidence:** `perf:memory` JSON shows L4; one evidence note with optional manual Task Manager compare on a desktop run.

**Gate — Phase 2 Passing:** B1/B2 scenarios emit process RSS; methodology documented; existing L1/L2 gates still pass. **Met.**

#### Phase 2 methodology (L4)

Automated L4 uses OS `ps` on the Playwright Chromium PID tree (`scripts/memory-process-rss.ts`):

1. Root PID = `browser.process().pid` from Playwright launch.
2. Parse `ps -axo pid=,ppid=,rss=,comm=` (darwin/linux only; Windows → null + note).
3. Walk descendants of root PID; select **max RSS** among renderer-like processes (`*Renderer*` in `comm`).
4. If no renderer child is found, fall back to browser root PID RSS (`os-ps-browser-fallback`).
5. Record `processSampleMethod`, `processSampleNote` (includes `headless=true|false`, platform, selected PID).
6. Sanity: console warns when `processRssAfterMb` &lt; `jsHeapUsedMb` on the same scenario.

**Headless vs Task Manager:** CI/local `perf:memory` runs headless Chromium; Chrome Task Manager (Shift+Esc) on a headed desktop run will read higher and is the optional ground truth — see **Manual ground truth (L4)** above. Do not hard-fail on absolute MB delta across modes.

#### Phase 2 results (2026-07-25)

- `scripts/memory-process-rss.ts` — OS `ps` parse + max-renderer RSS selection.
- `scripts/memory-baseline-metrics.ts` — L4 normalize + L4≥L2 sanity helper.
- `scripts/run-memory-baseline.mts` — before/after L4 on B1/B2/B3.
- Tests: `scripts/memory-process-rss.test.ts`, extended `memory-baseline-metrics.test.ts`.
- Evidence: [memory-metrics-phase-2.txt](../evidence/memory-metrics-phase-2.txt).
- **Architecture review:** self-review **Passed** — measurement-only; unknown → null; no retention changes.
- **Next:** Phase 3 — GPU / chart surface accounting.

### Phase 3 — GPU / chart surface accounting

**Band:** Now  
**Status:** **Pending**

**Outcome:** Explain chart-specific cost beyond “one heap number.”

| Work item | Scope |
|-----------|--------|
| Surface inventory | Count canvases, OffscreenCanvas usage signals if exposed, WebGL contexts; keep `mountedEngines` / inactive surfaces |
| Best-effort GPU | Use debug/memory WebGL extensions when present; otherwise `gpuMemoryMb: null` + note |
| Multi-cell proof | B2 already expects 1 mounted engine — assert surface counts align |
| Docs | Chart ARCHITECTURE: what we can/cannot measure for WebGL memory |

**Out of scope:** Rewriting WebGL renderers; forcing GPU memory APIs that do not exist.

**Exit evidence:** New L5 fields in baseline; focused tests for counters; doc paragraph.

**Gate — Phase 3 Passing:** B2 reports surface/WebGL inventory consistent with inactive-unmount policy; unknowns are null, not zero-filled.

---

### Phase 4 — Desk composite (Node + sidecar + Redis)

**Band:** Pre-launch  
**Status:** **Pending**

**Outcome:** One snapshot of the **local desk** footprint, not only the browser.

| Work item | Scope |
|-----------|--------|
| Node | Keep/extend RSS + heap around warm; optional idle vs warm pair |
| TWS sidecar | If sidecar reachable, sample process RSS (or sidecar `/health` memory field if added cheaply); else `skippedNoSidecar` |
| Redis | If `REDIS_URL` / health exposes memory, record `used_memory`; else skip |
| Composite | `desk.browserProcessRssMb`, `desk.nodeRssMb`, `desk.sidecarRssMb`, `desk.redisUsedMb`, `desk.totalKnownMb` |

**Out of scope:** Remote multi-instance aggregation; k8s cgroup metrics.

**Exit evidence:** Composite section in JSON; skips are explicit; no secrets in output.

**Gate — Phase 4 Passing:** Composite present; skips labeled; redaction-safe.

---

### Phase 5 — Scorecard report and soft budgets

**Band:** Pre-launch  
**Status:** **Pending**

**Outcome:** Humans get a 10-second read; CI can warn on regressions.

| Work item | Scope |
|-----------|--------|
| Report | Human summary at end of `perf:memory` and/or `npm run report:memory` reading `memory-baseline-latest.json` |
| Soft budgets | Configurable thresholds (heap Δ, process RSS ceiling, candles soft max already) — **warn** by default |
| Docs | Cheat sheet points at report output; link from AGENTS Verify examples (one line) if appropriate |
| Optional UI | **Defer** Data Health memory panel unless report proves daily need |

**Out of scope:** Hard-fail CI on absolute MB across machines without calibration; production RUM.

**Exit evidence:** Report command shows L1–L8 table; soft budget warnings demonstrated in evidence file.

**Gate — Phase 5 Passing:** Scorecard reproducible from latest JSON; budgets documented.

---

### Phase 6 — Soak / leak regression

**Band:** Pre-launch  
**Status:** **Pending**

**Outcome:** Catch “fine at 1 minute, fat at 30” on heap **and** process.

| Work item | Scope |
|-----------|--------|
| Soak scenario | Extend live-tip / dedicated soak (`MEMORY_SOAK_SEC`, default gated for CI length) |
| Dual delta | Fail/warn if `heapDeltaMb` or `processRssDeltaMb` exceeds budget over soak |
| Evidence | Record duration, deltas, EventSource count stability |

**Out of scope:** Overnight soak in default CI; production canaries.

**Exit evidence:** Soak scenario in baseline; budget behavior tested (unit or script flag).

**Gate — Phase 6 Passing:** Soak emits dual deltas; documented how to run full-length locally.

---

## Verification Plan

| Phase | Focused | App-level / collection | Notes |
|-------|---------|------------------------|-------|
| 0 | `lint:roadmap-status` / `lint:instructions` if indexes/docs entry touched | N/A | Docs only |
| 1–3 | Helper/unit tests for metric readers; existing memory-related tests | `npm run perf:memory` | Quote new JSON fields |
| 4 | Skip-path unit tests; no secret asserts | `perf:memory` with/without sidecar/Redis | Explicit skips OK |
| 5 | Report formatting tests if non-trivial | `perf:memory` or `report:memory` stdout scorecard | Soft budget warn path |
| 6 | Budget math tests | Soak run with short env override | Full soak local-only OK |

Architecture review: self-review **Passed** required each phase before harness **Passing**.

---

## Harness Update

- Activate **Memory metrics — Phase 0** under WIP=1 when starting (do not parallel Production Observability Active work).
- On each phase **Passing:** quote actual `perf:memory` / lint / test output; update this file’s Status line + [README](./README.md) table + [ROADMAP.md](../ROADMAP.md) near-term bullet.
- Task Contract if Phase 2+ spans sessions.
- **Commit:** yes per phase closeout (unless plan says skip).

---

## Deferred

| Item | Why |
|------|-----|
| Continuous production memory RUM | Needs product decision; free-stack successor only after Production Observability core |
| Hard CI fail on absolute process MB | Machine variance (headed/GPU/CI images) |
| Data Health memory panel | Wait for daily scorecard pain |
| Paid APM heap profiles | Forbidden as required dep by Observability constraints |

---

## Execution notes

- Prefer enriching `scripts/run-memory-baseline.mts` over new scripts unless Phase 5 report deserves `scripts/report-memory.mts`.
- Baseline artifacts stay under `docs/perf/memory-baseline-*.json` with `memory-baseline-latest.json` pointer.
- When comparing to peers, cite **same layer** (L4 vs L4, not heap vs Task Manager).
