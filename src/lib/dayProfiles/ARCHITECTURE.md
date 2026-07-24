# Day profiles

Confirmed day-classification labels for cohort browse (Phase 2) and mechanical rule assist (Phase 3).

## Store

- Phase 1 batch: `data/day-profiles/proposed/batch-20260718.csv`
- Propose batches: `data/day-profiles/proposed/batch-YYYYMMDD.csv` (new file per run; does not overwrite confirmed store)
- Human-confirmed rows use `status=confirmed`; L1 lives in CSV column `dayTypeHint` and is exposed as `dayType` in app types.

## Modules

| File | Role |
|------|------|
| `types.ts` | Zod schema + layer enums (L0–L3, L5) |
| `rules.ts` | Daily OHLCV classifiers (gap, vol, RVOL, relative, dayType hint) + metric helpers |
| `rulesOpen.ts` | RTH 5m openType classifier + ET session bar filter |
| `parseCsv.ts` | CSV → `DayProfile[]` |
| `load.ts` | Filesystem load for API route |
| `filter.ts` | AND filters across populated layers |
| `rthOpen.ts` | Session RTH open ms (`09:30` America/New_York) for chart goto |

## Rules assist (Phase 3)

Shared classifiers in `rules.ts` / `rulesOpen.ts` power:

- `npx tsx scripts/day-profiles-propose.mts [--days=N] [--skip-open] [--dry-run]` — daily tags + L1 hint + **L2 openType hint** from RTH 5m; rows stay `status=proposed`
- `npx tsx scripts/day-profiles-confirm-review.mts` — Phase 8 one-shot helper (auto-confirms; not the assist path)

Human still confirms L1/L2 before setting `status=confirmed`.

## API

`GET /api/day-profiles` — read-only list with optional query filters; returns `{ ok: true, profiles }`.

## UI

Days sidebar panel (`day-profiles`) fetches the API, filters L1–L3/L5, and opens a row on the active chart via `patchActiveCell` + pattern-library `requestChartGoto`.

## Out of scope

- L4 location / L6 setups columns
- Postgres sync, in-app propose/confirm/reject UI
- Catalyst / island gap mechanical assist
