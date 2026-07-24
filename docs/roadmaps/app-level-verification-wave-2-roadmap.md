# App-Level Verification Wave 2 Roadmap

Phased closure of **app-level** proofs deferred after Wave 1 ([app-level-verification-roadmap.md](./app-level-verification-roadmap.md) Phases 0–8 **Passing**, 2026-07-22). Covers product tracks that shipped later with focused/build evidence only — no new product features.

**Last updated:** 2026-07-24

**Status:** Phase 0 **Passing** (inventory); Phase 1 **Passing** (2026-07-24); Phase 2 **Passing** (2026-07-24); Phases 3–4 **Pending**. Wave 1 remains closed; memory walks closed by [memory-efficiency-roadmap.md](./memory-efficiency-roadmap.md) Phase 14.

**Related:** [Project Status](../PROJECT-STATUS.md), [Testing Verification Checklist](../checklists/testing-verification-checklist.md), [Feature Roadmaps index](./README.md), [Wave 1](./app-level-verification-roadmap.md), [Repository Constraints](../CONSTRAINTS.md).

---

## Intent Classification

- **Primary:** Testing — close Definition of Done gaps where code + focused tests passed but browser/live evidence was deferred after Wave 1.
- **Secondary:** none (bugs found during walks become separate Active Work under WIP=1).
- **Checklists applied:** `testing-verification-checklist.md`, `harness-status-checklist.md`, `architecture-review-checklist.md`.
- **Assumptions:**
  - Wave 1 evidence stays valid; do not re-run Wave 1 checklists unless a walk finds a regression.
  - Memory efficiency Phase 14 closed resident-bar / 8-cell / lazy-chunk debt — **not** re-queued here.
  - One verification phase **Active** at a time (WIP=1).
  - Live keys (`OPENROUTER_API_KEY`, Redis, IB Gateway) required for some items — mark **Blocked** with missing env rather than inventing stubs.

---

## Checklist Review

- **Architecture review:** **N/A** for Phase 0 (docs + inventory). Bug fixes from walks get their own review.
- **Missing:** Prioritized queue for post–2026-07-22 deferred walks; ownership transfer from AI agent / Grok parity / Connections / Redis / journal import / MCP rows.
- **Misalignments:** Several Active Work rows still say “walkthrough deferred” while Wave 1 is marked track-complete; MCP alert tool row was incorrectly “superseded” by Wave 1 Phase 3 (scripts fixtures — different surface).
- **Risks:** OpenRouter quota; Redis Docker not running; Copilot UX drift vs frozen grok.com captures; WIP collision with Research UX / shared-cache product work.
- **Recommendations:** Prefer quoted evidence (URL, `meta.source`, toast text, thread id). Skip superseded walks. Do not reopen completed product phases unless verification fails.

---

## Product Goal

Clear the post–Wave 1 backlog of deferred app-level proofs so shipped Copilot, Connections, Redis health, journal import, and MCP alert paths have recorded browser/ops evidence — without mixing verification into feature roadmaps.

### Success criteria (track-level)

- Every item in Phases 1–4 is **Passing**, **Skipped** (with reason), or filed as a bug Active Work row.
- Source tracks that are product-complete point here for residual walks (not Wave 1).
- Harness records quoted app-level evidence per phase.

### Non-goals

- New features, polish, or light-theme Copilot tokens (product deferrals elsewhere).
- Re-running Wave 1 or Memory Phase 14 checklists.
- Authenticated grok.com pixel captures (optional reference debt — see Explicit deferrals).
- Research UX / Trade Management / Connections Phase 5 product work.
- External alert delivery, options/brackets, news, TrendSpider.

---

## Ownership Transfer

| Former owner | Product status | Verification debt |
|--------------|----------------|-------------------|
| [ai-agent-roadmap.md](./ai-agent-roadmap.md) | Phases 0–8 **Passing** | → Phase 1 |
| [grok-copilot-parity-roadmap.md](./grok-copilot-parity-roadmap.md) | Phases 0–5 **Passing** (track complete) | → Phase 2 |
| [connections-providers-roadmap.md](./connections-providers-roadmap.md) | Phases 0–4 **Passing**; Phase 5 product open | → Phase 3 (shipped Settings/prefs/Connection UI only) |
| [shared-cache-topology-roadmap.md](./shared-cache-topology-roadmap.md) | Phase 0–3+ product in progress | → Phase 4 (manual `redis:up` health flip from Phase 2) |
| Journal import UX (Active Work next-best-steps) | Shipped | → Phase 4 |
| Alert AI / MCP tools | Registry **Passing**; walk never done | → Phase 4 |
| Calm connection status UX | **Passing** | → Phase 4 (live sidecar fault header calmness) |
| [memory-efficiency-roadmap.md](./memory-efficiency-roadmap.md) | Phase 14 **Passing** | **None** — closed |
| [app-level-verification-roadmap.md](./app-level-verification-roadmap.md) | Wave 1 complete | **None** — closed |

