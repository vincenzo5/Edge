import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ToolRegistry, createToolRegistry } from "./registry";
import { parseToolInput, toToolDefinition } from "./validation";
import type { AiTool } from "./types";

describe("ToolRegistry", () => {
  const sampleTool: AiTool = {
    name: "test_tool",
    description: "A test tool",
    inputSchema: z.object({ value: z.string() }),
    permission: "read",
    requiresConfirmation: false,
    execute: async (input) => ({ ok: true, data: input }),
  };

  it("registers and retrieves tools", () => {
    const registry = new ToolRegistry();
    registry.register(sampleTool);
    expect(registry.has("test_tool")).toBe(true);
    expect(registry.get("test_tool")?.name).toBe("test_tool");
  });

  it("rejects duplicate registration", () => {
    const registry = createToolRegistry([sampleTool]);
    expect(() => registry.register(sampleTool)).toThrow(/already registered/);
  });

  it("lists tool definitions with JSON schema", () => {
    const registry = createToolRegistry([sampleTool]);
    const defs = registry.listDefinitions();
    expect(defs).toHaveLength(1);
    expect(defs[0].name).toBe("test_tool");
    expect(defs[0].inputSchema).toBeTypeOf("object");
  });
});

describe("parseToolInput", () => {
  it("returns parsed data for valid input", () => {
    const schema = z.object({ count: z.number() });
    const result = parseToolInput(schema, { count: 3 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.count).toBe(3);
  });

  it("returns structured errors for invalid input", () => {
    const schema = z.object({ count: z.number() });
    const result = parseToolInput(schema, { count: "bad" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });
});

describe("toToolDefinition", () => {
  it("includes permission metadata", () => {
    const def = toToolDefinition({
      name: "delete_thing",
      description: "Deletes",
      permission: "destructive",
      requiresConfirmation: true,
      requiresClientSession: true,
      inputSchema: z.object({}),
    });
    expect(def.permission).toBe("destructive");
    expect(def.requiresConfirmation).toBe(true);
    expect(def.requiresClientSession).toBe(true);
  });
});
