# Discord Knowledge Mine Roadmap

Living track for **server-by-server Discord mining** via the Discord MCP: extract what the tool surface and **current free access** allow, then distill each community’s **operator system** into durable local notes (not live chat).

**Last updated:** 2026-07-30

**Status:** Phase 0–6 **Passing** (first-pass mines complete for Algo, Trinity, Wolves, MarketLife, SMB). Phase 7 **Passing** — Systems: WolvesOfWealth. Phase 8 **Passing** — Systems: Trinity. Phase 9 **Passing** — Systems: SMB Students. Phases 10–11 **Pending** — Algo, MarketLife. ChadGPT / Cursor / ServiceNow **omitted**. Refresh (step D) **deferred** — not the user goal.

**Branch:** OPS (secondary: none). Not an Edge product surface — local operator / research knowledge workflow.

**Related:** [Feature Roadmaps index](./README.md), [Project Status](../PROJECT-STATUS.md), [Constraints](../CONSTRAINTS.md) (secrets / no commit of private dumps).

**Origin:** 2026-07-29 plan — Discord MCP inventory (`get_servers`, `get_channels`, `read_messages`, `send_message`, `mcp_auth`) + server-by-server local layout.

**Restructure note (2026-07-30):** Phases 0–1 stay track setup. Phases 2–6 = first-pass mine (A→B→C) per server — **complete**. Phases 7–11 = **systems extraction** (step E) per server — one-shot operator systems, then leave. Old “Phase 2 bootstrap / 3 extract / 4 synthesis / 5 scale loop” numbering is retired. Evidence files `discord-knowledge-mine-phase-2|3|4-*.txt` remain historical proof for Algo’s bootstrap / extract / synthesis.

**Direction note (2026-07-30):** User is leaving many Discord servers. Goal is **persistent operator knowledge**, not staying current. Do **not** treat refresh passes as the next work.

---

## Goal

**Track goal (after Phase 6):** For each chosen server, produce a durable `knowledge/operator-system.md` that answers how that community’s operators/systems work — enough to leave Discord and still understand workflows, setups, norms, and resources.

First-pass mine (Phases 2–6) already did:

1. Inventory channels and classify what the server is for.
2. Pull recent message windows (MCP is not a full archive API).
3. Save raw JSON locally (append-only).
4. Synthesize context-shaped knowledge (`overview`, topics, resources, glossary, people, open questions).

Systems extraction (Phases 7–11) adds:

5. Dig structural / desk channels the first pass deferred (within free access).
6. Sample alert channels for **patterns**, not ticker archives.
7. Write `knowledge/operator-system.md` (workflow, setups, risk language, tools, audience, access gaps).
8. Stop — no ongoing monitoring.

**One-line framing:** *Mine once → extract the system → leave.*

### Success criteria (track-level)

- Discord MCP authenticated; `get_servers` returns the guild list.
- Local root exists with `_index.md` listing every accessible server + mine status.
- Each mined server folder has `meta.json`, `channels.json`, ≥1 raw message window (or explicit gap), and a non-empty `knowledge/overview.md`.
- Each systems phase lands a non-empty `knowledge/operator-system.md` (or an explicit access-limited stub that states what was unreachable).
- Mining sessions never call `send_message`.
- Knowledge store is outside git (or gitignored); no secrets/PII committed to Edge.
- Coverage is explicit: recent windows + chosen channels — not claimed “full history.”
- Paid / role-gated gaps are recorded; **no purchases** to deepen access.

### Non-goals

- Full Discord history / attachment / member / voice / audit-log archive via MCP alone.
- Posting, moderating, or automating replies in Discord.
- Shipping Discord mining into the Edge app, Copilot, or product persistence.
- Scraping servers that forbid export; ignoring Discord ToS or server rules.
- Building a Discord bot unless the optional deep-archive phase is explicitly activated.
- **Ongoing Discord monitoring** or staying up to date after leaving servers.
- **Paying for memberships / tiers** (e.g. SMB paid access) to unlock more channels.
- Treating **refresh (step D)** as the primary next work for this track.

---

