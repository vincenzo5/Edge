# Sub-Harness Tree

Edge’s agent instruction topology: a **thin parent** ([`AGENTS.md`](../../AGENTS.md) — Branch routing fan-out) plus **routed domain lanes**. Cursor **Plan mode** stays the sole planning ceremony; lanes narrow which pack and sensors load — they do not replace Plan mode or the plan → execute protocol.

**Track:** [Sub-Harness Tree Roadmap](../roadmaps/sub-harness-tree-roadmap.md). **Constraint truth:** [CONSTRAINTS.md](../CONSTRAINTS.md). **Status hub:** [PROJECT-STATUS.md](../PROJECT-STATUS.md) only — no per-branch status files.

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

---

## How Plan mode uses branches

1. **Mode ≠ branch** — Plan/Execute is *how* you work; branch is *which world* you enter.
2. **Parent** — [`AGENTS.md`](../../AGENTS.md) Branch routing points here; always-on CONSTRAINTS + PROJECT-STATUS. **Phase 5 live** (router enforcement + specialty cutover).
3. **Classify** — compact plan Intent Classification emits `Branch: <LANE>` (primary ± secondary). Wired into [plan-harness-awareness.mdc](../../.cursor/rules/plan-harness-awareness.mdc).
4. **Load** — Read `docs/harness/branches/<LANE>.md` before deep architecture reads.
5. **Execute** — reads `Branch:` from the approved plan; runs that lane’s sensors; no re-classification unless the plan is wrong.
6. **Topic docs** — branch pack → area `ARCHITECTURE.md` → focused verify.

Packs are ≤ ~80 lines: seed, load set, sensors, status prefix, security pins. They **link** into `CONSTRAINTS.md` — they do not restate it.

**Branch packs:**

| Pack | Path |
|------|------|
| ENGINE | [branches/ENGINE.md](./branches/ENGINE.md) |
| DATA | [branches/DATA.md](./branches/DATA.md) |
| LIVE | [branches/LIVE.md](./branches/LIVE.md) |
| AGENT | [branches/AGENT.md](./branches/AGENT.md) |
| APP | [branches/APP.md](./branches/APP.md) |
| OPS | [branches/OPS.md](./branches/OPS.md) |
| HARNESS | [branches/HARNESS.md](./branches/HARNESS.md) |

**BRAND** — side door only (no peer pack): `.cursor/skills/visual-assets/`, `.cursor/skills/visual-production/`, dashmotion; MCPs: LogoLoom, QuiverAI, **Higgsfield** (characters / logo concepts / marketing media — not production SVG).

---

## Seam rules (load-bearing)

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

## Intent → branch router

| User intent (examples) | Primary | Secondary |
|------------------------|---------|-----------|
| Chart pan/drawing/indicator/scripting/perf | ENGINE | — |
| Candle freshness, provider health, cache topology, connections-as-quotes | DATA | — |
| Order path, paper↔live isolation, sidecar control, display≠order account | LIVE | DATA (if connection prefs) |
| IBKR/TWS connection settings, quote routing | DATA | LIVE (if order path touched) |
| AI tool, MCP adapter, confirmation, session bridge, Copilot | AGENT | — |
| Workspace, research desk, journal, screener, design system, persistence UX | APP | — |
| Container deploy/rollback, readyz, HTTPS, env verify | OPS | — |
| Harness rules, checklists, steward, closeout, PROJECT-STATUS | HARNESS | — |
| Landing page brand kit, logos, characters, mockups, animations | BRAND | — (side door via visual skills + LogoLoom/QuiverAI/Higgsfield) |

**Specialty side doors (router-owned):**

- **OPS** — `.cursor/rules/deploy-local-prod.mdc`, `.cursor/skills/deploy-local-prod/`, `/deploy-prod` — OPS-forced; plan with `Branch: OPS` + [OPS.md](./branches/OPS.md)
- **BRAND** — `.cursor/rules/visual-assets.mdc`, `.cursor/skills/visual-assets/`, `.cursor/skills/visual-production/`, dashmotion; LogoLoom + QuiverAI + Higgsfield MCPs — side door only (no peer pack)
- **HARNESS** — `.cursor/rules/harness-steward.mdc`, `npm run harness:closeout` — quarantined; harness **or** product per turn

**Active Work naming:** new rows prefer lane prefixes (`DATA — …`, `OPS — …`, etc.). Roadmap track names (`Sub-harness tree — Phase N`) remain valid for HARNESS track work. No fail-closed lint on prefixes.

**Router matrix (manual smoke):** `/deploy-prod` → OPS; chart plan → ENGINE; order isolation → LIVE; market-data freshness → DATA; harness rule edit → HARNESS only; landing visuals → BRAND side door.

---

## Security (laminated, not a peer branch)

Security invariants live in [CONSTRAINTS.md](../CONSTRAINTS.md) Security section. Each MUST maps to an **owning lane** and **pinning test or doc** in [security-invariant-ledger.md](./security-invariant-ledger.md). Core lane packs list ledger ids they own under **Security pins**.

### Temporary SECURITY campaign mode

Use for time-boxed audit or hardening sprints — **not** a standing peer branch.

**When to use:** cross-lane security review, invariant gap audit, or post-incident hardening that touches multiple lanes (e.g. auth + trading + AI bridge).

**How to run:**

1. **Plan** — Intent Classification notes `SECURITY campaign` in Assumptions; primary lane stays the changed invariant (or **HARNESS** if docs-only). Load [security-invariant-ledger.md](./security-invariant-ledger.md) plus every lane pack whose pins are in scope.
2. **Execute** — Run each affected lane's pin tests (ledger **pinning test or doc** column) as focused verify; do not invent a SECURITY pack.
3. **Close** — Normal harness closeout when the campaign ends; archive campaign notes in evidence file. Campaign rows do not persist as a permanent branch.

**Exit:** campaign ends when scoped invariants are pinned or blockers are recorded; return to single-primary `Branch:` for follow-up work.

---

## Explicit non-goals

- Permanent **SECURITY** or **BRAND** peer branches with full pack machinery
- Per-branch `PROJECT-STATUS` files or per-branch closeout scripts
- Restating `CONSTRAINTS.md` inside every pack
- Replacing Cursor Plan mode with a custom planner
