# HARNESS — Agent instruction topology

**Purpose:** Rules, checklists, steward, closeout protocol, `PROJECT-STATUS.md` discipline. Quarantined lane — improve the router without piggybacking on product turns.

## Seed

- **Quarantine:** a turn mutates harness artifacts **or** product code, not both (unless plan explicitly scopes harness-only work).
- **Never:** grow `AGENTS.md` into an encyclopedia; restate full `CONSTRAINTS.md` in packs; skip quoted evidence before **Passing**.

## Load set

Read after this pack, before deep edits:

- [docs/harness/README.md](../README.md)
- [.cursor/rules/plan-harness-awareness.mdc](../../../.cursor/rules/plan-harness-awareness.mdc)
- [.cursor/rules/execute-from-plan.mdc](../../../.cursor/rules/execute-from-plan.mdc)
- [.cursor/rules/harness-steward.mdc](../../../.cursor/rules/harness-steward.mdc)
- [docs/checklists/harness-status-checklist.md](../../checklists/harness-status-checklist.md)
- [docs/checklists/execute-from-plan-checklist.md](../../checklists/execute-from-plan-checklist.md)

## Sensors

Focused:

```bash
npm run lint:instructions
npm run roadmaps:status-check
npm run lint:harness-retention
npm run lint:efficiency-ledger
```

On **Passing**:

```bash
npm run harness:closeout -- --name "…" --evidence-file …
```

## Status prefix

`HARNESS — …` or track phases like `Sub-harness tree — Phase N`.

## Security pins

None — process lane. Security ownership lives in product lane packs; ledger fill is Phase 4.