## Server progress board

User selection (2026-07-30): mine servers **1–5**; omit **6–8**. Status values match `_index.md`: `not_started` | `partial` | `current` | `omitted`.

| # | Server | id | Board status | Roadmap phase | Notes |
|---|--------|-----|--------------|---------------|-------|
| 1 | Algo Trading, Coding | `928315068955893760` | `partial` | **Phase 2 Passing** | Full A→B→C done. Gaps: rules empty in 168h; limited channels. |
| 2 | Trinity Trading Partners | `1305230430458351626` | `partial` | **Phase 3 Passing** | Full A→B→C done. Gaps: rules empty; orientation/education/faq limited. |
| 3 | WolvesOfWealth | `783160857139740713` | `partial` | **Phase 4 Passing** | Full A→B→C done. Gaps: read-first empty; Morning Watch video-only. |
| 4 | MarketLife | `778344907378655283` | `partial` | **Phase 5 Passing** | Full A→B→C done. Gaps: announcements/trading-chat empty; rules header only. |
| 5 | SMB Students | `755810120486879314` | `partial` | **Phase 6 Passing** | Full A→B→C done. Gaps: rules/help-center headers only; trade desks deferred. |
| 6 | ChadGPT Course's Discord Community | `1345810177135476768` | `omitted` | — | Out of scope. |
| 7 | Cursor | `1074847526655643750` | `omitted` | — | Out of scope. |
| 8 | ServiceNow Developers | `289994252241338369` | `omitted` | — | Out of scope. |

**Done (first-pass mine):** 5 / 5 chosen servers (Phases 2–6).  
**Next:** Systems extraction Phases 10–11 (step E), one server per phase. Refresh (D) deferred.

| # | Server | Systems phase | Systems status | Access note |
|---|--------|---------------|----------------|-------------|
| 3 | WolvesOfWealth | Phase 7 | **Passing** | operator-system.md; Edge `docs/trading/wolves-discord/` cited |
| 2 | Trinity Trading Partners | Phase 8 | **Passing** | operator-system.md; orientation/education/FAQ still gated |
| 5 | SMB Students | Phase 9 | **Passing** | Free tier only — operator-system.md; IA/trade desks largely gated |
| 1 | Algo Trading, Coding | Phase 10 | **Pending** | Smaller surface; limited first-pass channels |
| 4 | MarketLife | Phase 11 | **Pending** | Thin first-pass signal; extract what free access allows |

---

## Per-server process

### First-pass mine (Phases 2–6) — A → B → C

Apply **all** of A–C to the Active server. Do not split bootstrap / extract / synthesis across roadmap phase numbers.

### A — Bootstrap

| Work item | Scope |
|-----------|--------|
| Channels | `get_channels` → `channels.json` + channel table in `profile.md` |
| Classify | Assign class; purpose / audience / norms draft in `profile.md` |
| Priority list | Rank top channels for extract (≤ ~5 first pass) |
| Meta | `meta.json` (id, name, mined_at, channel count, class) |

**Exit:** `by-server/<slug>--<id>/` with `meta.json`, `channels.json`, `profile.md`.

### B — Priority channel extract (windowed)

| Work item | Scope |
|-----------|--------|
| Windows | `read_messages` with explicit `hours_back` / `max_messages` (default first pass: `hours_back=168`, `max_messages=100`) |
| Raw save | Append-only under `channels/.../messages/`; never overwrite |
| Digests | Update each channel `digest.md` (themes, links, recurring questions) |
| Run log | `runs/YYYY-MM-DD.md` — channels, windows, counts, gaps |
| Safety | Confirm zero `send_message` calls |

**Exit:** ≥1 raw JSON file per priority channel attempted; digests non-empty where messages exist (or explicit empty/gap note); run log written.

### C — Context-shaped synthesis

| Work item | Scope |
|-----------|--------|
| Overview | `knowledge/overview.md` — purpose, audience, norms |
| Topics | `knowledge/topics/*.md` only for themes with enough substance |
| Supporting | `resources.md`, `glossary.md`, `people.md`, `open-questions.md` |
| Citations | Prefer channel + approximate time; keep synthesis separate from raw |
| Index | Set server status in `_index.md` to `partial` or `current`; set `last_run` |

