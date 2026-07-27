# Sub-Harness Tree Roadmap

Evolve Edge’s single mega work harness into a **thin parent + routed domain sub-harnesses**, without replacing Cursor’s built-in Plan mode or the existing plan → execute protocol.

**Last updated:** 2026-07-27

**Status:** Phase 0 **Passing** (2026-07-27). Phase 1 **Passing** (2026-07-27). Phase 2 **Pending**.

**Related:** [AGENTS.md](../../AGENTS.md), [Plan → Execute Token Efficiency](./plan-execute-token-efficiency-roadmap.md), [plan-execute-routing](../../.cursor/rules/plan-execute-routing.mdc), [plan-harness-awareness](../../.cursor/rules/plan-harness-awareness.mdc), [execute-from-plan](../../.cursor/rules/execute-from-plan.mdc), [harness-steward](../../.cursor/rules/harness-steward.mdc), [CONSTRAINTS.md](../CONSTRAINTS.md), [Security Hardening](./security-hardening-roadmap.md), [Local Production Containerization](./local-production-containerization-roadmap.md).

**Origin:** 2026-07-27 design review — blast-radius split over org-title split; dual review (GPT-5.6 + Opus-5) converged on adding **DATA**, demoting **BRAND**, laminating **SECURITY**, and keeping Cursor Plan mode as the spine.

**Ledger / Active Work names:** `Sub-harness tree — Phase N`.

---

## Intent Classification

- **Primary:** Refactor — agent instructions, checklists, branch packs, and optional validators; no product runtime behavior.
- **Secondary:** Testing — lightweight gates (`lint:instructions`, optional branch/ledger lints); plan-session classification smoke (manual).
- **Architecture review:** N/A for Phase 0 (spec only). **Required** (self-review) for Phases 1–4 when rules, `AGENTS.md`, or validators change.
- **Assumptions:**
  - Cursor **Plan mode** remains the only planning ceremony; sub-harnesses narrow *which pack and sensors* load — they do not invent a parallel planner.
  - Plan vs execute stays an **orthogonal mode** (existing routing rules).
  - One `PROJECT-STATUS.md` hub remains; branches are labels / packs, not separate status files.
  - WIP=1 and evidence-gated closeout stay non-negotiable.
  - Branch packs are one page max and **point into** `CONSTRAINTS.md` / architecture docs — they do not restate them.

---

## Checklist Review

- **Missing:** Named domain packs; intent → branch router; security invariant ledger with owners; `Branch:` field in plan Intent Classification.
- **Misalignment:** Specialty skills (deploy, visual-assets) act as side doors without a first-class router; `AGENTS.md` is the single fat entry; market data has large surface + oracles but no harness owner.
- **Risks:**
  - Seven+ peer branches re-inflate token cost (fights [plan-execute-token-efficiency](./plan-execute-token-efficiency-roadmap.md)).
  - APP becomes the new mega-harness.
  - SECURITY laminated with no named owner → sensors rot.
  - META/HARNESS edits piggybacked on feature turns.
- **Decisions (locked):**
  - Split by **blast radius / failure mode / done-oracle**, not by job title (dev/security/media).
  - Core lanes: **ENGINE, DATA, LIVE, AGENT, APP, OPS**.
  - **BRAND** = side door / routed specialty pack (existing visual skills).
  - **HARNESS** (META) = quarantined exclusive lane (aligns with harness-steward); not folded into the thin parent’s always-on body.
  - **SECURITY** = laminated sensors + **invariant ledger**; temporary campaign mode only — not a permanent peer branch.
  - Add **DATA** in Phase 0 spec (not “later”).
  - Promote APP → SURFACE/STATE only if APP status rows dominate after packs land.

---

## Goal

After this track:

1. **Parent** (`AGENTS.md`) stays thin: init, WIP=1, DoD, plan/execute pointer, branch router pointer, layout map.
2. **Plan mode** classifies `Branch: <LANE>` and loads one branch pack before deep architecture reads.
3. **Execute** reads `Branch:` from the approved plan and runs that lane’s sensors — no re-classification unless the plan is wrong.
4. **Security** invariants map to owning lane + pinning test.
5. Token efficiency holds: no encyclopedia packs; no dual status systems; no parallel planning harness.

