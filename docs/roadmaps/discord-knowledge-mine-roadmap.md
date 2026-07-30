# Discord Knowledge Mine Roadmap

Living track for **server-by-server Discord mining** via the Discord MCP: extract what the tool surface allows, organize by each server’s context, and persist a durable local knowledge store (raw immutable + synthesized digests).

**Last updated:** 2026-07-29

**Status:** Phase 0 **Passing** (2026-07-29) — MCP auth + local store contract; Phase 1 **Passing** (2026-07-29) — guild inventory; Phase 2 **Passing** (2026-07-30) — first-server bootstrap (Algo Trading, Coding); Phase 3 **Passing** (2026-07-30) — priority channel extract; Phase 4 **Pending** — context synthesis.

**Branch:** OPS (secondary: none). Not an Edge product surface — local operator / research knowledge workflow.

**Related:** [Feature Roadmaps index](./README.md), [Project Status](../PROJECT-STATUS.md), [Constraints](../CONSTRAINTS.md) (secrets / no commit of private dumps).

**Origin:** 2026-07-29 plan — Discord MCP inventory (`get_servers`, `get_channels`, `read_messages`, `send_message`, `mcp_auth`) + server-by-server local layout.

---

## Goal

For each Discord server you can access:

1. Inventory channels and classify what the server is for.
2. Pull recent message windows (MCP is not a full archive API).
3. Save raw JSON locally (append-only).
4. Synthesize context-shaped knowledge (`overview`, topics, resources, glossary, people, open questions).
5. Refresh on a cadence without destroying prior raw evidence.

**One-line framing:** *One Active server at a time — raw windows first, context digests second.*

### Success criteria (track-level)

- Discord MCP authenticated; `get_servers` returns the guild list.
- Local root exists with `_index.md` listing every accessible server + mine status.
- At least one server folder has `meta.json`, `channels.json`, ≥1 raw message window, and a non-empty `knowledge/overview.md`.
- Mining sessions never call `send_message`.
- Knowledge store is outside git (or gitignored); no secrets/PII committed to Edge.
- Coverage is explicit: recent windows + priority channels — not claimed “full history.”

### Non-goals

- Full Discord history / attachment / member / voice / audit-log archive via MCP alone.
- Posting, moderating, or automating replies in Discord.
- Shipping Discord mining into the Edge app, Copilot, or product persistence.
- Scraping servers that forbid export; ignoring Discord ToS or server rules.
- Building a Discord bot unless Phase 6 is explicitly activated.

---

## MCP contract (ceiling for Phases 0–5)

| Tool | Mining use |
|------|------------|
| `mcp_auth` | Unblock connection before any extract |
| `get_servers` | Guild inventory → `_index.md` |
| `get_channels` | Per-server channel map → `channels.json` |
| `read_messages` | Recent windows (`server_id`, `channel_id`, `max_messages`, `hours_back`) |
| `send_message` | **Forbidden** during mining |

**Limits:** `read_messages` is recent-window only (default `hours_back` 24). No search, pins, threads-as-first-class, members/roles, or attachment download in the current MCP surface. Depth = repeated windows + priority channel selection, not one-shot dump.

---

## Local store layout

Default root (override when activating): `~/Knowledge/discord/` (keep **out of** the Edge git tree).

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

Classify from channel names + a small sample of rules / welcome / announcements / resources:

| Class | Emphasize in `knowledge/` |
|-------|---------------------------|
| Trading / research | setups, tickers, risk norms, timeframes, resources |
| OSS / product | roadmap crumbs, bugs, how-to, release notes |
| Education | curriculum order, definitions, assignments |
| Community | norms, events, key people, recurring topics |
| Ops / internal | runbooks, owners, incident patterns (extra PII care) |

**Mine order:** (1) rules / welcome / announcements / resources / docs → (2) high-signal topical → (3) help / Q&A → (4) off-topic last or skip. Skip voice and empty category shells.

---

## Phases

### Phase 0 — Auth + local store contract

**Status:** **Passing** (2026-07-29)

**Outcome:** Discord MCP works; root path and operating rules are fixed before any guild extract.

| Work item | Scope |
|-----------|--------|
| MCP auth | Fix `user-discord` connection (`mcp_auth` / Cursor MCP config) until `get_servers` succeeds |
| Root path | Confirm local root (default `~/Knowledge/discord/`); ensure not committed to Edge |
| Contract | This roadmap’s MCP table + layout + read-only rule is source of truth |
| Taxonomy stub | Create `_taxonomy.md` with server classes above |

**Exit evidence:** `get_servers` returns ≥1 guild; empty skeleton `_index.md` + `_taxonomy.md` on disk; harness note that Phase 1 may start.

**Gate — Phase 0 Passing:** Auth OK + local contract recorded; no product code required.

---

### Phase 1 — Guild inventory

**Status:** **Passing** (2026-07-29)

**Outcome:** Every accessible server is listed with mine status before deep work.

| Work item | Scope |
|-----------|--------|
| Inventory | `get_servers` → `_index.md` (id, name, status: `not_started` / `partial` / `current`) |
| Rank | User ranks (or agent proposes) which server is Active first |
| WIP=1 | Only one server marked Active / in progress |

**Exit evidence:** `_index.md` lists all guilds; one server chosen for Phase 2.

**Gate — Phase 1 Passing:** Complete index + chosen first server.

---

### Phase 2 — First-server bootstrap

**Status:** **Passing** (2026-07-30)

**Outcome:** One server has channel map, classification, and profile — ready to mine.

| Work item | Scope |
|-----------|--------|
| Channels | `get_channels` → `channels.json` + channel table in `profile.md` |
| Classify | Assign class; write purpose/audience/norms draft in `profile.md` |
| Priority list | Rank top channels for Phase 3 (≤ ~5 for first pass) |
| Meta | `meta.json` (id, name, mined_at, channel count, class) |

