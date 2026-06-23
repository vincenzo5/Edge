import type { ToolContext } from "../context";
import type { ToolRegistry } from "../registry";
import { executeTool } from "./execute";
import type { ExecuteToolOptions, ToolResult } from "../types";

export type InAppAiTools = {
  listTools: () => ReturnType<ToolRegistry["listDefinitionsForSession"]>;
  execute: (
    toolName: string,
    input: unknown,
    options?: ExecuteToolOptions,
  ) => Promise<ToolResult>;
};

export function createInAppAiTools(
  registry: ToolRegistry,
  getContext: () => ToolContext,
): InAppAiTools {
  return {
    listTools: () => registry.listDefinitionsForSession(true),
    execute: (toolName, input, options) =>
      executeTool(registry, toolName, input, getContext(), {
        permissionMode: options?.permissionMode ?? "write",
        confirmed: options?.confirmed ?? false,
      }),
  };
}