### Non-negotiables

| Outcome | Still required |
|---------|----------------|
| Cursor Plan mode | Sole planning ceremony |
| Plan → execute contract | Compact plan sections; execute skips planning checklists |
| WIP=1 | One Active Work focus |
| Quoted evidence | Real command output before **Passing** |
| Single status hub | `docs/PROJECT-STATUS.md` only |
| Constraint truth | `docs/CONSTRAINTS.md` remains source; packs link, don’t copy |

### Success criteria (track-level)

| Check | Pass |
|-------|------|
| Classification | ≥3 real Plan-mode sessions emit correct `Branch:` (primary ± secondary) |
| Load discipline | Plan turns Read the matching branch pack; do not load OPS/BRAND packs on unrelated work |
| Parent size | `npm run lint:instructions` green after parent trim |
| Ledger | Every Security-section MUST in `CONSTRAINTS.md` has owner lane + test/doc pointer |
| DoD | No skip of Arch / focused verify / app-level / closeout |

---

## Target topology

```text
PARENT (thin)
  WIP · router · shared DoD · status hub
  plan | execute = MODE (orthogonal)

Core lanes (packs under docs/harness/branches/):
  ENGINE   chart platform (packages/chart-*, indicators, drawings, scripting, perf)
  DATA     market truth (providers, cache, freshness, history, connections-as-quotes)
  LIVE     money path (orders, paper/live, TWS control, display≠order account)
  AGENT    AI tools (registry, MCP, confirmation, session bridge, Copilot)
  APP      product surface (workspace, research, journal, screener, design system, persistence UX)
  OPS      local production (container deploy/rollback, readyz, HTTPS, env verify)

Specialty:
  BRAND    side door — visual-assets / visual-production skills
  HARNESS  quarantined — rules, checklists, steward, closeout protocol
           (turn may be HARNESS or a work lane — never both)

Cross-cut:
  SECURITY laminated sensors per lane + invariant ledger
           (+ temporary audit campaigns)
```

### Seam rules (load-bearing)

| Concern | Owner |
|---------|--------|
| Quote / candle / cache / provider health | **DATA** |
| Order / account / paper↔live isolation / sidecar control | **LIVE** |
| IBKR/TWS as *connection* | **DATA** |
| IBKR/TWS as *order path* | **LIVE** |
| Tool permission / confirmation / bridge secret | **AGENT** |
| Deploy / health / rollback | **OPS** |
| Canvas engine / chart packages | **ENGINE** |
| In-app chrome / research shell | **APP** |
| Landing / brand kit | **BRAND** (side door) |
| Harness docs / status protocol | **HARNESS** |

Router picks **one primary** lane by changed invariant, then optional **secondary** packs. Path alone is insufficient (a TWS change may need DATA + LIVE + OPS).

---

## Baseline (what already works)

| Piece | State |
|-------|--------|
| Plan vs execute routing | **Shipped** — `plan-execute-routing.mdc` |
| Compact plan + execute-from-plan | **Shipped** — token-efficiency track complete |
| Hot harness read windows | **Shipped** — harness-status-checklist |
| Deploy specialty | **Shipped** — deploy-local-prod rule/skill/`/deploy-prod` |
| Visual specialty | **Shipped** — visual-assets / visual-production / dashmotion |
| Harness steward exclusivity | **Shipped** — `harness-steward.mdc` |
| Domain architecture docs | **Shipped** — per-`src/lib/*/ARCHITECTURE.md` |
| Security constraint cluster | **Shipped** — `CONSTRAINTS.md` Security section (hardening track complete) |
| DATA oracles (latent) | Exist — e.g. data-state / market-data scripts and roadmaps; no harness owner yet |

---

## Design principles

1. **Mode ≠ branch** — Plan/Execute is how you work; branch is what world you enter.
2. **Oracle defines the branch** — A lane exists when it owns gates no other lane can run.
3. **Thin packs** — Seed, load set, sensors, status prefix, security pins; ≤ ~80 lines.
4. **Parent routes; packs specialize** — Never grow `AGENTS.md` back into an encyclopedia.
5. **HARNESS quarantine** — Improving the router is not a side effect of a feature PR.
6. **Security has owners** — Laminated sensors without a ledger are theater.
7. **Prefer instruction changes first** — Validators only after classification discipline works in real sessions.