**Exit evidence:** `by-server/<slug>--<id>/` with `meta.json`, `channels.json`, `profile.md`.

**Gate — Phase 2 Passing:** Bootstrap artifacts present for the Active server.

---

### Phase 3 — Priority channel extract (windowed)

**Status:** **Passing** (2026-07-30)

**Outcome:** Raw message windows on disk for priority channels; per-channel digests started.

| Work item | Scope |
|-----------|--------|
| Windows | `read_messages` with explicit `hours_back` / `max_messages` (e.g. 7d first pass) |
| Raw save | Append-only under `channels/.../messages/`; never overwrite |
| Digests | Update each channel `digest.md` (themes, links, recurring questions) |
| Run log | `runs/YYYY-MM-DD.md` — channels, windows, counts, gaps |
| Safety | Confirm zero `send_message` calls |

**Exit evidence:** ≥1 raw JSON file per priority channel attempted; digests non-empty where messages exist; run log written.

**Gate — Phase 3 Passing:** Priority channels have raw + digest or an explicit empty/gap note.

---

### Phase 4 — Context-shaped synthesis

**Status:** **Pending**

**Outcome:** Server-level knowledge pack usable without re-reading raw JSON.

| Work item | Scope |
|-----------|--------|
| Overview | `knowledge/overview.md` — purpose, audience, norms |
| Topics | `knowledge/topics/*.md` only for themes with enough substance |
| Supporting | `resources.md`, `glossary.md`, `people.md`, `open-questions.md` |
| Citations | Prefer channel + approximate time; keep synthesis separate from raw |
| Index | Bump Active server status in `_index.md` (`partial` or `current`) |

**Exit evidence:** Non-empty `overview.md` + at least one supporting knowledge file; `_index` updated.

**Gate — Phase 4 Passing:** Knowledge pack readable standalone for the Active server.

---

### Phase 5 — Scale + refresh cadence

**Status:** **Pending**

**Outcome:** Repeat Phases 2–4 across remaining servers; define how refreshes work.

| Work item | Scope |
|-----------|--------|
| Next servers | One Active at a time; same bootstrap → extract → synthesize loop |
| Refresh | Re-pull recent windows; append raw; merge digests; update `runs/` + `_index` `last_run` |
| Coverage truth | Status stays `partial` unless priority set is intentionally complete for “current” |
| Optional skill | Cursor skill `discord-mine` encoding this pipeline (only if repetition justifies it) |

**Exit evidence:** ≥2 servers at `partial`/`current`, or documented decision to stop after N servers; refresh steps recorded in `_taxonomy.md` or a short `README` under the local root.

**Gate — Phase 5 Passing:** Multi-server index + documented refresh cadence; optional skill only if shipped.

---

### Phase 6 — Optional deep archive (bot / API)

**Status:** **Deferred** until MCP depth is insufficient **and** permission exists.

**Outcome:** True archival (older history, threads, attachments) only with explicit server ownership/permission — out of MCP-only scope.

| Work item | Scope |
|-----------|--------|
| Decision | Activate only if Phases 0–5 leave unacceptable gaps |
| Approach | Discord bot + privileged intents / official export paths |
| Store | Same local layout; new raw source tagged (e.g. `source: bot`) |

**Gate — Phase 6 Passing:** Separate activation; not required for track value from MCP mining.

---

## Operating rules

1. **Read-only** — never `send_message` while mining.
2. **WIP=1** — one Active server until bootstrap + priority extract + synthesis for that server land.
3. **Raw immutable, knowledge mutable.**
4. **Respect rules / ToS** — skip servers that forbid export; ask when unsure.
5. **PII** — redact in `knowledge/`; keep raw private locally.
6. **No completeness fiction** — track windows and channels attempted in `runs/`.
7. **Edge harness** — activate in `PROJECT-STATUS.md` only when executing a phase under WIP=1; Commit: **skip** for local knowledge files; commit only if a skill/docs change in-repo is explicitly requested.

---

## Verification (per phase)

| Phase | Evidence |
|-------|----------|
| 0 | `get_servers` succeeds; skeleton root exists |
| 1 | `_index.md` complete; first server chosen |
| 2 | `meta.json` + `channels.json` + `profile.md` |
| 3 | Raw windows + digests + `runs/` note; no send |
| 4 | `knowledge/overview.md` + supporting files; `_index` status |
| 5 | Multi-server progress + refresh notes |
| 6 | Only if activated — bot/API proof separate from MCP |

Edge `npm run check` / product tests: **not required** (outside app code unless a Cursor skill is added in-repo).

---

## Open questions

1. ~~Confirm local root path (`~/Knowledge/discord/` vs another).~~ **Resolved Phase 0** — locked to `~/Knowledge/discord/`.
2. ~~Which server is Active first after inventory?~~ **Resolved Phase 1** — Algo Trading, Coding (`928315068955893760`).
3. ~~Phase 2 bootstrap for Active server?~~ **Resolved Phase 2** — 7 channels; class Trading/research; priority list in `meta.json` / `profile.md`.
4. ~~Default window for first pass (`hours_back`: 24 vs 168)?~~ **Resolved Phase 3** — locked to `hours_back=168`, `max_messages=100`; 107 messages across 5 priority channels.
5. Is a Cursor skill worth it after the first 1–2 servers, or keep ad-hoc Agent runs?
6. Any servers that must be skipped for policy reasons?

---

## Pipeline (reference)

```text
Auth → get_servers → pick Active server → get_channels → classify
  → prioritize channels → read_messages windows → raw JSON
  → channel digests → knowledge/ synthesis → update _index + runs
  → next server (WIP=1)
```
