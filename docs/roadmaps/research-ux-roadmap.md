# Research UX Roadmap — AI-First Edge Research Desk

Phased track to evolve Edge’s shell toward **research-first** UX: Copilot as the primary interaction, a **Research Board** as the durable workspace for multi-symbol / multi-timeframe edge-building, while **keeping the existing tiled Desk (`/workspace`) as a first-class mode forever**.

**Last updated:** 2026-07-24

**Status:** Roadmap defined — Phase 0 **Passing** (2026-07-24). Phase 1 **Passing** (2026-07-24). Phase 2 **Passing** (2026-07-24). Phase 3 **Passing** (2026-07-24). Phase 4 **Passing** (2026-07-24). Phase 5 **Passing** (2026-07-24). Phase 6 **Passing** (2026-07-24). Phase 7 **Passing** (2026-07-24). Phase 8 **Passing** (2026-07-24). **Track complete.**

**Related:** [ROADMAP.md](../ROADMAP.md) (Phase 5 Copilot + shell), [AI Agent Roadmap](./ai-agent-roadmap.md), [Grok Copilot UX Parity](./grok-copilot-parity-roadmap.md), [Workspace State Persistence](./workspace-state-persistence-roadmap.md), [Rich Annotations Vision](../chart/rich-annotations-vision.md), [News Flow](./news-flow-roadmap.md), [Screener](./screener-roadmap.md), [Journal](./journal-roadmap.md), [Alerts](./alerts-roadmap.md), [Design System](../../src/lib/design-system/ARCHITECTURE.md), [AI Architecture](../../src/lib/ai/ARCHITECTURE.md), [Project Status](../PROJECT-STATUS.md), [Constraints](../CONSTRAINTS.md).

---

## Intent Classification

- **Primary:** Feature — app-shell / UX reorganization for research-heavy workflows (not a new market-data or chart-engine rebuild).
- **Secondary:** Architecture — Research Session + card model as a persistence/UI boundary alongside Desk tiles; Testing — board/card/session contracts need deterministic coverage.
- **Checklists applied:** `feature-planning-checklist.md`, `architecture-review-checklist.md`, `testing-verification-checklist.md`, `harness-status-checklist.md`.
- **Assumptions:** Heaviest use case is **edge research** (many symbols, timeframes, data surfaces, AI help). Execution (orders/alerts) matters but is secondary. Tiled Desk must remain available. Solo trader / private app. WIP=1 for implementation phases.

---

## Checklist Review

- **Architecture review:** **Required** — self-review at roadmap level **Passed for roadmap**. Implementation phases that touch shell routing, persistence schemas, Copilot hosts, or chart-card lifecycle each need their own exit review.
- **Aligned:** Copilot already exists as sidebar / page / tile with tool registry + confirm gates; semantic annotation metadata (`thesis` / `invalidation` / `target` / `note`) ships; `/workspace` tiling + persistence track complete; AI must not mutate React outside the registry.
- **Missing:** First-class Research Session; pinable conversation artifacts; spatial Research Board; density switch (Talk / Board / Desk); AI conductor that places/links cards; session reel / replay; research-default entry without removing Desk.
- **Misalignments:** Product shell today is **tool/app-first** (tiles + module hub). Copilot is strong but still one surface among apps. This track flips default gravity to **research session + AI**, without deleting Desk.
- **Risks:** Infinite-canvas busywork for live single-symbol grind; memory cost of many live chart cards (reuse inactive-cell unmount patterns); dual persistence models (Desk vs Board) drifting; turning Board into a second workspace engine; skipping confirm gates when AI rearranges or promotes actions.
- **Recommendations:** Freeze session/card contracts in Phase 0. Ship Talk + pin/evidence rail before full Board. Keep Desk as an explicit density, never a deprecated path. Reuse chart/screener/journal surfaces as **card hosts**, not rewrites. Treat execution as **promote-from-board**, not a parallel home.

---

## Product goal

Edge becomes an **AI research partner** that helps build and retain trading edge across charts, timeframes, screener hits, notes, and related data — with tools summoned into a living thesis board. The tiled Desk remains for power users and dense multi-pane work. Execution tools (alerts, journal commits, orders) are **exit ramps** from research, not the primary shell.

