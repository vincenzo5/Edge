# Copilot Chat Blocks Roadmap

Phased track to evolve Edge Copilot’s **in-thread message vocabulary** into a small set of reusable blocks — informed by Cursor / agentic IDE patterns, Grok chat chrome, and Claude Artifacts / ChatGPT Canvas separation of chat vs side surfaces — without freezing Research vs Execution workflows yet.

**Last updated:** 2026-07-29

**Status:** Roadmap defined — Phase 0 **Passing**; Phase 1 **Passing**; Phase 2 **Pending**.

**Related:** [AI Agent / In-App Copilot](./ai-agent-roadmap.md) (Phases 0–8 **Passing**), [Grok Copilot UX Parity](./grok-copilot-parity-roadmap.md) (Phases 0–5 **Passing** — shell complete), [Research UX](./research-ux-roadmap.md) (pin / evidence / Board — side surfaces), [AI Architecture](../../src/lib/ai/ARCHITECTURE.md), [Research Architecture](../../src/lib/research/ARCHITECTURE.md), [Design System](../../src/lib/design-system/ARCHITECTURE.md), [Project Status](../PROJECT-STATUS.md), [Constraints](../CONSTRAINTS.md).

---

## Intent Classification

- **Primary:** Feature — user-visible Copilot message blocks (structured results, media, actions, reference chips, follow-ups).
- **Secondary:** Architecture — compact block contracts on the stream/UI boundary; Testing — bubble/list/contract coverage for each block kind.
- **Checklists applied:** `feature-planning-checklist.md`, `architecture-review-checklist.md`, `testing-verification-checklist.md`, `harness-status-checklist.md`.
- **Assumptions:**
  - Keep chat **freeform** — do not encode Research vs Execution mode policy in this track.
  - Prose is the **default message body** (markdown), not a named block type.
  - Context stays on the **composer / silent snapshot / optional reference chips**, not a permanent in-thread Context card.
  - Rich durable artifacts continue to exit chat via pin → evidence rail → Board (Artifact/Canvas pattern), not live multi-chart embeds in bubbles.
  - WIP=1 — one Active phase at a time.

---

## Checklist Review

- **Architecture review:** **Required** — self-review at roadmap level **Passed for roadmap**. Implementation phases that touch stream contracts, persistence schemas, or confirm gates need their own exit review.
- **Aligned:** Agent loop, registry tools, confirm cards, Thoughts disclosure, attachments, `artifactHint` pin cards, evidence rail, and workspace snapshot injection already ship.
- **Missing:** Generic Media / Data / Action renderers (beyond thin artifact cards); reference/citation chips; follow-up chips; stick-to-bottom scroll on the virtualized message list.
- **Misalignments:** Current artifact cards are label+pin shells; confirm cards are Action-shaped but not a shared primitive; tool results that could be tables often collapse to Thoughts + prose.
- **Risks:** Over-specific block types (prior divergent inventory); stuffing Board/Desk into bubbles; persisting large structured payloads on every thread row; breaking confirm-token / prompt-isolation invariants while enriching Action.
- **Recommendations:** Freeze a **small** block enum in Phase 0. Ship scroll + Action/Data/Media before Reference/Follow-ups. Keep `artifactHint` as a compatibility bridge until Data/Media replace thin cards.

---

## Product goal

Copilot turns can mix **markdown** with a handful of reusable in-thread blocks so tool results and decisions are scannable — without a zoo of one-off widgets or a locked research/execution process.

**One-line framing:** *Few generic chat blocks; prose stays the message; heavy work exits to evidence/Board/Desk.*

### Success criteria

- Named in-thread blocks are only: **Trace**, **Media**, **Data**, **Action**, **Reference**, **Follow-ups**.
- Markdown remains the default assistant/user body (not a “Text” block).
- No permanent “Context” message block; desk orientation uses silent `workspaceSnapshot` + optional Reference chips when tools fire.
- Action covers confirms, order/annotation proposals, and similar decide/act moments via one shell.
- Data covers table and key/value shapes from tools (screener, levels, indicators, quotes).
- Media covers user attachments and assistant chart snapshots.
- Trace remains the existing Thoughts / tool-step disclosure.
- Pin / Open still routes to evidence rail and Desk/Board — not a new in-chat live workspace.
- Message list stick-to-bottom when the user is near the bottom (send + stream).

### Non-goals

- Research vs Execution mode switch or agent permission posture by density.
- Named **Text** or **Context** block types.
- Live mini-chart embeds in every bubble (Board already caps live charts).
- Claude Artifacts / ChatGPT Canvas clone inside the bubble (evidence rail + Board own that role).
- Parallel agent-private desk state.
- Imagine / voice / multi-agent Heavy / SuperGrok-style modes.

---

## Research notes (industry → Edge)

