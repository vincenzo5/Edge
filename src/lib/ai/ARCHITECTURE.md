# AI Tools Architecture

Shared, validated tool registry exposing Edge product features to AI agents.

## Responsibility

Define typed tools with Zod validation, permission metadata, and a single execution path. Adapters translate agent requests into registry calls.

## Architecture

```
AI Agent
  ├── In-App Adapter (AiToolsProvider)
  ├── HTTP Adapter (/api/ai/tools)
  └── MCP Adapter (scripts/edge-mcp-server.mts)
        └── ToolRegistry (src/lib/ai/registry.ts)
              ├── Zod Validation
              └── ToolContext
                    ├── AppActions (layout, cells, theme)
                    ├── ActiveChartContext (active chart read/write)
                    ├── WatchlistContext (watchlist CRUD)
                    ├── ScreenerProvider (last run + saved screen state)
                    ├── RiskSettingsProvider / AccountProvider / OptionsSessionProvider
                    ├── ScriptLibraryProvider (My scripts CRUD via ScriptLibraryPort)
                    ├── JournalPort (list/get/patch trades via journalClient)
                    ├── MarketDataPort (search, candles, quotes)
                    └── TradingPort (preview / place / cancel orders)
```

## Key Modules

| Module | Role |
|--------|------|
| `registry.ts` | Tool registration and lookup |
| `tools/clientTools.ts` | Browser-safe tool groups (no `node:fs`) → `clientToolRegistry` |
| `tools/index.ts` | `ALL_AI_TOOLS` = client tools + `patternLibraryTools` → `edgeToolRegistry` |
| `tools/*.ts` | Implementations: chart, marketData, indicators, indicatorScripts, drawings, watchlist, workflow, screener, sessionState, trading, journal, alerts, research, patternLibrary |
| `context.ts` | `ToolContext` interface — adapter boundary |
| `tradingPort.ts` | `TradingPort` facade over `/api/trading/*` (fetch) or `TradingService` (HTTP adapter) |
| `journalPort.ts` | `JournalPort` facade over `/api/me/journal/*` via `journalClient` |
| `alertsPort.ts` | `AlertsPort` facade over `/api/me/alerts` + `/api/me/alerts/events` via `alertClient` |
| `validation.ts` | Parse helpers, JSON Schema export |
| `schemas.ts` | Shared Zod schemas |
| `adapters/inApp.ts` | React provider execution |
| `adapters/http.ts` | REST endpoint execution |
| `adapters/mcp.ts` | MCP server execution |
| `sessionBridge.ts`, `sessionBridgeExecute.ts` | Client session bridge store + `executeClientSessionTool` helper |
| `AiSessionBridge.tsx` | Browser long-poll on `/api/ai/session/poll`; heartbeat every 45s (and on tab visible); on 401/409 re-syncs or adopts `sessionStorage` credentials with backoff (no 401 tight-loop). Mount once via `DensityModuleLayout` for Talk/Board/Desk (`src/app/(density)/layout.tsx`) — not inside nested `CopilotRuntimeProviders` tiles or chart `AppProviders`. |

## Tool Definition Shape

```ts
type AiTool<TInput> = {
  name: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
  permission: "read" | "write" | "destructive";
  requiresConfirmation: boolean;
  execute(input: TInput, context: ToolContext): Promise<ToolResult>;
};
```

## Permission Model

| Mode | Allowed |
|------|---------|
| `read` | Read-only tools |
| `write` | Read + non-destructive write tools |
| `full` | All tools when a valid server `confirmationToken` or session-bridge server validation is present for destructive ops |

External agents (HTTP/MCP) default to `read` unless session grants write access.

When `EDGE_API_KEY` is configured, HTTP/MCP callers must send `X-Edge-Api-Key` (or `Authorization: Bearer …`) for sensitive routes unless the request originates from trusted localhost. The MCP adapter forwards `EDGE_API_KEY` when calling `/api/ai/session/execute`.

### MCP call logging

Each `tools/call` through [`adapters/mcp.ts`](adapters/mcp.ts) writes one JSON line to **stderr** (`event: "mcp.tool"`) with `tool`, `ok`, optional `code`, `durationMs`, and `bridge` (session-bridge vs server execute). No args, results, or secrets are logged — intended for local Cursor MCP debugging only.

## Invariants

