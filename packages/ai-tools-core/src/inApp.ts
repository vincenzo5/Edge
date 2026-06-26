import type { BaseToolContext } from "./context";
import type { ToolRegistry } from "./registry";
import { executeTool } from "./execute";
import type { ExecuteToolOptions, ToolResult } from "./types";

export type InAppAiTools<TContext extends BaseToolContext> = {
  listTools: () => ReturnType<ToolRegistry<TContext>["listDefinitionsForSession"]>;
  execute: (
    toolName: string,
    input: unknown,
    options?: ExecuteToolOptions,
  ) => Promise<ToolResult>;
};

export function createInAppAiTools<TContext extends BaseToolContext>(
  registry: ToolRegistry<TContext>,
  getContext: () => TContext,
  defaultPermissionMode: ExecuteToolOptions["permissionMode"] = "write",
): InAppAiTools<TContext> {
  return {
    listTools: () => registry.listDefinitionsForSession(true),
    execute: (toolName, input, options) =>
      executeTool(registry, toolName, input, getContext(), {
        permissionMode: options?.permissionMode ?? defaultPermissionMode,
        confirmed: options?.confirmed ?? false,
      }),
  };
}