| Pattern | Cursor / IDEs | Grok | Claude / ChatGPT | Edge decision |
|---------|---------------|------|------------------|---------------|
| Prose | Default message | Default message | Default message | **Not a block** — markdown body |
| Thinking / tools | Tool step rows | Thoughts | Thinking / tool use | **Trace** (have) |
| Approve change | Keep / Reject diffs | — | — | **Action** (extend confirms) |
| Images | Attachments | Inline media | Attachments | **Media** |
| Structured results | Often markdown / tool cards | Cards / citations | Tables in markdown | **Data** when interactive; else markdown OK |
| Context | `@` composer pills | Silent + citations | Attachments | Composer + snapshot; **Reference** chips if needed |
| Rich output | Editor / review | Side rails | Artifacts / Canvas | Evidence rail → Board (**side**, not bubble) |
| Next steps | — | Follow-up chips | Suggestion chips | **Follow-ups** (later phase) |

---

## Block taxonomy (frozen target)

```
Composer:  [+ attach]  [Ask…]  [model]
                │
                ▼
Turn:   [Trace ▼]                         ← have (Thoughts)
        [Media?] [Data?] [Action?]        ← tool / confirm products
        markdown answer                   ← default body
        [Reference chips?] [Follow-ups?]  ← light chrome under turn
                │
     Pin / Open ─► evidence / Board / Desk
```

| Block | Role | Shapes | Primary sources today |
|-------|------|--------|------------------------|
| **Trace** | Collapsed tool/thinking steps | Disclosure list | `CopilotMessageBubble` Thoughts |
| **Media** | Image / chart snapshot | Caption + Open | User attachments; chart capture; future assistant snapshot |
| **Data** | Structured facts | `table` \| `kv` + optional row actions | Tool results (screener, chart summary, levels, quotes) |
| **Action** | Decide / act | Title, summary, primary/secondary; confirm token when gated | `confirm-required`, order preview, annotation accept |
| **Reference** | Clickable source / deep-link chips | Compact pills under turn | Provenance from tools; symbol·interval → chart |
| **Follow-ups** | Suggested next prompts | Chip row; sends as user message | Static or model-suggested (phase-local choice) |

**Explicitly not blocks:** Text (message body), Context (composer / snapshot / Reference).

### Compatibility with `artifactHint`

Existing `ResearchArtifactHint` (`chart`, `screener`, `journalDraft`, `note`, `aiCallout`) maps into the new shells:

| Hint type | Target block |
|-----------|--------------|
| `chart` (with image later) | Media and/or Reference |
| `screener`, journal lists | Data |
| `note`, `aiCallout` | Prefer markdown; thin Data only if pin needs structure |
| Confirm steps | Action |

Phase 0 freezes the mapping; Phase 2+ may extend stream payloads beyond hint-only cards.

---

## Current foundations (do not rebuild)

| Piece | Status | Notes |
|-------|--------|-------|
| Thoughts / tool steps | Shipped | Trace |
| Confirm Accept/Reject | Shipped | Action seed |
| Attachments + chart capture | Shipped | Media seed (user side) |
| `artifactHint` + `CopilotArtifactCard` | Shipped | Thin card; pin to evidence |
| Evidence rail → Board | Shipped | Side artifact path |
| `workspaceSnapshot` on send | Shipped | Silent context (≤4k, fenced user message) |
| Virtualized message list | Shipped | Stick-to-bottom policy frozen in `chatScrollPolicy.ts`; Phase 1 verifies UX |

---

## Touch points (expected)

| Area | Path |
|------|------|
| Message UI | `src/app/components/copilot/CopilotMessageBubble.tsx`, `CopilotMessageList.tsx`, `CopilotArtifactCard.tsx` |
| Thread / stream | `src/app/components/copilot/useCopilotThread.ts`, `streamChat.ts` |
| Contracts | `src/lib/ai/agent/contracts.ts`, `src/lib/copilot/types.ts` |
| Artifact hints | `src/lib/research/artifactHint.ts`, `cardFromHint.ts` |
| Prompt library / follow-ups | `src/lib/ai/agent/promptLibrary.ts` |
| AI docs | `src/lib/ai/ARCHITECTURE.md` |
| This track | `docs/roadmaps/copilot-chat-blocks-roadmap.md` |

---

## Phasing

### Phase 0 — Contract freeze

**Outcome:** Block taxonomy and Zod (or equivalent) sketches committed; mapping from tool steps / `artifactHint` / confirms documented; no user-visible change required beyond docs/types if preferred.

**Status:** **Passing**