- Tools MUST NOT import React — use `ToolContext` facades only.
- All inputs MUST pass Zod validation before execution.
- Destructive tools (`delete_drawing`, `clear_watchlist`, `delete_watchlist`, `delete_indicator_script`, `delete_alert`, `remove_research_card`, `place_order`, `attach_playbook`) require confirmation.
- Server-side tools (market data, trading, pattern library disk I/O) run without browser session; client-state tools return `requiresClientSession` error when no session.
- My scripts: seven `*_indicator_script` tools use `ScriptLibraryPort` (never React). Generic chart tools sanitize script instances to refs only; source is returned only from dedicated script tools. Compile is client-side only.
- When `layout.linkSymbol` or `layout.linkInterval` is on, matching fields propagate to peer cells; crosshair sync uses `layout.linkCrosshair`; drawing sync uses `layout.linkDrawings`.
- Trading tools use `TradingPort` only — never call brokerage or React account state directly. Live `place_order` and live `attach_playbook` require `liveConfirmation: "LIVE"`.
- Pattern library tools that touch the filesystem (`save_pattern_capture`, taxonomy/stats reads from disk) stay in `patternLibraryTools` and are **not** registered in `CLIENT_AI_TOOLS`.

## Server vs Client Split

| Runs server-side | Requires client session |
|------------------|------------------------|
| `search_symbols`, `get_candles`, `get_quotes`, `get_fundamentals`, `preview_order`, `place_order`, `preview_playbook`, `attach_playbook`, pattern library disk tools | `set_symbol`, `add_indicator`, `add_drawing`, `*_indicator_script`, layout mutators, `find_similar_setups` / `capture_pattern_setup` (active chart), journal tools, alert tools (`list/get/create/update/dismiss/delete`, high-level create, open/preview/suggest) |

## Two Chart-Tool Products

This registry owns **Edge application tools** (`tools/chart.ts`, etc.) against `ToolContext`. The separate `@edge/ai-tools-chart` package exposes similarly named tools on a portable `ChartSessionPort` — it is **not** registered here. Shared enum values (`CHART_TYPE_VALUES`, `STARTER_INDICATOR_NAMES`) come from `@edge/chart-core`; contracts differ. See [docs/ai-tools-architecture.md](../../../docs/ai-tools-architecture.md) § Two AI Chart-Tool Products and [packages/ai-tools-chart/ARCHITECTURE.md](../../../packages/ai-tools-chart/ARCHITECTURE.md).

## In-app agent (Phase 0–8)

Phase 0 freezes contracts; Phase 1 adds the read-only server agent route; Phase 2 adds the Copilot sidebar chat shell; Phase 3 productizes the session bridge for client-state read tools; Phase 4 unlocks confirmed writes; Phase 5 links AI annotations to Copilot turns; Phase 6 persists Copilot threads; Phase 7 adds allowlist model picker with per-thread override; Phase 8 adds workflow prompt library + model-visible data provenance. Full phasing: [docs/roadmaps/ai-agent-roadmap.md](../../../docs/roadmaps/ai-agent-roadmap.md).

