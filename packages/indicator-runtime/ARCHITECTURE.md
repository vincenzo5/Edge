# @edge/indicator-runtime

Private TypeScript indicator compiler and guest QuickJS-WASM execution host for Edge chart scripting.

## Ownership

| Module | Responsibility |
|--------|----------------|
| `sourceNormalize.ts` | Deterministic source normalization and versioned source hash |
| `compileScript.ts` | TypeScript typecheck + transpile, diagnostic mapping, manifest extract |
| `compilerService.ts` | Public compile façade (`compileScriptService`) |
| `executeArtifact.ts` | QuickJS guest execution, validation handoff, cancel/stale guards |
| `runtimeHost.ts` | VM lifecycle, interrupt budgets, capability probe, crash recovery |
| `guestGlobals.ts` | Forbidden source patterns and denied guest global list |
| `guestTaBootstrap.ts` | Single TA bootstrap injected into guest (keep synced with `taSdk.ts`) |
| `guestLockdown.ts` | Guest global lockdown bootstrap |
| `scriptSession.ts` | Headless last-valid session semantics for Phase 2 coordinator |
| `compilerWorker.ts` | Web Worker compile entry with `requestId` + cancel |
| `runtimeWorker.ts` | Web Worker compile+execute pipeline with cancel + stale reject |
| `taSdk.ts` | Host-side TA reference |

## Security boundary

- Guest runs in `quickjs-emscripten` with lockdown bootstrap denying `window`, `document`, `fetch`, storage, timers, `Promise`, `Date`, `eval`, and dynamic code paths.
- `Math` remains available for TA (`sqrt`); `Math.random` is rejected at compile gate.
- User source cannot import modules, use async/dynamic code, or call `draw()`.
- Output is validated in `@edge/chart-core` before entering the chart renderer.

## Public API (Phase 1 — frozen for Phase 2)

```typescript
compileScriptService({ source, budgets? }) → ScriptCompileResult
  // includes languageVersion, sdkVersion, artifactHash (normalized source + versions)

executeArtifact({ artifact, manifest, candles, inputs, revision, sessionKey, signal?, ... }) → ScriptExecutionResult

createScriptSession() → ScriptSession
  session.evaluate({ source, candles, inputs, sessionKey, signal? })
    → { compile, execution?, lastValid?, effective? }
    // compile/runtime failure after success → effective.status: 'stale' with prior series

runCompileAndExecutePipeline(...) / handleRuntimeWorkerMessage(...)
  // requestId + cancel + stale sessionKey reject
```

## Budgets (Phase 1)

See `DEFAULT_SCRIPT_RUNTIME_BUDGETS` in `@edge/chart-core` — includes `maxCandleCount`, `maxOutputBytes`, compile/execute timeouts, guest memory, plot/series/output limits. Measured on 5k-bar synthetic history via `examples/indicator-runtime-spike`.

## CSP / production build

Workers load as dedicated bundles (`packages/chart-react/src/workers/indicatorScriptRuntime.worker.ts`); WASM ships via `quickjs-emscripten`. Next.js transpiles `@edge/indicator-runtime` and `@edge/chart-react`; `ScriptRuntimeWorkerClient` falls back to main-thread `ScriptSession` when Worker is unavailable (Vitest/node).

## Phase 2 gate (chart runtime vertical slice)

- Per-chart `ScriptResultCoordinator` schedules compile+execute on revision/inputs/candle fingerprint changes; tip-stable result cache overwrites one slot per identity under live tip ticks (Memory efficiency Phase 5); `dispose` clears result maps.
- One `IndicatorResultProvider` snapshot feeds Canvas, WebGL, scale, legend, and price-axis annotations.
- Dev-only golden fixtures: `?scriptFixture=all` on `/workspace`.

## Phase 3 gate (My scripts MVP)

- App-owned script library: `src/lib/scriptLibrary/` (IndexedDB + localStorage); source never in workspace payloads.
- `resolveScriptSource(scriptId, revision, resolver?)` — library first, golden fixtures fallback.
- UI: My scripts picker section, `ScriptEditorModal`, script settings from saved manifest.

## Phase 4 gate (V1 completeness)

- Full `ParamDef` validation in `validateScriptManifest`; draft manifest persisted on Run.
- TA helpers: `source`, `highest`, `lowest`, `atr`, `roc` (host + guest bootstrap).
- Typed `ScriptExecutionErrorCode` + `formatScriptError` for editor/legend UX.
- Bounded `colorRules` on `ScriptPlotDef`; evaluated at draw time.
- Worker client: up to 3 crash recoveries before main-thread fallback; coordinator 150ms debounce.
- **Memory efficiency Phase 13:** script worker `postMessage` sends transferable `f64x6` packed candle buffers (`packCandlesToTransferBuffer` / `resolveWorkerCandles`); structured-clone `Candle[]` fallback on pack failure or main-thread path; **no** SharedArrayBuffer / COOP/COEP. Residual guest `JSON.stringify(__candles)` inject unchanged.

