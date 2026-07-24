# Grok.com Copilot UX Parity Roadmap

Make Edge Copilot (sidebar panel, `/copilot`, workspace tile) match **grok.com** chat UX/UI as closely as practical — layout, composer, empty state, and interaction patterns — while keeping Edge’s agent/tool registry and trading constraints.

**Product decision (2026-07-23):** No Fast/Auto/Expert/Heavy **modes**. Stick with **models** only. The enabled-model picker lives in the same in-bar chip + dropdown Grok uses for modes.

**Last updated:** 2026-07-24

**Status:** Phase 0–5 **Passing** — visual contract frozen; shared shell + empty hero + pill composer + in-bar model picker + active thread chrome + attachments shipped. Grok Copilot UX parity track **complete** (light theme deferred). Deferred chrome walks → [app-level-verification-wave-2-roadmap.md](./app-level-verification-wave-2-roadmap.md) Phase 2.

**Related:** [AI Agent / In-App Copilot](./ai-agent-roadmap.md) (Phases 0–8 **Passing** — functional agent), [Design System](../../src/lib/design-system/ARCHITECTURE.md), [AI Architecture](../../src/lib/ai/ARCHITECTURE.md), [App-level Verification Wave 2](./app-level-verification-wave-2-roadmap.md), [Project Status](../PROJECT-STATUS.md), [Constraints](../CONSTRAINTS.md).

**Reference captures:** [../assets/grok-parity/](../assets/grok-parity/)

| Artifact | Path |
|----------|------|
| Empty chat (light scrape) | [`grok-com-landing.png`](../assets/grok-parity/grok-com-landing.png) |
| Empty chat (dark, 1440 live) | [`grok-com-empty-dark-1440.png`](../assets/grok-parity/grok-com-empty-dark-1440.png) |
| Empty chat + mode menu (dark, live) | [`grok-com-mode-menu-dark.png`](../assets/grok-parity/grok-com-mode-menu-dark.png) |
| Mode menu open (dark, 1440 live) | [`grok-com-mode-menu-open-dark-1440.png`](../assets/grok-parity/grok-com-mode-menu-open-dark-1440.png) |
| History gate (logged out, 1440) | [`grok-com-history-logged-out-dark-1440.png`](../assets/grok-parity/grok-com-history-logged-out-dark-1440.png) |
| Imagine gallery + floating bar (dark) | [`grok-com-imagine-dark.png`](../assets/grok-parity/grok-com-imagine-dark.png) |

**Sources:** Live `https://grok.com` + `https://grok.com/history` + `https://grok.com/imagine` (2026-07-23, logged out); marketing `https://x.ai/grok`; Suprmind Grok features + delete guides; LLMnesia history guide for signed-in sidebar behavior. Authenticated pixel captures deferred — browser session had no grok.com sign-in; signed-in chrome documented in § G from public sources + shared composer CSS.

---

## Intent Classification

- **Primary:** Feature — user-visible Copilot chrome and interaction redesign to match grok.com.
- **Secondary:** Refactor — recompose `CopilotPanel` / `CopilotComposer` / message list around a Grok-like shell without changing the agent orchestration contract.
- **Checklists applied:** `feature-planning-checklist.md`, `testing-verification-checklist.md`, `harness-status-checklist.md`, `architecture-review-checklist.md`.
- **Assumptions:**
  - “Exact look” means visual + interaction parity of the **chat shell**, not cloning Grok branding, SuperGrok paywalls, Companions, or xAI models-only.
  - Edge remains model-agnostic via OpenRouter allowlist. Grok’s mode menu is a **UI pattern reference only** — Edge fills that chip/menu with allowlisted **models**, not Fast/Auto/Expert/Heavy.
  - WIP=1 — do not activate implementation while another Active Work row owns the harness.
  - Design-system rule against decorative pills/glows is **waived for Copilot surfaces only** when required for parity; tokens stay `--edge-*` or Copilot-scoped aliases, not raw hex sprawl.

---

## Checklist Review

