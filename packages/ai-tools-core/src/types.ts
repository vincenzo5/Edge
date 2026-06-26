import type { z } from "zod";
import type { BaseToolContext } from "./context";

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

export type AiTool<TContext extends BaseToolContext = BaseToolContext> = {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  permission: ToolPermission;
  requiresConfirmation: boolean;
  /** When true, tool needs a live browser session context. */
  requiresClientSession?: boolean;
  execute: (input: unknown, context: TContext) => Promise<ToolResult>;
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
export function defineTool<
  TSchema extends z.ZodType,
  TContext extends BaseToolContext = BaseToolContext,
>(
  tool: {
    name: string;
    description: string;
    inputSchema: TSchema;
    permission: ToolPermission;
    requiresConfirmation: boolean;
    requiresClientSession?: boolean;
    execute: (
      input: z.infer<TSchema>,
      context: TContext,
    ) => Promise<ToolResult>;
  },
): AiTool<TContext> {
  return {
    ...tool,
    execute: (input, context) => tool.execute(input as z.infer<TSchema>, context),
  };
}
