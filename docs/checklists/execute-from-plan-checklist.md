# Execute From Plan Checklist

Apply when implementing an **approved plan** or roadmap phase — not when planning.

**Rule:** [.cursor/rules/execute-from-plan.mdc](../../.cursor/rules/execute-from-plan.mdc)

## When to Use

- User says implement, execute, ship, or build from an approved plan
- Roadmap phase with an approved `.plan.md` or compact plan in chat
- Fresh-chat continue with `/handoff` brief + path to approved `.plan.md` (see **Fresh-chat execute** below)

Do **not** use for Plan mode or "plan this" asks — use [planning-router.md](./planning-router.md) instead.

## Pre-Execute Read

Read only:

- [ ] Approved plan — Proposed Plan steps, Verification Plan, Harness Update, Arch line, `Branch:` when present (do not re-classify unless plan is wrong/incomplete)
- [ ] [docs/PROJECT-STATUS.md](../PROJECT-STATUS.md) — Active Work row for this task + open Task Contract only (`Grep`; **≤2** status reads total: activate + closeout)
- [ ] Closest architecture doc for touched area (from plan files column or Area Ownership)

Do **not** read:

- [ ] `planning-router.md` or intent checklists (feature/refactor/bugfix/testing)
- [ ] `architecture-review-checklist.md` (Arch decision is in the plan)
- [ ] Session Log history (unless handoff explicitly points to a blocker)
- [ ] Full `PROJECT-STATUS.md`, Previous Verified stacks, or mid-step status re-reads

## Hot harness read windows

Slice-read only — full table in [harness-status-checklist.md](./harness-status-checklist.md).

| Mode | Read | Do not |
|------|------|--------|
| **Execute** | Approved plan; Active Work row + open Task Contract; **≤2** status reads (activate + closeout) | Full file; Previous Verified stacks; Session Log unless blocker pointer; mid-step re-reads |

## Gate — stop and re-plan

Before coding, confirm the plan has:

- [ ] Arch: N/A (reason) or Arch: Required (reviewer, Pending|Passed|Blocked)
- [ ] Focused verify command when code changes
- [ ] Concrete files for non-trivial work
- [ ] `Branch:` when present matches the work (stop/re-plan only if wrong — missing `Branch:` on pre-Phase-1 plans is OK)

If any missing → stop; tell user what's missing; do not discover or improvise.

## Execute Must

- [ ] Activate harness once — Active Work **Active**; run `npm run harness:activate -- --name "…"` to stamp task window (multi-task registry; use `efficiency:switch` when changing focus)
- [ ] Implement plan steps only — no bundled adjacent work
- [ ] Run Verification Plan tiers; quote actual command output
- [ ] Closeout once — see [session-exit-checklist.md](./session-exit-checklist.md)

## Execute Must Not

- [ ] Re-read planning-router or planning intent checklists after plan approval
- [ ] Re-scan Session Log for archaeology
- [ ] Re-open product roadmap except status line at closeout

## Explore (opt-in)

- [ ] **Default off** when roadmap or approved plan already lists concrete files — use `Read`/`Grep` on named paths
- [ ] **Allow** one explore/`Task` only when: file map unknown, bug localization, or plan step says discover
- [ ] **Cap:** at most one explore; no parallel explores; return paths + ≤5-line summary

## Fresh-chat execute

Prefer a **new execute chat** when plan research exceeded ~15–20 tool calls (same-session context is fat). Do **not** mandate for small phases.

**Starting a fresh execute chat:**

- [ ] End the plan session with `/handoff` (~800 tokens) + path to the approved `.plan.md`
- [ ] Paste the handoff into the new chat; attach or point to the plan file
- [ ] Follow this checklist and [execute-from-plan.mdc](../../.cursor/rules/execute-from-plan.mdc) — do not re-walk planning checklists

**Incoming handoff:** treat pasted handoff as the brief; execute the `Next ask` from the handoff, then the plan's Proposed Plan steps.

## Closeout

Walk [session-exit-checklist.md](./session-exit-checklist.md). Prefer [Harness Steward](../../.cursor/rules/harness-steward.mdc) (exclusive harness mutator):

```bash
npm run harness:closeout -- --name "…" --evidence-file path [--files …] [--roadmap …] [--session-log …] [--efficiency-file path]
npm run status:prune
npm run lint:harness-retention
npm run lint:efficiency-ledger
```

Do **not** pass `--user-messages` — `.edge/prompts.jsonl` (project hooks) auto-fills at closeout.

Closeout archives the displaced Current block to `docs/status-archive/` — **no** `## Previous Verified State` stacks in the hot file (Previous keep = **0**).

- [ ] Active Work → **Passing** with quoted evidence + Files column (via helper or manual)
- [ ] Efficiency ledger row appended via closeout gate (chain-anchored time window + prompt-log messages; spend null until `efficiency:reconcile`)
- [ ] Current Verified State block updated
- [ ] Session Log entry if work ran this session or cross-session
- [ ] Roadmap phase status line if applicable
- [ ] **Git commit after Passing** — one commit for task changes when evidence is quoted and state is **Passing** (repo commit protocol: status/diff/log → stage → HEREDOC). Skip if no changes, plan says `Commit: skip`, or not Passing. Never commit secrets / `.env.local`. Standing request for execute-from-plan.

## Spot-check (Phase 2)

Next planned product phase implement: expect **0** explore/`Task` subagents unless blocked or plan says discover. Record count in Session Log / A/B notes.