---

## Proposed Plan

### Phase 0 — Spec lock

**Outcome:** Target tree, router table, ledger schema, and seam rules are written and indexed. No agent behavior change yet.

**Deliverables:**

- This roadmap **Passing** as the locked design (Status line + README/ROADMAP indexes).
- `docs/harness/README.md` — short index of the tree + “how Plan mode uses branches.”
- Router table (intent examples → primary / secondary) in that README or `docs/harness/router.md`.
- Security ledger **skeleton** (`docs/harness/security-invariant-ledger.md`) — columns: invariant id / CONSTRAINT anchor / owning lane / pinning test or doc / status. Rows may be TBD stubs for Phase 4.

**Verification:**

- `npm run lint:instructions`
- `npm run roadmaps:status-check`
- Manual: tree matches Decisions (locked) above — DATA present; BRAND not a peer; SECURITY not a peer.

**Arch:** N/A — docs/spec only.

---

### Phase 1 — Branch field in Plan mode

**Outcome:** Every compact plan emits `Branch:` without loading full packs yet.

**Deliverables:**

- Update [plan-harness-awareness.mdc](../../.cursor/rules/plan-harness-awareness.mdc) Intent Classification template:

  ```md
  ## Intent Classification
  - Branch: <ENGINE|DATA|LIVE|AGENT|APP|OPS|HARNESS> (secondary: <lane|none>)
  - Primary / Secondary. Arch: …
  ```

- One-line pointer in [plan-execute-routing.mdc](../../.cursor/rules/plan-execute-routing.mdc) and [planning-router.md](../checklists/planning-router.md): classify Branch after Plan vs Execute, before deep topic loads.
- [execute-from-plan.mdc](../../.cursor/rules/execute-from-plan.mdc) / execute checklist: read `Branch:` from plan; do not re-classify unless plan is wrong/incomplete.

**Verification:**

- `npm run lint:instructions`
- Manual smoke: 2–3 Plan-mode sessions (different domains) produce plausible `Branch:` lines.

**Arch:** Required — self-review (instruction contract change).

---

### Phase 2 — Branch packs

**Outcome:** Six core packs + HARNESS pack exist; Plan mode loads the primary pack after classification.

**Deliverables:**

```text
docs/harness/branches/
  ENGINE.md
  DATA.md
  LIVE.md
  AGENT.md
  APP.md
  OPS.md
  HARNESS.md
```

Each pack (≤ ~80 lines):

1. **Seed** — purpose + never-do (links into `CONSTRAINTS.md` sections)
2. **Load set** — architecture docs / skills / checklists to Read
3. **Sensors** — commands that prove done
4. **Status prefix** — Active Work naming (`DATA — …`)
5. **Security pins** — ledger row ids this lane owns (may be stubs until Phase 4)

- Plan-harness rule: after `Branch:`, **Read** `docs/harness/branches/<LANE>.md` before area architecture deep-dives.
- BRAND remains documented as a side door in `docs/harness/README.md` (points at existing skills) — no peer pack required unless useful as a thin pointer file.

**Verification:**

- `npm run lint:instructions`
- Spot-check: each pack links to real paths; no restated full CONSTRAINTS essays.
- Manual: one Plan session per of DATA, LIVE, OPS loads only the matching pack as the first domain doc.

**Arch:** Required — self-review.

---

### Phase 3 — Thin parent

**Outcome:** `AGENTS.md` sheds specialty encyclopedias; router + pack index become the entry fan-out.

**Deliverables:**

- Trim [AGENTS.md](../../AGENTS.md): keep Communication, stack, init, verify, WIP/DoD, session exit, layout, hard-constraint summary, instruction hygiene.
- Replace long “Key Docs dump” behavior with: parent → router → branch pack → topic `ARCHITECTURE.md`.
- Pointers only for deploy (OPS), visuals (BRAND side door), steward (HARNESS).
- Confirm `lint:instructions` size/scoping gates still pass.

