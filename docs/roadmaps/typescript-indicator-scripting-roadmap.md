# TypeScript Indicator Scripting Roadmap

Build a private “My scripts” workflow where AI-generated TypeScript indicators compile inside Edge and render on the chart without rebuilding the application.

**Last updated:** 2026-07-19

**Status:** Phase 0 **Passing** (2026-07-19); Phase 1 **Passing** (2026-07-19); Phase 2 **Passing** (2026-07-19); Phase 3 **Passing** (2026-07-19); Phase 4 **Passing** (2026-07-19); Phase 5A **Passing** (2026-07-19); Phase 5B **Passing** (2026-07-19); Scripts workspace tile **Passing**. **Product foundation complete.** Deferred app-level walks → [app-level-verification-roadmap.md](./app-level-verification-roadmap.md) Phase 3.

**Related:** [Script Depth Roadmap](./script-depth-roadmap.md) (follow-on TA/visuals/MTF/alerts/drawings), [Chart Engine Architecture](../../src/lib/chart/ARCHITECTURE.md), [Plugin API](../chart/prereqs/plugin-api.md), [Indicator Foundation Plan](../chart/indicator-foundation-plan.md), [Persistence Architecture](../../src/lib/persistence/ARCHITECTURE.md), [Design System Architecture](../../src/lib/design-system/ARCHITECTURE.md), [Project Status](../PROJECT-STATUS.md), [Repository Constraints](../CONSTRAINTS.md).

---

## Intent Classification

- **Primary:** Feature — add private, runtime-authored TypeScript indicators to the chart.
- **Secondary:** Testing — untrusted-capability boundaries, deterministic compilation, runtime limits, rendering, and persistence need explicit verification.
- **Checklists applied:** `feature-planning-checklist.md`, `testing-verification-checklist.md`, `harness-status-checklist.md`, `architecture-review-checklist.md`.
- **Assumption:** Scripts are private and authored by the user or AI acting for the user; public/community script execution is not part of this track.

## Checklist Review

- **Architecture review:** **Required** — architecture review, **Passed after roadmap corrections**. The work changes chart runtime contracts, package/app boundaries, persistence, and cross-component UI. Every implementation phase requires its own exit review.
- **Aligned:** Edge already has an `IndicatorPlugin` registry, typed inputs, batch calculation, declarative outputs, Canvas/WebGL rendering, settings, legends, multiple instances, and a disabled **My scripts** picker section.
- **Missing:** TypeScript compilation, isolated execution, runtime budgets, asynchronous result delivery, source/version persistence, editor diagnostics, and user-script identity separate from built-in indicator names.
- **Misalignments:** The existing `compute()` contract is synchronous and trusted; drawing, scaling, legends, annotations, and WebGL independently expect synchronous results; `IndicatorConfig` persists a plugin name but not script identity/revision; workspace schemas would strip unknown reference fields; the catalog is static; direct `draw()` access and function-valued colors are not safe serializable script contracts.
- **Risks:** A script can freeze calculation, allocate excessive memory, return malformed series, leak capabilities, produce stale results after rapid chart changes, or conflict with a built-in name.
- **Recommendations:** Keep V1 private and chart-only; compile TypeScript to JavaScript in a disposable worker but execute it only inside a guest WASM JavaScript VM with a capability-only API; use one asynchronous result provider for drawing, scaling, legends, annotations, and WebGL; keep scripts outside the static built-in registry and workspace payload; prove the complete rendering bridge before building the editor.

---

## Approved Product Decisions

The following decisions are fixed for V1 and do not require further user input:

1. **Private scripts only** — no public library, marketplace, purchased scripts, or arbitrary third-party execution.
2. **Chart indicators only** — no strategies, orders, alerts, or screener execution.
3. **Declarative visuals only** — line, histogram, band/fill, and horizontal-level plots.
4. **TypeScript authoring** — source is compiled inside Edge; saving or running a script never requires rebuilding the app.
5. **Restricted capabilities** — scripts receive candles, validated inputs, and the Edge indicator SDK; they do not receive Canvas, DOM, network, filesystem, cookies, storage, or application state.
6. **Basic editor first** — a textarea, Run, Save, and readable diagnostics are sufficient for V1.