| Module | Role |
|--------|------|
| `model/types.ts`, `model/allowlist.ts` | `ModelRef`, seed defaults, OpenRouter id validation, default model resolution |
| `model/enabledModelsStore.ts` | Client persisted enabled model ids (`edge:ai:enabledModels:v1`); picker source |
| `model/openrouterModels.ts` | OpenRouter catalog fetch (popular + newest tool-capable models; server-only cache) |
| `model/provider.ts` | `ModelProvider` interface |
| `model/openrouter.ts` | OpenRouter streaming client (`server-only`; `OPENROUTER_API_KEY`) |
| `agent/contracts.ts` | `POST /api/ai/chat` request + NDJSON stream event Zod schemas (optional `artifactHint` on `tool-result` for Talk pin UI — not persisted on Copilot threads) |
| `agent/orchestrate.ts` | Tool loop (max 8 rounds); write mode; confirm gate; server tools via registry; client-session tools via session bridge |
| `agent/readTools.ts` | Filters registry definitions by permission mode for model binding |
| `agent/confirmGate.ts` | Confirm detection, reasons, AI drawing defaults, accept execute options |
| `agent/summarizeToolResult.ts` | Short stream summaries + model continuation payloads (includes top-level `meta` when present on data) |
| `agent/dataProvenance.ts` | Slim `dataProvenance` projection from chart `dataMeta` for agent-visible tool results |
| `agent/promptLibrary.ts` | Copilot workflow prompt catalog (prepare / compare / invalidation / thesis) |
| `agent/promptBoundaries.ts` | System prompt isolation, workspace snapshot sanitization/fencing, client system-role strip, orchestrator content budget |
| `agent/ownership.ts` | Agent vs registry ownership split |
| `app/api/ai/chat/route.ts` | NDJSON stream (`application/x-ndjson`); honors `permissionMode`; 503 when key missing |
| `app/api/ai/models/route.ts` | OpenRouter popular/newest tool-capable catalog for Copilot settings (503 when key missing) |
| `app/components/copilot/` | Copilot panel — stream client, confirm cards, thread hook, message list, composer, chart↔chat focus |
| `app/components/copilot/CopilotShell.tsx` | Grok-parity layout shell — empty hero vs active thread; host variants `sidebar` / `page` / `tile` (presentation only; agent contract unchanged) |
| `app/components/copilot/CopilotModelSettingsModal.tsx` | Settings cog modal — active chips, Popular/Recent/Enabled tabs, search, richer provider rows |
| `app/components/copilot/CopilotModuleShell.tsx` | Standalone `/copilot` module page |
| `app/components/app-workspace/CopilotTileSurface.tsx` | Workspace tile mount for surface `copilot` |
| `lib/copilot/stubAppActions.ts` | Minimal `AppActions` for standalone Copilot (default layout snapshot; no-op mutators) |
| `lib/copilot/localCopilotThreadsStore.ts` | localStorage snapshot (`tv-ai:copilot-threads:v1`) |
| `lib/persistence/client/copilotThreadsClient.ts` | Hydrate/save with cloud sync + 503 local fallback |
| `lib/persistence/schemas/copilotThreads.ts` | Thread/message Zod contracts (redacted tool steps) |
| `app/api/me/copilot-threads/` | User-scoped thread CRUD |

**Phase 1 behavior:** Server tools execute via `createServerToolContext`. Optional `workspaceSnapshot` on the request injects compact desk context (not full candles).

**Phase 2 behavior:** Copilot opens as sidebar panel `copilot` (pop-out supported), standalone module at `/copilot` (home hub card), or workspace tile surface `copilot` (Change panel / placeholder assign). All mounts reuse the same `CopilotPanel` component. Sidebar entry: sidebar rail + `toggleCopilot` (⌥⇧C) command palette. Standalone/tile entry: `CopilotRuntimeProviders` with stub `AppActions` (chart-backed tools degrade without a live chart tile). UI POSTs to `/api/ai/chat`, parses NDJSON `AgentStreamEvent`s, shows streaming text + tool chips, supports cancel. Client sends compact `workspaceSnapshot` (≤4000 chars) derived from `buildAppWorkspaceSnapshot`.

**Phase 3 behavior:** `requiresClientSession` read tools enqueue through `executeClientSessionTool` → in-memory session bridge → `AiSessionBridge` in the open browser tab. Single-consumer poll dispatch avoids duplicate job delivery across tabs. Structured stderr logs: `event: "session.bridge"` (tool, ok, code, durationMs, source — no args/secrets). In-memory store is single-process (solo local dev); multi-worker Redis deferred. MCP continues to use HTTP `/api/ai/session/execute` against the same store when `EDGE_APP_URL` is set.

