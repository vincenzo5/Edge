# AI Agent / In-App Copilot Roadmap

Phased track for Edge’s in-app AI agent: chat UI, model-agnostic LLM access (OpenRouter-first), and orchestration that **only** executes through the existing tool registry.

**Last updated:** 2026-07-22

**Status:** Roadmap defined — Phase 0–8 **Passing** (2026-07-22). Tool registry, adapters, and session-bridge plumbing are foundations (not this track’s rebuild). Deferred app-level walks → [app-level-verification-wave-2-roadmap.md](./app-level-verification-wave-2-roadmap.md) Phase 1. Product direction: [ROADMAP.md Phase 5](../ROADMAP.md); tools: [ai-tools-architecture.md](../ai-tools-architecture.md); chart↔chat: [rich-annotations-vision.md](../chart/rich-annotations-vision.md) Phase C.

**Related:** [AI Tools Architecture (lib)](../../src/lib/ai/ARCHITECTURE.md), [Design System](../../src/lib/design-system/ARCHITECTURE.md), [Workspace State Persistence](./workspace-state-persistence-roadmap.md) (chat history deferred here), [Grok Copilot UX Parity](./grok-copilot-parity-roadmap.md) (shell/composer match grok.com — next UX track), [Risk Management System](./risk-management-system-roadmap.md) (Phase 9 — Copilot RiskPolicy preview/compose vocabulary), [App-level Verification Wave 2](./app-level-verification-wave-2-roadmap.md), [Project Status](../PROJECT-STATUS.md), [Constraints](../CONSTRAINTS.md).

---

## Intent Classification

- **Primary:** Feature — in-app copilot chat that collaborates with the trader via the shared AI tool registry.
- **Secondary:** Testing — agent loop, confirmations, and session-bridge paths need deterministic coverage; Architecture — new `/api/ai/chat` + model provider boundary without a parallel tool system.
- **Checklists applied:** `feature-planning-checklist.md`, `testing-verification-checklist.md`, `harness-status-checklist.md`, `architecture-review-checklist.md`.
- **Assumptions:** Single-user / solo trader. LLM API keys stay server-only. Persistence of chat threads is optional until Phase 6. WIP=1 — do not start Phase 0 while another Active Work row owns the harness.

---

## Checklist Review

- **Architecture review:** **Required** — self-review, **Passed for roadmap**. Implementation touches AI tool + app context, new API contracts, optional persistence schemas, and UI chrome. Each phase needs its own exit review.
- **Aligned:** One registry, many adapters (`AiToolsProvider`, HTTP, MCP); Zod validation; permission modes (`read` / `write` / `full`); destructive tools require confirmation; server vs client tool split; `AiSessionBridge` long-poll already exists; semantic drawing metadata Phase A shipped (`source: "ai"`, `proposed`).
- **Missing:** In-app chat shell; agent orchestration route; model provider abstraction; OpenRouter (or equivalent) wiring; productized client-tool execution from the agent loop; confirmation cards in chat; `threadId` chart↔chat linkage; thread persistence.
- **Misalignments:** `docs/ROADMAP.md` “Copilot UI | Future” and `ai-tools-architecture.md` rollout steps 6–7 say “future” without a living phase file — this roadmap owns that work. Workspace persistence explicitly deferred “Copilot thread / AI chat history” to a separate track — Phase 6 here.
- **Risks:** Reimplementing tools outside the registry; running client-state tools on the server without the session bridge; auto-executing destructive tools; dumping full candle history into prompts; coupling the UI to one vendor SDK; exposing API keys to the browser; unbounded OpenRouter model list (poor tool-calling models).
- **Recommendations:** Freeze contracts in Phase 0. Ship OpenRouter + read-only agent before a polished chat chrome if needed for evidence — but prefer Phase 1 (gateway) then Phase 2 (shell) so UX is testable. Harden session bridge before write tools. Keep intelligent model routing optional (Phase 7). Never mutate React from the LLM path.

---

## Product goal

The trader can open a copilot panel in the workspace, chat with an agent that sees the same chart/layout/market context they do, and let that agent call Edge tools — with explicit confirmation for meaningful writes and destructive actions.