- **Architecture review:** **Required** — self-review, **Passed for roadmap**. Touches AI chrome, design tokens/primitives, `/copilot` + sidebar + tile hosts. Each implementation phase needs its own exit review.
- **Aligned:** Agent loop, registry tools, confirm gates, thread persistence, and model allowlist already shipped ([ai-agent-roadmap.md](./ai-agent-roadmap.md)). This track is presentation + interaction, not a second tool platform.
- **Missing (deferred):** Authenticated pixel captures (history rail, streaming/stop, Thoughts expanded) — requires grok.com sign-in; light-theme token pair measured live; mobile breakpoints (Edge is desktop-first — note only).
- **Misalignments:** Current Copilot uses bordered textarea + “Send”/`EdgePanelHeader` density; Grok uses centered empty state + pill `query-bar` + circular ↑ submit. App UX polish discouraged full pills — Copilot parity is an explicit product exception.
- **Risks:** Pixel-chasing Grok while breaking Edge density in narrow sidebar; long model labels crowding the pill; shipping Imagine/voice without product need; copying SuperGrok upsell patterns.
- **Recommendations:** Freeze a Copilot visual contract in Phase 0 from captures + measured CSS. Ship shell + in-bar model picker (Phases 1–3) before optional multimodal (Phase 5). Keep trading confirm cards and tool chips — restyle, don’t remove.

---

## Product goal

A trader opening Copilot should feel they are using a **Grok-class chat surface**: vast calm empty state, one hero prompt pill, in-bar **model** chip (same dropdown pattern as Grok’s mode control), attach affordance, circular send — then an active thread with the same composer language docked at the bottom.

Edge differentiator stays **workspace-native tools** (chart, journal, alerts, trading confirms), not general chatbot feature sprawl.

### Success criteria

- Empty state and active-thread composer match grok.com structure and measured geometry (pill bar ~800px max / full width in panel, ~60px min height, circular send, left +, model chip in-bar).
- In-bar dropdown lists **enabled OpenRouter models** (title + optional subtitle + checkmark) — same interaction as Grok’s mode menu, different contents.
- Placeholder / a11y copy mirrors Grok (“What do you want to know?” / “Ask … anything”).
- Sidebar, `/copilot`, and tile hosts share one shell component.
- Streaming, tool chips, confirm cards, threads, and model allowlist still work; header model `EdgeSelect` removed once in-bar picker ships.
- Visual acceptance: side-by-side capture vs grok.com at 1024 / 1440 (panel + full page).

### Non-goals

- Fast / Auto / Expert / Heavy **response modes** (or any mode layer on top of models).
- Cloning Grok logo, wordmark, SuperGrok paywall, or Companions / NSFW characters.
- Replacing Edge’s OpenRouter agent with xAI-only APIs.
- Shipping Imagine video, voice/camera, or multi-agent Heavy compute as part of UI parity (capability decisions are Adopt/Adapt/Defer/Skip below).
- Redesigning non-Copilot app chrome to look like grok.com.

---

## Research inventory (grok.com)

### A. Visual system (measured live, dark)

| Token / property | Observed value | Notes |
|------------------|----------------|-------|
| Page background | `rgb(5, 5, 5)` | Near-true black |
| Primary text | `rgb(252, 252, 252)` | |
| Font stack | `universalSans, Inter, Roboto, Open Sans, Arial, …` | Sans UI |
| Body size | `16px` | |
| Theme-color meta | `#f9f8f7` (light), `#1e1f22` (dark) | Dual theme |
| Query bar class | `query-bar` + `bg-surface-l1` + inset `ring` | |
| Query bar fill | `rgb(20, 20, 20)` | Elevated surface |
| Query bar size | **800×60** px (centered; `@xl:w-4/5` parent) | |
| Query bar radius | **160px** (full pill) | |
| Query bar ring/shadow | Inset 1px `oklch(… / 0.08)` + soft drop shadow | Soft, not neon glow |
| Textarea | Transparent, `min-h-[60px]`, placeholder secondary | |
| Control radius | Most chrome controls `9999px` | Pills / circles |
| Sign up CTA | Solid light fill on dark; pill | High contrast |

