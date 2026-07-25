# Plan → Execute Token Efficiency Roadmap

Cut agent token cost for plan and implement work **without** weakening DoD, WIP=1, architecture review, focused verification, or quoted harness evidence.

**Last updated:** 2026-07-24

**Status:** Phase 0 **Passing** (compact plan template, 2026-07-24). Phase 1 **Passing** (execute-from-plan protocol, 2026-07-24). Phase 2 **Passing** (explore opt-in, 2026-07-24). Phase 3 **Passing** (hot harness read windows, 2026-07-24). Phase 4 **Passing** (scope plan-rule injection, 2026-07-24). Phase 5 **Passing** (fresh-chat execute process, 2026-07-24). Phase 6 **Passing** (harness closeout helper, 2026-07-24). Phase 7 **Passing** (task efficiency ledger, 2026-07-25). Complements [AGENTS.md](../../AGENTS.md), [plan-execute-routing](../../.cursor/rules/plan-execute-routing.mdc), [plan-harness-awareness](../../.cursor/rules/plan-harness-awareness.mdc), [planning-router](../checklists/planning-router.md), and [harness-status-checklist](../checklists/harness-status-checklist.md).

**Related:** [Project Status](../PROJECT-STATUS.md), `/handoff` Cursor skill (~800 tok fresh-chat briefs), existing evidence-gated docs automation (`npm run docs:auto-update` harness lane).

**Origin:** 2026-07-24 review of `~/.cursor/plans/*` plus recent plan→build agent transcripts. Compact plan *output* already shipped; this track targets **execution** cost (re-reads, explore subagents, harness thrash, fat same-session context).

---

## Intent Classification

- **Primary:** Refactor — agent instructions, checklists, and optional harness automation; no product runtime behavior.
- **Secondary:** Testing — lightweight A/B gates on the next few roadmap phases (read counts / explore counts), not app Vitest.
- **Architecture review:** N/A for Phases 1–3, 5 (docs/rules only). **Required** (self-review) for Phase 4 if `PROJECT-STATUS` is split or validators change; Phase 6 if closeout scripts touch harness contracts.
- **Assumptions:**
  - Keep outcomes; change only when/how often agents load docs and explore.
  - Planning still walks checklists internally; plans stay compact (deltas-only).
  - Execute must not invent scope when the plan is incomplete — re-plan instead.
  - WIP=1 — one phase Active at a time; quote real evidence before Passing.

---

## Checklist Review

- **Missing:** Optional status split; closeout helper (Phase 6).
- **Risks:** Efficiency rules that skip Arch / focused verify / app-level / quoted evidence; explore forever-forbidden when discovery is needed; splitting `PROJECT-STATUS` without validator support.
- **Decisions (locked):** Outcomes over prose; plan ceremony stays in Plan mode; implement uses the approved plan as contract; explore is opt-in for specified roadmap phases.

---

## Goal

After this track:

1. **Plan** sessions still route through checklists and emit compact plans (Arch + files + verify + harness line).
2. **Execute** sessions follow the plan: activate once → code → verify → closeout once — without re-walking planning checklists or Session Log archaeology.
3. Routine roadmap phases do not auto-launch explore subagents.
4. Agents load a small hot harness slice, not the full status history, mid-implement.
5. Large phases can implement in a fresh chat from plan + short handoff without quality loss.

### Non-negotiables (do not drop)

| Outcome | Still required |
|---------|----------------|
| WIP=1 | At most one Active Work row |
| Architecture decision | Arch: N/A (reason) or Required + reviewer + Pending/Passed/Blocked |
| Focused verify | Real command + quoted output when code changes |
| App-level | When UI+state, API+persist, or AI+app boundaries cross |
| Harness Passing | Quoted evidence; Files column; Task Contract / Session Log when cross-session |
| Incomplete plan | Stop and re-plan — do not “efficiently” improvise |

### Success criteria (track-level)

On the next 3 product roadmap phases after Phase 1–3 land:

