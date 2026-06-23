import type { z } from "zod";
import type { ToolContext } from "./context";

export type ToolPermission = "read" | "write" | "destructive";

export type PermissionMode = "read" | "write" | "full";

export type ToolResult<T = unknown> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: string;
      code?:
        | "validation"
        | "not_found"
        | "permission_denied"
        | "confirmation_required"
        | "requires_client_session"
        | "execution";
    };

export type AiTool = {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  permission: ToolPermission;
  requiresConfirmation: boolean;
  /** When true, tool needs a live browser ToolContext (layout/chart/watchlist). */
  requiresClientSession?: boolean;
  execute: (input: unknown, context: ToolContext) => Promise<ToolResult>;
};

export type ToolDefinition = {
  name: string;
  description: string;
  permission: ToolPermission;
  requiresConfirmation: boolean;
  requiresClientSession: boolean;
  inputSchema: Record<string, unknown>;
};

export type ExecuteToolOptions = {
  permissionMode?: PermissionMode;
  confirmed?: boolean;
};

export type SessionJob = {
  jobId: string;
  name: string;
  input: unknown;
  permissionMode: PermissionMode;
  confirmed: boolean;
  enqueuedAt: number;
};

/** Infer execute input from a Zod schema while keeping a uniform AiTool type. */
export function defineTool<TSchema extends z.ZodType>(
  tool: {
    name: string;
    description: string;
    inputSchema: TSchema;
    permission: ToolPermission;
    requiresConfirmation: boolean;
    requiresClientSession?: boolean;
    execute: (
      input: z.infer<TSchema>,
      context: ToolContext,
    ) => Promise<ToolResult>;
  },
): AiTool {
  return {
    ...tool,
    execute: (input, context) => tool.execute(input as z.infer<TSchema>, context),
  };
}
