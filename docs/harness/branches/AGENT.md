# AGENT — AI tools

**Purpose:** Tool registry, MCP/HTTP adapters, confirmation, session bridge, Copilot. Owns AI capability and permission invariants.

## Seed

- All AI through registry — see [AI Tools](../../CONSTRAINTS.md#ai-tools) and [Security](../../CONSTRAINTS.md#security) confirmation/bridge MUSTs.
- **Never:** tools import React or mutate component state directly; bare `confirmed: true` on destructive tools; untrusted workspace snapshots in system prompt.

## Load set

Read after this pack, before deep edits:

- [src/lib/ai/ARCHITECTURE.md](../../src/lib/ai/ARCHITECTURE.md)
- [docs/ai-tools-architecture.md](../../ai-tools-architecture.md)

## Sensors

Focused:

```bash
npm test -- --run src/lib/ai/registry.test.ts
npm test -- --run src/lib/ai/
```

When MCP or session bridge touched: related route tests under `src/app/api/ai/`.

App-level when tool + app context cross: destructive tool requires confirmation token in UI flow.

## Status prefix

`AGENT — …` (e.g. `AGENT — MCP adapter`, `AGENT — confirmation flow`).

## Security pins

| id | note |
|----|------|
| SEC-06 | Confirmation token / session-bridge for destructive tools |
| SEC-11 | Bridge secret on session poll/result/execute |
| SEC-20 | Copilot prompt isolation |

Full ledger: [security-invariant-ledger.md](../security-invariant-ledger.md).
