# LIVE — Money path

**Purpose:** Orders, paper/live isolation, TWS sidecar control, display≠order account. Owns trading-path invariants no other lane can prove.

## Seed

- Order and account invariants — IBKR/TWS as *order path* lives here; connection prefs may need [DATA.md](./DATA.md) secondary.
- **Never:** mix paper and live without explicit isolation; treat UI display account as order account; mutate orders without persistence/auth gates when Postgres is on.

See [Security](../../CONSTRAINTS.md#security) trading and sidecar MUSTs.

## Load set

Read after this pack, before deep edits:

- [src/lib/trading/ARCHITECTURE.md](../../src/lib/trading/ARCHITECTURE.md)
- [docs/roadmaps/trading-audit-roadmap.md](../../roadmaps/trading-audit-roadmap.md) — when audit/isolation work

Secondary when connection prefs touched: [DATA.md](./DATA.md).

## Sensors

Focused:

```bash
npm test -- --run src/lib/trading/
```

When money-path or isolation is in scope:

```bash
npm run report:trading-audit
```

App-level when UI + order state + sidecar cross: paper order round-trip with display≠order account check.

## Status prefix

`LIVE — …` (e.g. `LIVE — paper isolation`, `LIVE — sidecar auth`).

## Security pins

| id | note |
|----|------|
| SEC-12 | Mutating `/api/trading/*` auth when Postgres configured |
| SEC-17 | `TWS_SIDECAR_SECRET` for non-loopback sidecar |

Full ledger: [security-invariant-ledger.md](../security-invariant-ledger.md) (Phase 4 fills owners).
