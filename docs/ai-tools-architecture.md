# AI Tools Architecture

Edge exposes product features to AI agents through a shared, validated tool registry. Every capability is a typed tool with runtime validation, permission metadata, and a single execution path. The in-app copilot, HTTP API, and MCP server all call the same registry.

## Two AI Chart-Tool Products

Edge maintains **two separate chart-tool surfaces** that share enum values but not execute paths:

| Product | Location | Context | Use when |
|---------|----------|---------|----------|
| **Edge application tools** | `src/lib/ai/tools/chart.ts` (+ registry) | `ToolContext` — layout cells, active chart, market data | In-app copilot, HTTP/MCP session bridge against the running app |
| **Portable chart-session tools** | `@edge/ai-tools-chart` | `ChartSessionPort` — serialized chart state only | Examples, headless agents, package/SDK consumers |

**Same tool name ≠ same contract.** Notably:

- `get_chart_state` — app: `{ cellIndex }` + cell config/overlays; package: `{}` + serialized state
- `set_chart_type` — app: updates a layout cell; package: mutates session state
- `summarize_chart` — app workflow tool returns annotations/thesis; package returns compact session counts

Shared schemas: `CHART_TYPE_VALUES` and `STARTER_INDICATOR_NAMES` from `@edge/chart-core` (re-exported in `src/lib/ai/schemas.ts`). Do not merge registries or mechanically unify tool implementations.

See [packages/ai-tools-chart/ARCHITECTURE.md](../packages/ai-tools-chart/ARCHITECTURE.md).

## Design Principles

1. **One registry, many adapters** — tool definitions live in `src/lib/ai/`; adapters translate agent requests into registry calls.
2. **No direct React manipulation** — agents call typed commands that route through existing app update paths (`StockApp`, `ActiveChartContext`, watchlist reducers).
3. **Validate before execute** — all inputs pass through Zod schemas; invalid args return structured errors.
4. **Permission-aware** — read, write, and destructive tools are gated; destructive actions require explicit confirmation.
5. **Server vs client split** — market-data and trading tools run server-side; layout/chart/watchlist tools require a live browser session.

## Architecture

```
AI Agent
  ├── In-App Adapter (AiToolsProvider)
  ├── HTTP Adapter (/api/ai/tools)
  └── MCP Adapter (scripts/edge-mcp-server.mts)
        └── Shared Tool Registry (src/lib/ai/)
              ├── Zod Validation
              └── ToolContext
                    ├── AppActionsContext (layout, cells, theme)
                    ├── ActiveChartContext (active chart read/write)
                    ├── ChartActionsContext (symbol load)
                    ├── WatchlistContext (watchlist CRUD)
                    ├── ScreenerProvider (saved screens + last run)
                    ├── RiskSettingsProvider / AccountProvider / OptionsSessionProvider
                    ├── MarketDataPort (search, candles, quotes, fundamentals)
                    └── TradingPort (preview / place / cancel via TradingService)
```

## Tool Inventory

