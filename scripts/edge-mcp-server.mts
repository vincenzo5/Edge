#!/usr/bin/env node
/**
 * Edge MCP server — exposes market-data AI tools to Cursor and other MCP clients.
 * Stateful chart/layout tools require a live browser session via the in-app adapter.
 *
 * Usage: npx tsx scripts/edge-mcp-server.mts
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { edgeToolRegistry } from "../src/lib/ai/tools/index.ts";
import { buildMcpToolHandlers, getMcpStartupInfo } from "../src/lib/ai/adapters/mcp.ts";

const startup = getMcpStartupInfo(edgeToolRegistry);
console.error(
  `[edge-mcp] tools=${startup.toolCount} bridge=${startup.bridgeUrl ?? "none"} mode=${startup.permissionMode}`,
);

const handlers = buildMcpToolHandlers(edgeToolRegistry);
const handlerMap = new Map(handlers.map((h) => [h.name, h]));

const server = new Server(
  { name: "edge-ai-tools", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: handlers.map((h) => ({
    name: h.name,
    description: h.description,
    inputSchema: h.inputSchema,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const handler = handlerMap.get(request.params.name);
  if (!handler) {
    return {
      content: [{ type: "text", text: JSON.stringify({ ok: false, error: "Unknown tool" }) }],
      isError: true,
    };
  }
  return handler.handler(request.params.arguments ?? {});
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
