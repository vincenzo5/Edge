# Quantitative Research Runtime Roadmap

Living track for a **server-side quantitative research runtime** that Copilot (and later the Research Board) use to design experiments, run real math on large market datasets, and interpret compact results — without stuffing candle histories into the LLM context.

**Last updated:** 2026-07-30

**Status:** Phase 4 **Passing** (2026-07-30) — sandboxed Python research cells via `run_research_code`.

**Branch:** AGENT (secondary: DATA).

**Related:** [AI Agent](./ai-agent-roadmap.md), [Research UX](./research-ux-roadmap.md), [Copilot Chat Blocks](./copilot-chat-blocks-roadmap.md), [Script depth](./script-depth-roadmap.md) (strategies/backtests deferred there → owned here), [TypeScript indicator scripting](./typescript-indicator-scripting-roadmap.md) (chart plots only — do not extend QuickJS into this), [Screener](./screener-roadmap.md) (filter surface, not backtester), [Journal](./journal-roadmap.md) (compact aggregate pattern to copy), [Market Data Architecture](../../src/lib/marketData/ARCHITECTURE.md), [AI Tools Architecture](../../src/lib/ai/ARCHITECTURE.md), [Project Status](../PROJECT-STATUS.md), [Constraints](../CONSTRAINTS.md).

**Origin:** 2026-07-29 first-principles plan — Copilot needs quant R&D (experiments + results); industry pattern is sandboxed compute outside the prompt (Code Interpreter / E2B-class isolation; DuckDB + Polars; vectorized studies before LEAN-class engines).

---

## Intent Classification

- **Primary:** Feature — registry-exposed research compute for strategy investigation.
- **Secondary:** Architecture — new server-only compute + dataset/artifact contracts; Testing — deterministic numeric + look-ahead/provenance gates.
- **Assumptions:** Solo trader / local-first. LLM orchestrates; Python worker computes. Chart QuickJS stays plot-only. Full event-driven portfolio simulation is out of v1.

---

## Product goal

Copilot helps the trader **create experiments** (typed study specs) and **see results** (compact metrics, warnings, artifact refs it can explain). Heavy series never enter the chat context.

**One-line framing:** *Agent designs the study; a research kernel runs the math; chat gets the scoreboard.*

### Success criteria (track-level)

- Versioned research datasets exist (symbol/interval/range/provider/adjustment) with provenance.
- Copilot can start profiling, signal studies, and (later) vectorized strategy evals via Zod registry tools.
- Jobs are async, immutable, fingerprintable, and cancelable.
- Tool results are compact: key metrics, bounded preview tables, warnings, artifact refs — not raw OHLCV dumps.
- Sandbox (when shipped) has no network, read-only data mounts, allowlisted packages, CPU/memory/time budgets.
- Chart indicator scripting remains separate; this track does not mutate React or chart state directly.

### Non-goals

- Extending `@edge/indicator-runtime` / QuickJS into a general quant sandbox.
- Dumping full candle histories into Copilot prompts or tool-result chips.
- LEAN / Zipline / broker-accurate event-driven portfolios in Phases 0–4.
- Unrestricted Python or arbitrary `pip install` on day one.
- Replacing the screener, journal stats, or Research Board stores with a notebook product.
- Live autotrading from research runs.

---

## First principles

| LLM is good at | Compute must own |
|----------------|------------------|
| Framing hypotheses as experiments | Arithmetic over large series |
| Choosing stats and explaining outcomes | Deterministic fills, warm-up, costs |
| Revising bounded analysis code | Reproducibility + data fingerprints |
| Spotting obvious methodology smells | Enforcing no look-ahead / resource limits |

Industry alignment: process data in an isolated execution environment; return summaries (Anthropic/Cloudflare “code mode”; OpenAI Code Interpreter; E2B/Modal as optional executors). Prefer Polars + DuckDB on Parquet over pandas-first; use vectorized signal research before full simulators.

---

## Target architecture

```text
Copilot / registry tools (TypeScript control plane)
        │
        ▼
ResearchComputePort  →  async jobs + artifact store
        │
        ├─ MarketDataService (acquire / paginate / normalize; sandbox has no internet)
        ├─ Dataset store (versioned Parquet partitions)
        └─ Python worker (Polars + DuckDB; later allowlisted code cells)
                │
                ▼
        Artifacts (metrics JSON, curves, trade tables, run manifest)
                │
                ▼
        Compact tool result → Copilot Data blocks / Research Board pins
```

**Reuse:** `src/lib/ai/` registry + server tool context; `MarketDataService` for acquisition; journal/screener compact-summary shapes; Research Board + Copilot Data blocks as presentation sinks.

**Do not reuse as compute:** `packages/indicator-runtime`, active-chart candle windows, screener `lastRun` as durable dataset, Research Board stores as execution engines.

