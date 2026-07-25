# Task Efficiency Ledger

Append-only record of AI-assisted task cost and effort. One row per Active Work outcome (Passing, Blocked, or Abandoned).

**Store:** [`ledger.jsonl`](./ledger.jsonl)  
**Active stamp:** `.edge/efficiency-active.json` (gitignored; written at task activate)

## Domain

| Term | Definition |
|------|------------|
| **Task** | One Active Work row (or Task Contract) with a clear goal and completion evidence |
| **Passing** | Task evidence ran and latest result is recorded as Passing |
| **User message** | A prompt you send (Agent/Ask/Plan/etc.) — not agent tool calls or model replies |
| **Handoff** | A new chat/session continuing the same unfinished task (`/handoff`, fresh agent) |
| **Rework turn** | A user message after the task was treated as done that reopens the same task |
| **Spend (USD)** | Cursor usage cost for the task window (paste from Cursor Usage at closeout) |
| **Velocity** | Count of Passing tasks per week |

## Derived ratios (compute offline)

- **$/Passing** — spend ÷ Passing tasks
- **Messages / Passing** — user messages ÷ Passing tasks
- **Handoffs / task** — handoffs ÷ tasks that reached Passing
- **Rework rate** — rework turns ÷ total user messages

## JSONL schema

Each line is one JSON object:

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| `id` | yes | string | UUID |
| `task_name` | yes | string | Matches Active Work feature name |
| `started_at` | yes | ISO 8601 | Task window start |
| `ended_at` | yes | ISO 8601 | Closeout time |
| `outcome` | yes | enum | `Passing`, `Blocked`, `Abandoned` |
| `user_messages` | yes | int ≥ 0 | Your prompts in task window |
| `handoffs` | yes | int ≥ 0 | Fresh chats for this task |
| `rework_turns` | yes | int ≥ 0 | Reopen-after-done prompts |
| `spend_usd` | yes | number ≥ 0 | Task spend (manual from Cursor Usage) |
| `spend_baseline_usd` | no | number ≥ 0 | Cursor Usage at activate |
| `tokens` | no | int \| null | Optional if available |
| `notes` | no | string | Free text |
| `corrects` | no | string | UUID of row this corrects |
| `void` | no | boolean | When true, marks a correction row |

## Rules

1. **Append-only** — never rewrite history; corrections append a new row with `corrects` or `void`.
2. **WIP=1** — one active stamp at a time; attribute usage to the Active Work row only.
3. **Closeout gate** — `npm run harness:closeout` requires efficiency fields; Passing cannot finish without a valid ledger row.
4. **No dashboard** — query `ledger.jsonl` directly (jq, spreadsheet import, etc.).

## Commands

```bash
# At task activate (when Active Work → Active)
npm run efficiency:start -- --name "Feature — Phase N" [--spend-baseline-usd 12.34]

# At closeout (via harness:closeout flags or --efficiency-file)
npm run harness:closeout -- \
  --name "Feature — Phase N" \
  --evidence-file docs/evidence/....txt \
  --user-messages 8 \
  --handoffs 1 \
  --rework-turns 0 \
  --spend-usd 2.50
```

Efficiency file alternative (JSON):

```json
{
  "user_messages": 8,
  "handoffs": 1,
  "rework_turns": 0,
  "spend_usd": 2.5
}
```
