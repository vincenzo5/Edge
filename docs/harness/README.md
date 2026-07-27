# Sub-Harness Tree

Edge’s agent instruction topology: a **thin parent** (`AGENTS.md`) plus **routed domain lanes**. Cursor **Plan mode** stays the sole planning ceremony; lanes narrow which pack and sensors load — they do not replace Plan mode or the plan → execute protocol.

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
2. **Classify** — compact plan Intent Classification emits `Branch: <LANE>` (primary ± secondary). Wired into [plan-harness-awareness.mdc](../../.cursor/rules/plan-harness-awareness.mdc).
3. **Load** — Read `docs/harness/branches/<LANE>.md` before deep architecture reads. **Phase 2 live.**
4. **Execute** — reads `Branch:` from the approved plan; runs that lane’s sensors; no re-classification unless the plan is wrong.
5. **Topic docs** — branch pack → area `ARCHITECTURE.md` → focused verify.

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

**BRAND** — side door only (no peer pack): `.cursor/skills/visual-assets/`, `.cursor/skills/visual-production/`, dashmotion.

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
| Landing page brand kit, logos, mockups, animations | BRAND | — (side door via visual skills) |

**Specialty side doors (already shipped):**

- **OPS** — `.cursor/rules/deploy-local-prod.mdc`, `.cursor/skills/deploy-local-prod/`, `/deploy-prod`
- **BRAND** — `.cursor/skills/visual-assets/`, `.cursor/skills/visual-production/`, dashmotion
- **HARNESS** — `.cursor/rules/harness-steward.mdc`, `npm run harness:closeout`

---

## Security (laminated, not a peer branch)

Security invariants live in [CONSTRAINTS.md](../CONSTRAINTS.md) Security section. Each MUST maps to an **owning lane** and **pinning test or doc** in [security-invariant-ledger.md](./security-invariant-ledger.md). Core lane packs list ledger ids they own (Phase 4).

**Temporary SECURITY campaign mode:** audit or hardening sprints may load multiple lane packs + the full ledger. Campaigns are time-boxed — not a standing peer branch. Full campaign protocol lands in Phase 4.

---

## Explicit non-goals

- Permanent **SECURITY** or **BRAND** peer branches with full pack machinery
- Per-branch `PROJECT-STATUS` files or per-branch closeout scripts
- Restating `CONSTRAINTS.md` inside every pack
- Replacing Cursor Plan mode with a custom planner
