# Research Compute Domain

Server-side quantitative research runtime for Copilot and (later) the Research Board. The LLM orchestrates typed experiments; a research kernel runs math on large market datasets; chat receives compact metrics and artifact refs — never full OHLCV histories.

**Track:** [Quant Research Runtime Roadmap](../../../docs/roadmaps/quant-research-runtime-roadmap.md). **Phase 1 (2026-07-30):** filesystem datasets + profile jobs + server-only registry tools.

## Purpose

- Materialize versioned research datasets (symbol / interval / range / provider / adjustment) with provenance and fingerprints.
- Run async jobs: profiling, signal studies, vectorized strategy evaluation, (later) sandboxed Python cells.
- Return compact tool results to the AI registry; full series live in filesystem artifacts.

This domain is **not** chart indicator scripting. Do not extend `@edge/indicator-runtime` / QuickJS into a general quant sandbox.

## Control plane vs worker

```text
Copilot / registry tools (TypeScript)
        │
        ▼
ResearchComputePort  →  async jobs + artifact store
        │
        ├─ MarketDataService (acquire / paginate during materialization only)
        ├─ Dataset store (versioned Parquet under research root)
        └─ Python worker (Polars + DuckDB — Phase 4+ isolation)
                │
                ▼
        Artifacts (metrics JSON, curves, trade tables, run manifest)
                │
                ▼
        Compact tool result → Copilot Data blocks / Research Board pins
```

**Phases 1–3:** Node control plane + filesystem artifacts; worker isolation ships at Phase 4 (local Docker first).

## Plug-in boundary

| Layer | Location | Notes |
|-------|----------|-------|
| Domain | `src/lib/researchCompute/` | Contracts, materialization, profile jobs, artifact store |
| Registry tools | `src/lib/ai/tools/researchCompute.ts` | Server-only group; not `CLIENT_AI_TOOLS` |
| Port | `ResearchComputePort` on `ToolContext` | Injected via `createServerToolContext()` |

Tools MUST NOT import React or mutate component state — use `ToolContext` facades only (same as all registry tools).

## Reuse

| Source | Role |
|--------|------|
| `MarketDataService` | Dataset acquisition + pagination; provenance from `meta.source` |
| `src/lib/ai/` registry | Zod tools, permission metadata, compact summaries |
| Journal / screener | Bounded aggregate + preview-table patterns |
| Copilot Data blocks / Research Board | Presentation sinks for metrics and artifact pins |

## Do not reuse as compute

| Source | Reason |
|--------|--------|
| `packages/indicator-runtime` | Chart plot VM only |
| Active-chart candle windows | Ephemeral UI state; not durable datasets |
| Screener `lastRun` | Session-scoped; not versioned research materialization |
| Research Board stores | Presentation / pins; not execution engines |

## Phase 1 modules

| Module | Role |
|--------|------|
| `contracts.ts` | Zod schemas — dataset identity, jobs, artifacts, compact results |
| `materialize.ts` | Paginated `MarketDataService` acquisition → Parquet partitions |
| `profileMetrics.ts` | Pure-TS descriptive metrics + preview table |
| `service.ts` | `ResearchComputeService` — jobs, artifacts, profile runs |
| `server.ts` | Server singleton wired into AI tool context |

Research root defaults to `data/research/` (override `EDGE_RESEARCH_ROOT` in tests).

## Frozen contracts (Phase 0)

See roadmap Phase 0 subsections 0.1–0.4 for dataset identity, job states, artifact kinds, tool names, security envelope, and hard caps. Open questions #1–4 resolved there.

## Related docs

- [AI Tools Architecture](../ai/ARCHITECTURE.md) — registry + server tool context
- [Market Data Architecture](../marketData/ARCHITECTURE.md) — acquisition, pagination, provenance
- [Research UX Architecture](../research/ARCHITECTURE.md) — sessions and board pins (separate stores)
- [TypeScript Indicator Scripting Roadmap](../../../docs/roadmaps/typescript-indicator-scripting-roadmap.md) — chart plots only
- [Script Depth Roadmap](../../../docs/roadmaps/script-depth-roadmap.md) — strategies/backtests deferred here