---

## Evidence Template

```text
**App-level PASS:** <date> — <1–3 sentence observation with ids/URLs/meta if relevant>
```

Mark **Skipped** only with a one-line reason.

---

## Phasing

### Phase 0 — Inventory freeze

**Status:** **Passing** (2026-07-24)

**Outcome:** Single authoritative checklist for post–Wave 1 deferred walks.

| # | Deliverable |
|---|-------------|
| 0.1 | This roadmap authored with phases + ownership transfer |
| 0.2 | Indexed in [README.md](./README.md) + [ROADMAP.md](../ROADMAP.md) |
| 0.3 | Source tracks point residual walks here |
| 0.4 | Harness Pending Active Work + Task Contract (execution not started) |

**Exit:** Docs + harness row only; no runtime change.

---

### Phase 1 — Copilot agent functional walks

**Status:** **Passing** (2026-07-24)

**Outcome:** In-app agent path proven end-to-end with `OPENROUTER_API_KEY` (stream → bridge → confirm → linkage → persist → model → workflows).

**App-level evidence (2026-07-24, `http://localhost:3003/workspace`):**

- **1.1:** `POST /api/ai/chat` → NDJSON `text-delta` + `done` stop.
- **1.2:** Sidebar Copilot stream — “Say hello in one word only.” → “Hello”; thread `691e626f-d40d-467c-aa3b-bf2119905f32`.
- **1.3:** `get_chart_state` ok → **CSCO · 1d**.
- **1.4:** `prepare_chart_for_analysis` **Rejected**; `add_drawing` ok **Invalidation** @ 245.51; no `place_order`.
- **1.5:** **Skipped** — Cursor browser eval CSP blocks drawing-toolbar automation; `add_drawing` metadata stamps `threadId`/`messageId`.
- **1.6:** Refresh restores thread `d5e9ac81-52ca-4c44-8d7a-73008eead05d` (4 messages, `modelId` `openai/gpt-5.6-sol`).
- **1.7:** Model switch → `openai/gpt-5.6-sol`; reply **model-check-ok**.
- **1.8:** Mark invalidation chip — `get_candles`/`get_quotes`/`add_drawing` ok **Invalidation** @ 25.82 APLD.

| # | Item | Source | Pass criteria (summary) |
|---|------|--------|-------------------------|
| 1.1 | Chat route smoke | AI agent Phase 1 | `POST /api/ai/chat` (or documented curl) streams NDJSON with key set |
| 1.2 | Panel stream | AI agent Phase 2 | Open Copilot → send read-only ask → tokens + tool chips visible |
| 1.3 | Session bridge reads | AI agent Phase 3 | Agent `get_chart_state` / `summarize_chart` while workspace chart open |
| 1.4 | Confirm / drawing write | AI agent Phase 4 | Accept proposed annotation; Reject destructive; no silent `place_order` |
| 1.5 | Chart ↔ chat linkage | AI agent Phase 5 | Click AI drawing → correct chat turn; Open in chat; accept/dismiss metadata |
| 1.6 | Thread restore | AI agent Phase 6 | Refresh restores last thread; annotation click switches threads |
| 1.7 | Model switch | AI agent Phase 7 | Switch model mid-thread; subsequent send uses new allowlisted id |
| 1.8 | Workflow chips | AI agent Phase 8 | Empty-state chip runs useful tool use + visible chart update (with confirms) |

**Exit:** All 1.x **PASS** or **Skipped** (e.g. no OpenRouter key → Blocked, not silent Skip).

---

### Phase 2 — Grok Copilot UX parity walks

**Status:** **Passing** (2026-07-24)

**Outcome:** Shipped Grok-shell chrome matches frozen contract + reference captures at desk widths.

**App-level evidence (2026-07-24, `http://localhost:3003/copilot`):**

- **2.1:** New chat → `copilot-empty-brand` hero + centered `copilot-query-bar` + workflow chips; no dense empty header.
- **2.2:** Pill 800×60 @1440/@1024, `rgb(20,20,20)`, circular ↑; Submit→Stop during stream.
- **2.3:** In-bar model menu — 5 options, checkmark on Grok 4.5; switch to GPT-5.6; no header `EdgeSelect`.
- **2.4:** History rail collapse; `copilot-thoughts` with 6 tool steps; Copy + Regenerate on last assistant turn.

| # | Item | Source | Pass criteria (summary) |
|---|------|--------|-------------------------|
| 2.1 | Empty-state layout | Grok parity Phase 1 | `/copilot` empty: brand hero + centered composer + workflow chips; no dense empty header |
| 2.2 | Pill composer geometry | Grok parity Phase 2 | Query-bar pill + circular ↑/stop vs `docs/assets/grok-parity/` @ 1024/1440 |
| 2.3 | In-bar model menu | Grok parity Phase 3 | Model chip opens dropdown; checkmark; header `EdgeSelect` gone |
| 2.4 | Active thread chrome | Grok parity Phase 4 | History rail collapse; Thoughts disclosure; Copy + Regenerate last assistant turn |

