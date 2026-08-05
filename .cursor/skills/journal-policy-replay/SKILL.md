---
name: journal-policy-replay
description: >-
  Replay closed IBKR journal trades through risk policies and refresh the
  comparison canvas. Use for policy replay, replay journal through risk policies,
  compare risk policies on my trades, update policy-replay canvas, or run the
  trade policy analysis again.
---

# Journal Policy Replay

**APP specialty entry** — `Branch: APP`; load [docs/harness/branches/APP.md](../../../docs/harness/branches/APP.md). Trading notes: [docs/trading/README.md](../../../docs/trading/README.md).

Read this skill, then run the checked-in pipeline — **do not** re-invent ad-hoc `/tmp` replay scripts.

## Command

```bash
npm run journal:policy-replay
```

Optional flags:

- `--account U25026894` — IB account id on journal fills (default `U25026894`)
- `--out docs/evidence/policy-replay-latest.json` — JSON output path
- `--canvas ~/.cursor/projects/Users-vincentn-TV-AI/canvases/ib-live-risk-policy-replay.canvas.tsx` — canvas path override

## Prerequisites

- `DATABASE_URL` in `.env.local` (Postgres with journal fills ingested)
- Network for Yahoo daily bars (live run only; unit tests use inline paths)
- Closed STK round-trips with `openQty >= 10`, not `ignored`

## Assumptions (locked)

- **Path model:** Yahoo **daily closes** only (confirmed moves)
- **R unit:** `plannedRiskUsd / openQty` when present, else **ATR(14)** near entry
- Counterfactual only — not live planned risk unless recorded on the trade

## Outputs

| Artifact | Path |
|----------|------|
| Full JSON payload | `docs/evidence/policy-replay-latest.json` |
| Comparison canvas | `~/.cursor/projects/Users-vincentn-TV-AI/canvases/ib-live-risk-policy-replay.canvas.tsx` |

Open the canvas beside chat after a successful run. Lib + simulator: `src/lib/journal/policyReplay/`.

## Hard rules

- **Read-only DB** — SELECT journal trades/fills only; no orders, no writes except evidence + canvas
- **Do not** treat ATR-based R as live planned risk in product copy or tickets
- **Do not** skip the npm script for one-off analysis — keep results reproducible
- On Yahoo failures, report which symbols failed; do not fabricate paths

## Long / short caveats

Scoreboards split long vs short. Small short samples (often 1 trade) are **not** reliable for picking a short-side policy.

## Success report

```
Policy replay — N trades (XL / YS)
Wrote docs/evidence/policy-replay-latest.json
Canvas …/ib-live-risk-policy-replay.canvas.tsx
Step trail 0.25R: net +X.XXR · WR …% · exp …
Top policy: … (+X.XXR net)
```

## Failure report template

```
**Stopped at:** <step — DB load | Yahoo fetch | path build | write>
**Exit:** <code or key log lines>
**Account:** <account id used>
**Recommended next:**
- Confirm DATABASE_URL and journal ingest (`npm run dev`, sync journal)
- Re-run: npm run journal:policy-replay -- --account <id>
- Focused tests: npm test -- --run src/lib/journal/policyReplay/
```