| Check | Pass |
|-------|------|
| Behavior | Same DoD as today (verify quoted, harness Passing, app-level when required) |
| Execute reads | `PROJECT-STATUS` ≤ 2 reads during implement; 0 planning-checklist / planning-router reads after plan approval |
| Explore | 0 `Task`/explore subagents unless blocked or plan says discover |
| Plan quality | Compact sections; no Aligned essays / checklist link lists |
| Validators | `npm run lint:instructions` green; harness closeout still evidence-gated |

---

## Baseline (what already works)

| Piece | State |
|-------|--------|
| Compact plan template | **Passing** — [plan-harness-awareness](../../.cursor/rules/plan-harness-awareness.mdc) + [planning-router](../checklists/planning-router.md) |
| Planning Pre-Read / intent routing | Intact — must stay for Plan mode |
| Evidence-gated harness docs automation | Exists (`docs:auto-update` harness lane) |
| Handoff skill (~800 tok briefs) | Exists for fresh-chat continue |
| Observed waste (2026-07-24 sample) | ~6.8 `PROJECT-STATUS` reads/plan session; often 3–13 more during implement; ~1.3 explore subagents/session; ~565 duplicate same-path Reads / 40 sessions; status file ~547KB / ~4k lines |

---

## Design principles

1. **Outcomes fixed, ceremony movable** — DoD unchanged; repeated reads and explore tours are optional cost.
2. **Plan vs execute contracts** — Planning may be expensive; building should be boring and file-directed.
3. **Plan is the execute contract** — Missing Arch / files / focused verify → re-plan, not silent discovery.
4. **Explore is a tool, not a ritual** — Default off when roadmap + plan already name files.
5. **Harness twice** — Activate at start, Passing at end; no mid-step status thrash.
6. **Prefer instruction changes first** — Split/archive status and scripts only after read-window discipline works.
7. **WIP=1** — one phase Active; evidence before Passing.

---

## Proposed Plan

### Phase 0 — Compact plan output *(shipped)*

**Outcome:** Plan mode emits compact sections; checklist walk + DoD unchanged.

**Delivered:** Rewrite of `.cursor/rules/plan-harness-awareness.mdc`; planning-router Required Plan Sections + MUST NOT; architecture-review pointer for compact Intent/Checklist form.

**Evidence:** `npm run lint:instructions` passed; Active Work row **Compact plan template** **Passing**.

---

### Phase 1 — Execute-from-plan protocol *(shipped)*

**Outcome:** Implementing an approved plan skips planning ceremony without skipping quality gates.

**Delivered:** `.cursor/rules/execute-from-plan.mdc`; `docs/checklists/execute-from-plan-checklist.md`; one-line pointers in plan-harness-awareness, planning-router, AGENTS; `validate-agent-instructions.mts` wiring.

**Evidence:** `npm run lint:instructions` → `Instruction architecture validation passed.`; Active Work row **Execute-from-plan protocol** **Passing**; dry-run note — post-approve implement forbids planning-router / intent checklist reads.

---

### Phase 2 — Explore subagents opt-in *(shipped)*

**Outcome:** Roadmap phases with named files/scope do not auto-explore.

**Delivered:** Explore policy in `execute-from-plan.mdc`; opt-in bullets in `execute-from-plan-checklist.md`; plan-rule note in `plan-harness-awareness.mdc`; lint asserts in `validate-agent-instructions.mts`.

**Evidence:** `npm run lint:instructions` → `Instruction architecture validation passed.`; Active Work row **Explore subagents opt-in** **Passing**; spot-check on next product phase (0 explores unless blocked/discover).

---

### Phase 3 — Hot harness read windows *(shipped)*

**Outcome:** Agents read small slices of `PROJECT-STATUS`, not the whole history, during plan/execute.

**Delivered:** Hot harness read windows in [harness-status-checklist](../checklists/harness-status-checklist.md); Plan/Execute pointers in plan-harness-awareness, planning-router, execute-from-plan rule/checklist, AGENTS; lint asserts in `validate-agent-instructions.mts`.