| Group | Tool | Permission | Confirmation |
|---|---|---|---|
| **App** | `get_app_state` | read | — | Returns `layoutId`, linked mode, theme, active cell, and per-cell summary via `buildAppWorkspaceSnapshot` |
| **App** | `set_active_cell` | write | no |
| **App** | `set_grid_mode` | write | no | Accepts `layoutId` (preferred) or legacy `gridMode`; migrates to template id |
| **App** | `set_linked_mode` | write | no |
| **App** | `set_theme` | write | no |
| **Chart** | `get_chart_state` | read | — |
| **Chart** | `get_visible_candles` | read | — |
| **Chart** | `set_symbol` | write | no |
| **Chart** | `set_chart_range` | write | no |
| **Chart** | `set_chart_type` | write | no |
| **Chart** | `go_to_date` | write | no |
| **Market data** | `search_symbols` | read | — |
| **Market data** | `get_candles` | read | — |
| **Market data** | `get_quotes` | read | — |
| **Market data** | `get_fundamentals` | read | — |
| **Indicators** | `list_indicators` | read | — |
| **Indicators** | `add_indicator` | write | no |
| **Indicators** | `remove_indicator` | write | no |
| **Indicators** | `update_indicator` | write | no |
| **Drawings** | `list_drawings` | read | — |
| **Drawings** | `add_drawing` | write | no |
| **Drawings** | `update_drawing` | write | no |
| **Drawings** | `delete_drawing` | destructive | yes |
| **Drawings** | `undo` / `redo` | write | no |
| **Watchlist** | `get_watchlists` | read | — |
| **Watchlist** | `create_watchlist` | write | no |
| **Watchlist** | `rename_watchlist` | write | no |
| **Watchlist** | `add_watchlist_symbols` | write | no |
| **Watchlist** | `remove_watchlist_symbols` | write | no |
| **Watchlist** | `clear_watchlist` | destructive | yes |
| **Watchlist** | `delete_watchlist` | destructive | yes |
| **Watchlist** | `load_watchlist_symbol` | write | no |
| **Workflow** | `summarize_chart` | read | — |
| **Workflow** | `compare_symbols` | write | no |
| **Workflow** | `prepare_chart_for_analysis` | write | no |
| **Screener** | `summarize_screen` | read | — |
| **Session state** | `get_risk_settings` | read | — |
| **Session state** | `get_account_snapshot` | read | — |
| **Session state** | `get_options_session` | read | — |
| **Trading** | `preview_order` | write | no |
| **Trading** | `place_order` | destructive | yes |
| **Pattern library** | `list_pattern_taxonomy` | read | — |
| **Pattern library** | `find_similar_setups` | read | — | OHLCV retrieval from active chart; requires client session |
| **Pattern library** | `pattern_library_stats` | read | — |
| **Pattern library** | `capture_pattern_setup` | read | — | Draft record from active chart; requires client session |
| **Pattern library** | `save_pattern_capture` | write | yes | Persist capture record + SVG |
| **Pattern library** | `get_pattern_capture` | read | — | Load saved capture by id |

See [`src/lib/patternLibrary/ARCHITECTURE.md`](../src/lib/patternLibrary/ARCHITECTURE.md) for hybrid retrieval + bake-off methodology.

### Supported Indicators (implemented only)

MA, EMA, BOLL, MACD, RSI, VOL

### Supported Drawing Types

`trend_line`, `horizontal_line`, `vertical_line`, `ray`, `rectangle`, `parallel_channel`, `price_channel`, `circle`, `fib_retracement`, `price_line`, `annotation`, `measure`, `ruler`

### Drawing annotation metadata (Phase A)

All drawing types accept optional `metadata` on `add_drawing` / `update_drawing`:

| Field | Values |
|---|---|
| `kind` | `thesis`, `invalidation`, `target`, `note` |
| `status` | `proposed`, `accepted`, `active`, `triggered`, `invalidated` |
| `source` | `user`, `ai`, `imported` |
| `rationale` | string — why the annotation exists |

`list_drawings` optional filters: `kind`, `status`, `source`. Returns `annotationSummary`.

`summarize_chart` returns `annotations: { total, byKind, byStatus, proposedCount, items, thesisSummary }`.

AI placements with `metadata.source: "ai"` default to `status: "proposed"` unless overridden.

Types: [`src/lib/chart/annotationMetadata.ts`](../src/lib/chart/annotationMetadata.ts)

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

## ToolContext

`ToolContext` is the adapter boundary between tools and app state:

| Field | Source |
|---|---|
| `getLayout()` / layout mutators | `AppActionsContext` |
| `getActiveChart()` | `ActiveChartContext` |
| `getWatchlistState()` / watchlist mutators | `WatchlistContext` |
| `loadSymbolIntoActiveChart()` | `ChartActionsContext` |
| `screener.getState()` / `getLastRun()` | `ScreenerProvider` |
| `risk.getRiskSettings()` | `RiskSettingsProvider` |
| `account.getSnapshot()` | `AccountProvider` |
| `options.getSession()` | `OptionsSessionProvider` |
| `marketData` | `ServiceMarketDataPort` (server) or `FetchMarketDataPort` (client) |
| `trading` | `ServiceTradingPort` (HTTP → `TradingService`) or `FetchTradingPort` (in-app → `/api/trading/*`) |

Tools never import React. Context providers assemble a `ToolContext` snapshot at execution time. `preview_order` / `place_order` require a non-null `trading` port; `place_order` is destructive and needs confirmation (plus `liveConfirmation: "LIVE"` for live).