**Plug-in sketch:** pure domain under `src/lib/researchCompute/` (or equivalent); server-only tool group (not `CLIENT_AI_TOOLS`); optional `ResearchComputePort` on `ToolContext` for jobs/pagination.

---

## Agent tool surface (target)

| Tool | Role |
|------|------|
| `create_research_dataset` | Materialize / fingerprint a versioned dataset |
| `get_research_dataset` | Metadata + provenance |
| `profile_research_dataset` | Distributions, correlations, missingness, rolling stats |
| `run_signal_study` | Declarative signal → forward-return / expectancy study |
| `run_strategy_evaluation` | Minimal vectorized entry/exit + costs (Phase 3+) |
| `run_research_code` | Bounded Python cell (Phase 4+) |
| `get_research_job` / `cancel_research_job` | Async lifecycle |
| `get_research_artifact` | Fetch artifact metadata / bounded preview |
| `compare_research_runs` | Side-by-side metrics (Phase 5) |

**Input rules:** dataset refs + typed experiment specs; never accept raw candle arrays from the model; version adjustment/timezone/fill/fee assumptions; hard caps on symbols, rows, runtime, sweep cardinality.

**Output rules:** `jobId`, status, run fingerprint, provenance, warnings, key metrics, artifact refs; preview tables ≤ ~20 rows; full series stay in artifacts.

---

## Phases

### Phase 0 — Contracts + architecture freeze

**Status:** **Passing** (2026-07-30)

**Outcome:** Spec is frozen before code: dataset identity, job/artifact shapes, tool names, security envelope, and explicit boundary vs indicator scripting.

| Work item | Scope |
|-----------|--------|
| 0.1 Dataset contract | Identity keys (symbols, interval, range, provider, adjustment); fingerprint fields; Parquet layout sketch |
| 0.2 Job + artifact contract | Async states, run manifest, metrics schema sketch, artifact kinds |
| 0.3 Tool surface freeze | Names + input/output philosophy (table above); permission = read / server-only |
| 0.4 Security envelope | No network in worker; read-only data; allowlist; CPU/mem/time; no app secrets |
| 0.5 Boundary docs | Pointers from script-depth / indicator scripting / AI ARCHITECTURE; `src/lib/researchCompute/ARCHITECTURE.md` stub or section |
| 0.6 Index sync | This file + [README](./README.md) + [ROADMAP.md](../ROADMAP.md) |

**Verification:** Doc review of 0.1–0.6; `npm run roadmaps:status-check` clean for this row; no runtime code required.

#### 0.1 Dataset contract (frozen)

**Identity keys** — every materialized dataset is addressed by:

| Field | Type | Notes |
|-------|------|-------|
| `symbols` | `string[]` | 1–50 symbols (v1 cap); uppercase normalized |
| `interval` | chart interval enum | Same vocabulary as `/api/candles` |
| `fromMs` / `toMs` | `number` | UTC epoch ms; inclusive range window |
| `provider` | provider id | Resolved route at acquisition time; stored in provenance |
| `adjustment` | `split` \| `dividend` \| `none` | Must match acquisition assumptions |
| `timezone` | IANA string | Session/calendar semantics for bar alignment |

**Dataset id:** stable `datasetId` = hash of identity keys + acquisition policy version (not content alone).

**Fingerprint fields** (reproducibility):

| Field | Role |
|-------|------|
| `contentFingerprint` | Hash of normalized OHLCV payload written to Parquet |
| `identityFingerprint` | Hash of identity keys + adjustment + timezone |
| `acquisitionMeta` | Provider route, `meta.source`, warnings, pagination extent, materialized row count |
| `materializedAt` | ISO timestamp when Parquet write completed |

**Parquet layout sketch:**

```text
{researchRoot}/datasets/{datasetId}/
  manifest.json          # identity + fingerprints + provenance
  partitions/
    symbol={SYMBOL}/
      bars.parquet       # normalized OHLCV columns
```

**Hard caps (v1 doc numbers):** ≤50 symbols; ≤500_000 total bars per dataset; materialization must paginate via `MarketDataService` (not chat `barCount` 500). Phase 1 implements enforcement.

#### 0.2 Job + artifact contract (frozen)

**Async job states:** `queued` → `running` → `succeeded` | `failed` | `canceled`. Terminal states are immutable.

**Run manifest** (written on job completion):

| Field | Role |
|-------|------|
| `jobId` | UUID |
| `toolName` | Registry tool that started the job |
| `datasetRef` | `datasetId` + identity fingerprint |
| `runFingerprint` | Hash of dataset ref + tool input spec + compute version |
| `startedAt` / `finishedAt` | ISO timestamps |
| `status` | Terminal state |
| `warnings` | string[] methodology / data-quality notices |
| `computeVersion` | Control-plane + worker semver (Phase 4 adds worker image id) |