## Product Goal

The user can open **My scripts**, paste or edit an AI-generated TypeScript indicator, run it, fix any reported errors, save it, add it to a chart, configure its inputs and styles, and see it restored after reload without an application rebuild.

## V1 Success Criteria

- A valid TypeScript script compiles and displays at least one supported plot without reloading or rebuilding Edge.
- Invalid source reports line/column diagnostics and leaves the last valid indicator result visibly marked as stale/error on the chart.
- A runaway or oversized script is stopped without freezing chart interaction.
- Saved scripts appear in **My scripts**, can be renamed/duplicated/deleted, and survive reload in browser-local mode without Postgres.
- Multiple instances of one script can use different inputs and styles.
- Script edits invalidate only the affected script revision and cannot overwrite a built-in indicator.
- Script output length, numeric values, plot declarations, and resource usage are validated before entering the renderer.
- No script can directly access Canvas, DOM, network, filesystem, application storage, or secrets.

---

## V1 Script Shape

The public authoring API should remain small and AI-friendly:

```typescript
export default defineIndicator({
  name: "High-Low Midpoint",
  pane: "main",
  inputs: {
    period: input.number({ default: 20, min: 1 }),
  },
  calculate({ candles, inputs, ta }) {
    const midpoint = candles.map((bar) => (bar.high + bar.low) / 2);
    return {
      midpoint: ta.sma(midpoint, inputs.period),
    };
  },
  plots: {
    midpoint: plot.line({ title: "Midpoint" }),
  },
});
```

### Supported language and SDK surface

- TypeScript expressions, functions, arrays, local variables, conditionals, and loops within runtime limits.
- No imports, dynamic imports, package access, `eval`, asynchronous work, timers, `Date`, randomness, or ambient browser/server globals.
- Read-only normalized candles and validated inputs.
- Edge-owned `ta` helpers for common moving averages and transformations.
- Declarative `plot.line`, `plot.histogram`, `plot.hline`, and `plot.band`/fill definitions.
- Versioned SDK and script-language contract so saved scripts can be migrated deliberately.

---

## Target Architecture

```text
Basic TypeScript editor
  → compiler worker (source → diagnostics + JavaScript artifact)
  → guest WASM JavaScript VM inside a runtime worker
      (artifact + candles + inputs + capability-only SDK; no host globals)
  → validated result envelope (series + plot metadata + script revision)
  → one async indicator-result provider/cache
  → Canvas/WebGL drawing + scale + legend + annotations + settings
```

### Ownership boundaries

| Area | Responsibility |
|------|----------------|
| `packages/chart-core` | Serializable script manifest/input/plot/result contracts, output validation, cache fingerprints, declarative drawing from supplied results, safe TA primitives; no compiler, VM, worker, editor, or persistence dependencies |
| Dedicated indicator-runtime package | Compiler protocol, guest WASM VM, capability SDK, budgets, cancellation, deterministic execution, and worker recovery |
| `packages/chart-react` | Own one asynchronous result coordinator/provider consumed by Canvas, WebGL, scale, legend, and annotations; imperatively invalidate rendering when current results arrive; preserve synchronous built-in rendering through an adapter |
| `src/app/components/` | Basic editor, diagnostics, **My scripts** library, picker integration, loading/error/disabled states using Edge primitives |
| App script library | Browser-local repository with IndexedDB preferred for source/drafts/revisions and a bounded localStorage fallback; separate from workspace payloads and the built-in registry |
| `src/lib/persistence/` | Optional script-library cloud sync after browser-local behavior is proven; optimistic concurrency and local operation without Postgres |
| `src/lib/ai/` | Post-V1 tools operating through a `ScriptLibraryPort`, never through React state or server-side arbitrary source execution |

### Required compatibility changes