**Exit:** Non-empty `overview.md` + at least one supporting knowledge file; `_index` updated.

### D — Refresh (deferred — not the user goal)

Optional only if the user later wants new messages. **Not** Phases 7–11.

When re-mining a server already at `partial` / `current`:

1. Re-pull recent windows (`read_messages`).
2. Append new raw JSON (never overwrite).
3. Merge channel digests + update `knowledge/`.
4. Append `runs/YYYY-MM-DD.md`; bump `_index.md` `last_run`.
5. Keep status `partial` unless the priority set is intentionally complete → `current`.

Refresh work uses Active Work name `OPS — Discord knowledge mine — Refresh — <server slug>` (not a systems phase).

**Gate — mine phase Passing:** Steps A–C complete for that server; evidence file lists MCP calls, artifact paths, `send_message` count = 0.

### E — Systems extraction (Phases 7–11)

One-shot depth pass for the Active server. Goal: **operator system**, not more chat noise.

| Work item | Scope |
|-----------|--------|
| Channel pick | From existing `channels.json` + `profile.md`, choose structural / desk channels first pass deferred (orientation, FAQ, course, trade desks, curriculum). Cap ~5–8 channels per phase unless a clear hit warrants one more. |
| Access policy | Use **current free / role access only**. Never purchase tiers. If a channel is empty, denied, or header-only, record the gap — do not block the phase. |
| Windows | `read_messages` with explicit `hours_back` / `max_messages` (default: `hours_back=168`, `max_messages=100`; widen only when a structural channel is clearly active and still thin). |
| Pattern sample | For alert / callout desks: sample for **setup patterns, risk language, workflow norms** — not a ticker archive. Prefer digests that name patterns over listing every ticker. |
| Raw + digests | Append-only raw JSON; update channel `digest.md`; append `runs/YYYY-MM-DD.md`. |
| Operator system | Write `knowledge/operator-system.md` with sections below. |
| Supporting | Update `overview.md` / `open-questions.md` / `resources.md` only where systems work adds substance. |
| Safety | Confirm zero `send_message` calls. |

**`knowledge/operator-system.md` required sections:**

1. **Who it’s for** — audience / skill level / instrument focus  
2. **Daily / weekly workflow** — how operators move through the server  
3. **Setup types** — named patterns or play types (with channel citations)  
4. **Risk language** — size, stops, “do less,” Friday rules, etc.  
5. **Tools & resources** — bots, docs, external links that matter  
6. **Access limits** — what was role-gated, paywalled, video-only, or empty in-window  
7. **Leave-ready summary** — 5–10 bullets you’d keep if you never reopen Discord  

**Gate — systems phase Passing:** `operator-system.md` present and non-empty (or explicit access-limited stub); ≥1 new raw window or documented “no new readable channels”; run log + Edge evidence file; `send_message` = 0.

---

## Track phases

### Phase 0 — Auth + local store contract

**Status:** **Passing** (2026-07-29)

**Outcome:** Discord MCP works; root path and operating rules fixed before any guild extract.

| Work item | Scope |
|-----------|--------|
| MCP auth | Fix `user-discord` until `get_servers` succeeds |
| Root path | Lock local root to `~/Knowledge/discord/`; outside Edge git |
| Contract | This roadmap’s MCP table + layout + read-only rule |
| Taxonomy stub | `_taxonomy.md` with server classes |

**Gate — Phase 0 Passing:** Auth OK + local contract on disk.

---

### Phase 1 — Guild inventory

**Status:** **Passing** (2026-07-29)

**Outcome:** Every accessible server listed before deep work.

| Work item | Scope |
|-----------|--------|
| Inventory | `get_servers` → `_index.md` |
| Rank | User ranks which servers to mine (and which to skip) |
| WIP=1 | Only one server Active at a time |

**Gate — Phase 1 Passing:** Complete index + first server chosen.

---

### Mine phases (Phases 2–6) — identical process