**Artifact kinds:**

| Kind | Content | Phase |
|------|---------|-------|
| `run_manifest` | Job manifest JSON | 1+ |
| `metrics_json` | Key KPI object | 1+ |
| `preview_table` | Bounded tabular preview (≤20 rows in tool result) | 1+ |
| `equity_curve` | Time series for charts (artifact only) | 3+ |
| `trades_table` | Trade list (artifact only) | 3+ |
| `source_py` | Persisted Python cell source | 4+ |

**Compact tool-result shape** (returned to Copilot — never full series):

```text
jobId, status, runFingerprint, provenance, warnings[], keyMetrics{}, artifactRefs[], previewTable? (≤20 rows)
```

Full OHLCV, equity curves, and trade tables stay in artifacts; Copilot Data blocks render `keyMetrics` + bounded preview only.

#### 0.3 Tool surface freeze (frozen)

All tools below are **server-only** (not registered in `CLIENT_AI_TOOLS`). Permission: **`read`** for v1 (no destructive research mutations).

| Tool | Phase | Input philosophy |
|------|-------|------------------|
| `create_research_dataset` | 1 | Identity keys only; server paginates |
| `get_research_dataset` | 1 | `datasetId` ref |
| `profile_research_dataset` | 1 | `datasetId` + profile options |
| `run_signal_study` | 2 | `datasetId` + JSON IR signal spec |
| `run_strategy_evaluation` | 3 | `datasetId` + vectorized strategy spec (fees required) |
| `run_research_code` | 4 | `datasetId` + bounded Python cell |
| `get_research_job` | 1 | `jobId` |
| `cancel_research_job` | 4 | `jobId` |
| `get_research_artifact` | 1 | `artifactId` + optional preview limit |
| `compare_research_runs` | 5 | Two+ `runFingerprint` refs |

**Input rules (frozen):** dataset refs + typed experiment specs only; **never** accept raw OHLCV arrays from the model; version adjustment/timezone/fill/fee assumptions in spec; hard caps on symbols, rows, runtime, sweep cardinality.

**Output rules (frozen):** compact shape in 0.2; preview tables ≤ ~20 rows; artifact refs for full payloads.

#### 0.4 Security envelope (frozen)

| Control | v1 policy |
|---------|-----------|
| Network | **No network** in research worker (Phase 4+); Phases 1–3 control plane may call `MarketDataService` only during dataset materialization |
| Data mounts | Read-only dataset Parquet mounts in worker; no write outside artifact dir |
| Packages | Allowlist only when Phase 4 ships: Polars, DuckDB, NumPy, SciPy (+ narrow stats); no arbitrary `pip install` |
| Secrets | No app secrets (`EDGE_AUTH_SECRET`, DB URLs, API keys) in worker env |
| Budgets | Wall time, memory, output bytes, concurrent jobs — numeric caps in Phase 1+ implementation |
| Isolation gate | **Phase 4** is first shipped executor isolation (local Docker worker); Phases 1–3 run in Node control plane + filesystem artifacts |

E2B/Modal remain optional later executors — not before Phase 4 without explicit roadmap revision.

#### 0.5 Boundary docs (delivered)

- [src/lib/researchCompute/ARCHITECTURE.md](../../src/lib/researchCompute/ARCHITECTURE.md) — domain stub + plug-in map
- [src/lib/ai/ARCHITECTURE.md](../../src/lib/ai/ARCHITECTURE.md) — Phase 0 pointer (server-only research tools)
- [typescript-indicator-scripting-roadmap.md](./typescript-indicator-scripting-roadmap.md) — non-goal cross-link
- [script-depth-roadmap.md](./script-depth-roadmap.md) — strategies/backtests → this track
- [src/lib/marketData/ARCHITECTURE.md](../../src/lib/marketData/ARCHITECTURE.md) — acquisition/pagination pointer

#### 0.6 Index sync (delivered)

[README](./README.md) + [ROADMAP.md](../ROADMAP.md) Phase 0 **Passing** rows synced at closeout.

---

### Phase 1 — Datasets + descriptive research

**Status:** **Passing** (2026-07-30)

**Outcome:** Copilot can create a versioned dataset and run profiling studies; results are compact + artifact-backed.

| Work item | Scope |
|-----------|--------|
| 1.1 Dataset materialization | Server pagination beyond chat `barCount` 500; write Parquet; provenance from market-data meta |
| 1.2 Profile job | Missing bars, distributions, correlations, rolling stats |
| 1.3 Registry tools | `create_research_dataset`, `get_research_dataset`, `profile_research_dataset`, `get_research_job` |
| 1.4 Copilot presentation | Compact summary → Data block; optional Research Board pin |

