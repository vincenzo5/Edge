import type { ToolRegistry } from "@edge/ai-tools-core";

import type { ToolContext } from "../context";
import type { PermissionMode, ToolDefinition } from "../types";

/** Tool definitions exposed to the model for the given permission mode. */
export function listAgentToolDefinitions(
  registry: ToolRegistry<ToolContext>,
  permissionMode: PermissionMode = "read",
): ToolDefinition[] {
  const defs = registry.listDefinitions();
  if (permissionMode === "read") {
    return defs.filter((def) => def.permission === "read");
  }
  // write/full: bind read + write + destructive so the model can propose confirms
  return defs;
}

/** Read-only tool definitions for model binding (includes client-session read tools). */
export function listReadToolDefinitions(
  registry: ToolRegistry<ToolContext>,
): ToolDefinition[] {
  return listAgentToolDefinitions(registry, "read");
}
