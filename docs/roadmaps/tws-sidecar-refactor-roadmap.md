# TWS Sidecar Architecture Refactor

Behavior-preserving structural refactor of `services/tws-sidecar/main.py` into a multi-module `tws_sidecar/` package, then concurrency hardening — without changing frozen HTTP contracts consumed by Next.js.

**Last updated:** 2026-07-23

**Status:** Phases 0–7 **Passing** (2026-07-23) — `main.py` 90 lines; max module 378 lines; `Ran 55 tests OK`.

**Related:** [marketData ARCHITECTURE](../../src/lib/marketData/ARCHITECTURE.md), [trading ARCHITECTURE](../../src/lib/trading/ARCHITECTURE.md), [dual-connection-roadmap.md](./dual-connection-roadmap.md), [refactor-planning-checklist.md](../checklists/refactor-planning-checklist.md), [Project Status](../PROJECT-STATUS.md).

---

## Goal

1. **Eliminate the monolith** — `main.py` ≤150 lines; domain logic in `tws_sidecar/` packages.
2. **Preserve HTTP contracts** — paths, bodies, and response shapes frozen for `tws/client`, `brokerageClient`, `ibTws`.
3. **Harden concurrency** — cache-first SSE, per-connection handlers, orphan job abandon (after structural extract).

**Hard rule:** WIP=1; one phase Active at a time; each phase needs quoted unittest evidence before **Passing**.

---

## Organization invariant (Definition of Done)

| Path | Max lines |
|------|-----------|
| `main.py` | ≤150 |
| Any `tws_sidecar/**/*.py` module | ≤500 |

Domain code lives in `runtime/`, `market_data/`, `account/`, `trading/`, `routes/` — never re-accumulated into `main.py`.

---

## Phasing

| Phase | Outcome | Exit evidence |
|-------|---------|---------------|
| **0 — Contract freeze** | Roadmap, characterization tests, Task Contract | Sidecar unittest green |
| **1 — Leaf extract** | `config`, `util`, `mapping`, `auth`, `trading/models` | Symbols moved out of `main.py` |
| **2 — Runtime kernel** | `runtime/{state,worker,connections,supervisor}` together | Reconnect/supervisor tests green |
| **3 — Market data** | `market_data/*`, `routes/market_data.py` | No MD logic in `main.py` |
| **4 — Account** | `account/*`, `routes/account.py` | Account cache tests green |
| **5 — Trading + thin main** | `trading/*`, `routes/trading.py`, `main.py` ≤150 | Trading tests + line budget |
| **6 — Concurrency** | Cache-first SSE, per-connection handlers, abandon policy | New concurrency tests |
| **7 — Docs + harness** | ARCHITECTURE updates, track **Passing** | Organization gate verified |

---

## Anti-goals

- No HTTP path/body renames without coordinated TS migration
- No sidecar→Postgres writes
- No dual IB workers in v1
- No mega-module substitute (`service.py` with 2k lines)
- No opportunistic product features bundled in refactor phases