**Verification:** Focused tests on fingerprint + profile metrics; app-level: Copilot starts profile → sees metrics without candle dump.

---

### Phase 2 — Signal / event studies

**Status:** **Passing** (2026-07-30)

**Outcome:** Declarative “when X, what happens next?” studies with holdout splits — no order simulation.

| Work item | Scope |
|-----------|--------|
| 2.1 Signal expression contract | Approved indicators/transforms only (v1) |
| 2.2 Study metrics | Forward returns, hit rate, expectancy, drawdown of signal returns, regime splits; optional bootstrap CIs |
| 2.3 Train/test partitions | Explicit date splits + warnings on peeking |
| 2.4 Tool | `run_signal_study` |

**Verification:** Golden datasets; look-ahead unit tests; app-level Copilot loop: hypothesize → study → explain.

---

### Phase 3 — Minimal vectorized strategy evaluation

**Status:** **Passing** (2026-07-30)

**Outcome:** Explicit entry/exit, direction, sizing rule, fees, slippage, execution timing → trades + equity curve. Labeled **vectorized research**, not broker-accurate simulation.

| Work item | Scope |
|-----------|--------|
| 3.1 Strategy eval contract | Required fees/slippage/timing fields |
| 3.2 Outputs | Trades artifact, equity curve, exposure, turnover, risk metrics |
| 3.3 Tool | `run_strategy_evaluation` |
| 3.4 Warnings | Same-bar fill ambiguity, warm-up, survivorship / universe provenance |

**Verification:** Numeric parity fixtures; focused cost/timing tests; app-level walk with fees required.

---

### Phase 4 — Sandboxed Python research cells

**Status:** **Passing** (2026-07-30)

**Outcome:** Advanced / Copilot-authored bounded Python on mounted datasets after isolation is proven.

| Work item | Scope |
|-----------|--------|
| 4.1 Executor | Local Docker worker first; Modal/E2B optional later |
| 4.2 Allowlist | Polars, DuckDB, NumPy, SciPy (+ narrow stats); no network; no secrets |
| 4.3 Tool | `run_research_code` + cancel; persist source, env version, fingerprints |
| 4.4 Budgets | Wall time, memory, output bytes, process count |

**Verification:** Hostile-code tests (network/fs escape attempts fail); successful cell returns compact stdout/metrics + artifacts only.

---

### Phase 5 — Compare, pin, promote

**Status:** **Pending**

**Outcome:** Compare runs; pin to Research Sessions; promote validated signals toward indicator/playbook specs. Defer event-driven portfolios and live execution until demand is proven.

| Work item | Scope |
|-----------|--------|
| 5.1 `compare_research_runs` | Side-by-side KPIs + parameter diffs |
| 5.2 Board / session pins | Artifact cards with provenance |
| 5.3 Promotion hooks | Export signal/strategy spec toward scripts or playbooks (manual confirm) |

**Verification:** Focused compare tests; app-level pin + reopen artifact.

---

## Security, cost, latency, verification

| Risk | Control |
|------|---------|
| Untrusted code | Ephemeral non-root worker; no network; read-only mounts; package allowlist |
| Token / context blowup | Never return full series to the model; artifact refs only |
| Cost | Fingerprint caches; sweep cardinality caps; concurrent job limits |
| Latency | Async jobs + progress; reuse Parquet partitions |
| Bad science | Look-ahead tests; required costs on strategy metrics; holdout + multiple-testing warnings; golden cross-checks |

---

## Out of scope until later

- Full LEAN-class event-driven multi-asset portfolios
- Broker-accurate microstructure simulation
- GPU / ML training inside the sandbox (Modal only if explicitly activated)
- Community strategy marketplace
- Automatic live trading from a research run

---

## Open questions (Phase 0 resolutions)

Frozen defaults for v1 — later phases may revisit implementation detail only.

| # | Question | Phase 0 resolution | Owner phase |
|---|----------|-------------------|-------------|
| 1 | Local Docker-only executor for Phases 1–3, or E2B/Modal earlier? | **Node control plane + filesystem artifacts** for Phases 1–3; **Docker worker at Phase 4**; no E2B/Modal before then | 4 |
| 2 | Postgres + object store vs filesystem-first? | **Filesystem-first** under server-local research root (solo local-first); Postgres optional later | 1 |
| 3 | Signal expression language? | **JSON IR + curated indicator/transform ids** only; no free DSL in v1 | 2 |
| 4 | Auto-promote research signal to chart script? | **Manual copy-as-draft only**; no automatic chart-script promotion | 5 |

---

## Harness notes

- Do not activate this track in `PROJECT-STATUS.md` until WIP=1 allows it.
- Phase **Passing** requires quoted evidence + README / ROADMAP status sync (`npm run roadmaps:status-check`).
- Active Work name pattern: `AGENT — Quant research runtime — Phase N`.
