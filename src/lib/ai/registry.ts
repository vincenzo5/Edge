import type { AiTool, ToolDefinition } from "./types";
import { toToolDefinition } from "./validation";

export class ToolRegistry {
  private tools = new Map<string, AiTool>();

  register(tool: AiTool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }
    this.tools.set(tool.name, tool);
  }

  registerAll(tools: AiTool[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  get(name: string): AiTool | undefined {
    return this.tools.get(name);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  list(): AiTool[] {
    return Array.from(this.tools.values());
  }

  listDefinitions(): ToolDefinition[] {
    return this.list().map((tool) => toToolDefinition(tool));
  }

  listDefinitionsForSession(clientSession: boolean): ToolDefinition[] {
    return this.listDefinitions().filter(
      (def) => !def.requiresClientSession || clientSession,
    );
  }
}

export function createToolRegistry(tools: AiTool[]): ToolRegistry {
  const registry = new ToolRegistry();
  registry.registerAll(tools);
  return registry;
}