Light theme also exists (Firecrawl scrape captured light empty state); dark is the primary reference for Edge Midnight.

### B. Logged-out empty chat (home)

**Layout (one composition):**

1. **Top-left:** Mark-only logo (home).
2. **Top-right:** Imagine text+icon · Settings gear · Sign in · Sign up (pill).
3. **Center:** Large mark + “Grok” wordmark.
4. **Center composer:** Pill query bar (see anatomy).
5. **Footer:** Dim legal — “By messaging Grok, you agree to our Terms and Privacy Policy.”

No sidebar, suggestion chips, or secondary marketing in the first viewport.

### C. Composer anatomy (`query-bar`)

Left → right inside the pill:

| Control | Role | a11y / copy |
|---------|------|-------------|
| **Attach** | `+` button | `aria-label="Attach"` (collapsed menu when open) |
| **Text** | Multiline field | `aria-label="Ask Grok anything"`; placeholder **“What do you want to know?”** |
| **Model select** (Grok: “mode”) | Pill chip in-bar | Grok labels e.g. **Fast**; chevron. **Edge:** show current model short label here instead. |
| **Submit** | Circular ↑ | `aria-label="Submit"`; **disabled** until draft non-empty |

Keyboard: Enter send, Shift+Enter newline, Esc closes menus — frozen in § H (tab order measured live; Enter/Shift+Enter confirm in Phase 2).

### D. In-bar dropdown (Grok = modes; Edge = models)

**Grok ships** Fast / Auto / Expert / Heavy (+ SuperGrok upsell footer). That menu pattern is the reference for chrome only.

**Edge ships** the same chip + elevated menu + checkmark, filled with **enabled allowlisted models** (from existing model settings). No mode layer. No SuperGrok footer. Settings cog still manages which models appear in the list.

### E. Imagine (`/imagine`) — separate product surface

Not the chat empty state. Observed:

- Header: mark + “Featured Templates” · “+ New Project” · Settings · auth.
- Horizontal **Featured Templates** strip (tall cards: Glossy Product Shot, Chibi, Object Remover, Professional Headshot, …).
- **Discover** masonry image grid.
- **Floating bottom** pill: placeholder “Type to imagine”; + attach; **Image / Video / (third)** mode icons; **Auto** + aspect **2:3** chips; circular ↑.

**Edge decision:** Skip as a Copilot requirement; optional future media track only.

### F. Full product feature set (capability map)

From x.ai/grok + consumer docs (not all visible logged-out):

| Capability | What it is | Edge Copilot decision |
|------------|------------|------------------------|
| Chat + streaming | Core Q&A thread | **Adopt** (have) — restyle |
| Response modes Fast/Auto/Expert/Heavy | Latency vs depth routing | **Skip** — models only |
| In-bar chip + dropdown UI | Pill control + menu with checkmark | **Adapt** — fill with enabled models |
| Real-time web + 𝕏 search | Live grounded answers | **Defer** (not trading-core; optional later) |
| DeepSearch / DeeperSearch | Multi-step research agent | **Defer** |
| Visible “Thoughts” / thinking | Expandable chain-of-thought | **Adapt** — restyle tool/thinking steps |
| Multi-agent / Heavy | Parallel agents | **Skip** |
| Citations | Inline source chips when search tools run | **Adapt** when/if search lands; keep provenance chips for chart tools |
| Attach / files / vision | Upload images/PDFs into thread | **Adapt** later — Phase 4+ |
| Imagine image/video | Dedicated generative gallery | **Skip** for Copilot parity |
| Voice + camera | Realtime voice / scene | **Skip** |
| Memory across chats | Cross-thread preferences | **Defer** (threads exist; global memory later) |
| Projects / workspaces | File-scoped project containers | **Defer** (Edge workspace is the project) |
| Canvas / docs | Long-form side editor | **Defer** |
| Custom instructions | User system prefs | **Adapt** — settings modal extension |
| Shareable threads | Public links | **Skip** (private trading app) |
| Companions | Animated characters | **Skip** |
| Tasks / Build | Automation / coding agent | **Skip** |
| SuperGrok upsell UI | Paywall in mode menu | **Skip** |