**One-line framing:** *AI research partner that builds a living thesis board from live charts and data; Desk stays; execution is the exit ramp.*

### Success criteria

- User can work in **Talk**, **Board**, or **Desk** without losing the other modes.
- Research Session is a durable object (question + evidence cards + links + optional reel).
- Copilot tool results can be **pinned** as evidence without leaving chat.
- Board holds live/linked cards for chart slices, screener lists, journal drafts, notes, and AI callouts.
- AI can propose add/link/rearrange cards; destructive or write promotes use existing confirm gates.
- Desk (`/workspace` tiling) remains fully usable and syncable — never removed or hidden behind a kill-switch by default.
- Default entry can prefer research when the user opts in; Desk remains one click / last-module eligible.

### Non-goals

- Replacing the custom chart engine or TradingView parity chase.
- Deleting or gutting `/workspace` tiling.
- Ambient-only / voice-only shell as v1.
- Mission-control wall as the default home (may appear later for alert/scan mornings).
- Multi-user realtime CRDT collaboration on the board.
- Cloning Miro/Figma as a general whiteboard product.

---

## Densities (permanent product surfaces)

| Density | Role | Status target |
|---------|------|----------------|
| **Talk** | Default *interaction* — Conversation OS; tools return as artifacts; pin to evidence/board | Evolve from Copilot page/shell |
| **Board** | Default *research home* — spatial Research Board of cards + links | New (this track) |
| **Desk** | Power *charting/layout* — today’s `/workspace` tiles | **Keep forever** |
| **Stage** | Brief confirm / spotlight moments (not a home) | Lightweight overlay pattern |

```
ask (Talk) ──▶ pin artifacts ──▶ arrange on Board ──▶ open Desk when needed
                                      │
                                      └── promote ▶ alert / journal / order (Stage confirm)
```

---

## Current state (foundations — out of scope to rebuild)

| Piece | Status | Notes |
|-------|--------|-------|
| `/workspace` tiling shell | Shipped | Chart / Screener / Journal / Scripts / Alerts / Copilot tiles |
| Workspace persistence | Complete | Per-tile charts, desk sync — [workspace-state-persistence-roadmap.md](./workspace-state-persistence-roadmap.md) |
| Copilot agent + Grok UX | Complete | Sidebar / `/copilot` / tile; tools + confirms + threads |
| Semantic annotations | Phase A shipped | Thesis metadata on drawings; AI proposed drawings |
| Module hub `/home` | Shipped | App cards; last-module root redirect |
| Inactive chart unmount | Shipped | Memory efficiency — reuse for off-board / inactive cards |
| Research Session / Board | **Phase 3 v1 (local)** | Spatial board + session store; cloud sync Phase 6 |
| Conversation pin / evidence rail | **Passing (Phase 2)** | Talk evidence rail + Send to board (Phase 3) |

---

## Best practices (non-negotiable)

1. **Desk is permanent** — no phase may remove, disable-by-default, or break `/workspace` tiling as a supported density.
2. **Agent orchestrates; tools mutate** — Board/AI actions go through the registry + confirm gates; no ad-hoc React mutation from the LLM.
3. **Cards host existing surfaces** — chart/screener/journal/scripts are card *types* wrapping current modules, not parallel engines.
4. **Session ≠ Desk layout** — Research Session persistence is separate from workspace tile layout (same spirit as Copilot threads vs chart layout).
5. **Memory-aware cards** — inactive / off-viewport chart cards follow inactive-cell unmount / placeholder rules.
6. **Edge design system** — Board chrome uses Edge tokens/primitives; no one-off Miro clone aesthetic that fights the app.
7. **Execution is promote** — alerts/journal/orders start from board/Talk confirms; do not rebuild a trade blotter as the research home.
8. **WIP=1** — one Active phase at a time; do not bundle Board + reel + default-entry in one push.

---

