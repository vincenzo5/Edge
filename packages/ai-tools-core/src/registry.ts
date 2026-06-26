import type { BaseToolContext } from "./context";
import type { AiTool, ToolDefinition } from "./types";
import { toToolDefinition } from "./validation";

export class ToolRegistry<TContext extends BaseToolContext = BaseToolContext> {
  private tools = new Map<string, AiTool<TContext>>();

  register(tool: AiTool<TContext>): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }
    this.tools.set(tool.name, tool);
  }

  registerAll(tools: AiTool<TContext>[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  get(name: string): AiTool<TContext> | undefined {
    return this.tools.get(name);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  list(): AiTool<TContext>[] {
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

export function createToolRegistry<TContext extends BaseToolContext = BaseToolContext>(
  tools: AiTool<TContext>[],
): ToolRegistry<TContext> {
  const registry = new ToolRegistry<TContext>();
  registry.registerAll(tools);
  return registry;
}