Each mine phase runs **A → B → C** for exactly one server (defaults: `hours_back=168`, `max_messages=100`, ≤ ~5 priority channels). Exit for every mine phase: `by-server/<slug>--<id>/` with `meta.json`, `channels.json`, `profile.md`, raw windows + digests + `runs/`, non-empty `knowledge/overview.md` + supporting files; `_index` → `partial` or `current`; Edge evidence file; `send_message` = 0.

---

### Phase 2 — Mine: Algo Trading, Coding

**Status:** **Passing** (2026-07-30)

**Server:** Algo Trading, Coding (`928315068955893760`)  
**Process:** A → B → C complete (5 priority channels; 107 messages; 8 knowledge files).  
**Evidence:** `docs/evidence/discord-knowledge-mine-phase-2-2026-07-30.txt`, `…-phase-3-…`, `…-phase-4-…` (historical step proofs under old numbering).  
**Index status:** `partial`.

---

### Phase 3 — Mine: Trinity Trading Partners

**Status:** **Passing** (2026-07-30)

**Server:** Trinity Trading Partners (`1305230430458351626`)  
**Process:** A → B → C complete (5 priority channels; 35 messages; 6 knowledge files).  
**Evidence:** `docs/evidence/discord-knowledge-mine-phase-3-trinity-2026-07-30.txt`  
**Index status:** `partial`.

---

### Phase 4 — Mine: WolvesOfWealth

**Status:** **Passing** (2026-07-30)

**Server:** WolvesOfWealth (`783160857139740713`)  
**Process:** A → B → C complete (5 priority channels; 84 messages; 7 knowledge files).  
**Evidence:** `docs/evidence/discord-knowledge-mine-phase-4-wolves-2026-07-30.txt`  
**Index status:** `partial`.  
**Note:** Edge `docs/trading/wolves-discord/` remains a separate research archive (not imported).

---

### Phase 5 — Mine: MarketLife

**Status:** **Passing** (2026-07-30)

**Server:** MarketLife (`778344907378655283`)  
**Process:** A → B → C complete (5 priority channels; 12 messages; 6 knowledge files).  
**Evidence:** `docs/evidence/discord-knowledge-mine-phase-5-marketlife-2026-07-30.txt`  
**Index status:** `partial`.

---

### Phase 6 — Mine: SMB Students

**Status:** **Passing** (2026-07-30)

**Server:** SMB Students (`755810120486879314`)  
**Process:** A → B → C complete (5 priority channels; 10 messages; 6 knowledge files).  
**Evidence:** `docs/evidence/discord-knowledge-mine-phase-6-smb-2026-07-30.txt`  
**Index status:** `partial`.

---

### Systems phases (Phases 7–11) — identical process (step E)

Each systems phase runs **E** for exactly one server. Order is by expected operator-signal value, not original mine order. Exit for every systems phase: `knowledge/operator-system.md` + run log + Edge evidence; access gaps named; `send_message` = 0.

**Access rule (all systems phases):** extract only what the current account can read for free. Paid unlocks are out of scope — especially SMB Students.

---

### Phase 7 — Systems: WolvesOfWealth

**Status:** **Passing** (2026-07-30)

**Server:** WolvesOfWealth (`783160857139740713`)  
**Process:** E — systems extraction (7 channels; 131 messages; operator-system.md).  
**Why first:** Richest first-pass signal; separate Edge archive at `docs/trading/wolves-discord/` (cite, do not duplicate wholesale).  
**Channels:** callout-guide (gap), indices, mag7-updates, ep-lessons, swing-trades, earnings-economic-data, high-risk.  
**Evidence:** `docs/evidence/discord-knowledge-mine-phase-7-wolves-systems-2026-07-30.txt`

---

### Phase 8 — Systems: Trinity Trading Partners

**Status:** **Passing** (2026-07-30)

**Server:** Trinity Trading Partners (`1305230430458351626`)  
**Process:** E — systems extraction (7 channels; 151 messages; operator-system.md).  
**Why second:** Orientation / education / FAQ deferred in first pass — likely holds durable norms.  
**Channels:** commentary, watchlist, trading-qna, premium-selling-and-spreads, long-term-swings, trade-log, remz-small-account-challenge.  
**Evidence:** `docs/evidence/discord-knowledge-mine-phase-8-trinity-systems-2026-07-30.txt`

