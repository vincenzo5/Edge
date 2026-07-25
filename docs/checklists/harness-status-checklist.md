# Harness Status Checklist

Apply to **every** plan. Ensures work aligns with the project harness and `docs/PROJECT-STATUS.md` stays authoritative.

## Pre-Plan Read

Use **Hot harness read windows** (Plan mode) — slice-read only; do not load the full file or Previous Verified stacks.

- [ ] [docs/PROJECT-STATUS.md](../PROJECT-STATUS.md) — Current Verified State top block only (`Read` ~lines 1–20)
- [ ] Active Work rows for this track (`Grep` on feature/track name)
- [ ] Open Task Contract for this track (`Grep` on `## Task Contract — …`)
- [ ] Session Log only if handoff or blocker pointer (`Read` near `## Session Log`, ~30 lines)
- [ ] [AGENTS.md](../../AGENTS.md) — WIP=1 and Definition of Done reviewed

## Hot harness read windows

`PROJECT-STATUS.md` is a hot dashboard (~4k lines with history). Prefer `Read` with offset/limit + `Grep` for named rows — not full-file reads.

| Mode | Read | Do not |
|------|------|--------|
| **Plan** | Current Verified State top block; Active Work rows for this track; open Task Contract for this track; Session Log only if handoff/blocker | Full file; Previous Verified stacks; Session Log archaeology |
| **Execute** | Approved plan; Active Work row + open Task Contract for this task; **≤2** status reads (activate + closeout) | Mid-step re-reads; planning checklists; Session Log unless blocker pointer |

Implementing an approved plan → [execute-from-plan-checklist.md](./execute-from-plan-checklist.md) (Execute window above).

## WIP=1 Discipline

- [ ] Prefer one **Active** focus row; multi Active allowed when multitasking (efficiency registry tracks each task)
- [ ] Plan states what happens to other Active items when multitasking (pause via `efficiency:pause` / `efficiency:switch`)
- [ ] No adjacent refactors, polish, or follow-up features bundled while Active item lacks evidence

## Active Work Row (when starting tracked work)

- [ ] Feature name clear and distinct
- [ ] Behavior described in user-visible terms
- [ ] State set appropriately: **Pending**, **Active**, **Blocked**, or **Passing**
- [ ] Completion evidence / latest result field populated (not vague placeholders)
- [ ] Files column lists primary touched paths

## Task Contract (when required)

Create or update a Task Contract when work is:

- [ ] Long-running or cross-session
- [ ] Cross-component (UI + API + provider, chart engine + app, etc.)
- [ ] Likely to be handed off before completion

Contract must include:

- [ ] Status, Goal, Delivered (as work completes), Verification, Blockers

## Session Log (when required)

Append a Session Log entry when:

- [ ] Work spans multiple sessions or agents
- [ ] Handoff may happen before completion
- [ ] Verification was run and results should be preserved

Entry must include:

- [ ] Goal, Completed, Verification run, Next best step
- [ ] Known blockers if any

## Definition of Done

- [ ] Completion evidence passes before marking **Passing**
- [ ] Code written or unit tests alone are not sufficient without planned evidence tier
- [ ] App-level evidence included when change crosses UI + state + engine or API + provider

## Session Exit (before handoff)

See [session-exit-checklist.md](./session-exit-checklist.md) for the full exit gate. Minimum:

- [ ] Active Work state and latest result updated
- [ ] Task Contract updated or cleared
- [ ] Known blockers recorded
- [ ] Temporary/debug artifacts removed
- [ ] Next concrete action recorded
- [ ] Appropriate verification tier run and recorded

## Current Verified State Block

After significant work, update the top block with:

- [ ] **Current task** — one-line summary
- [ ] **State** — Pending | Active | Blocked | Passing
- [ ] **Latest verification** — exact commands and results
- [ ] **Evidence** — primary file paths
- [ ] **Current blocker** — none or explicit
- [ ] **Next best step** — single concrete action
- [ ] **Last updated** — today's date (YYYY-MM-DD)
- [ ] On closeout, displaced Current → `status-archive/`; **0** Previous Verified blocks in hot file (`status:prune` / [harness-steward.mdc](../../.cursor/rules/harness-steward.mdc))

## Retention / Archive

`PROJECT-STATUS.md` is a hot dashboard. Full history: [docs/status-archive/](../status-archive/).

- [ ] Previous Verified keeps **0** blocks in hot file; all displaced/historical blocks → monthly `status-archive/YYYY-MM.md` (`harness:closeout` + `status:prune`)
- [ ] Active Work keeps Active/Pending/Blocked + ≤10 recent Passing rows
- [ ] Completed Task Contracts moved to `status-archive/` (or deleted if Session Log already has evidence)
- [ ] Session Log keeps ~15 recent entries; older → monthly `status-archive/YYYY-MM.md`
- [ ] Prune when the hot file exceeds ~300 lines, after marking Passing, or weekly