## Permission Model

| Mode | Allowed tools |
|---|---|
| `read` | read-only tools |
| `write` | read + write tools (non-destructive) |
| `full` | all tools when `confirmed: true` for destructive ops |

External agents (HTTP/MCP) default to `read` unless a session grants write access.

When `EDGE_API_KEY` is configured, HTTP/MCP callers must send `X-Edge-Api-Key` (or `Authorization: Bearer …`) for `/api/ai/*` unless the request originates from trusted localhost (`EDGE_TRUST_LOCALHOST`, default true).

## Serving Adapters

### In-App Adapter

`AiToolsProvider` wraps the app, builds `ToolContext` from React contexts, and exposes `executeTool(name, input, options)` to a future copilot panel.

### HTTP Adapter

- `GET /api/ai/tools` — list tool definitions with JSON Schema
- `POST /api/ai/tools/execute` — execute a tool by name

Server-side execution supports market-data and trading tools directly (`TradingPort` → `TradingService`). Client-state tools return a `requiresClientSession` error when no browser context is available. Middleware applies optional `EDGE_API_KEY` and in-process rate limits (`EDGE_RATE_LIMIT`) to `/api/ai/*`.

### MCP Adapter

`scripts/edge-mcp-server.mts` exposes market-data and tool-definition tools for Cursor and other MCP clients. Stateful chart/layout tools require the in-app session bridge (future WebSocket bridge). When bridging to `/api/ai/session/execute`, the adapter forwards `EDGE_API_KEY` as `X-Edge-Api-Key`.

Add to `.cursor/mcp.json`:

```json
{
  "edge": {
    "command": "npx",
    "args": ["tsx", "scripts/edge-mcp-server.mts"]
  }
}
```

## Linked Layout Caveat

When `layout.linkSymbol` or `layout.linkInterval` is on, symbol or range/interval changes on the active cell propagate to peer cells via `applyLinkPropagation`. Crosshair sync is gated on `layout.linkCrosshair`. Tools that mutate these fields document propagation in their descriptions.

## Rich Annotations (product direction)

Drawings are evolving from TV-style geometry into a **semantic annotation layer** for the trading co-pilot: typed kinds (thesis, invalidation, target, …), live computed payloads, chart↔chat linkage, playbooks, and executable alerts. See [chart/rich-annotations-vision.md](./chart/rich-annotations-vision.md) for the full vision and phased implementation plan. AI drawing tools will gain `metadata` filters and fields as Phase A lands.

## Rollout Phases

1. Core registry + validation + documentation (this phase)
2. Read-only tools wired to app context
3. Confirmed write tools (symbol, range, indicators, watchlist)
4. Drawing/viewport bridge via `ActiveChartCommands`
5. Rich annotation metadata on drawings — **shipped** (see [rich-annotations-vision.md](./chart/rich-annotations-vision.md))
6. In-app copilot UI (future)
7. Session bridge for MCP stateful tools (future)

## File Map

| Path | Purpose |
|---|---|
| `src/lib/ai/types.ts` | Core types |
| `src/lib/ai/schemas.ts` | Shared Zod schemas |
| `src/lib/ai/validation.ts` | Parse helpers, JSON Schema export |
| `src/lib/ai/registry.ts` | Tool registration and lookup |
| `src/lib/ai/context.ts` | `ToolContext` interface |
| `src/lib/ai/marketDataPort.ts` | Server/client market data adapters |
| `src/lib/ai/tools/*.ts` | Tool implementations by group |
| `src/lib/ai/adapters/*.ts` | In-app, HTTP, MCP adapters |
| `src/app/components/AiToolsProvider.tsx` | React provider |
| `src/app/components/AppActionsContext.tsx` | Layout action facade |
| `src/app/components/watchlist/WatchlistContext.tsx` | Watchlist state provider |
| `src/app/api/ai/tools/route.ts` | Tool listing endpoint |
| `src/app/api/ai/tools/execute/route.ts` | Tool execution endpoint |
| `scripts/edge-mcp-server.mts` | MCP server for external agents |

## Testing

- Unit tests for schema validation and registry behavior
- Tool execution tests against mocked `ToolContext`
- Component tests for context wiring changes