Edge is **not** building a second tool platform, a general chatbot, or a multi-tenant AI SaaS. Differentiator: **workspace-native agent** over the same validated registry as MCP/HTTP.

### Success criteria

- User can chat in-app; responses stream; tool steps are visible.
- Agent tools = registry tools (JSON Schema from definitions); execute via existing adapters/bridge.
- Any allowlisted model via OpenRouter (and later direct providers) without rewriting tools or chat UI.
- Client-state tools work when the browser session is connected; server tools work without it.
- Write/destructive actions show confirm cards; AI drawings default to `proposed` + `source: "ai"`.
- Clicking an AI annotation opens the related chat turn (`threadId`).
- Chat history persists separately from chart workspace state (Phase 6).

---

## Current state (foundations — out of scope to rebuild)

| Piece | Status | Notes |
|-------|--------|-------|
| Tool registry + Zod + permissions | Shipped | `src/lib/ai/` |
| In-app / HTTP / MCP adapters | Shipped | Same execute path |
| `AiToolsProvider` + `executeTool` | Shipped | Copilot must call this (or bridge → same path) |
| Session bridge routes + `AiSessionBridge` | Partial | Poll/execute/heartbeat exist; not productized for in-app agent |
| Semantic annotation metadata | Phase A shipped | Enables proposed AI drawings |
| In-app chat / agent loop / LLM provider | **Not started** | This track |
| Chart↔chat `threadId` navigation | **Passing** (Phase 5) | `threadId`/`messageId` on AI drawings; Copilot focus on annotation click |
| Copilot thread persistence | **Passing** (Phase 6) | `/api/me/copilot-threads` + `tv-ai:copilot-threads:v1` |

---

## Best practices (non-negotiable)

1. **Agent orchestrates; tools mutate** — LLM never touches React state or ad-hoc fetches for product actions.
2. **One registry** — tool schemas and execute paths come from `src/lib/ai/`; no parallel tool defs in the agent SDK.
3. **Server LLM, split execution** — model calls run server-side (secrets, rate limits); client-state tools run in the browser via session bridge; market-data/trading tools may run server-side as today.
4. **Tight context injection** — inject a small workspace snapshot per turn; use tools for depth (`summarize_chart`, candles, journal, etc.).
5. **Confirm meaningful writes** — honor `requiresConfirmation` / destructive + live `LIVE` gates in chat UI, not only in tool metadata.
6. **Model-agnostic boundary** — `ModelProvider` + allowlisted `modelId`; OpenRouter as first gateway; direct vendors optional later.
7. **Observable tool steps** — stream text; show tool name + short result summary for auditability.
8. **Keys server-only** — `OPENROUTER_API_KEY` (and any vendor keys) never shipped to the client.

---

## Target architecture

```
┌────────────────────────────┐
│  Copilot Chat UI           │  stream, tool chips, confirm cards, annotation deep-links
│  (workspace panel)         │
└─────────────┬──────────────┘
              │ POST /api/ai/chat { messages, modelId?, threadId? }
┌─────────────▼──────────────┐
│  Agent orchestrator        │  system prompt + snapshot + tool loop
│  (server)                  │
└───────┬───────────┬────────┘
        │           │
        ▼           ▼
┌───────────────┐  ┌────────────────────────────┐
│ ModelProvider │  │ Tool execution             │
│ OpenRouter    │  │ • server tools → registry  │
│ (allowlist)   │  │ • client tools → session   │
│ + future      │  │   bridge → AiToolsProvider │
│ direct APIs   │  │ • confirm gate for writes  │
└───────────────┘  └────────────────────────────┘
```

### Model access (OpenRouter-first)

| Approach | Role |
|----------|------|
| **OpenRouter gateway** | Primary — one key, many models, OpenAI-compatible API |
| **User model picker** | Allowlisted `modelId` per thread/user (Phase 7) |
| **Intelligent router** | Optional later — cheap vs strong by task; not required for v1 |
| **Direct providers** | Optional — same `ModelProvider` interface when native features matter |

Do **not** expose the entire OpenRouter catalog. Maintain an allowlist of models verified for tool calling.