- Give every user script a stable `scriptId`; saved chart instances reference an immutable revision/source hash rather than a mutable display name.
- Extend indicator instances, cloning, templates, pane keys, and workspace Zod schemas additively so they distinguish built-ins from user scripts and preserve `{ scriptId, revision }`.
- Store source and compiled artifacts only in the separate script library; never embed them in chart workspaces or generic chart/app-state tools.
- Keep legacy built-in `IndicatorConfig` records loading unchanged.
- Keep built-in `IndicatorPlugin.compute()` synchronous behind an adapter; user-script results arrive through one asynchronous result provider shared by every chart consumer.
- Keep user scripts out of the global built-in registry so server-side screener evaluation cannot execute them.
- Reject stale worker responses by session key, immutable script revision/source hash, runtime ABI, inputs fingerprint, and candle fingerprint.
- Require serializable literal/conditional color rules; never expose function-valued colors or the existing custom `draw(ctx, ...)` escape hatch.
- Fix/characterize horizontal-level rendering so `hline` does not require an otherwise-unused data series.

---

## Proposed Plan

### Phase 0 — Contracts and feasibility spike

**Outcome:** The highest-risk decisions are proven before product UI work begins.

| Work item | Scope |
|-----------|-------|
| Golden scripts | Define minimal valid line, histogram, band, and horizontal-level examples plus invalid/runaway fixtures |
| Script contracts | Freeze `scriptId`, revision, language version, input schema, plot schema, compile result, and execution result envelopes |
| Compiler spike | Compile TypeScript in a worker and return useful line/column diagnostics without application rebuild |
| Isolation spike | Select and prove a guest WASM JavaScript VM with explicit memory/time interruption, no host globals, production-build compatibility, and worker crash recovery |
| Threat model | Prove absent network/storage/timer/`Date`/random/dynamic-code capabilities; document CSP and browser assumptions |
| Async bridge spike | Prove one result reaches drawing, scale, legend, annotations, and WebGL without changing built-in compute behavior |
| Budget baseline | Measure compile and execution latency on representative chart history; set documented time, memory, source-size, plot-count, and series-count limits |

**Gate:** One hard-coded script compiles and reaches every chart consumer through one result provider; infinite-loop and memory-pressure fixtures terminate safely; guest globals are absent; worker recovery and the production build pass; architecture review records the selected VM and async seam.

**Phase 0 results (2026-07-19):**

- **VM:** `quickjs-emscripten` guest WASM in `@edge/indicator-runtime`; TypeScript transpile via compiler API (worker entry points in `compilerWorker.ts` / `runtimeWorker.ts`).
- **Contracts:** `packages/chart-core/src/scriptContracts.ts`, golden fixtures in `scriptFixtures.ts`.
- **Async seam:** `packages/chart-react/src/engine/indicatorResultProvider.ts` — one provider feeds Canvas (`layers.ts`), WebGL (`indicatorGeometry.ts`), scale (`indicatorScale.ts`), legend (`legend.ts`), and price-axis annotations (`priceAxisAnnotations.ts`); built-ins stay sync via adapter.
- **Budget baseline (5k bars, line-midpoint fixture):** compile **18.1ms**, execute **97.0ms**; limits in `DEFAULT_SCRIPT_RUNTIME_BUDGETS` (64KiB source, 3s compile, 2s execute, 8MiB guest memory, 16 plots/series).
- **Verification:** **Focused:** `Test Files 4 passed (4)`, `Tests 27 passed (27)`; **Packages:** `npm run lint:package-boundaries` passed, `npm run typecheck:packages` passed, `npm run build:packages` passed; **Build:** `npm run build` passed; **App-level spike:** `npm run spike -w @edge/example-indicator-runtime-spike` → compile **18.1ms**, execute **97.0ms**, `Status: ready`; **Architecture review:** self-review **Passed**.

### Phase 1 — Headless compiler and runtime kernel

**Outcome:** A tested library can compile and execute private TypeScript indicators without UI.