---

### Phase 9 — Systems: SMB Students

**Status:** **Passing** (2026-07-30)

**Server:** SMB Students (`755810120486879314`)  
**Process:** E — systems extraction under **free-tier access only** (7 channels; 50 messages; operator-system.md).  
**Access:** No paid tier purchase. IA info and education Q channels header-only; trade desks partially readable.  
**Channels:** questions-to-smb, questions-about-education, books-and-videos, smb-inside-access-information, setups-trade-ideas, swing-trading, bionic-trader-code.  
**Evidence:** `docs/evidence/discord-knowledge-mine-phase-9-smb-systems-2026-07-30.txt`

---

### Phase 10 — Systems: Algo Trading, Coding

**Status:** **Pending**

**Server:** Algo Trading, Coding (`928315068955893760`)  
**Process:** E — systems extraction.  
**Note:** Smaller channel surface; systems file may be shorter — quality over padding.  
**Evidence (when done):** `docs/evidence/discord-knowledge-mine-phase-10-algo-systems-YYYY-MM-DD.txt`

---

### Phase 11 — Systems: MarketLife

**Status:** **Pending**

**Server:** MarketLife (`778344907378655283`)  
**Process:** E — systems extraction.  
**Note:** First pass was thin; extract what free access allows; accept a short leave-ready summary if signal stays low.  
**Evidence (when done):** `docs/evidence/discord-knowledge-mine-phase-11-marketlife-systems-YYYY-MM-DD.txt`

---

### Omitted servers

ChadGPT Course's Discord Community, Cursor, and ServiceNow Developers are **out of scope** for this track (`omitted` in `_index.md`). Do not mine unless the user reopens them.

---

### Optional — Deep archive (bot / API)

**Status:** **Deferred** until MCP depth is insufficient **and** permission exists **and** the user explicitly asks.

True archival (older history, threads, attachments) only with explicit server ownership/permission — out of MCP-only scope. Same local layout; tag raw source (e.g. `source: bot`). Not required for systems extraction if free-access windows + digests already support a leave-ready `operator-system.md`.

---

## MCP contract

| Tool | Mining use |
|------|------------|
| `mcp_auth` | Unblock connection before any extract |
| `get_servers` | Guild inventory → `_index.md` |
| `get_channels` | Per-server channel map → `channels.json` |
| `read_messages` | Recent windows (`server_id`, `channel_id`, `max_messages`, `hours_back`) |
| `send_message` | **Forbidden** during mining |

**Limits:** `read_messages` is recent-window only. No search, pins, threads-as-first-class, members/roles, or attachment download in the current MCP surface.

---

## Local store layout

Default root: `~/Knowledge/discord/` (keep **out of** the Edge git tree).

```text
~/Knowledge/discord/
  _index.md
  _taxonomy.md
  by-server/
    <slug>--<server_id>/
      meta.json
      channels.json
      profile.md
      channels/
        <channel-slug>--<id>/
          messages/          # append-only raw JSON windows
            <iso>__h<hours>__n<max>.json
          digest.md
      knowledge/
        overview.md
        operator-system.md   # Phases 7–11 — leave-ready operator system
        topics/
        people.md
        resources.md
        glossary.md
        open-questions.md
      runs/
        YYYY-MM-DD.md
```

**Rules:** raw immutable; knowledge mutable; one Active server (WIP=1); redact emails/phones/tokens in synthesized `knowledge/` files.

---

## Server classification + channel priority

| Class | Emphasize in `knowledge/` |
|-------|---------------------------|
| Trading / research | setups, tickers, risk norms, timeframes, resources |
| OSS / product | roadmap crumbs, bugs, how-to, release notes |
| Education | curriculum order, definitions, assignments |
| Community | norms, events, key people, recurring topics |
| Ops / internal | runbooks, owners, incident patterns (extra PII care) |