### Touch points

| Area | Path |
|------|------|
| Tool registry | `src/lib/ai/` |
| In-app execute | `AiToolsProvider.tsx`, `adapters/inApp.ts` |
| Session bridge | `sessionBridge.ts`, `AiSessionBridge.tsx`, `/api/ai/session/*` |
| New agent API | `src/app/api/ai/chat/` (planned) |
| Model provider | `src/lib/ai/model/` (planned) |
| Chat UI | `src/app/components/copilot/` (planned) — Edge tokens/primitives |
| Annotation linkage | drawing `metadata.threadId` — [rich-annotations-vision.md](../chart/rich-annotations-vision.md) |
| Thread persistence | new store / `/api/me/copilot-threads` (Phase 6) — not layout localStorage |

---

## Phasing

### Phase 0 — Contracts freeze

**Outcome:** Wire formats and boundaries agreed; no production chat yet.

**Status:** **Passing** (2026-07-22) — `src/lib/ai/model/`, `src/lib/ai/agent/contracts.ts`, focused tests, env + architecture docs.

| Work item | Scope |
|-----------|--------|
| Model contracts | `ModelRef` (`id`, `label`, `provider`, `capabilities.tools`), allowlist stub, `ModelProvider` interface |
| Agent wire format | Messages, streamed events (text / tool-call / tool-result / error), confirm-required envelope |
| Env | Document `OPENROUTER_API_KEY`, optional `EDGE_AI_DEFAULT_MODEL`; update `.env.example` |
| Ownership map | Explicit: tools stay in registry; agent owns only orchestration + prompts |
| Architecture docs | Point `ai-tools-architecture.md` rollout 6–7 at this roadmap |

**Out of scope:** UI, live LLM calls, persistence.

**Exit:** Focused contract/unit tests for schema/allowlist; architecture note updated.

---

### Phase 1 — Model gateway + read-only agent route

**Outcome:** Server can stream a tool-using completion via OpenRouter against **read** tools.

**Status:** **Passing** (2026-07-22) — `OpenRouterModelProvider`, read-only orchestrator, `POST /api/ai/chat` NDJSON stream; focused tests with mocked provider.

| Work item | Scope |
|-----------|--------|
| OpenRouter client | Behind `ModelProvider`; server-only key; attribution headers as required |
| `POST /api/ai/chat` | Stream text + tool calls; default allowlisted model |
| Tool binding | Export JSON Schema from registry; permission `read` only |
| Execute | Server-capable tools via registry; client-required tools return structured `requiresClientSession` (bridge in Phase 3) |
| Context | Inject compact `get_app_state` / active chart summary into system/user context |
| Rate limit / auth | Reuse `/api/ai/*` hardening (`EDGE_API_KEY`, localhost trust) patterns |

**Out of scope:** Polished panel, writes, model picker UI, thread DB.

**Exit:** Focused tests with mocked provider; optional app-level curl/stream smoke with key set.

---

### Phase 2 — Copilot chat shell

**Outcome:** Workspace-native chat UI that talks to `/api/ai/chat`.

**Status:** **Passing** (2026-07-22) — sidebar `copilot` panel, NDJSON stream client, in-memory thread, tool chips, composer send/cancel, `toggleCopilot` command (⌥⇧C), compact `workspaceSnapshot` on send.

| Work item | Scope |
|-----------|--------|
| Panel | Sidebar or workspace tile — Edge tokens / `Edge*` primitives |
| Streaming UI | Assistant tokens, tool-call chips, error states |
| Composer | Send, cancel in-flight, empty/loading states |
| Thread local state | In-memory (or session) thread until Phase 6 |
| Entry points | Header/command-palette affordance; deep-link stub optional |

**Out of scope:** Confirm cards (Phase 4), annotation click-through (Phase 5).

**Exit:** Component tests + app-level open panel → read-only ask (“summarize this chart”) when Phase 1+3 available.

---

### Phase 3 — Session bridge productization

**Outcome:** In-app (and MCP) agents can execute **client-state** tools against the live desk.