## Phase 1 gate

- Deterministic normalized source hash + replay tests
- Real type diagnostics (explicit annotation errors)
- Expanded compile gates (import, dynamic import, async, draw, Promise, timers)
- Guest lockdown + capability probe
- Runtime cancel, candle/output budgets, stale session reject
- Headless `ScriptSession` last-valid stale/error semantics
- Worker `requestId` cancel protocol + crash recovery smoke

## SDK / plot extension rules (Script depth)

These rules apply to Phases 1–5 of the [script depth roadmap](../../docs/roadmaps/script-depth-roadmap.md). Full version constants live in `@edge/chart-core` `scriptContracts.ts`.

### TA helpers (`HOST_TA_SDK` / `GUEST_TA_BOOTSTRAP`)

- Implement new helpers in `taSdk.ts` and mirror the same names/signatures in `guestTaBootstrap.ts` in the **same change**.
- Bump `SCRIPT_SDK_VERSION` when adding or changing helper signatures.
- Update `docs/chart/script-examples.md` and AI authoring context (`scriptAuthoringContext.ts`) in the same phase.
- **Lockstep test:** `taSdk.test.ts` asserts `Object.keys(HOST_TA_SDK)` match guest bootstrap exports (parity enforced in CI).

**Phase 1 shipped (`edge-indicator-sdk-2`):** `wma`, `vwma`, `macd`, `stoch`, `bollinger`, `cci`, `obv`, `dmi`, `crossover`, `crossunder`, `change`, `percentChange` — see `docs/chart/script-examples.md`.

**Phase 2 shipped (`edge-indicator-sdk-3`):** plot kinds `marker`, `bgcolor`, `barcolor` (main pane only); series styles `stepline`, `circles`, `crosses`, `area`, `columns`; marker/bgcolor budgets; Canvas-first rendering with WebGL fail-closed; golden fixtures `plot-marker-signal`, `plot-bgcolor-band`, `plot-style-stepline`.

**Phase 3 shipped (`edge-indicator-sdk-4`):** optional 4th `calculate` arg `request.series({ symbol?, interval? })`; host-resolved secondary series via `ChartDataFeed.loadCandles`; close-of-bar alignment (no lookahead); budgets `maxSecondarySeriesRequests` (2), `maxSecondarySeriesBars` (10k), `secondaryFetchTimeoutMs` (5s); golden fixtures `request-htf-sma`, `request-dual-symbol`. Guest never receives `fetch`.

**Phase 4 shipped (`edge-indicator-sdk-5`):** optional manifest `alerts` map (`conditionId → { title, seriesId }`); validate alert series at execute time; golden fixture `alert-condition-cross`. Alert arming/delivery lives in the shared alerts track — guest never runs on the server cron path.

**Phase 5 shipped (`edge-indicator-sdk-6`):** optional `objects` map on `calculate()` return (`box`, `label`, `level`); host peels `objects` before series validation; budgets `maxScriptObjects` (64), label text length 64; main-pane scripts only; render via dedicated Canvas layer below user `DrawingStore` (no undo/hit-test); golden fixture `object-box-label`. Script objects are not `DrawingPlugin` entries.

### Plot kinds and manifest fields

- Extend `ScriptPlotKind` / `ScriptPlotDef` in `@edge/chart-core` only; keep validation allowlists and output budgets.
- Bump `SCRIPT_SDK_VERSION` when adding plot kinds or manifest fields scripts depend on.
- Bump `SCRIPT_LANGUAGE_VERSION` only when syntax or manifest shape **breaks** saved scripts without migration.
- Renderer consumes new kinds via the existing `IndicatorResultProvider` — no guest Canvas/DOM/WebGL.

### Additive compatibility

- Never rename or remove TA helpers or plot kinds without a documented migration path.
- Stale SDK / language version mismatches must surface clear diagnostics (typed error codes).
- Saved script revisions remain immutable; new SDK features are opt-in via new revisions.

### Security boundary (unchanged)

- Guest never receives `fetch`, storage, timers, `Promise`, arbitrary `draw()`, or host application state.
- Multi-series requests (Phase 3+) resolve on the host; guest receives aligned candle arrays only.

### Fixture reservation

- Reserve golden fixture IDs in `scriptFixtures.ts` (`RESERVED_SCRIPT_DEPTH_FIXTURE_SLOTS`) before implementing a phase; add to `ScriptFixtureId` only when the fixture source ships.