---

### G. Signed-in chat chrome (inventory — 2026-07-23)

Composer anatomy and query-bar CSS are **identical** on empty and active threads (live measured logged-out; docked bottom when messages present). Signed-in layout documented from grok.com public UX + Suprmind/LLMnesia guides. Authenticated screenshots deferred until a grok.com session is available.

**Layout (active thread, signed in):**

1. **Left history rail** — persistent on grok.com chat; lists conversations by auto-generated title (first-message summary); reverse chronological (newest first); no folders/tags. Direct URL `grok.com/history` shows the same list. New chat affordance at top of rail (exact label varies by build).
2. **Main column** — scrollable message list; user bubbles right-aligned or distinct fill; assistant prose left; inline citation links when search tools run.
3. **Docked composer** — same `query-bar` pill at bottom of main column (not centered hero); max-width ~800px centered in column with horizontal padding.
4. **Top chrome** — mark home; settings/profile; no dense marketing.

**History rail interactions:**

| Action | Pattern |
|--------|---------|
| Open thread | Click title in sidebar |
| Delete one | Hover title → trash icon (or three-dot → Delete) |
| Rename | Three-dot / conversation menu (when available) |
| Export | Conversation menu → Export to PDF |
| Delete all | Settings → Data Controls → Delete All Conversations |

**Streaming / stop:**

- Submit circular ↑ while idle; during generation becomes **stop** control (square or stop icon — match live grok.com in Phase 2 app-level QA).
- Regenerate via message hover actions / three-dot on assistant turn (Phase 4).

**Thoughts / thinking disclosure:**

- Toggle or expandable **Thoughts** panel before final answer during Think Mode / DeepSearch (Suprmind features guide). Edge **Adapt:** restyle existing tool/reasoning step chips as collapsible “Thoughts” block; keep confirm cards separate.

**Settings (chat-relevant):**

- Profile / settings gear → Data Controls (model training opt-out, export, delete all), custom instructions, memory review. Edge maps model enable/disable to existing `CopilotModelSettingsModal`.

**Measured logged-out geometry (composer + menu — applies signed-in):**

| Element | Size / style |
|---------|----------------|
| Query bar | 800×60 px, radius 160px, bg `rgb(20,20,20)` |
| Mode/model menu | 278×282 px, radius 16px, bg `rgb(54,54,54)` |
| Menu row | ~53 px height, ~268 px content width |
| Page canvas | bg `rgb(5,5,5)` |

**History rail width:** not measured live (auth required). Phase 1 target **~280px** collapsible on `/copilot` + wide tile; sidebar uses compact header thread controls only (host-split — see Visual contract).

---

### H. Keyboard & focus matrix (frozen)

Measured tab order on empty chat (live 2026-07-23): **Attach → textarea → Model select → Submit**.

| Input | Contract behavior |
|-------|-------------------|
| **Enter** | Send when draft non-empty (standard chat) |
| **Shift+Enter** | Insert newline in textarea |
| **Esc** | Close open attach/model/settings menus; do not clear draft |
| **Tab** | Move focus through composer controls in order above |

Placeholder / a11y: `aria-label="Ask Grok anything"` on textarea; placeholder copy **“What do you want to know?”** (observed variant: “How can I help you today?” — Edge ships Grok-primary string). Attach `aria-label="Attach"`; submit `aria-label="Submit"`; model chip `aria-label="Model select"` (Edge: same pattern, label reflects current model).

Synthetic keydown tests on logged-out textarea did not surface React preventDefault hooks; confirm against live grok.com signed-in during Phase 2 composer implementation.

---

### I. Token map — Grok → Edge / Copilot aliases (frozen)

Implementation phases add scoped CSS variables under `.copilot-shell` (see [Design System](../../src/lib/design-system/ARCHITECTURE.md) § Copilot parity aliases). No raw hex in components — aliases reference `--edge-*` where close enough.

