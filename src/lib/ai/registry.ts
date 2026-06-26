import type { ToolContext } from "./context";
import {
  ToolRegistry,
  createToolRegistry as createCoreToolRegistry,
} from "@edge/ai-tools-core";
import type { AiTool } from "./types";

export { ToolRegistry };

export function createToolRegistry(tools: AiTool[]): ToolRegistry<ToolContext> {
  return createCoreToolRegistry<ToolContext>(tools);
}