**Status:** **Passing** (2026-07-22) — orchestrator awaits `enqueueSessionExecution` for client tools; single-consumer poll dispatch; read grant default; `session.bridge` logs; focused bridge/orchestrator/client tests.

| Work item | Scope |
|-----------|--------|
| Bridge reliability | Heartbeat, poll, execute, result path hardened for agent latency |
| Agent integration | Orchestrator waits on bridge for `requiresClientSession` tools |
| Permissions | Session grants `read` by default; document write grant for Phase 4 |
| MCP parity | External MCP + in-app agent share the same live-state path |
| Observability | Reuse MCP-style structured logs where useful (no secrets/args dump) |

**Depends on:** Existing `AiSessionBridge` + `/api/ai/session/*`.

**Exit:** Focused bridge tests; app-level: agent `get_chart_state` / `summarize_chart` while workspace open.

---

### Phase 4 — Confirmed writes

**Outcome:** Agent can mutate the workspace safely.

**Status:** **Passing** (2026-07-23) — write-mode orchestrator + confirm gate; Copilot accept/reject cards; agent-path AI drawing defaults (`source: ai`, `status: proposed`); `place_order` never silent.

| Work item | Scope |
|-----------|--------|
| Permission | Chat sessions may use `write`; destructive needs confirm |
| Confirm cards | In-chat accept/reject for `requiresConfirmation` and high-impact writes |
| AI drawings | Default `metadata.source: "ai"`, `status: "proposed"` |
| Trading | `place_order` keeps existing live `LIVE` gate; never silent |
| Linked layout | Tool descriptions + UX note propagation (`linkSymbol` / `linkInterval`) |

**Exit:** Focused confirm-gate tests; app-level: accept proposed annotation / reject destructive; no silent `place_order`.

---

### Phase 5 — Chart ↔ chat linkage

**Outcome:** Bidirectional anchors between annotations and conversation (rich-annotations Phase C).

**Status:** **Passing** (2026-07-23) — `threadId`/`messageId` stamped on agent `add_drawing`; Copilot focus + fallback rationale; toolbar “Open in chat” + “AI suggested”; accept→`accepted`/dismiss→`invalidated`; `summarize_chart` narrative + link IDs.

| Work item | Scope |
|-----------|--------|
| `threadId` (and message id) on AI placements | Stable IDs written on create/update |
| Click annotation → open turn | Copilot panel focuses rationale + message |
| Provenance UI | “AI suggested” / accept → `accepted` or dismiss → `invalidated` |
| `summarize_chart` | Prefer rationale + status in narrative when present |

**Exit:** App-level click AI drawing → correct chat turn; accept/dismiss updates metadata.

---

### Phase 6 — Thread persistence

**Outcome:** Copilot history survives refresh (and optional cloud sync).

**Status:** **Passing** (2026-07-23) — `tv-ai:copilot-threads:v1` local fallback + `/api/me/copilot-threads`; thread list/rename/delete/New chat; debounced save; annotation click switches threads; redacted tool-step persist.

| Work item | Scope |
|-----------|--------|
| Storage | localStorage fallback + optional Postgres `/api/me/copilot-threads` |
| Scope | Threads separate from chart layout / app-workspace documents |
| Privacy | No secrets; redact tool payloads if needed; user-scoped |
| UX | Thread list, rename, delete |

**Out of scope:** Multi-device realtime CRDT; sharing threads publicly.

**Exit:** App-level refresh restores last thread; focused schema/repository tests.

---

### Phase 7 — Model picker + optional routing

**Outcome:** User (and later policy) can choose models without code changes.

**Status:** **Passing** (2026-07-23) — `listAgentModels()` + Copilot `EdgeSelect` model picker; per-thread `modelId` persist (local + `/api/me/copilot-threads`); `streamChat` sends resolved allowlisted id; intelligent router + direct providers deferred.

| Work item | Scope |
|-----------|--------|
| Allowlist UI | Short list of tool-capable models; default + per-thread override |
| Capability flags | Hide models that fail tool-calling from agent mode |
| Optional router | Heuristic cheap-vs-strong (summarize vs multi-tool analysis) — **defer until cost/latency evidence** |
| Direct providers | Optional second `ModelProvider` (OpenAI/xAI) behind same interface |

