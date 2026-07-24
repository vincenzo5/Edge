import type { BaseToolContext } from "./context";
import type { ToolRegistry } from "./registry";
import type {
  AiTool,
  ExecuteToolOptions,
  PermissionMode,
  ToolPermission,
  ToolResult,
} from "./types";
import { parseToolInput } from "./validation";

function permissionAllowed(
  toolPermission: ToolPermission,
  mode: PermissionMode,
): boolean {
  if (mode === "full") return true;
  if (mode === "write") return toolPermission !== "destructive";
  return toolPermission === "read";
}

function requiresClientSession<TContext extends BaseToolContext>(
  tool: AiTool<TContext>,
): boolean {
  return tool.requiresClientSession === true;
}

function toolNeedsConfirmation<TContext extends BaseToolContext>(
  tool: AiTool<TContext>,
): boolean {
  return tool.requiresConfirmation || tool.permission === "destructive";
}

function isConfirmationSatisfied<TContext extends BaseToolContext>(
  tool: AiTool<TContext>,
  toolName: string,
  rawInput: unknown,
  permissionMode: PermissionMode,
  options: ExecuteToolOptions,
): boolean {
  if (!toolNeedsConfirmation(tool)) {
    return true;
  }

  if (options.confirmationValidatedByServer) {
    return true;
  }

  if (options.confirmationToken && options.verifyConfirmationToken) {
    return options.verifyConfirmationToken(
      options.confirmationToken,
      toolName,
      rawInput,
      permissionMode,
    );
  }

  return false;
}

export async function executeTool<TContext extends BaseToolContext>(
  registry: ToolRegistry<TContext>,
  toolName: string,
  rawInput: unknown,
  context: TContext,
  options: ExecuteToolOptions = {},
): Promise<ToolResult> {
  const permissionMode = options.permissionMode ?? "read";

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

  if (!isConfirmationSatisfied(tool, toolName, rawInput, permissionMode, options)) {
    return {
      ok: false,
      error: `Tool "${toolName}" requires user confirmation`,
      code: "confirmation_required",
    };
  }

  if (requiresClientSession(tool) && !context.clientSession) {
    return {
      ok: false,
      error: `Tool "${toolName}" requires a live browser session`,
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

export async function executeTools<TContext extends BaseToolContext>(
  registry: ToolRegistry<TContext>,
  calls: Array<{ name: string; input: unknown }>,
  context: TContext,
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