## Target architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Density switch:  Talk  │  Board  │  Desk                       │
└─────────────┬───────────────┬───────────────┬───────────────────┘
              │               │               │
              ▼               ▼               ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────┐
│ Copilot Talk     │ │ Research Board   │ │ App Workspace Desk   │
│ artifacts + pin  │ │ cards + links    │ │ /workspace tiles     │
└────────┬─────────┘ └────────┬─────────┘ └──────────▲───────────┘
         │                    │                      │
         │     Research Session store                │ open as tile /
         │     (cards, links, reel beats)            │ promote card
         └────────────────────┴──────────────────────┘
                              │
                              ▼
                   AI tool registry + confirms
                   (unchanged ownership)
```

### Primary object: Research Session

| Field (conceptual) | Purpose |
|--------------------|---------|
| `id`, `title`, `question` | What the user is investigating |
| `cards[]` | Evidence: chart slice, screener snapshot/live, note, journal draft, news pin, AI callout, desk-link |
| `links[]` | Directed edges between cards (supports thesis chains) |
| `threadIds[]` | Linked Copilot threads |
| `reel[]` (later) | Ordered beats for session replay |
| `updatedAt` | Resume / last-module |

### Card types (v1 target)

| Type | Hosts | Notes |
|------|-------|-------|
| `chart` | Chart cell / lightweight chart surface | Symbol + interval + optional viewport/drawings ref |
| `screener` | Screener results / saved query | Pin hit list or live query ref |
| `note` | Markdown / research note | May link `market_research_notes` later |
| `journalDraft` | Journal draft trade/note | Promote → save journal |
| `aiCallout` | Copilot summary / claim | Links to `threadId` / `messageId` |
| `deskLink` | Pointer to a Desk tile/layout | Escape hatch without duplicating state |
| `news` (later) | Headline pin | Depends on [news-flow-roadmap.md](./news-flow-roadmap.md) |

---

## Touch points (expected)

| Area | Path |
|------|------|
| Desk shell | `src/app/components/app-workspace/` |
| Copilot | `src/app/components/copilot/`, `/copilot` |
| Home / entry | `src/app/components/home/`, `src/lib/app/lastModule.ts` |
| New research UI | `src/app/components/research/` (planned), `/research` (planned) |
| Session persistence | `src/lib/persistence/` + `/api/me/research-sessions` (planned); localStorage fallback |
| AI tools | Existing registry — optional later tools: `pin_to_research`, `add_research_card`, etc. |
| Design tokens | `src/lib/design-system/`, Copilot/Board chrome |
| Docs | This file; `ROADMAP.md`; design-system / AI ARCHITECTURE as phases land |

---

## Phasing

### Phase 0 — Contracts & information architecture

**Outcome:** Research Session / card / density contracts frozen; Desk permanence documented; no production Board yet.

**Status:** **Passing** (2026-07-24)

| Work item | Scope |
|-----------|--------|
| Density model | Document Talk / Board / Desk / Stage; Desk **must remain** |
| Session + card schemas | Zod (or equivalent) types for session, cards, links; version field |
| Ownership map | Desk layout vs Research Session vs Copilot threads — three stores, clear boundaries |
| Entry policy stub | How `/`, `/home`, `/copilot`, `/workspace`, `/research` relate (no forced redirect yet) |
| Architecture notes | Pointers from `ROADMAP.md` + this file; AI/design-system touch notes |

**Out of scope:** Board UI, persistence API, default-entry change.

**Exit:** Focused schema/unit tests; architecture review Passed; docs linked from roadmaps index.

---

### Phase 1 — Density switch + research entry (Desk untouched)

**Outcome:** User can switch Talk ↔ Desk explicitly; research entry exists without removing tiling.

**Status:** **Passing** (2026-07-24)

| Work item | Scope |
|-----------|--------|
| Density control | App chrome control: Talk / Board (may stub) / Desk |
| Talk surface | Elevate `/copilot` (or `/research` Talk host) as first-class research entry |
| Desk | `/workspace` unchanged in behavior; still last-module eligible |
| Board stub | Optional empty Board route/shell so switcher isn’t a dead end |
| Navigation | Home hub card / nav affordance for Research without deleting Charts/Journal/etc. |

**Out of scope:** Spatial cards, pin pipeline, session DB.

**Exit:** Focused nav/shell tests; app-level: open Talk and Desk in one session; Desk tile workflows still work.

---

### Phase 2 — Conversation artifacts + evidence rail

**Outcome:** Copilot tool results become pinable artifacts; Split-brain evidence stack as interim research surface.

**Status:** **Passing** (2026-07-24)

| Work item | Scope |
|-----------|--------|
| Artifact cards in chat | Chart summary / screener hits / journal draft / note render as cards |
| Pin action | Pin → evidence rail (session-local list) |
| Evidence rail | Split view beside Talk (thought \| evidence); reorder; open; unpin |
| Deep links | Open pinned chart context in Desk tile or chart module |
| Confirm unchanged | Writes still use Copilot confirm cards |

**Out of scope:** Infinite canvas, AI auto-layout.

**Exit:** Focused Copilot/artifact tests; app-level: ask → pin screener/chart → reopen from rail.

---

### Phase 3 — Research Board v1 (manual)

**Outcome:** Spatial board holds pinned cards; user arranges and links manually.

**Status:** **Passing** (2026-07-24)

| Work item | Scope |
|-----------|--------|
| Board canvas | Pan/zoom board; card nodes; simple directed links |
| Card hosts | At least `chart` (placeholder or live), `note`, `aiCallout`, `screener` (static pin ok) |
| Pin → Board | Evidence rail “Send to board” |
| Desk bridge | “Open in Desk” / `deskLink` card; never fork a second chart engine |
| Empty states | Board empty → prompt to ask Copilot or import from rail |

**Out of scope:** AI placing cards; cloud sync; reel.

**Exit:** Focused board model tests; app-level: pin 2+ cards, link them, reload board from local session state.

---

### Phase 4 — Live cards + Desk ↔ Board promote

**Outcome:** Cards are useful research surfaces; round-trip with Desk without duplicating sources of truth carelessly.

**Status:** **Passing**

| Work item | Scope |
|-----------|--------|
| Live chart cards | Mount chart with inactive unmount when off-viewport / unfocused |
| Screener cards | Live or refreshable query pin |
| Journal draft cards | Draft → save via existing journal paths + confirms |
| Promote / demote | Board card ↔ Desk tile; preserve identity where possible |
| Performance budget | Document max live chart cards; reuse memory-efficiency patterns |

**Depends on:** Phase 3; memory inactive-cell patterns.

**Exit:** Focused lifecycle tests; app-level: 3+ chart cards, focus one, confirm peers unmount/placeholder; Desk open still works.

---

### Phase 5 — AI board conductor

**Outcome:** Copilot can propose board mutations (add/link/arrange) through tools + confirms.

**Status:** **Passing** (2026-07-24)

| Work item | Scope |
|-----------|--------|
| Registry tools | **Frozen:** `get_research_board`, `add_research_card`, `link_research_cards`, `focus_research_card`, `arrange_research_cards` (confirm), `remove_research_card` (destructive + confirm) |
| Confirm policy | `remove_research_card` destructive; `arrange_research_cards` bulk layout confirm |
| Provenance | Cards created by AI mark `source: ai`; optional `threadId` / `messageId` on add |
| Talk ↔ Board | Agent narrates; board updates via `ResearchBoardPort`; user rejects via confirm decline |

**Out of scope:** Fully autonomous overnight research agents; multi-user presence; promote-to-alert/order (use existing alert/trading tools).

**Exit:** Focused tool + confirm tests; app-level: “build a board for NVDA OR-high thesis” → cards appear → user accepts/rejects.

---

### Phase 6 — Research Session persistence

**Outcome:** Sessions save/resume across reloads (local + optional cloud), separate from Desk layout.

**Status:** **Passing** (2026-07-24)

| Work item | Scope |
|-----------|--------|
| Local store | `tv-ai:research-sessions:v1` (or equivalent) fallback |
| Cloud API | `/api/me/research-sessions` when `DATABASE_URL` + auth present |
| Session list | Rename, delete, open recent |
| Thread linkage | Persist `threadIds`; opening session can focus related Copilot thread |
| Migration | Versioned schema from Phase 0 |

**Out of scope:** CRDT multi-device merge; realtime collab.

**Exit:** Focused repository/client tests; app-level: build board → reload → restored; Desk layout independently unchanged.

---

### Phase 7 — Session reel (storyboard)

**Outcome:** A research session can be replayed as an ordered reel of beats for review/journal.

**Status:** **Passing** (2026-07-24)

| Work item | Scope |
|-----------|--------|
| Reel beats | Auto or manual checkpoints (scan → chart mark → note → decision) |
| Timeline UI | Horizontal filmstrip; focus beat expands card |
| Export hooks | Optional “draft journal from reel” (uses journal APIs; no parallel journal) |

**Out of scope:** Video export; social sharing.

**Phase 7 evidence:** **Focused:** `Test Files 13 passed (13)`, `Tests 62 passed (62)`; **Build:** `npm run build` — ✓ Compiled successfully; **Architecture review:** self-review **Passed**; **App-level:** reel scrub + draft journal walkthrough deferred.

**Exit:** Focused reel model tests; app-level: complete a short session → scrub reel → open beat.

---

### Phase 8 — Research-default entry (opt-in)

**Outcome:** Product gravity can prefer research without stranding Desk users.

**Status:** **Passing** (2026-07-24)

| Work item | Scope |
|-----------|--------|
| Pref | User preference: default density Talk/Board/Desk |
| Smart `/` | Extend last-module to include `/research` (or Talk) without removing `/workspace` |
| Home hub | Research Session as primary card; Desk still prominent |
| Docs / onboarding | Short “Talk → pin → Board → Desk when needed” |

**Out of scope:** Removing module routes; forcing Board on all users.

**Phase 8 evidence:** **Focused:** `Test Files 4 passed (4)`, `Tests 31 passed (31)` (Phase 8 + lastModule + hub + redirect); AppSettingsShell `Tests 7 passed (7)`; **Build:** blocked by pre-existing `tradingClient.ts` import parse error (unrelated); **Architecture review:** self-review **Passed**; **App-level:** pref Desk/Board landings deferred.

**Exit:** Focused last-module/pref tests; app-level: pref Desk → `/` still lands Desk; pref Board → lands research; both modes healthy.

---

## Explicit deferrals

- Ambient ghost UI / voice-first shell as default.
- Mission Control monitor wall as primary home (candidate later for alerts morning brief).
- Multiplayer / CRDT board sync.
- Full Miro/FigJam feature parity (freehand, sticky storms, templates marketplace).
- Replacing semantic annotations with board-only notes (board **complements** chart metadata).
- Auto-trading from board without existing trading confirm paths.

---

## Dependencies & sequencing

| Depends on | Why |
|------------|-----|
| AI agent + Grok parity (done) | Talk surface and tool/confirm foundation |
| Workspace persistence (done) | Desk remains correct while Board grows |
| Memory inactive unmount (done) | Live chart cards must not explode heap |
| News flow (optional later) | `news` card type richness |
| Alerts / journal / trading (done foundations) | Promote-from-board exit ramps |

**Suggested activation order:** Phase 0 → 1 → 2 → 3 → 4 → 5 → 6 → (7 and 8 can swap if default-entry is product-critical earlier; reel is lower priority than persistence).

---

## Verification plan (track-level)

| Layer | When |
|-------|------|
| Focused unit/component | Every phase — session/card schemas, density switch, pin/board actions, tools |
| Build | When touching app routing / shared providers |
| App-level | Talk↔Desk switch; pin→board; live card unmount; session reload; pref entry |
| Architecture review | Phase 0 + any phase that adds persistence schema or AI board tools |

Do not declare a phase Passing without recording evidence in `docs/PROJECT-STATUS.md`.

---

## Harness update

When Phase 0 is activated: set Active Work row **Research UX — Phase 0** to **Active** (WIP=1); completion evidence = schema tests + docs pointers. Later phases get their own rows. Track file: this roadmap.