| Work item | Scope |
|-----------|--------|
| Taxonomy | Trace / Media / Data / Action / Reference / Follow-ups; exclude Text & Context |
| Schemas | Discriminated union for in-memory block payloads (stream → UI); persistence policy (hints stay in-memory unless phase says otherwise) |
| Mapping table | Tool names → Data/Media/Action; confirm → Action |
| Scroll contract | Stick-to-bottom when near bottom; do not yank when user scrolled up |
| Architecture note | Short section in `src/lib/ai/ARCHITECTURE.md` |

**Exit evidence:** Focused tests on schema parse/round-trip; self-review Passed; roadmap Phase 0 → Passing.

---

### Phase 1 — Scroll + Action shell

**Outcome:** Message list sticks to bottom during send/stream when near bottom; confirm/proposal UI shares one **Action** shell (Accept/Reject or primary/secondary).

**Status:** **Passing**

| Work item | Scope |
|-----------|--------|
| Stick-to-bottom | `CopilotMessageList` + virtualizer; respect “user scrolled away” |
| Action primitive | Shared component wrapping existing confirm cards; ready for order/annotation later |
| Tests | List scroll behavior; Action render + confirm wiring unchanged |

**Exit evidence:** Focused Copilot list/bubble tests; app-level: send message → viewport follows stream; scroll up → no yank; confirm still Accept/Reject.

---

### Phase 2 — Media + Data shells

**Outcome:** Generic **Media** and **Data** (table \| kv) renderers replace or wrap thin artifact cards for the highest-traffic tools; pin/Open preserved.

**Status:** **Pending**

| Work item | Scope |
|-----------|--------|
| Media block | Image + caption + Open; user attachments reuse; assistant chart snapshot when available |
| Data block | Table and kv layouts; optional row actions (e.g. Load symbol) wired only where safe |
| Hint bridge | `screener` / chart / journal hints render through Data/Media |
| Cap payload size | Keep stream summaries compact; no full candle dumps in blocks |

**Exit evidence:** Focused tests for Media/Data render + pin; app-level: tool that returns screener/chart hint shows Data/Media, not only Thoughts prose.

---

### Phase 3 — Reference chips

**Outcome:** Optional **Reference** chips under a turn for tool provenance and deep links (e.g. `AAPL · 1D`, provider freshness) — not a Context banner.

**Status:** **Pending**

| Work item | Scope |
|-----------|--------|
| Chip model | Label + href or in-app open handler |
| Emission | From tool results / `dataProvenance` / snapshot fields when present |
| Density | Cap count; collapse overflow |

**Exit evidence:** Focused chip tests; app-level: turn with chart tool shows clickable reference without a Context card.

---

### Phase 4 — Follow-ups

**Outcome:** **Follow-up** chips under completed assistant turns; click sends as a normal user message (with workspace snapshot).

**Status:** **Pending**

| Work item | Scope |
|-----------|--------|
| Chip source | Start from curated prompts (`promptLibrary`) or last-turn suggestions — pick one in phase; no mode routing |
| Placement | Under latest assistant turn only; hide while streaming / pending confirm |
| Empty state | Do not resurrect workflow pills in the empty hero (idle placeholder rotator stays) |

**Exit evidence:** Focused panel/bubble tests; app-level: chip send creates user message and streams reply.

---

### Phase 5 — Enrich Action payloads (trading / annotations)

**Outcome:** Order preview and annotation proposal use the Action shell with richer summary rows (still confirm-gated).

**Status:** **Pending**

| Work item | Scope |
|-----------|--------|
| Order preview | Map `preview_order` / confirm into Action summary fields |
| Annotation propose | Accept → existing drawing accept path |
| Security | No bypass of `confirmationToken` / destructive gates |

**Exit evidence:** Focused confirm/Action tests; app-level: gated tool still requires Accept; rejected path unchanged.

---

## Suggested execution order

1. Phase 0 (contracts)  
2. Phase 1 (scroll + Action shell) — unblocks usable chat immediately  
3. Phase 2 (Media + Data) — highest visual payoff for tools  
4. Phase 3 (Reference) → Phase 4 (Follow-ups)  
5. Phase 5 (richer Action) when trading/annotation UX needs it  

---

## Verification (per phase)

```bash
# Typical focused set (adjust to files touched)
npm test -- --run src/app/components/copilot/
npm test -- --run src/lib/research/artifactHint.ts src/lib/ai/agent/contracts.test.ts

# When stream contracts change
npm test -- --run src/lib/ai/agent/
npm test -- --run src/app/api/ai/chat/
```

App-level: `/copilot` or sidebar Copilot — send, stream stickiness, confirm, pin, Open.

---

## Harness

- Active Work name prefix: `AGENT — Copilot chat blocks — Phase N` (UI-heavy phases may use `APP —` if chrome-only; prefer **AGENT** when stream/contracts touch).
- WIP=1; on Passing quote focused (+ app-level when UI+stream cross) evidence.
- Commit: yes after each Passing phase unless phase says skip.