**Mine order inside a server (first pass):** (1) rules / welcome / announcements / resources / docs → (2) high-signal topical → (3) help / Q&A → (4) off-topic last or skip. Skip voice and empty category shells.

**Systems order inside a server (Phases 7–11):** (1) orientation / read-first / FAQ / course → (2) operator desks for workflow + risk language → (3) pattern-sample alert channels → (4) resources that name tools. Skip paywalled channels after one failed/empty attempt; note the gap.

---

## Operating rules

1. **Read-only** — never `send_message` while mining.
2. **WIP=1** — one Active server until the phase gate for that server lands (A–C for mines; E for systems).
3. **One server = one roadmap phase** after Phase 1 (no cross-server “scale” phase).
4. **Raw immutable, knowledge mutable.**
5. **Respect rules / ToS** — skip servers that forbid export; ask when unsure.
6. **PII** — redact in `knowledge/`; keep raw private locally.
7. **No completeness fiction** — track windows and channels attempted in `runs/`.
8. **No paid unlocks** — never buy memberships/tiers to deepen a mine; record the gap instead.
9. **Signal over noise** — prefer workflows, setups, risk norms, resources; do not archive ticker spam.
10. **No ongoing monitoring** — systems phases are one-shot; refresh (D) stays deferred unless the user reopens it.
11. **Edge harness** — activate `OPS — Discord knowledge mine — Phase N` under WIP=1; Commit: **skip** for local knowledge files; commit only if a skill/docs change in-repo is explicitly requested.

---

## Verification

| Phase | Evidence |
|-------|----------|
| 0 | `get_servers` succeeds; skeleton root exists |
| 1 | `_index.md` complete; first server chosen |
| 2–6 (mine) | Per-server A–C artifacts; `_index` status; `send_message` = 0 |
| 7–11 (systems) | `knowledge/operator-system.md` + run log + Edge evidence; access gaps named; `send_message` = 0 |
| Refresh (D) | Deferred — only if reopened; appended raw + updated digests/knowledge + `last_run` |
| Deep archive | Only if activated — bot/API proof separate from MCP |

Edge `npm run check` / product tests: **not required** (outside app code unless a Cursor skill is added in-repo).

---

## Open questions

1. ~~Confirm local root path.~~ **Resolved Phase 0** — `~/Knowledge/discord/`.
2. ~~Mine set.~~ **Resolved** — servers 1–5 (Algo, Trinity, Wolves, MarketLife, SMB); omit ChadGPT, Cursor, ServiceNow.
3. ~~Default extract window.~~ **Resolved** — `hours_back=168`, `max_messages=100`.
4. ~~Should Wolves's existing `docs/trading/wolves-discord/` notes be imported into the local store during Phase 4, or left as a separate Edge research archive?~~ **Resolved Phase 4** — left separate; one-line pointer in `knowledge/overview.md` only.
5. ~~Next after first-pass mines?~~ **Resolved 2026-07-30** — systems extraction Phases 7–11 (step E) for all five servers; refresh deferred; no paid unlocks.
6. Is a Cursor skill worth it after systems phases land?
7. After Phase 11, should `_index` status move from `partial` → `current` for servers with a leave-ready `operator-system.md`?

---

## Pipeline (reference)

```text
Phase 0 auth + store                         (Passing)
Phase 1 inventory all guilds                 (Passing)
Phase 2 Algo Trading, Coding     → A → B → C (Passing)
Phase 3 Trinity Trading Partners → A → B → C (Passing)
Phase 4 WolvesOfWealth           → A → B → C (Passing)
Phase 5 MarketLife               → A → B → C (Passing)
Phase 6 SMB Students             → A → B → C (Passing)
Phase 7 WolvesOfWealth           → E systems (Passing)
Phase 8 Trinity Trading Partners → E systems (Passing)
Phase 10 Algo Trading, Coding        → E systems (Pending)  ← next
Phase 10 Algo Trading, Coding    → E systems (Pending)
Phase 11 MarketLife              → E systems (Pending)
Deferred: D refresh / deep archive (only if user reopens)
```