**Exit:** Quoted visual/interaction observations; light theme remains product-deferred (not required).

---

### Phase 3 — Connections & provider preference walks

**Status:** **Pending**

**Outcome:** Settings Connections / Market data prefs and Connection displayName proven in browser.

| # | Item | Source | Pass criteria (summary) |
|---|------|--------|-------------------------|
| 3.1 | Settings Connections console | Connections Phase 1 | Gear → Connections + Market data: IB status, provider table, no secrets shown |
| 3.2 | Preference → `meta.source` | Connections Phase 2 | Reorder/disable display providers → chart candle/quote `meta.source` reflects preference |
| 3.3 | Connection displayName | Connections Phase 4 | Rename connection → reload → Settings + header Data picker show new name |

**Exit:** Quoted Settings + chart provenance observations. Phase 5 OAuth product work stays on connections roadmap.

---

### Phase 4 — Ops residuals (Redis, journal import, MCP, calm header)

**Status:** **Pending**

**Outcome:** Small leftover ops/UI proofs that do not need a dedicated product track.

| # | Item | Source | Pass criteria (summary) |
|---|------|--------|-------------------------|
| 4.1 | Redis health flip | Shared cache Phase 2 | `npm run redis:up` + redis backend → `/api/market-data/health` reports `kind: redis`; memory boot reports `memory` |
| 4.2 | Journal import dialog | Journal import UX | Import → expand help → drop Flex CSV → Done |
| 4.3 | Journal import + sync chrome | Journal import UX | Toolbar import icon → drop CSV; sync icon → spinner then idle |
| 4.4 | MCP alert tools | Alert AI / MCP tools | Cursor (or local) MCP session-bridge: create/list alert tool succeeds against open app session |
| 4.5 | Calm header on fault | Calm connection status UX | Live sidecar/Gateway blip → header calm incident + Reconnect; chart keeps feed chip + Data Health dot (no API/env dump) |
| 4.6 | MCP stderr log (optional) | MCP call logging | Local `mcp:edge` tool call emits one `event: "mcp.tool"` stderr line — **Skipped** OK if optional |

**Exit:** All required 4.1–4.5 cleared; 4.6 optional.

---

## Explicit deferrals

| Item | Why |
|------|-----|
| Authenticated grok.com pixel captures | Reference-asset debt; signed-in session unavailable at capture time — not Edge runtime DoD |
| Light-theme Copilot tokens | Product deferral on Grok parity track |
| Memory Phase 14 skips (`skippedNoAuth`, `skippedLargeFixture`) | Already closed with Skip reasons on memory track |
| Wave 1 items | Closed 2026-07-22 |
| Connections Phase 5 OAuth | Product backlog |
| External alerts / options / Research Board / Manage playbooks | Product backlog |

---

## Sequencing and WIP

1. Phase 0 docs — **Passing** with this file.
2. Activate **Phase 1** under WIP=1 when OpenRouter + workspace available (highest product gravity).
3. Phase 2 can batch with Phase 1 in one Copilot session when chrome is already open.
4. Phase 3 needs Settings + chart; no LLM key required.
5. Phase 4 last among walks; Redis flip needs Docker; MCP needs local MCP client.

Do **not** mark source product roadmaps “verification incomplete” after transfer — point to this file’s open phase instead.

---

## Verification Plan (meta)

| Tier | Use |
|------|-----|
| **Focused** | Only when a walkthrough finds a bug and a fix lands |
| **Build** | Only if that fix touches packages/app wiring |
| **App-level** | **Required** for every checklist item (or Skipped with reason) |
| **Full** | After a bug fix that crosses shared boundaries |

Harness: one Active Work row per phase (e.g. “App-level verification wave 2 — Phase 1”); quote observations; update this roadmap phase Status to **Passing** when the phase checklist is cleared.

---

## Harness Update (Phase 0)

| Section | Action |
|---------|--------|
| Active Work | Row **App-level verification wave 2** — **Pending** (Phase 0 inventory done; Phase 1 not Active) |
| Task Contract | Open for track until Phase 4 exit or pause |
| Session Log | Entry for roadmap authoring |
| Feature roadmaps README + ROADMAP.md | Wave 2 indexed; Wave 1 remains complete |
| Source tracks | Residual walks point here |

---

## Related docs

- [PROJECT-STATUS.md](../PROJECT-STATUS.md) — Active Work evidence
- [app-level-verification-roadmap.md](./app-level-verification-roadmap.md) — Wave 1 (complete)
- [ai-agent-roadmap.md](./ai-agent-roadmap.md), [grok-copilot-parity-roadmap.md](./grok-copilot-parity-roadmap.md)
- [connections-providers-roadmap.md](./connections-providers-roadmap.md), [shared-cache-topology-roadmap.md](./shared-cache-topology-roadmap.md)
