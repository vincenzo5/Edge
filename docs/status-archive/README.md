# Project Status Archive

Cold ledger for harness history pruned from [`docs/PROJECT-STATUS.md`](../PROJECT-STATUS.md).

## Layout

| File | Contents |
|------|----------|
| `YYYY-MM.md` | Session Log entries and other cold dumps for that month |

## Rules

1. **Hot file** (`PROJECT-STATUS.md`) stays operational: Current Verified State, open Active Work, in-flight Task Contracts, recent Session Log.
2. **Do not** stack `## Previous Verified State` blocks in the hot file.
3. When pruning, **move verbatim** — do not summarize away evidence.
4. Feature inventory and architecture truth stay in topic docs (`chart/features.md`, `*/ARCHITECTURE.md`), not here.

See retention table in `PROJECT-STATUS.md` § Harness Retention.