**Exit:** App-level switch model mid-thread; focused allowlist validation tests.

---

### Phase 8 — Workflow polish

**Outcome:** Guided trading workflows feel first-class.

**Status:** **Passing** (2026-07-22) — `COPILOT_WORKFLOW_PROMPTS` empty-state chips; `prepare_chart_for_analysis` confirm gate; slim `dataProvenance` on `get_chart_state` / `summarize_chart`; system prompt cites source/freshness; playbooks (Phase D) deferred.

| Work item | Scope |
|-----------|--------|
| Prompt library | “Prepare chart for analysis”, “Compare symbols”, “Mark invalidation”, “Summarize thesis” |
| Workflow tools | Lean on existing `prepare_chart_for_analysis`, `compare_symbols`, `summarize_chart`, journal/alert tools |
| Source/freshness | Surface provider metadata in answers when available |
| Playbooks handoff | Align with rich-annotations Phase D when that track starts — do not block |

**Exit:** App-level each workflow prompt produces useful tool use + visible chart updates (with confirms).

---

### Standalone Copilot module (post-track)

**Outcome:** `/copilot` hosts the same `CopilotPanel` as a top-level app section; sidebar panel unchanged.

**Status:** **Passing** (2026-07-23) — `CopilotModuleShell` + `CopilotRuntimeProviders` + home hub card; stub `AppActions` for standalone snapshot.

---

## Explicit deferrals

- Building a second tool registry or letting the LLM SDK own tool definitions as source of truth
- Exposing every OpenRouter model in the UI
- Intelligent multi-model routing before Phase 7 evidence
- Multi-tenant / team copilots / shared public agents
- Voice / multimodal chart screenshot vision (may revisit after Phase 5)
- Pine Script or external TradingView strategy bots
- Replacing MCP — MCP remains for Cursor/external agents; in-app agent is an additional adapter consumer
- External delivery of AI suggestions (email) — stay in-app

---

## Verification plan

| Tier | When | Scope |
|------|------|--------|
| **Focused** | Every phase | Provider mocks; agent event schema; confirm gates; bridge queue; thread schema |
| **Build** | Phases 1+ (API/UI wiring) | `npm run build` when routes/components land |
| **App-level** | Phases 2–6, 8 | Panel open → stream → tool chips → confirm → annotation click → refresh restore |
| **Full** | Before marking track major milestones Passing | `npm run check` when shared AI/app behavior changes |

Completion evidence must quote actual command output or numbered app-level observations (per harness Definition of Done).

---

## Harness Update

When this roadmap is filed (docs-only):

| Section | Change |
|---------|--------|
| Active Work | Add **AI agent / in-app copilot track** — **Pending** (roadmap defined; Phase 0 not started) |
| Task Contract | Create **AI agent / in-app copilot** — Incomplete; Next = Phase 0 under WIP=1 when prioritized |
| Session Log | Entry: roadmap created + indexed |
| Current Verified State | Unchanged — do not steal Active WIP from app-level verification |

When Phase N starts: one Active row only; Task Contract Delivered/Verification updated; mark phase **Passing** only with evidence.

---

## Relationship to product roadmap Phase 5

[ROADMAP.md § Phase 5 — In-App Copilot](../ROADMAP.md) remains the product outcome statement. **This file owns phasing, contracts, and exit criteria.** Map:

| Product bullet | Track phase |
|----------------|-------------|
| Copilot panel reads chart/layout/market context | 2 + 3 |
| Propose annotations; accept writes | 4 |
| Chart selections ↔ chat stable IDs | 5 |
| Workflows (prepare / compare / invalidation / thesis) | 8 |
| Session bridge for MCP live state | 3 |

---

## Source of truth

- Live Active Work / evidence → [PROJECT-STATUS.md](../PROJECT-STATUS.md)
- Tool inventory / permissions → [ai-tools-architecture.md](../ai-tools-architecture.md)
- Annotation linkage vision → [rich-annotations-vision.md](../chart/rich-annotations-vision.md)
- Feature roadmaps index → [README.md](./README.md)
