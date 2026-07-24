import type { ExecuteToolOptions, ToolPermission } from "../types";
import type { AiTool } from "../types";

/** Tool names that require `permissionMode: full` when user confirms in chat. */
export const DESTRUCTIVE_TOOL_NAMES = new Set([
  "delete_drawing",
  "delete_indicator_script",
  "delete_alert",
  "delete_watchlist",
  "clear_watchlist",
  "place_order",
  "attach_playbook",
  "save_pattern_capture",
]);

export function toolNeedsConfirmGate(tool: AiTool): boolean {
  return tool.requiresConfirmation || tool.permission === "destructive";
}

export function buildConfirmReason(tool: AiTool): string {
  if (tool.name === "place_order") {
    return "Submit this order? Live orders also require liveConfirmation: LIVE in the tool input — never assume silent execution.";
  }
  if (tool.name === "attach_playbook") {
    return "Attach this management playbook? It will arm post-fill manage rules through TradingService. Live attach requires liveConfirmation: LIVE — never assume silent execution.";
  }
  if (tool.permission === "destructive") {
    return `Confirm destructive action: ${tool.name}`;
  }
  if (tool.requiresConfirmation) {
    return `Confirm: ${tool.name}`;
  }
  return `Confirm: ${tool.name}`;
}

export function resolveConfirmExecuteOptions(
  toolName: string,
  permission: ToolPermission | undefined,
  confirmationToken: string,
): ExecuteToolOptions {
  const mode =
    permission === "destructive" || DESTRUCTIVE_TOOL_NAMES.has(toolName)
      ? "full"
      : "write";
  return { permissionMode: mode, confirmationToken };
}

export type AgentDrawingLinkage = {
  threadId?: string;
  messageId?: string;
};

export function applyAgentDrawingDefaults(
  toolName: string,
  args: Record<string, unknown>,
  linkage?: AgentDrawingLinkage,
): Record<string, unknown> {
  if (toolName !== "add_drawing" && toolName !== "update_drawing") return args;

  const rawMetadata = args.metadata;
  const metadata =
    rawMetadata && typeof rawMetadata === "object" && !Array.isArray(rawMetadata)
      ? { ...(rawMetadata as Record<string, unknown>) }
      : toolName === "update_drawing"
        ? undefined
        : {};

  if (!metadata) return args;

  const nextMetadata: Record<string, unknown> = {
    ...metadata,
  };

  if (toolName === "add_drawing") {
    nextMetadata.source = metadata.source ?? "ai";
    nextMetadata.status = metadata.status ?? "proposed";
  }

  if (linkage?.threadId && !nextMetadata.threadId) {
    nextMetadata.threadId = linkage.threadId;
  }
  if (linkage?.messageId && !nextMetadata.messageId) {
    nextMetadata.messageId = linkage.messageId;
  }

  return {
    ...args,
    metadata: nextMetadata,
  };
}
