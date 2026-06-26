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
                    └── MarketDataPort (search, candles, quotes)
```

## Key Modules

| Module | Role |
|--------|------|
| `registry.ts` | Tool registration and lookup |
| `tools/index.ts` | Aggregates all tool groups into `edgeToolRegistry` |
| `tools/*.ts` | Implementations: chart, marketData, indicators, drawings, watchlist, workflow |
| `context.ts` | `ToolContext` interface — adapter boundary |
| `validation.ts` | Parse helpers, JSON Schema export |
| `schemas.ts` | Shared Zod schemas |
| `adapters/inApp.ts` | React provider execution |
| `adapters/http.ts` | REST endpoint execution |
| `adapters/mcp.ts` | MCP server execution |
| `sessionBridge.ts` | Client session bridge for stateful tools |

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
| `full` | All tools when `confirmed: true` for destructive ops |

External agents (HTTP/MCP) default to `read` unless session grants write access.

## Invariants

- Tools MUST NOT import React — use `ToolContext` facades only.
- All inputs MUST pass Zod validation before execution.
- Destructive tools (`delete_drawing`, `clear_watchlist`, `delete_watchlist`) require confirmation.
- Server-side tools (market data) run without browser session; client-state tools return `requiresClientSession` error when no session.
- When `layout.linkSymbol` or `layout.linkInterval` is on, matching fields propagate to peer cells; crosshair sync uses `layout.linkCrosshair`; drawing sync uses `layout.linkDrawings`.

## Server vs Client Split

| Runs server-side | Requires client session |
|------------------|------------------------|
| `search_symbols`, `get_candles`, `get_quotes`, `get_fundamentals` | `set_symbol`, `add_indicator`, `add_drawing`, layout mutators |

## Verification

```bash
npm test -- --run src/lib/ai/
npm test -- --run src/app/api/ai/tools/route.test.ts
```

## Related Docs

- [docs/ai-tools-architecture.md](../../../docs/ai-tools-architecture.md) — full design and tool inventory
- [docs/chart/rich-annotations-vision.md](../../../docs/chart/rich-annotations-vision.md) — annotation metadata direction