| Grok (dark, measured) | Edge / Copilot alias | Notes |
|----------------------|----------------------|-------|
| Page `rgb(5, 5, 5)` | `--copilot-canvas-bg` → `#050505` | Closer to true black than default `--edge-background` `#080a0f`; Copilot-only |
| Primary text `rgb(252, 252, 252)` | `--edge-text-strong` | `#f3f6fc` — acceptable delta |
| Query bar `rgb(20, 20, 20)` | `--copilot-query-bar-bg` → `#141414` | Darker than `--edge-surface-panel` `#111827` |
| Inset ring ~8% on primary | `--copilot-query-bar-ring` | `color-mix(in oklab, var(--edge-text-strong) 8%, transparent)` |
| Dropdown menu `rgb(54, 54, 54)` | `--copilot-menu-bg` → `#363636` | Elevated above query bar |
| Bar min-height 60px | `--copilot-bar-min-height: 60px` | |
| Bar max-width 800px centered | `--copilot-bar-max-width: 800px` | Sidebar/tile narrow: `width: 100%`, no max |
| Pill radius 160px / 9999px | `--copilot-pill-radius: 9999px` | Full pill — **Copilot-only exception** to `--edge-radius-*` |
| Menu radius 16px | `--edge-radius-dialog` (10px) or `--copilot-menu-radius: 16px` | Slight bump allowed for parity |
| Body 16px | `--edge-text-body-size` is 12px app-wide | Copilot composer uses **16px** local override in shell |
| Font stack universalSans… | App sans stack | Do not import Grok fonts |

Light theme pair: **deferred** (Edge Midnight primary; light Copilot polish optional Phase 5).

Pill/glow exception: Copilot surfaces only (product waiver documented in Intent Classification).

---

### J. In-bar model chip copy rules (frozen)

Edge fills Grok’s mode chip + dropdown with **enabled OpenRouter models** only — no Fast/Auto/Expert/Heavy, no SuperGrok footer.

| Surface | Rule |
|---------|------|
| **Chip label** | `ModelRef.label` from allowlist / settings (seed labels already short: `GPT-5.6`, `Grok 4.5`, …) |
| **Chip truncate** | Ellipsis at **14 characters** in sidebar (~360px host); full label in menu |
| **Menu row title** | Same as `label` |
| **Menu row subtitle** | Optional provider slug or OpenRouter id tail (e.g. `openrouter · grok-4.5`) — omit when redundant |
| **Selected state** | Checkmark on current thread `modelId` |
| **Icons** | No Grok mode icons (lightning, grid) unless later capability badges |
| **Settings** | Existing settings cog + `CopilotModelSettingsModal` for enable/disable catalog |

---

## Edge Copilot current state (gap)

| Area | Edge today | Grok reference |
|------|------------|----------------|
| Empty state | Panel header + workflow chips + empty message | Centered brand + single pill, no header chrome |
| Composer | Bordered textarea, bottom “Send” / “Cancel” | Pill bar, in-bar model chip, circular ↑, streaming stop pattern TBD |
| Model picker | Header `EdgeSelect` for OpenRouter `modelId` | Move into Grok-style in-bar chip + dropdown; settings = enable/disable catalog |
| Attach | None | `+` in bar |
| Threads | Header select + rename/delete/new | History rail (signed-in — **inventory in § G**) |
| Messages | Tool chips + confirms | Message list + Thoughts (signed-in — **inventory in § G**) |
| Hosts | Sidebar, `/copilot`, tile | Full-page + app |

---

## Proposed plan

### Phase 0 — Signed-in capture + Copilot visual contract

**Outcome:** Complete the inventory with authenticated chat chrome; freeze a written visual/interaction contract Edge will implement. No production UI change required (docs + assets only).