**Verification:**

- `npm run lint:instructions`
- Diff review: no loss of non-negotiable DoD / WIP / init commands.

**Arch:** Required — self-review.

---

### Phase 4 — Security ledger + sensors

**Outcome:** Security MUSTs have owners; lanes list mandatory sensors; optional campaign mode documented.

**Deliverables:**

- Fill `docs/harness/security-invariant-ledger.md` for every Security-section MUST in `CONSTRAINTS.md` (and clearly related API/trading auth MUSTs if they live elsewhere but are security-critical).
- Each core pack’s **Security pins** section lists real ledger ids.
- Document temporary **SECURITY campaign** mode in `docs/harness/README.md` (audit/hardening sprints; not a standing peer branch).
- Optional: lightweight `lint:harness-ledger` or extend `lint:instructions` to require ledger file presence + no empty owner column (only if cheap; skip if it fights YAGNI).

**Verification:**

- Ledger completeness vs `CONSTRAINTS.md` Security section (manual or script).
- `npm run lint:instructions`
- Spot-check: LIVE owns paper/live + trading auth pins; AGENT owns confirmation/bridge; OPS owns prod fail-closed / secret-free logs.

**Arch:** Required — self-review.

---

### Phase 5 — Router enforcement + specialty cutover

**Outcome:** Side doors are router-owned; HARNESS quarantine is explicit; optional validator for missing `Branch:`.

**Deliverables:**

- Deploy rule/skill: document as **OPS-forced** entry (already keyword-routed; align wording with branch pack).
- Visual skills: document as **BRAND** side door under harness README.
- HARNESS quarantine language in steward / HARNESS pack: a turn may mutate harness artifacts **or** product code, not both (unless plan explicitly scopes a harness-only task).
- Optional: plan/closeout warning or lint when Active Work / plan lacks `Branch:` for non-trivial tracked work.
- Closeout note: Active Work rows prefer branch-prefixed names for new work (`DATA — …`).

**Verification:**

- `npm run lint:instructions`
- Manual matrix: `/deploy-prod` → OPS; chart plan → ENGINE; order isolation → LIVE; market-data freshness → DATA; harness rule edit → HARNESS only.
- Track-level success criteria table above satisfied.

**Arch:** Required — self-review.

---

## Explicit deferrals

- Permanent **SECURITY** peer branch.
- Peer **BRAND** branch with full pack machinery (unless Phase 2 pointer file proves useful).
- Splitting **APP** into SURFACE vs STATE on day one.
- Per-branch `PROJECT-STATUS` files or per-branch closeout scripts.
- Auto-generated multi-agent teams / nested agent factories (revfactory-style) — out of scope.
- Replacing Cursor Plan mode with a custom planner agent.
- Restating `CONSTRAINTS.md` inside every pack.

---

## Verification Plan (track)

| Phase | Focused | Notes |
|-------|---------|-------|
| 0 | `lint:instructions`, `roadmaps:status-check` | Spec + indexes |
| 1–3 | `lint:instructions` + Plan-mode smoke | Instruction contract |
| 4 | Ledger completeness + `lint:instructions` | Security ownership |
| 5 | Manual router matrix + `lint:instructions` | Cutover |

App-level / `npm run build` **not** required — harness/docs only unless a phase accidentally touches runtime.

---

## Harness Update

- Activate `Sub-harness tree — Phase N` (WIP=1) when executing a phase.
- On **Passing**, quote evidence (`lint:instructions` output; smoke notes; ledger completeness).
- Task Contract / Session Log if cross-session.
- Commit: **yes** for instruction/doc phases (skip only if no changes).
- This track is **HARNESS**-lane work — do not mix with ENGINE/DATA/LIVE product phases in the same Active turn.

---

## Phase status summary

| Phase | Name | Status |
|-------|------|--------|
| 0 | Spec lock | **Passing** (2026-07-27) |
| 1 | Branch field in Plan mode | **Passing** (2026-07-27) |
| 2 | Branch packs | **Pending** |
| 3 | Thin parent | **Pending** |
| 4 | Security ledger + sensors | **Pending** |
| 5 | Router enforcement + specialty cutover | **Pending** |
