# Task Efficiency Ledger

Append-only record of AI-assisted task cost and effort. One row per Active Work outcome (Passing, Blocked, or Abandoned).

**Store:** [`ledger.jsonl`](./ledger.jsonl)  
**Usage import:** [`usage.jsonl`](./usage.jsonl)  
**Active registry:** `.edge/efficiency-active.json` (gitignored; multi-task map)  
**Prompt log:** `.edge/prompts.jsonl` (gitignored; ambient hook capture)  
**Session log:** `.edge/sessions.jsonl` (gitignored; idle detection)

## Domain

| Term | Definition |
|------|------------|
| **Task** | One Active Work row (or Task Contract) with a clear goal and completion evidence |
| **Passing** | Task evidence ran and latest result is recorded as Passing |
| **User message** | A prompt you send (Agent/Ask/Plan/etc.) — not agent tool calls or model replies |
| **Handoff** | A new chat/session continuing the same unfinished task (`/handoff`, fresh agent) |
| **Rework turn** | A user message after the task was treated as done that reopens the same task |
| **Spend (USD)** | Cursor usage cost attributed to the task time window — filled by `efficiency:reconcile` |
| **Velocity** | Count of Passing tasks per week |

## Derived ratios (compute offline)

- **$/Passing** — spend ÷ Passing tasks
- **Messages / Passing** — user messages ÷ Passing tasks
- **Handoffs / task** — handoffs ÷ tasks that reached Passing
- **Rework rate** — rework turns ÷ total user messages

## JSONL schema (ledger)

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
| `spend_usd` | yes | number ≥ 0 or null | Null until reconcile; filled by correction row |
| `tokens` | no | int or null | Optional; filled by reconcile |
| `notes` | no | string | Free text |
| `corrects` | no | string | UUID of row this corrects |
| `void` | no | boolean | When true, marks a correction row |

## Usage JSONL schema

Imported from periodic Cursor usage extracts:

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| `id` | yes | string | Unique import row id |
| `started_at` | yes | ISO 8601 | Usage interval start (point events: same as ended_at) |
| `ended_at` | yes | ISO 8601 | Usage interval end |
| `spend_usd` | yes | number ≥ 0 | Spend for interval |
| `tokens` | no | int | Tokens for interval |
| `source` | no | string | e.g. `cursor-usage-export` |
| `imported_at` | yes | ISO 8601 | When row was imported |

## Rules

1. **Append-only** — never rewrite history; corrections append a new row with `corrects` or `void`.
2. **Multi-task registry** — many open stamps; starting task B does not overwrite A; pause/resume/switch for context changes.
3. **Closeout gate** — `npm run harness:closeout` requires a valid time-window ledger row; spend may be null until reconcile.
4. **Spend deferred** — import usage periodically; run `efficiency:reconcile` to attribute spend/tokens by timestamp overlap.
5. **Timeline partition (Phase 9)** — project hooks append prompts; closeout chain-anchors `started_at` to previous ledger `ended_at` (gap-clamped); auto-fills messages/handoffs/rework from prompt log.
6. **No dashboard** — query JSONL directly (jq, spreadsheet import, etc.).

## Overlap attribution (reconcile)

When usage intervals overlap multiple closed task windows, spend/tokens split **pro-rata** by overlap duration.

## Commands

```bash
# At task activate (when Active Work → Active; idempotent resume by default)
npm run harness:activate -- --name "Feature — Phase N" [--session-id UUID] [--strict]

# Open-task status + chain anchor hint
npm run efficiency:status

# Context switch (pause foreground, resume/start target)
npm run efficiency:switch -- --name "Other task" [--session-id UUID]

# Attach chat session for transcript fallback at closeout
npm run efficiency:attach -- --name "Feature — Phase N" --session-id UUID

# List open tasks
npm run efficiency:list

# At closeout (chain-anchored window + prompt-log auto-fill; do not pass --user-messages)
npm run harness:closeout -- \
  --name "Feature — Phase N" \
  --evidence-file docs/evidence/....txt

# Lint: newly Passing rows must have ledger entry
npm run lint:efficiency-ledger

# Periodic: import Cursor usage extract
npm run efficiency:import-usage -- --file path/to/usage-export.jsonl

# Attribute spend/tokens to closed tasks by timestamp
npm run efficiency:reconcile [--dry-run] [--include-zero]

# Optional: backfill prompts from ~/.cursor/analytics/analytics.db
npm run efficiency:backfill [--dry-run]
```

Project hooks (committed in `.cursor/hooks.json`) append prompts on every submit and inject open-task context at session start. Plan mode does not run efficiency scripts.

Efficiency file alternative at closeout (JSON):

```json
{
  "user_messages": 8,
  "handoffs": 1,
  "rework_turns": 0
}
```

Spend is omitted (null) until reconcile unless explicitly provided.
