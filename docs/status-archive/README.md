# Project Status Archive

Cold ledger for harness history pruned from [`docs/PROJECT-STATUS.md`](../PROJECT-STATUS.md).

## Layout

| File | Contents |
|------|----------|
| `YYYY-MM.md` | Session Log entries and other cold dumps for that month |

## Rules

1. **Hot file** (`PROJECT-STATUS.md`) stays operational: Current Verified State only (no Previous stacks), open Active Work, in-flight Task Contracts, recent Session Log (~15 entries).
2. **Closeout** (`npm run harness:closeout`) archives the displaced Current Verified block to `docs/status-archive/YYYY-MM.md`. Previous Verified keep = **0** in hot file — run `npm run status:prune` for overflow.
3. When pruning manually, **move verbatim** — do not summarize away evidence. Script: `npm run status:prune` (or `npx tsx scripts/harness-archive.mts`).
4. Feature inventory and architecture truth stay in topic docs (`chart/features.md`, `*/ARCHITECTURE.md`), not here.

See retention table in `PROJECT-STATUS.md` § Harness Retention.
