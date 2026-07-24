# Script Depth Roadmap

Deepen private Edge TypeScript indicator scripts toward Pine-like *capability* — richer TA, visuals, multi-timeframe data, condition alerts, and optional script-managed drawings — without adopting Pine Script syntax or a public marketplace.

**Last updated:** 2026-07-22

**Status:** Phase 0 **Passing**; Phase 1 **Passing** — TA helper expansion shipped (`edge-indicator-sdk-2`); Phase 2 **Passing** — richer declarative plot visuals shipped (`edge-indicator-sdk-3`); Phase 3 **Passing** — multi-timeframe / multi-symbol `request.series` shipped (`edge-indicator-sdk-4`); Phase 4 **Passing** — script condition alerts handoff (`edge-indicator-sdk-5`); Phase 5 **Passing** — script-managed drawing objects (`edge-indicator-sdk-6`). **Track complete.** Deferred app-level walks → [app-level-verification-roadmap.md](./app-level-verification-roadmap.md) Phase 3. V1 scripting foundation is **Passing** via [typescript-indicator-scripting-roadmap.md](./typescript-indicator-scripting-roadmap.md).

**Related:** [TypeScript Indicator Scripting Roadmap](./typescript-indicator-scripting-roadmap.md), [Alerts Roadmap](./alerts-roadmap.md), [Chart Engine Architecture](../../src/lib/chart/ARCHITECTURE.md), [Indicator Runtime Architecture](../../packages/indicator-runtime/ARCHITECTURE.md), [Plugin API](../chart/prereqs/plugin-api.md), [User Script Examples](../chart/script-examples.md), [TradingView Reference §5](../chart/tradingview-reference.md#58-tradingview-vs-edge--indicators-summary), [Project Status](../PROJECT-STATUS.md), [Repository Constraints](../CONSTRAINTS.md).

---

## Intent Classification

- **Primary:** Feature — expand what private My scripts can compute and display on the chart.
- **Secondary:** Testing — SDK versioning, declarative visual contracts, data-request budgets, and alert/drawing boundaries need explicit verification.
- **Checklists applied:** `feature-planning-checklist.md`, `testing-verification-checklist.md`, `harness-status-checklist.md`, `architecture-review-checklist.md`.
- **Assumptions:**
  - Authoring language remains Edge TypeScript (`edgeScript()`), not Pine.
  - Scripts stay private and chart-scoped until later phases explicitly widen that.
  - Manual chart drawing tools remain separate from script-managed visual objects.

## Checklist Review

- **Architecture review:** **Required** — every implementation phase needs its own exit review (`self-review` minimum; `architect agent` or `human` when contracts cross market-data, alerts, or drawing platforms). Touches chart-core contracts, indicator-runtime TA/guest bootstrap, chart-react rendering, optional market-data multi-series fetches, and later alerts/drawings.
- **Aligned:** V1 already has compile → guest execute → validated series → async result provider → Canvas/WebGL/legend; `pane: "main" | "sub"`; declarative plots `line | histogram | hline | band`; starter TA SDK; versioned `SCRIPT_LANGUAGE_VERSION` / `SCRIPT_SDK_VERSION`.
- **Missing:** Broader TA surface; marker/bgcolor/plot-style visuals; multi-timeframe/multi-symbol request API; script condition → alert handoff; script-managed drawing objects with lifecycle limits.
- **Misalignments:** Pine’s imperative `line.new` / `label.new` model conflicts with Edge’s “no custom `draw()` / serializable plots only” V1 security decision — Phase 5 must stay declarative or tightly capability-gated, not reopen arbitrary canvas access. Script alerts must not fork a second alert engine; they should feed [alerts-roadmap.md](./alerts-roadmap.md).
- **Risks:** SDK growth without versioning breaks saved scripts; marker/bgcolor spam freezes interaction; MTF requests explode fetch/cache cost; script drawings collide with user drawings; alert evaluation of untrusted scripts on the server is unsafe.
- **Recommendations:** Expand **compute then declare** first (TA → plot richness → MTF). Keep strategies/Pine syntax/community out of scope. Bump `SCRIPT_SDK_VERSION` (and language version when syntax changes) per phase. Prefer client-side script evaluation for alerts until a trusted compile-to-condition path exists.

---

## Approved Product Decisions

1. **Not Pine syntax** — no Pine parser, Pine compatibility layer, or “paste TradingView code” promise.
2. **Private scripts remain the default** — no public library or marketplace in this track.
3. **Declarative visuals stay the default** — series and bounded plot/object declarations; no guest Canvas/DOM/WebGL.
4. **TA and plot richness before object drawings** — markers/bgcolor/styles unlock most signal UX without Pine drawing objects.
5. **Script alerts depend on the Alerts track** — Phase 4 produces conditions; delivery/persistence live in [alerts-roadmap.md](./alerts-roadmap.md).
6. **Strategies / backtests / orders stay deferred** — separate product surface, not an indicator-scripting add-on.
7. **Versioned SDK** — each phase that adds helpers or plot kinds bumps `SCRIPT_SDK_VERSION` and documents migration for saved revisions.

---

## Product Goal

A user (or AI acting for them) can write a private Edge script that uses a capable TA toolkit, draws rich indicator visuals (including separate sub-panes), optionally pulls other timeframes/symbols, and later attaches alert conditions or bounded script-managed annotations — without rebuilding Edge and without gaining unsafe host capabilities.

## Success Criteria (track-level)

- Common custom indicators (MACD/Stoch/CCI-class, signal markers, condition tints) are authorable without new built-in plugins.
- New plot kinds render through the existing async result provider (draw/scale/legend/WebGL stay consistent).
- Multi-series requests are budgeted, cancellable, and fingerprint-invalidated like today’s candle sessions.
- Script alert conditions reuse the shared alerts engine; untrusted source never executes on the server.
- Script-managed drawings (if shipped) are capped, serializable, and cannot call arbitrary `draw()`.
- Built-in indicators and V1 scripts keep working across SDK bumps (or fail with clear stale/migration diagnostics).

---

## Current Baseline (V1 — already shipped)

| Area | Today |
|------|--------|
| Language | TypeScript `edgeScript()` → compile + QuickJS-WASM guest |
| Placement | `pane: "main" \| "sub"` |
| Plots | `line`, `histogram`, `hline`, `band` (+ bounded `colorRules`) |
| TA SDK | `sma`, `ema`, `stddev`, `rsi`, `atr`, `roc`, `highest`, `lowest`, `source` |
| Data | Current chart candles + validated inputs only |
| Out of scope in V1 | Markers, bgcolor/barcolor, MTF/MS, alerts, drawing objects, strategies, Pine |

---

## Proposed Plan (phased)

### Phase 0 — Contract freeze and depth inventory

**Goal:** Lock the extension seams before growing the SDK or renderer.

| Work | Detail |
|------|--------|
| Inventory | Map Pine-like capabilities → Edge phase; mark Adopt / Adapt / Defer / Skip |
| Contracts | Document how `ScriptPlotKind`, `HOST_TA_SDK`, guest bootstrap, and `SCRIPT_SDK_VERSION` extend additively |
| Fixtures | Reserve golden fixture IDs / example slots for each upcoming phase |
| Docs | Cross-link this roadmap from scripting V1 deferrals, features.md, ROADMAP index |

**Gate — Phase 0 Passing:** Inventory table accepted; additive extension rules written in `packages/indicator-runtime/ARCHITECTURE.md` + `scriptContracts.ts` comments or companion doc section; no runtime behavior change required.

**Exit review:** self-review.

#### Phase 0 results — Pine→Edge capability inventory

Disposition key: **Adopt** = Edge-native helper/API; **Adapt** = declarative Edge equivalent (not Pine syntax); **Defer** = later phase or platform dependency; **Skip** = explicit out-of-scope.

| Capability class | Pine / TradingView reference | Disposition | Edge phase | Notes |
|------------------|------------------------------|-------------|------------|-------|
| Extra TA movers (`wma`, `vwma`) | `ta.wma`, volume-weighted averages | **Adopt** | 1 | Pure series math on guest candles |
| Composites (`macd`, `stoch`, Bollinger ergonomics) | `ta.macd`, `ta.stoch`, `ta.bb` | **Adopt** | 1 | Compose from existing + new helpers |
| Oscillators / strength (`cci`, `adx`/`dmi`, `obv`) | `ta.cci`, `ta.dmi`, `ta.obv` | **Adopt** | 1 | Prioritize by fixture demand |
| Glue (`crossover`, `crossunder`, `change`, `percentChange`) | Pine cross/change helpers | **Adopt** | 1 | Null-safe series utilities |
| Signal markers / `plotshape` | `plotshape`, arrows, dots at bars | **Adapt** | 2 | Declarative `marker` plot kind; bounded counts |
| Background / bar tints | `bgcolor`, `barcolor` | **Adapt** | 2 | Bounded opacity/segment budgets |
| Richer series styles | stepline, columns, circles, area | **Adapt** | 2 | Style enums on existing plot kinds where possible |
| Multi-timeframe / multi-symbol | `request.security` | **Adapt** | 3 | Host `request.series({ symbol?, interval })`; guest never `fetch` |
| Script alert conditions | `alertcondition`, `alert()` | **Adapt** | 4 | Handoff to [alerts-roadmap.md](./alerts-roadmap.md); client-side eval v1 |
| Script-managed objects | `line.new`, `box.new`, `label.new` | **Adapt** / **Defer** | 5 | Bounded declarative objects; not arbitrary canvas |
| Pine syntax / import TV scripts | Pine Script language | **Skip** | — | Edge TypeScript only |
| Strategies / backtests / orders | `strategy()` | **Skip** | — | Separate product surface |
| Public / community marketplace | TradingView library | **Skip** | — | Private My scripts only |
| Arbitrary Canvas / DOM / WebGL from guest | Pine `draw()`-class access | **Skip** | — | Security boundary unchanged |
| Screener-wide script evaluation | Pine on watchlists | **Skip** | — | Chart-scoped only |
| Language server / debugger IDE | Pine editor tooling | **Defer** | — | Monaco highlighting only today |

#### Phase 0 results — reserved golden fixture slots

Reserved for upcoming phases — **not** in `ScriptFixtureId` until implemented. See `RESERVED_SCRIPT_DEPTH_FIXTURE_SLOTS` in [`packages/chart-core/src/scriptFixtures.ts`](../../packages/chart-core/src/scriptFixtures.ts).

| Phase | Reserved fixture IDs |
|-------|----------------------|
| 1 | `ta-wma`, `ta-macd-compose`, `ta-stoch`, `ta-cci`, `ta-cross-glue` |
| 2 | `plot-marker-signal`, `plot-bgcolor-band`, `plot-style-stepline` |
| 3 | `request-htf-sma`, `request-dual-symbol` |
| 4 | `alert-condition-cross` |
| 5 | `object-box-label` |

---

### Phase 1 — TA helper expansion *(foundational compute)*

**Goal:** Author most classic custom indicators from scripts without new built-in plugins.

| Work | Detail |
|------|--------|
| Core movers | `wma`, `vwma` / volume-weighted helpers as needed |
| Composites | `macd`, `stoch` (or documented compose recipes + helpers), Bollinger-style mean+stddev ergonomics |
| Oscillators / strength | `cci`, `adx`/`dmi`, `obv` (prioritize by fixture demand) |
| Glue | `crossover`, `crossunder`, `change`, `percentChange`, null-safe fill helpers |
| Versioning | Bump `SCRIPT_SDK_VERSION`; keep host `taSdk.ts` and guest bootstrap in lockstep |
| Docs / AI | Update `docs/chart/script-examples.md` and AI authoring context with the new helpers |

**In scope:** Pure series math on candles already provided to the guest.  
**Out of scope:** New plot kinds, MTF fetches, drawings, alerts.

**Gate — Phase 1 Passing:** Focused TA unit tests + guest execute fixtures for each new helper; package lint/typecheck/build; build; at least one example script (e.g. Stoch or CCI) runs on chart via existing plot kinds; architecture review Passed.

**Exit review:** self-review (architect if SDK surface becomes large enough to warrant module split).

---

### Phase 2 — Richer declarative plot visuals *(foundational “drawing” for indicators)*

**Goal:** Scripts can show signals and conditions the way traders expect — markers, tints, richer series styles — still without freeform canvas or Pine drawing objects.

Ship in this order inside the phase:

1. **`marker` / `plotshape`-class plots** — shapes/arrows/dots at bars (signal markers).
2. **`bgcolor` bands or bar-span tints** — highlight condition ranges (bounded opacity/count).
3. **Richer series styles** — stepline, columns, circles/crosses, area (as style enums on line/histogram where possible).
4. **`barcolor`** — optional candle recolor by script series (main pane only; strict validation).

| Work | Detail |
|------|--------|
| Contracts | Extend `ScriptPlotKind` / style fields; validate counts, enums, colors |
| Renderer | Canvas + WebGL paths consume new kinds via the unified `IndicatorResultProvider` |
| Legend / scale | Markers/tints do not corrupt price scale; legend shows status not thousands of marker IDs |
| Budgets | Max markers per series, max bgcolor segments, reject oversized payloads |
| Fixtures | Golden fixtures for marker + bgcolor + style variants |

**In scope:** Bar-aligned declarative visuals.  
**Out of scope:** `line.new` / `box.new` / `label.new` / tables; manual DrawingStore tools from scripts.

**Gate — Phase 2 Passing:** Focused contract + renderer tests; package + app build; app-level script with markers on a sub-pane signal; built-in regression green; architecture review Passed.

**Exit review:** self-review + chart rendering spot-check.

---

### Phase 3 — Multi-timeframe / multi-symbol requests

**Goal:** Scripts can request additional series (other interval and/or symbol) under strict budgets — Edge’s answer to Pine `request.security`, without Pine APIs.

| Work | Detail |
|------|--------|
| API | Capability-only `request.series({ symbol?, interval })` (final name TBD) available to `calculate` |
| Host fetch | Chart/runtime host resolves requests through existing market-data routing; guest never gets `fetch` |
| Alignment | Document bar alignment rules (close-of-HTF, lookahead forbidden by default) |
| Cache / fingerprint | Extra series participate in session fingerprints and cancel/stale reject |
| Budgets | Max secondary series, max bars, timeout; deny unbounded fan-out |
| UI | Clear error when symbol/interval unavailable or budget exceeded |

**Depends on:** Stable Phase 1–2 authoring so MTF scripts have something useful to plot.  
**Out of scope:** Screener-wide script evaluation; server-side guest execution.

**Gate — Phase 3 Passing:** Focused host+guest tests for align/budget/cancel; build; app-level HTF SMA or dual-symbol spread script; architecture review Passed (market-data + chart runtime).

**Exit review:** architect or human recommended (data + runtime boundary).

---

### Phase 4 — Script condition alerts *(handoff to Alerts track)*

**Goal:** A script can declare named boolean/series conditions that the shared alerts system can arm — without running untrusted script source on the server.

| Work | Detail |
|------|--------|
| Declaration | Manifest-level `alerts` / condition series IDs (serializable) |
| Client path (v1) | Evaluate condition series in the existing guest/runtime; emit armable condition snapshots to the alerts engine |
| Server path (later) | Only if a trusted, non-source artifact or pure threshold on persisted series is proven safe — default remains “no server guest” |
| UX | Create alert from script legend/settings; reuse alerts panel/delivery |
| Coordination | Implementation sequencing owned jointly with [alerts-roadmap.md](./alerts-roadmap.md); do not start until price/drawing alert MVP exists or is Active |

**In scope:** Indicator-condition alerts for private scripts.  
**Out of scope:** Full Pine alert() combinatorics; webhook marketplace; strategy fill alerts.

**Gate — Phase 4 Passing:** Focused condition declaration + controller tests; alerts roadmap integration evidence; app-level arm → trigger on script condition; architecture review Passed.

**Exit review:** architect or human (alerts + scripting boundary).

#### Phase 4 results (2026-07-22)

- **Contracts:** `ScriptManifest.alerts` + `validateScriptAlertSeries`; `SCRIPT_SDK_VERSION` → `edge-indicator-sdk-5`; golden fixture `alert-condition-cross`.
- **Alerts handoff:** `script_condition` leg; `POST /api/me/alerts/[id]/snapshot`; `scriptAlertEval` 5m freshness guard on shared cron; chart bridge via `onScriptResultReady`.
- **UX:** Indicator settings **Create alert…**; Alerts tile script-condition summary.
- **Verification:** **Focused:** `Test Files 8 passed (8)`, `Tests 61 passed (61)`; **Build:** `✓ Compiled successfully in 9.8s`; **Architecture review:** self-review **Passed**.

---

### Phase 5 — Script-managed drawing objects *(optional depth)*

**Goal:** Bounded, declarative chart objects from scripts (levels, boxes, labels) for advanced annotations — still not arbitrary canvas.

| Work | Detail |
|------|--------|
| Object kinds | Start with `hline`-richer levels, `box` (time/price bounds), `label` (text at bar/price) |
| Lifecycle | Create/update/delete by stable object id within one execution result; max object counts |
| Pane routing | Price pane first; sub-pane objects only after drawing-on-indicator-panes platform work |
| Conflict rules | Script objects namespaced separately from user `DrawingStore` drawings; user drawings win on interaction |
| Security | No `draw(ctx)`; no DOM; literal styles only |

**Depends on:** Phase 2 visual model proven; ideally drawing-platform pane routing from chart drawing docs.  
**Out of scope:** Polylines/brushes, tables HUD, freehand, strategies.

**Gate — Phase 5 Passing:** Focused object validation + render tests; budgets enforced; app-level script boxes/labels; architecture review Passed.

**Exit review:** architect recommended.

#### Phase 5 results (2026-07-22)

- **Contracts:** `ScriptObjectDef` kinds `box` | `label` | `level`; `calculate()` return `objects` map peeled by host; `SCRIPT_SDK_VERSION` → `edge-indicator-sdk-6`; golden fixture `object-box-label`.
- **Render:** `scriptObjects` layer (z=35) below user drawings; `IndicatorResultProvider` snapshots; no DrawingStore / undo / hit-test.
- **Budgets:** max 64 objects; label text max 64 chars; main-pane scripts only.
- **Verification:** **Focused:** see harness Active Work row; **Packages/build:** passed; **Architecture review:** self-review **Passed**.

---

## Explicit Deferrals

- Pine Script syntax, compiler, or “import TradingView script” compatibility.
- Public / community / purchased script marketplace.
- Strategies, backtesting, order placement, bots.
- Screener execution of user scripts.
- Arbitrary Canvas/DOM/WebGL from guest code.
- Full Pine drawing surface (polylines, tables as first-class HUDs) before Phase 5 basics prove out.
- Language-server / debugger IDE features beyond current Monaco highlighting.

---

## Verification Plan

| Tier | When |
|------|------|
| **Focused** | Each phase: new TA/plot/request/alert/object tests + adversarial budget/capability denial |
| **Packages** | `npm run lint:package-boundaries`, `npm run typecheck:packages`, `npm run build:packages` when chart-core / indicator-runtime / chart-react change |
| **Build** | `npm run build` when workers, SDK bootstrap, or app wiring change |
| **Startup** | `npm run check:startup` when harness docs change |
| **App-level** | Scripts tile → Run → Apply → confirm visual/data/alert behavior on `/workspace` |
| **Full** | `npm run check` before marking a phase **Passing** when contracts are shared or cross-package |

Completion evidence must quote actual command output (test counts, build lines), not paraphrases.

---

## Harness Update

Creating this roadmap does **not** activate implementation or displace current WIP.

When implementation begins:

1. Add or update one **Active Work** row named **Script depth — Phase N** with behavior, state, completion evidence, and files.
2. Keep WIP=1 — only that row **Active**; leave other Pending work Pending.
3. Create/update **Task Contract — Script depth** with goal, compatibility invariants, delivered work, verification, blockers, next action.
4. Append a **Session Log** entry after each phase.
5. Update **Current Verified State** only while a Script depth phase is the active implementation task; mark **Passing** only with executable evidence.
6. Per phase, update the closest architecture docs (`packages/indicator-runtime/ARCHITECTURE.md`, `src/lib/chart/ARCHITECTURE.md`, `docs/chart/features.md`, `docs/chart/script-examples.md`; alerts/persistence docs when Phases 4–5 touch them).

**Resulting roadmap state now:** Phase 0 **Passing**; Phase 1 **Passing**; Phase 2 **Passing**; Phase 3 **Passing**; Phase 4 **Passing**; Phase 5 **Passing**. Track complete.

---

## Phase summary

| Phase | Focus | Why this order |
|-------|--------|----------------|
| **0** | Contract freeze + inventory | Safe extension seams |
| **1** | TA helpers | Foundational compute; AI-friendly; low risk |
| **2** | Markers, bgcolor, richer plot styles | Foundational indicator “drawing”; still declarative |
| **3** | Multi-timeframe / multi-symbol | Unlocks advanced scripts after visuals exist |
| **4** | Script → alert conditions | Needs shared alerts engine |
| **5** | Script-managed boxes/labels/levels | Powerful but heaviest architecture |
| **Defer** | Pine syntax, strategies, marketplace | Platform-clone territory |
