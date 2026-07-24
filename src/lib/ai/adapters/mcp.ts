import type { ToolRegistry } from "../registry";
import { executeTool } from "./execute";
import type {
  ExecuteToolOptions,
  PermissionMode,
  ToolDefinition,
  ToolResult,
} from "../types";
import type { ToolContext } from "../context";
import { createConfirmationVerifier } from "../confirmationToken";

export type McpToolHandler = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: unknown) => Promise<{ content: Array<{ type: "text"; text: string }> }>;
};

const VALID_MODES = new Set<PermissionMode>(["read", "write", "full"]);

function resolveMcpOptions(
  options: ExecuteToolOptions = {},
): ExecuteToolOptions {
  const envMode = process.env.EDGE_PERMISSION_MODE;
  const permissionMode =
    options.permissionMode ??
    (typeof envMode === "string" && VALID_MODES.has(envMode as PermissionMode)
      ? (envMode as PermissionMode)
      : "read");

  const resolved: ExecuteToolOptions = {
    permissionMode,
    confirmationToken: options.confirmationToken,
  };
  if (options.confirmationToken) {
    resolved.verifyConfirmationToken = createConfirmationVerifier();
  }
  return resolved;
}

function getBridgeAppUrl(): string | null {
  const url = process.env.EDGE_APP_URL?.trim();
  return url ? url.replace(/\/$/, "") : null;
}

async function forwardToSessionBridge(
  appUrl: string,
  name: string,
  args: unknown,
  options: ExecuteToolOptions,
): Promise<ToolResult> {
  try {
    const res = await fetch(`${appUrl}/api/ai/session/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.EDGE_API_KEY?.trim()
          ? { "X-Edge-Api-Key": process.env.EDGE_API_KEY.trim() }
          : {}),
      },
      body: JSON.stringify({
        name,
        input: args ?? {},
        permissionMode: options.permissionMode,
        confirmationToken: options.confirmationToken,
      }),
    });

    const json = (await res.json()) as ToolResult;
    if (json && typeof json === "object" && "ok" in json) {
      return json;
    }

    return {
      ok: false,
      error: "Invalid response from session bridge",
      code: "execution",
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Session bridge request failed";
    return {
      ok: false,
      error: message,
      code: "execution",
    };
  }
}

function toMcpContent(result: ToolResult) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
  };
}

export type McpToolCallLog = {
  ts: string;
  event: "mcp.tool";
  tool: string;
  ok: boolean;
  code?: string;
  durationMs: number;
  bridge: boolean;
};

/** Structured stderr log for local MCP debugging (no args/results/secrets). */
export function logMcpToolCall(entry: Omit<McpToolCallLog, "ts" | "event">): void {
  const line: McpToolCallLog = {
    ts: new Date().toISOString(),
    event: "mcp.tool",
    ...entry,
  };
  if (line.ok) {
    delete line.code;
  }
  console.error(JSON.stringify(line));
}

let serverToolContextPromise: Promise<ToolContext> | null = null;

async function getServerToolContext(): Promise<ToolContext> {
  if (!serverToolContextPromise) {
    serverToolContextPromise = import("./http").then(({ createServerToolContext }) =>
      createServerToolContext(),
    );
  }
  return serverToolContextPromise;
}

/** Build MCP-compatible tool handlers using the shared registry. */
export function buildMcpToolHandlers(
  registry: ToolRegistry,
  options: ExecuteToolOptions = {},
): McpToolHandler[] {
  const resolvedOptions = resolveMcpOptions(options);
  const bridgeUrl = getBridgeAppUrl();
  const definitions = registry.listDefinitionsForSession(Boolean(bridgeUrl));

  return definitions.map((def) => ({
    name: def.name,
    description: def.description,
    inputSchema: def.inputSchema,
    handler: async (args: unknown) => {
      const useBridge = Boolean(def.requiresClientSession && bridgeUrl);
      const t0 = Date.now();
      let result: ToolResult;

      try {
        if (useBridge) {
          result = await forwardToSessionBridge(
            bridgeUrl!,
            def.name,
            args,
            resolvedOptions,
          );
        } else {
          const context = await getServerToolContext();
          result = await executeTool(
            registry,
            def.name,
            args,
            context,
            resolvedOptions,
          );
        }
      } catch (err) {
        result = {
          ok: false,
          error: err instanceof Error ? err.message : "Tool execution failed",
          code: "execution",
        };
      }

      logMcpToolCall({
        tool: def.name,
        ok: result.ok,
        code: result.ok ? undefined : result.code,
        durationMs: Date.now() - t0,
        bridge: useBridge,
      });

      return toMcpContent(result);
    },
  }));
}

export function listMcpToolDefinitions(registry: ToolRegistry): ToolDefinition[] {
  return registry.listDefinitionsForSession(Boolean(getBridgeAppUrl()));
}

export function getMcpStartupInfo(registry: ToolRegistry): {
  bridgeUrl: string | null;
  permissionMode: PermissionMode;
  toolCount: number;
} {
  const bridgeUrl = getBridgeAppUrl();
  const resolved = resolveMcpOptions();
  return {
    bridgeUrl,
    permissionMode: resolved.permissionMode ?? "read",
    toolCount: registry.listDefinitionsForSession(Boolean(bridgeUrl)).length,
  };
}