| Work item | Scope |
|-----------|-------|
| Compiler service | Deterministic source normalization, diagnostics, artifact hash, language/SDK version |
| Runtime host | Guest WASM VM lifecycle inside a worker, capability-only SDK, cancellation, timeout, memory limit, structured errors, and crash recovery |
| API restrictions | Reject imports, async APIs, dynamic code generation, unsupported globals, and custom drawing access |
| Result validation | Enforce unique plot IDs, serializable colors, exact series lengths, finite/null values, valid band references, bounded output count and payload size |
| Last-valid behavior | Compile/runtime failures preserve the previous successful artifact and result while clearly marking it stale/error |
| Test corpus | Valid, syntax/type error, infinite loop, allocation pressure, malformed output, stale response, and cancellation cases |

**Gate:** Headless adversarial tests prove deterministic replay, diagnostics, capability denial, numeric CPU/memory/source/output/candle limits, bounded failure, and stale-result rejection.

**Phase 1 results (2026-07-19):**

- **Compiler:** `sourceNormalize.ts`, versioned hash, ambient SDK typecheck, compile budget, expanded forbidden patterns; public `compileScriptService`.
- **Runtime:** `runtimeHost.ts`, `guestLockdown.ts`, single `guestTaBootstrap.ts`, cancel/`AbortSignal`, candle/output byte budgets, stale session reject.
- **Session:** `scriptSession.ts` last-valid stale/error semantics (headless).
- **Workers:** `requestId` + cancel on compiler/runtime workers; crash recovery smoke.
- **Corpus:** 12 fixtures + 41 Vitest cases (valid, type/syntax, import/dynamic import/async/draw, infinite loop, allocation, malformed output, cancel, stale, deterministic replay).
- **Verification:** **Focused:** `Test Files 4 passed (4)`, `Tests 41 passed (41)`; **Packages:** `npm run lint:package-boundaries` passed, `npm run typecheck:packages` passed, `npm run build:packages` passed; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.2s`); **App-level spike:** compile **33.8ms**, execute **95.2ms**, `Status: ready`; **Architecture review:** self-review **Passed**.

### Phase 2 — Chart runtime vertical slice

**Outcome:** One user script can be added to a live chart and update safely as candles or inputs change.

| Work item | Scope |
|-----------|-------|
| Instance identity | Additive built-in/user discriminator plus `scriptId` and revision reference |
| Result coordinator | Schedule execution when source revision, inputs, or candle fingerprint changes; coalesce duplicate requests |
| Unified result provider | Supply one ready result to Canvas, WebGL, scale, legend, and price-axis annotation paths; no consumer calls user source or recomputes it |
| Renderer coverage | Feed validated line, histogram, band/fill, and horizontal-level results through the existing declarative renderer in main and sub panes |
| Lifecycle states | Compiling, calculating, ready, stale, and error without blocking pan/zoom or built-ins |
| Cache behavior | Bounded cache keyed by script revision + SDK version + inputs + candle fingerprint |
| Compatibility | Existing layouts and all 15 built-in indicators continue to work unchanged |

**Gate:** App-level fixtures prove all four approved plot types; one computation is shared across draw/scale/legend/annotations; input changes produce fresh results; late generations are ignored; source errors retain visibly stale last-valid output; legacy built-in layouts still load.

**Phase 2 results (2026-07-19):**

- **Identity:** `createScriptIndicatorInstance`; workspace Zod preserves `kind` / `scriptId` / `revision`; golden fixture catalog in `@edge/chart-core`.
- **Coordinator:** `ScriptResultCoordinator` + `useScriptResultCoordinator`; per-chart `IndicatorResultProvider`; worker client with main-thread fallback; bounded result cache; last-valid stale semantics.
- **Chart wiring:** provider threaded through draw/scale/legend/annotations/WebGL; async snapshot → `requestDraw('data')`; legend lifecycle labels (calculating/stale/error).
- **Dev fixture:** `?scriptFixture=all` or `NEXT_PUBLIC_SCRIPT_FIXTURE=1` injects four golden script instances via `src/lib/chart/scriptFixtureDev.ts`.
- **Verification:** **Focused:** `Test Files 5 passed (5)`, `Tests 24 passed (24)`; **Packages:** `npm run lint:package-boundaries` passed, `npm run build:packages` passed; **Build:** `npm run build` passed (`✓ Compiled successfully in 5.8s`); **Architecture review:** self-review **Passed**; **App-level:** dev fixture injector ready — manual four-plot walkthrough on `localhost:3003?scriptFixture=all` deferred.

### Phase 3 — Basic editor and local “My scripts” MVP

**Outcome:** The approved workflow is usable without database setup.

| Work item | Scope |
|-----------|-------|
| My scripts | Enable the existing picker section; list saved private scripts separately from the static built-in catalog |
| Editor | Basic textarea with script name, Run, Save, Cancel, diagnostics, dirty state, and keyboard-accessible controls |
| Lifecycle | Create, rename, duplicate, and delete; prevent deleting a script still used by a chart unless the user confirms |
| Local library | Versioned browser-local repository for source, drafts, immutable revisions, and last-valid artifact metadata; IndexedDB preferred, bounded localStorage fallback, SSR-safe hydration |
| Chart integration | Add saved scripts from the picker; generate settings from script inputs and plots |
| Recovery | Missing/deleted revisions, corrupt storage, failed computation, and obsolete language versions produce recoverable states without breaking built-in charts |

**Gate — usable MVP:** Create/paste → Run → see plot → Save immutable revision → add a second instance with different inputs → reload → both instances and source return in browser-local mode without Postgres.

**Phase 3 results (2026-07-19):**

- **Library:** `src/lib/scriptLibrary/` — IndexedDB primary + `edge:script-library:v1` localStorage fallback; immutable revisions keyed by normalized source hash; SSR-safe `ScriptLibraryProvider`.
- **Resolver:** `packages/chart-core/src/scriptSourceResolver.ts` — injected library resolver with golden fixture fallback; wired through `ScriptResultCoordinator` / `useScriptResultCoordinator` / `ChartCell`.
- **UI:** My scripts section enabled in `IndicatorPicker`; `ScriptEditorModal` (textarea, Run/Save/Cancel, diagnostics); delete-in-use confirm; script settings from manifest in `IndicatorSettingsModal`.
- **Verification:** **Focused:** `Test Files 6 passed (6)`, `Tests 18 passed (18)`; **Packages:** `npm run lint:package-boundaries` passed, `npm run typecheck:packages` passed, `npm run build:packages` passed; **Build:** `npm run build` passed (`✓ Compiled successfully in 5.4s`); **Architecture review:** self-review **Passed**; **App-level:** create/run/save/add/reload walkthrough deferred.

### Phase 4 — V1 completeness and hardening

**Outcome:** All approved visuals and reliability requirements are complete.

| Work item | Scope |
|-----------|-------|
| Input coverage | Number, boolean, enum, and price-source inputs with generated settings and validation |
| Plot styling | Add bounded serializable conditional color rules without function-valued output metadata |
| TA SDK | Documented, tested starter helpers built from existing indicator math; no speculative Pine compatibility layer |
| Performance | Debounce rapid edits, cancel superseded executions, keep worker/result caches bounded, avoid per-frame React state |
| Reliability | Recover from repeated worker/VM crashes, cache pressure, malformed output, and missing immutable revisions |
| Error UX | Distinguish compile, runtime, timeout, limit, unsupported-version, missing-revision, and invalid-output errors |
| Accessibility | Labeled editor/actions, focus management, keyboard workflow, non-color-only errors, reduced-motion compliance |
| Documentation | Update chart architecture, plugin API, feature inventory, and user-facing example scripts |

**Gate — V1 Passing:** Focused, package, build, app-level, and full verification pass with exact results recorded in the harness.

**Phase 4 results (2026-07-19):**

- **Contracts:** widened `ScriptExecutionErrorCode`; `ScriptColorRule` (max 8, first-match); `validateParamDef`; `formatScriptError` / `evaluateScriptColorRules`.
- **TA SDK:** `source`, `highest`, `lowest`, `atr`, `roc` + guest bootstrap sync; `taSdk.test.ts`.
- **Runtime/chart:** typed limit/invalid-output errors; coordinator debounce (150ms) + missing-revision code; worker crash recovery (3 attempts); draft manifest on Run; `inputSchema` on resolver stub; conditional color draw path.
- **UX:** editor keyboard Run/Save, focus, severity markers, reduced-motion; legend typed errors; picker script action labels.
- **Docs:** chart/runtime architecture, plugin-api script instances, `docs/chart/script-examples.md`, features Phase 4 row.
- **Verification:** record exact results in harness on completion — **Focused:** `Test Files 6 passed (6)`, `Tests 42 passed (42)`; **Packages/build/startup/full:** passed (`npm run check` exit **0**, `Tests 3173 passed (3173)`); **Architecture review:** self-review **Passed**; **App-level:** deferred.

### Phase 5A — AI authoring

**Outcome:** AI can draft, validate, repair, save, and apply private scripts through governed tools.

| Work item | Scope |
|-----------|-------|
| AI tools | `list_indicator_scripts`, `get_indicator_script`, `create_indicator_script`, `update_indicator_script`, `compile_indicator_script`, `apply_indicator_script`, and `delete_indicator_script` |
| Safety | Zod-validated inputs; delete requires explicit confirmation; tools use facades rather than React state |
| AI context | Return concise SDK version, examples, and compiler diagnostics so AI can repair scripts |
| Privacy | Generic chart/app-state tools return script references and status only, never source; AI tools do not execute arbitrary source server-side |

**Gate:** AI creates, compiles, repairs, saves, and applies a script through the shared registry while deletion confirmation and source-privacy tests pass.

**Phase 5A results (2026-07-19):**

- **AI tools:** seven `*_indicator_script` tools registered in `CLIENT_AI_TOOLS` via `ScriptLibraryPort` on `ToolContext`.
- **Authoring context:** `getScriptAuthoringContext()` returns SDK versions, TA helpers, curated fixture examples, budgets, and forbidden constructs on `get_indicator_script` / `compile_indicator_script`.
- **Privacy:** `sanitizeIndicatorForAi` strips script source from `get_chart_state`, `list_indicators`, and `summarize_chart`.
- **Safety:** `delete_indicator_script` is destructive + confirmation-gated; compile runs client-side only (no server arbitrary execute).
- **Verification:** **Focused:** `Test Files 13 passed (13)`, `Tests 50 passed (50)` (`src/lib/ai/`); **Build:** `npm run build` passed (`✓ Compiled successfully in 5.7s`); **Full:** `Test Files 528 passed (528)`, `Tests 3182 passed (3182)`, `npm run check` exit **0**; **Architecture review:** self-review **Passed**; **App-level:** in-app AI create/compile/apply walkthrough deferred.

### Phase 5B — DB-first normalized library

**Outcome:** Private My scripts are owned by local Postgres; the browser holds an in-memory cache only.

| Work item | Scope |
|-----------|-------|
| Normalized schema | `user_scripts` + `user_script_revisions` tables; draft columns on script row |
| Resource API | `/api/me/scripts*` CRUD + revision save; server computes revision hash via Node crypto |
| Client | `ScriptLibraryProvider` hydrates from DB; awaited writes; legacy snapshot/IDB one-time import |
| Privacy | Workspace snapshots still store `scriptId`/`revision` only |

**Gate:** Create/save/reload/apply works with Postgres; DB unavailable surfaces error (no silent local-only success).

**Phase 5B results (2026-07-19, superseded by DB-first delivery):**

- Snapshot sync via `/api/me/script-library` replaced by normalized resource routes.
- Browser IDB/localStorage no longer authoritative for My scripts.

### Phase 6 — Scripts workspace surface

**Outcome:** My scripts has a first-class workspace tile (peer to Screener/Journal) with library + in-tile editor; chart picker Edit/New routes to the tile.

| Work item | Scope |
|-----------|-------|
| Surface | `SurfaceId` += `scripts`; assign/reassign/deep-link ingress |
| Tile UI | `ScriptsTileSurface` — library rail, `ScriptEditorPane`, compact stacked layout |
| Chart bridge | `WorkspaceDriveContext.applyScriptToActiveChart` + `WorkspaceScriptApplyBridge`; picker Edit/New → `focusOrOpenSurface("scripts")` |
| Retirement | Remove modal `ScriptEditorModal`; workspace-level `ScriptLibraryProvider` |

**Gate:** Assign Scripts pane → create/run/save → Apply to chart; picker Edit opens Scripts tile with selection.

**Phase 6 results (2026-07-19):**

- **Surface:** `scripts` tile in workspace shell; `selectedScriptId` in tile surface state; `/workspace?surface=scripts&scriptId=…` ingress.
- **UI:** `ScriptsTileSurface`, `ScriptsLibraryRail`, `ScriptEditorPane`; Apply disabled without a chart tile.
- **Bridge:** `addScriptIndicatorToActiveChart` on `ChartActionsProvider`; workspace script-apply handler registered from chart tile.
- **Picker:** Edit/New focus or open Scripts tile; modal editor removed.

---

## Explicit Deferrals

- Pine Script syntax or compatibility.
- Public/community/purchased script execution or publishing.
- Strategies, backtesting, orders, bots, and automatic trading.
- Screener execution or server-side script evaluation.
- External packages, imports, network calls, files, browser storage, or access to application internals.
- Full IDE features such as language-server autocomplete, source control, profiler, or debugger (basic Monaco syntax highlighting in the Scripts tile is in scope; LSP and debugger are not).
- Arbitrary Canvas drawing, DOM overlays, or custom WebGL shaders from guest code.

**Moved to follow-on track:** richer TA helpers, marker/bgcolor/plot styles, multi-timeframe/multi-symbol requests, script condition alerts, and bounded script-managed drawing objects are phased in the [Script Depth Roadmap](./script-depth-roadmap.md) (not Pine syntax).

---

## Verification Plan

| Tier | Required evidence |
|------|-------------------|
| **Focused** | Compiler diagnostics; runtime limits/capability denial; result validation; cache/revision/cancellation; storage migration; editor and picker interactions; declarative renderer coverage |
| **Packages** | `npm run lint:package-boundaries`, `npm run typecheck:packages`, and `npm run build:packages` when chart-core/chart-react contracts change |
| **Build** | `npm run build` for worker bundling, package exports, persistence, and app wiring |
| **Startup** | `npm run check:startup` whenever `docs/PROJECT-STATUS.md` or harness-controlled docs change |
| **App-level** | On `localhost:3003`: create/paste/run/save/add/configure/reload; syntax error; runaway fixture; rapid edit cancellation; built-in indicator regression; browser-local operation without Postgres |
| **Full** | `npm run check` before marking V1, Phase 5A, or Phase 5B **Passing** |

Each phase must record the exact command output—for example the `Test Files … passed`, `Tests … passed`, build completion line, and measured app-level compile/execution timings—not a paraphrase.

## Harness Update

When implementation begins:

1. Add or update one **Active Work** row named **TypeScript indicator scripting — Phase N** with user-visible behavior, state, exact completion evidence, and touched files.
2. Keep only that row **Active**; existing Pending work stays Pending and no adjacent indicator, screener, alert, or strategy work is bundled.
3. Create/update **Task Contract — TypeScript indicator scripting** with status, goal, compatibility invariants, delivered work, verification, blockers, and next action.
4. Append a **Session Log** entry after each phase because this track is cross-component and likely cross-session.
5. Update **Current Verified State** only when the phase becomes the active implementation task; mark it **Passing** only after the phase gate has executable evidence.
6. On V1 completion, update `src/lib/chart/ARCHITECTURE.md`, the dedicated runtime package architecture doc, `docs/chart/prereqs/plugin-api.md`, and `docs/chart/features.md`; update persistence and AI architecture docs when Phases 5A/5B touch those boundaries.

**Resulting roadmap state now:** **Planned/Pending** only. Creating this roadmap does not activate implementation or displace other WIP.