| Work item | Scope |
|-----------|--------|
| Signed-in captures | History rail, new chat, active thread, streaming, stop, regenerate, Thoughts, copy/share menus, settings drawers |
| Token map | Map Grok surfaces → `--edge-*` / Copilot aliases (bg `5,5,5`↔Midnight, pill `20,20,20`, ring alpha 0.08, 60px bar, 160px radius) |
| Model chip copy | Short labels for in-bar chip (truncate long OpenRouter names); menu = label + optional provider subtitle |
| Contract doc | This roadmap § Visual contract (filled) + screenshots in `docs/assets/grok-parity/` |

**Exit:** Contract section complete; open questions resolved or explicitly deferred; Active Work Phase 0 **Passing**.

### Phase 1 — Shared shell + empty state

**Outcome:** One `CopilotShell` used by sidebar / `/copilot` / tile; empty state matches Grok composition (mark optional Edge wordmark, centered pill, no dense `EdgePanelHeader` on empty).

| Work item | Scope |
|-----------|--------|
| Shell | Layout slots: top chrome (minimal), empty hero, message scroller, docked composer |
| Empty state | Centered title + composer; legal/footer optional omit in embedded panel |
| Hosts | Wire panel, page, tile |

**Exit:** Focused tests + screenshot vs reference at 1440 full-page and ~360px sidebar width.

### Phase 2 — Composer parity

**Outcome:** `CopilotComposer` is a Grok-like `query-bar`.

| Work item | Scope |
|-----------|--------|
| Pill bar | 60px min height, full pill radius, elevated fill, inset ring |
| Controls | + (menu stub OK), textarea, **model chip**, circular ↑ / stop while streaming |
| Behavior | Enter send, Shift+Enter newline, disable submit when empty, cancel→stop icon |

**Exit:** Focused composer tests; visual match checklist.

### Phase 3 — In-bar model picker

**Outcome:** Grok-style in-bar dropdown selects the thread’s `modelId` from enabled allowlisted models. Settings modal keeps enable/disable catalog. No response modes.

| Work item | Scope |
|-----------|--------|
| Menu UI | Chip shows current model; menu lists enabled models with checkmark; no SuperGrok footer |
| Wiring | Reuse per-thread `modelId` + `enabledModelsStore` / settings modal |
| Cleanup | Remove header model `EdgeSelect` once in-bar picker works |

**Exit:** Focused tests for model→request payload; architecture note in `src/lib/ai/ARCHITECTURE.md`.

### Phase 4 — Active thread chrome

**Outcome:** Message list, streaming cursor, tool/thinking disclosure, and thread history match Grok’s signed-in patterns (from Phase 0 captures), while keeping Edge confirm cards and tool chips.

| Work item | Scope |
|-----------|--------|
| History | Collapsible rail or Grok-equivalent thread list |
| Messages | User/assistant typography, spacing, actions |
| Steps | “Thoughts”-style disclosure for tool/reasoning steps |

**Exit:** Focused + app-level walkthrough on `/copilot`.

### Phase 5 — Attachments & polish (optional)

**Outcome:** Attach menu + image/file preview in composer; motion/focus polish; light theme pair if still required.

| Work item | Scope |
|-----------|--------|
| Attach menu | Upload, paste, attach chart screenshot (`captureChartElement` / active chart) |
| Storage | `POST/GET /api/me/copilot/attachments`; FS blobs + Postgres metadata |
| Multimodal | Chat contracts + OpenRouter `image_url` parts; server-side byte resolve |
| Vision gate | `capabilities.vision` on seed models; block/auto-switch when attaching |
| UI | Composer preview chips; user-message thumbnails; Esc closes attach menu |
| Polish | Preview enter animation; light theme **deferred** |

**Exit:** Focused upload validation tests; visual QA. **Passing** 2026-07-24.

---

## Visual contract (frozen — Phase 0)

**Product decisions (resolved 2026-07-23):**

| Decision | Edge contract |
|----------|---------------|
| Workflow chips | **Keep** below composer (secondary row) — Edge differentiator; not in Grok first-viewport hero |
| History rail | **Host-split:** collapsible ~280px rail on `/copilot` + wide tile; sidebar keeps compact header thread controls |
| Empty branding | **Full page / wide tile:** Edge mark + wordmark; **narrow sidebar:** mark-only or composer-first (no wordmark) |

