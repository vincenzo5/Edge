# Day Classification Roadmap

Label historical stock sessions into a small catalog so you can study cohorts of similar days (e.g. all trend days) and learn which conditions help or hurt setups.

**Not the goal:** AI that trades for you.

**Last updated:** 2026-07-23

## Catalog structure

A **day profile** is one labeled session: `(symbol, date)`. Layers are orthogonal — pick one value per exclusive layer (or leave null).

| Layer | Role | Cardinality | Values |
|-------|------|-------------|--------|
| **L0 Universe** | What is classified | exclusive | `tape_index`, `sector`, `single_name` |
| **L1 Day type** | Session shape (end of day) | exclusive | `trend`, `double_distribution`, `normal`, `normal_variation`, `neutral`, `non_trend`, `unknown` |
| **L2 Open type** | First 30–90 min | exclusive | `open_drive`, `open_test_drive`, `open_rejection_reverse`, `open_auction`, `open_unknown` |
| **L3a Gap** | Gap behavior | exclusive | `gap_none`, `gap_and_go`, `gap_fill`, `gap_and_fade`, `gap_partial`, `island` |
| **L3b Volatility** | Range vs recent | exclusive | `vol_expand`, `vol_normal`, `vol_contract`, `vol_climax` |
| **L3c Participation** | Relative volume | exclusive | `rvol_high`, `rvol_normal`, `rvol_low` |
| **L3d Catalyst** | News context (names) | exclusive | `catalyst_scheduled`, `catalyst_unscheduled`, `catalyst_none` |
| **L4 Location** | Vs prior value / VWAP | multi | `above_prior_value`, `inside_prior_value`, `below_prior_value`, `above_vwap`, `below_vwap`, `at_hv_node`, `at_lv_node`, `outside_day` |
| **L5 Relative** | Vs SPY / sector | exclusive | `leader`, `laggard`, `beta_proxy`, `idiosyncratic` |
| **L6 Setups** | Intraday plays observed | multi | Existing pattern-library family ids (`pullback_in_trend`, `breakout_retest`, `range_fade`, `failed_breakdown`, `momentum_continuation`, `reversal_climax`, …) |

**Relations (hypotheses for study, not rules):**

- Open → day: Drive / Test Drive often → `trend` or `double_distribution`; Rejection Reverse → `neutral`; Auction → `normal` / `non_trend`
- Day → setups: `trend` → pullback / momentum; `normal`/`neutral`/`non_trend` → range fade; Rejection / failed IB → failed breakdown; climax vol → reversal climax

Classify **tape first**, then the name relative to tape (L5).

## Phases

| Phase | Outcome |
|-------|---------|
| **0 — Schema** | This catalog locked as the label set (`schemaVersion: 1`) |
| **1 — Manual labels** | Label a small set of liquid names by hand; store day profiles |
| **2 — Cohort browse** | Filter/list days by L1–L5 (e.g. all `trend` + `gap_and_go` + `rvol_high`) and open them on the chart |
| **3 — Rules assist** | Optional mechanical hints from OHLCV to speed labeling (human still confirms) |

## Status

| Phase | Status |
|-------|--------|
| 0 — Schema | **Defined** (this doc) |
| 1 — Manual labels | **Passing** (2026-07-22) — 50 sessions confirmed in `data/day-profiles/proposed/batch-20260718.csv` (`confirmed:50`; L1+L2 human review via visual guide + RTH 5m); propose script: `npx tsx scripts/day-profiles-propose.mts` |
| 2 — Cohort browse | **Passing** (2026-07-22) — Days sidebar (`day-profiles`): filter L1–L3/L5 on confirmed CSV; open session on chart at RTH open via `GET /api/day-profiles` |
| 3 — Rules assist | **Passing** (2026-07-23) — shared rules in `src/lib/dayProfiles/rules*.ts`; propose fills gap/vol/RVOL/relative + dayType hint + **openType hint** from RTH 5m; human confirms before `status=confirmed`; `npx tsx scripts/day-profiles-propose.mts [--days=N] [--skip-open]` |

## Related

- **Visual guide (start here for review):** [day-classification-visual-guide.md](../trading/day-classification-visual-guide.md) + schematics in `docs/trading/assets/`
- Setup families (L6): `src/lib/patternLibrary/taxonomy.ts`
- Pattern capture / library: `src/lib/patternLibrary/ARCHITECTURE.md`
