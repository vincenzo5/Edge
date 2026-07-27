# DATA — Market truth

**Purpose:** Quotes, candles, cache, freshness, provider health, history, connections-as-quotes. Owns market-data oracles no other lane can run.

## Seed

- Market truth invariants — IBKR/TWS as *connection* (not order path) lives here.
- **Never:** treat stale cache as fresh without oracle; bypass provider health gates; conflate display account with quote routing.

## Load set

Read after this pack, before deep edits:

- [src/lib/marketData/ARCHITECTURE.md](../../src/lib/marketData/ARCHITECTURE.md)
- [src/lib/chartDataFeed/ARCHITECTURE.md](../../src/lib/chartDataFeed/ARCHITECTURE.md)
- [src/lib/connections/ARCHITECTURE.md](../../src/lib/connections/ARCHITECTURE.md)
- [docs/roadmaps/market-data-reliability-roadmap.md](../../roadmaps/market-data-reliability-roadmap.md) — when freshness/topology work

## Sensors

Focused:

```bash
npm run lint:data-state-contracts
npm test -- --run src/lib/marketData/
npm test -- --run src/lib/chartDataFeed/
```

When freshness or provider health is in scope:

```bash
npm run report:data-reliability
```

App-level when API + cache + chart feed cross: confirm candle load and `meta.source` on `/api/candles`.

## Status prefix

`DATA — …` (e.g. `DATA — cache topology`, `DATA — provider health`).

## Security pins

| id | note |
|----|------|
| SEC-16 | `IBKR_SSL_VERIFY` default on |

Full ledger: [security-invariant-ledger.md](../security-invariant-ledger.md) (Phase 4 fills owners).