**Empty (full page / wide tile):**

```
┌─────────────────────────────────────────────┐
│ [mark]                    [settings] […]    │
│                                             │
│              [Edge mark + wordmark]         │
│              ┌──────────────────────────┐   │
│              │ +  What do you want…  │M│↑│ │
│              └──────────────────────────┘   │
│         [ workflow chips — secondary row ]    │
└─────────────────────────────────────────────┘
  M = in-bar model chip (enabled models menu)
  ↑ = circular submit (disabled until draft)
```

**Active thread (`/copilot` / wide tile):**

```
┌──────────┬──────────────────────────────────┐
│ history  │  [user / assistant messages]     │
│ ~280px   │  [Thoughts disclosure — Phase 4] │
│ new chat │                                  │
│ titles…  │  ┌────────────────────────────┐  │
│          │  │ +  draft…           model ↑│  │
│          │  └────────────────────────────┘  │
└──────────┴──────────────────────────────────┘
```

**Sidebar embedded panel:** no history rail; header thread select + New chat; composer full width with 14ch model chip truncate; optional mark-only above pill; workflow chips below pill.

**Composer CSS targets (dark — implement Phase 2):**

- Bar: `--copilot-query-bar-bg`; `--copilot-pill-radius`; `--copilot-bar-min-height: 60px`; `--copilot-query-bar-ring`.
- Max width `--copilot-bar-max-width: 800px` when centered; sidebar `width: 100%` + `--edge-space-4` horizontal padding.
- Submit: circular ↑; disabled muted; streaming → stop.
- Placeholder: “What do you want to know?”; textarea `aria-label` Grok-style (“Ask … anything” → Edge: “Ask Copilot anything”).

**Retained Edge behaviors (restyle, do not remove):**

- Tool step chips, confirm Accept/Reject cards, chart linkage, thread persistence, per-thread `modelId`.
- Model settings modal; remove header `EdgeSelect` when in-bar picker ships (Phase 3).

**Explicit non-goals:** response modes; Imagine/voice; SuperGrok upsell; Grok wordmark/logo clone.

Reference captures: [empty 1440](../assets/grok-parity/grok-com-empty-dark-1440.png), [mode menu](../assets/grok-parity/grok-com-mode-menu-open-dark-1440.png), [history gate](../assets/grok-parity/grok-com-history-logged-out-dark-1440.png).

---

## Verification plan

| Tier | When |
|------|------|
| **Focused** | Composer/shell/model-picker unit + Testing Library; each phase |
| **Build** | Shared AI/UI chrome touch → `npm run build` or packages as needed |
| **App-level** | `/copilot` + sidebar panel side-by-side with grok.com reference captures @ 1024/1440 |
| **Full** | Before merge of shell + in-bar model picker → `npm run check` |

---

## Harness update

| Section | Change |
|---------|--------|
| Active Work | Add **Grok Copilot UX parity** track row **Pending**; Phase 0 row **Pending** (activate under WIP=1 when prioritized) |
| Task Contract | Create when Phase 0 or Phase 1 becomes **Active** |
| Session Log | Entry for roadmap authorship (this session) |
| Current Verified State | Unchanged until Phase 0 evidence |

---

## Resolved product questions (Phase 0)

1. **Workflow chips:** Keep below composer (secondary row) — not in Grok hero viewport.
2. **History rail:** Host-split — full rail on `/copilot` + wide tile; compact header controls in sidebar.
3. **Empty branding:** Mark + wordmark on full page / wide tile; mark-only or none in narrow sidebar.

Authenticated pixel captures for history rail + streaming/stop + Thoughts remain a **follow-up** when grok.com sign-in is available; contract above is sufficient to start Phase 1.

---

## Related docs

- [AI agent roadmap](./ai-agent-roadmap.md) — functional agent (complete)
- [App UX polish](./app-ux-polish-roadmap.md) — general chrome (complete; Copilot is exception surface)
- [Component standardization](./component-standardization-roadmap.md)
