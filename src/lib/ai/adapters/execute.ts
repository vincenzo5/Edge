import type { ToolContext } from "../context";
import type { ToolRegistry } from "../registry";
import type {
  AiTool,
  ExecuteToolOptions,
  PermissionMode,
  ToolPermission,
  ToolResult,
} from "../types";
import { parseToolInput } from "../validation";

function permissionAllowed(
  toolPermission: ToolPermission,
  mode: PermissionMode,
): boolean {
  if (mode === "full") return true;
  if (mode === "write") return toolPermission !== "destructive";
  return toolPermission === "read";
}

function requiresClientSession(tool: AiTool): boolean {
  return tool.requiresClientSession === true;
}

export async function executeTool(
  registry: ToolRegistry,
  toolName: string,
  rawInput: unknown,
  context: ToolContext,
  options: ExecuteToolOptions = {},
): Promise<ToolResult> {
  const permissionMode = options.permissionMode ?? "read";
  const confirmed = options.confirmed ?? false;

  const tool = registry.get(toolName);
  if (!tool) {
    return { ok: false, error: `Unknown tool: ${toolName}`, code: "not_found" };
  }

  if (!permissionAllowed(tool.permission, permissionMode)) {
    return {
      ok: false,
      error: `Permission denied for tool "${toolName}" in mode "${permissionMode}"`,
      code: "permission_denied",
    };
  }

  if (tool.requiresConfirmation && !confirmed) {
    return {
      ok: false,
      error: `Tool "${toolName}" requires user confirmation`,
      code: "confirmation_required",
    };
  }

  if (requiresClientSession(tool) && !context.clientSession) {
    return {
      ok: false,
      error: `Tool "${toolName}" requires a live Edge browser session`,
      code: "requires_client_session",
    };
  }

  const parsed = parseToolInput(tool.inputSchema, rawInput);
  if (!parsed.ok) {
    const detail = parsed.errors.map((e) => `${e.path}: ${e.message}`).join("; ");
    return {
      ok: false,
      error: `Invalid input for "${toolName}": ${detail}`,
      code: "validation",
    };
  }

  try {
    return await tool.execute(parsed.data, context);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tool execution failed";
    return { ok: false, error: message, code: "execution" };
  }
}

export async function executeTools(
  registry: ToolRegistry,
  calls: Array<{ name: string; input: unknown }>,
  context: ToolContext,
  options: ExecuteToolOptions = {},
): Promise<Array<{ name: string; result: ToolResult }>> {
  const results: Array<{ name: string; result: ToolResult }> = [];
  for (const call of calls) {
    const result = await executeTool(
      registry,
      call.name,
      call.input,
      context,
      options,
    );
    results.push({ name: call.name, result });
  }
  return results;
}
