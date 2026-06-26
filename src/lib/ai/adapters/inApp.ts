import type { ToolContext } from "../context";
import type { ToolRegistry } from "../registry";
import { createInAppAiTools as createCoreInAppAiTools } from "@edge/ai-tools-core";
import type { ExecuteToolOptions, ToolResult } from "../types";

export type InAppAiTools = {
  listTools: () => ReturnType<ToolRegistry<ToolContext>["listDefinitionsForSession"]>;
  execute: (
    toolName: string,
    input: unknown,
    options?: ExecuteToolOptions,
  ) => Promise<ToolResult>;
};

export function createInAppAiTools(
  registry: ToolRegistry<ToolContext>,
  getContext: () => ToolContext,
): InAppAiTools {
  return createCoreInAppAiTools(registry, getContext, "write");
}
