import type { z } from "zod";
import type { ToolContext } from "./context";

export type {
  ToolPermission,
  PermissionMode,
  ToolResult,
  ToolDefinition,
  ExecuteToolOptions,
  SessionJob,
} from "@edge/ai-tools-core";

export type { BaseToolContext } from "@edge/ai-tools-core";

export type AiTool = import("@edge/ai-tools-core").AiTool<ToolContext>;

/** Infer execute input from a Zod schema while keeping Edge ToolContext typing. */
export function defineTool<TSchema extends z.ZodType>(
  tool: {
    name: string;
    description: string;
    inputSchema: TSchema;
    permission: import("@edge/ai-tools-core").ToolPermission;
    requiresConfirmation: boolean;
    requiresClientSession?: boolean;
    execute: (
      input: z.infer<TSchema>,
      context: ToolContext,
    ) => Promise<import("@edge/ai-tools-core").ToolResult>;
  },
): AiTool {
  return {
    ...tool,
    execute: (input, context) => tool.execute(input as z.infer<TSchema>, context),
  };
}
