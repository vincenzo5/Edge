# APP — Product surface

**Purpose:** Workspace, research, journal, screener, design system, persistence UX. Owns in-app chrome and user-facing shell invariants.

## Seed

- Edge tokens and primitives for chrome — see [Design System](../../CONSTRAINTS.md#design-system) and persistence MUSTs in [Security](../../CONSTRAINTS.md#security).
- **Never:** ad-hoc Tailwind palette in new chrome; landing brand tokens in chart platform UI; skip `baseRevision` on remote writes.

## Load set

Read after this pack, before deep edits (pick areas touched):

- [src/lib/design-system/ARCHITECTURE.md](../../src/lib/design-system/ARCHITECTURE.md)
- [src/lib/persistence/ARCHITECTURE.md](../../src/lib/persistence/ARCHITECTURE.md)
- [src/lib/appWorkspace/ARCHITECTURE.md](../../src/lib/appWorkspace/ARCHITECTURE.md)
- [src/lib/journal/ARCHITECTURE.md](../../src/lib/journal/ARCHITECTURE.md)
- [src/lib/research/ARCHITECTURE.md](../../src/lib/research/ARCHITECTURE.md)

## Sensors

Focused:

```bash
npm test -- --run src/app/components/
npm run lint:app-lib-boundaries
```

When design tokens change: `npm test -- --run src/lib/design-system/edge.test.ts`.

App-level when UI + state + persistence cross: layout sync, sidebar, or journal round-trip on `http://localhost:3003`.

## Status prefix

`APP — …` (e.g. `APP — research desk`, `APP — layout sync`).

## Security pins

| id | note |
|----|------|
| SEC-03 | Dev session cookie auth boundary |
| SEC-07 | Pattern-library ID/path validation |
| SEC-13 | Same-user FK ownership |
| SEC-14 | Link href allowlist |
| SEC-18 | Session cookie max age |
| SEC-19 | `EDGE_AUTH_SECRET` rotation = logout |

Full ledger: [security-invariant-ledger.md](../security-invariant-ledger.md).