**Evidence:** `npm run lint:instructions` → `Instruction architecture validation passed.`; Active Work row **Hot harness read windows** **Passing**; spot-check on next product phase implement — expect ≤2 `PROJECT-STATUS` reads.

---

### Phase 4 — Scope plan-rule injection *(shipped)*

**Outcome:** Coding turns do not pay full plan-writing instructions; optional hot/cold status split if Phase 3 is insufficient.

**Delivered:** `plan-execute-routing.mdc` always-apply stub routes Plan vs Execute; `plan-harness-awareness.mdc` demoted to agent-requestable (`alwaysApply: false`); execute rule description tuned; validator allowlist + asserts in `validate-agent-instructions.mts`; AGENTS Work Boundaries pointer; status split deferred.

**Evidence:** `npm run lint:instructions` → `Instruction architecture validation passed.`; Active Work row **Scope plan-rule injection** **Passing**; **Architecture review:** self-review **Passed**.

---

### Phase 5 — Fresh-chat execute (process) *(shipped)*

**Outcome:** Large phases can implement in a new chat from plan + handoff without quality loss.

**Delivered:** Fresh-chat execute section in [execute-from-plan-checklist.md](../checklists/execute-from-plan-checklist.md) and [execute-from-plan.mdc](../../.cursor/rules/execute-from-plan.mdc); AGENTS Work Boundaries one-liner; validator asserts for `/handoff` + `.plan.md`.

**Evidence:** `npm run lint:instructions` → `Instruction architecture validation passed.`; Active Work row **Fresh-chat execute** **Passing**; process note only (product-phase trial deferred).

---

### Phase 6 — Harness closeout helper

**Outcome:** Closeout is scripted and evidence-gated; models stop rewriting large markdown by hand.

**Scope:** Extend existing docs automation pattern:

```bash
npm run harness:closeout -- --name "…" --evidence-file …
```

Fills Active Work → Passing + quoted evidence, Current Verified State, optional Session Log line, roadmap phase status line. **Require** evidence file (same gate as harness lane today).

**Exit evidence:** Script + focused test or dry-run; one real phase closeout uses the helper.

---

### Phase 7 — Task efficiency ledger

**Outcome:** Every Passing/Blocked/Abandoned task records messages, handoffs, rework, and spend in one append-only ledger; closeout fails without a valid row.

**Scope:**

- `docs/evidence/efficiency/ledger.jsonl` + domain README
- `scripts/efficiency-ledger.mts` — `efficiency:start` active stamp + append/validate
- `harness:closeout` gate — `--user-messages`, `--handoffs`, `--rework-turns`, `--spend-usd` or `--efficiency-file`
- Checklist bullets in execute-from-plan + session-exit

**Exit evidence:** Focused tests pass; dry-run closeout without efficiency flags fails; with flags succeeds.

---

## Verification Plan (per phase)

| Tier | When |
|------|------|
| **Instructions** | `npm run lint:instructions` whenever rules/checklists/AGENTS change |
| **Focused** | Validator/unit tests if Phase 4 split or Phase 6 script lands |
| **Process A/B** | Next 3 product phases after Phases 1–3: compare status reads, explore count, DoD intact |
| **Build / App-level / Full** | N/A unless a phase accidentally touches app runtime |

---

## Harness Update

- Track row: **Plan → execute token efficiency** — **Passing** (Phase 0–7 complete, 2026-07-25).
- Phase 0–7 **Passing** via compact plan template + execute-from-plan + explore opt-in + hot harness read windows + plan-rule injection + fresh-chat execute + harness closeout helper + task efficiency ledger.
- Phase 7 evidence: **Focused:** Test Files 2 passed (2), Tests 32 passed (32); closeout gate blocks without efficiency fields.
- Do not activate while another product phase is Active (WIP=1).

---

## Explicit deferrals

- Rewriting historical `~/.cursor/plans/*`
- Mandating fresh-chat execute for every small phase
- Removing architecture review or lowering DoD for “efficiency”
- Auto-summarizing away plan research mid-session inside Cursor (platform-dependent)
