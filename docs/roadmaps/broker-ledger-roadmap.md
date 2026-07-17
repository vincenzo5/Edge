# Broker Ledger + Sync Roadmap

Durable IBKR account and execution ledger in Postgres — server-side ingest while Next.js + TWS sidecar are running. Replaces client-only journal fill sync as the source of truth for fills.

**Last updated:** 2026-07-16

## Product Goal

Portal and Edge trades on the same IB account land in the journal without opening the Journal module. Account equity and positions gain a stored history for reporting beyond live `AccountProvider` RAM.

## Runtime Model

- **Ingest runs while Next + sidecar are up** — no separate daemon; optional `EDGE_CRON_SECRET` ping to `/api/cron/brokerage-ingest`.
- **Postgres optional** for charting; ledger ingest no-ops when `DATABASE_URL` unset (journal localStorage fallback unchanged).
- **Sidecar does not write Postgres** — Next owns all durable rows.

## Phases

| Phase | Outcome | Status |
|-------|---------|--------|
| **0** | Roadmap + architecture links + harness Task Contract | Shipped |
| **1** | Server fill ingest + `broker_ingest_cursors`; snapshot-path trigger; cron route | Shipped |
| **2** | Gap detection + Flex auto-backfill when env configured; ingest status on cursor | Shipped |
| **3** | `account_snapshots` (NetLiq, cash, buying power); throttled ingest; GET API | Shipped |
| **4** | `position_snapshots`; client journal sync demoted to refresh-only; Data Health ingest age | Shipped |

## Data Flow (target)

```
IB Gateway → tws-sidecar (executions, summary, positions)
         → Next runBrokerageIngest (server)
         → journal_fills + cursors + snapshots (Postgres)
         → Journal UI reads ledger
Flex API/CSV → gap backfill → same journal path
```

## Out of Scope

- Sidecar → Postgres direct writes
- 24/7 ingest when Next is down
- Multi-broker consolidation
- Market candle storage in Postgres
- Production OAuth (dev session + cron secret only)
- Separate broker order-history archive (Edge `order_intents` covers Edge-placed orders)

## Verification

```bash
npm test -- --run src/lib/brokerage/ingest
npm test -- --run src/lib/persistence/repositories/brokerIngestRepository
npm test -- --run src/app/api/cron/brokerage-ingest
npm run build
```

**App-level:** **Passing** 2026-07-17 — paper F MKT `orderId=10190` `Filled` → new journal fill `execId=00025b44.6a5abe6c.01.01` without Journal UI (see functional plan B2).

**Functional scenarios:** [broker-ledger-functional-test-plan.md](./broker-ledger-functional-test-plan.md) (Tier A/B executed; C1 Flex optional/skipped).

## Related Docs

- [Journal Architecture](../../src/lib/journal/ARCHITECTURE.md)
- [Persistence Architecture](../../src/lib/persistence/ARCHITECTURE.md)
- [Journal Roadmap](./journal-roadmap.md)
- [Project Status](../PROJECT-STATUS.md)