**Security hardening (Phase 3 — bridge ownership):** First heartbeat mints `{ sessionId, bridgeSecret }` synchronously before auth lookup (avoids Strict Mode double-mint races); the browser stores the secret in memory + `sessionStorage` and sends `X-Edge-Bridge-Secret` on heartbeat refresh, poll, result, and Copilot session execute. Hijack heartbeats without the secret return **409** (client adopts a racing mount's stored secret); poll/result without it return **401** (client re-heartbeats with backoff). Optional bind to persistence `userId` after mint when a signed cookie is present. HTTP `/api/ai/session/execute` also accepts a valid `EDGE_API_KEY` for MCP enqueue (no browser secret). In-process agent enqueue is unchanged.

**Phase 4 behavior:** Copilot sends `permissionMode: write`. Non-destructive write tools auto-execute in the orchestrator loop. Tools with `requiresConfirmation` or `permission: destructive` emit `confirm-required` (with server-minted `confirmationToken`) + `confirmation_required` tool-result without executing. Copilot shows Accept/Reject cards; Accept re-executes via `/api/ai/session/execute` (client-session tools) or `/api/ai/tools/execute` (server-only tools) with the minted token — bare `confirmed: true` is rejected. Agent-path `add_drawing` merges default `metadata.source: ai` and `metadata.status: proposed`. `place_order` remains destructive with LIVE gate — never auto-executed or silently confirmed.

**Phase 5 behavior:** Chat requests include `assistantMessageId`; orchestrator stamps `metadata.threadId` and `metadata.messageId` on agent-path `add_drawing` (and confirmed re-exec). `CopilotProvider` exposes `openAnnotationInChat` — opens sidebar Copilot and focuses the linked message (fallback rationale banner when message not in memory). Drawing toolbar shows “AI suggested” + “Open in chat”; accept sets `status: accepted`, dismiss sets `invalidated`. `summarize_chart` returns `annotations.narrative` (rationale + status prose) and link IDs on items.

**Phase 6 behavior:** Copilot threads persist in `tv-ai:copilot-threads:v1` with optional cloud sync via `/api/me/copilot-threads`. Threads are separate from chart layout / app-workspace documents. UI supports thread list, rename, delete, and New chat. Persisted messages redact `confirmArguments` from tool steps. Debounced save after stream terminal state / confirm resolve. `openAnnotationInChat` switches threads by `threadId` before focusing `messageId`. Archived threads remain loadable by id for annotation deep-links but are hidden from the list.

**Phase 7 behavior:** Copilot in-bar model chip (Grok parity Phase 3) selects the thread `modelId` from the client enabled-model store (`enabledModelsStore` — seeded from five verified OpenRouter defaults: GPT-5.6 Sol, Claude Opus 4.8, Claude Fable 5, Grok 4.5, GLM 5.2). Chip opens an anchored dropdown listing enabled models with checkmark + provider/id subtitle; selection calls `setModelId` (blocked while streaming). Settings cog opens `CopilotModelSettingsModal`, which loads popular + newest tool-capable models from `GET /api/ai/models` (OpenRouter proxy with short server cache). The modal shows a pinned active-chips strip, Popular/Recent/Enabled segmented tabs, search filter, and richer provider rows in a single scroll region. Check/uncheck (or chip remove) updates the picker immediately without restart; at least one model must stay enabled. Server chat accepts any valid OpenRouter `vendor/model` id (not only seed ids). Each thread stores optional `modelId` (local + cloud); New chat resets to `resolveEnabledModelId()`. Mid-thread model changes apply to subsequent sends only. Intelligent cheap/strong routing and direct OpenAI/xAI providers remain deferred.

**Phase 8 behavior:** Empty Copilot state shows four workflow prompt chips (`COPILOT_WORKFLOW_PROMPTS`) below the centered composer (Grok parity Phase 1 shell). Chips send immediately via the normal chat path (with workspace snapshot). `prepare_chart_for_analysis` requires confirmation (clears drawings). `get_chart_state` and `summarize_chart` include slim `dataProvenance` from active chart `dataMeta`. System prompt instructs the model to cite provider source/freshness when present. Rich-annotations playbooks (Phase D) remain deferred — `playbookId` reserved only.

**Grok UX parity (presentation track):** Phase 1 landed `CopilotShell` with `.copilot-shell` scoped CSS aliases, host-aware empty hero (Edge brand + centered composer), and minimal top chrome on empty. Phase 2 landed pill `query-bar` composer. Phase 3 landed in-bar model chip + dropdown (header `EdgeSelect` removed). Phase 4 landed collapsible history rail on `/copilot` + wide tile (`CopilotHistoryRail`), Thoughts disclosure for non-confirm tool steps, message typography/actions (Copy + Regenerate last turn via `regenerateLast`). Phase 5 landed attach menu (upload/paste/chart capture), composer preview chips, message thumbnails, `/api/me/copilot/attachments` upload-then-URL storage, multimodal OpenRouter content parts, and vision gate (`capabilities.vision` on seed allowlist). Light-theme Copilot tokens remain deferred.

**Runtime interaction performance (Phase 6 — message list):** `CopilotMessageList` virtualizes older bubbles via `@tanstack/react-virtual`; `CopilotMessageBubble` is memoized; the streaming assistant turn stays mounted outside the recycled window so token patches do not remount history. Stick-to-bottom policy is frozen in `src/lib/copilot/chatScrollPolicy.ts` (`NEAR_BOTTOM_THRESHOLD_PX = 96`).

**Copilot chat blocks (Phase 0 — contracts):** In-thread vocabulary is frozen to six block kinds — **Trace**, **Media**, **Data**, **Action**, **Reference**, **Follow-ups** — in `src/lib/copilot/chatBlocks.ts`. Markdown prose is the default message body (not a named block). Context stays on the composer / silent `workspaceSnapshot` / optional Reference chips — not a permanent in-thread Context card. Zod schemas cap payload size (Data tables, Reference/Follow-up chip counts). Mapping helpers in `src/lib/copilot/chatBlockMapping.ts` bridge existing `artifactHint` types and tool names to block kinds. The NDJSON stream still emits `tool-result.artifactHint` and `confirm-required`; UI projection to block shells ships in Phases 1–2. Blocks and hints are derived in-memory — not a new persisted thread column; pin → evidence rail → Board unchanged. Full phasing: [docs/roadmaps/copilot-chat-blocks-roadmap.md](../../../docs/roadmaps/copilot-chat-blocks-roadmap.md).

**Memory efficiency (Phase 7 — request context):** Copilot persists full threads locally/cloud (≤500 messages). Each chat send windows the **request payload only** via `selectChatRequestMessages` — last **40** user/assistant turns, each `content` truncated to **4000** chars for the wire. React state and persisted history stay full for annotation deep-links. `chatRequestSchema` hard-caps `messages` at **64** and `content` at **8000** chars.

**Security hardening (Phase 6 — prompt boundaries):** The orchestrator keeps a single trusted system prompt (`SYSTEM_PROMPT_BASE`). Workspace snapshots are sanitized (control-char strip, ≤4000 chars) and injected as a fenced **user** context message labeled untrusted — never concatenated into system instructions. Client-supplied chat messages with `role: "system"` are stripped before model I/O. Before OpenRouter, `assemblePromptMessages` enforces a total content budget (**48_000** chars across system + snapshot context + history). **Residual prompt-injection risk:** tool permission modes and server-minted confirmation tokens remain the hard boundary for destructive actions; prompt isolation reduces model confusion but cannot fully prevent social engineering of the operator or confirm UX.

**Ownership:** The agent owns orchestration, prompts, model I/O, and chat stream events. This registry owns tool definitions, JSON Schema export, `executeTool`, and permission/confirmation gates. The LLM path must never mutate React state directly.

**Secrets:** `OPENROUTER_API_KEY` and `EDGE_AI_DEFAULT_MODEL` are server-only (see `.env.example`). Keys must not ship to the client bundle.

## Verification

```bash
npm test -- --run src/lib/ai/
npm test -- --run src/app/api/ai/tools/route.test.ts
npm test -- --run src/app/api/ai/chat/route.test.ts
npm test -- --run src/app/components/copilot/
npm test -- --run src/lib/copilot/
npm test -- --run src/app/api/me/copilot-threads/
```

## Related Docs

- [docs/ai-tools-architecture.md](../../../docs/ai-tools-architecture.md) — full design and tool inventory
- [docs/roadmaps/ai-agent-roadmap.md](../../../docs/roadmaps/ai-agent-roadmap.md) — in-app copilot / OpenRouter agent phasing
- [src/lib/research/ARCHITECTURE.md](../research/ARCHITECTURE.md) — Research UX track; sessions hold `threadIds[]` referencing Copilot threads (separate stores)
- [docs/chart/rich-annotations-vision.md](../../../docs/chart/rich-annotations-vision.md) — annotation metadata direction

## State Ownership

| Surface | Type | Persisted | AI read tool |
|---------|------|-----------|--------------|
| Chart layout / cells | `ChartLayout`, `CellConfig` | Yes (localStorage + optional Postgres) | `get_app_state`, `get_chart_state` |
| Watchlist | `WatchlistState` | Yes | watchlist tools |
| Screener query/library | `ScreenerState` | Yes | `summarize_screen` (uses session last run) |
| Screener session | `ScreenerSessionState` | No (ephemeral) | via `summarize_screen` |
| Risk settings | `RiskSettings` | Yes (localStorage) | `get_risk_settings` |
| Options chain data | `OptionsChainModel` | No | `get_options_chain` (server) |
| Options workspace | `OptionsSessionState` | No (in-memory) | `get_options_session` |
| Account | `AccountSnapshot` | No (broker stream) | `get_account_snapshot` |
| Trading intents / orders | `TradingService` + connection registry | No (in-memory intents; broker holds orders) | `preview_order`, `place_order` |
| Active chart | `ActiveChartReadState` | Derived from layout + runtime | `get_chart_state` |
| My scripts library | `ScriptLibraryState` | Yes (IndexedDB + localStorage) | `list_indicator_scripts`, `get_indicator_script`, etc. |
| Alert definitions | `AlertDefinitionResponse[]` | Yes (Postgres + localStorage) | `list_alerts`, `get_alert`, `create_alert`, etc. |
