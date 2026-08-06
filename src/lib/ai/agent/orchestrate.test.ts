import { describe, expect, it } from "vitest";

import { createToolRegistry } from "../registry";
import { defineTool } from "../types";
import type { ToolContext } from "../context";
import { z } from "zod";

import { orchestrateChat } from "./orchestrate";
import type { ModelProvider, ModelProviderEvent } from "../model/provider";
import { listAgentToolDefinitions, listReadToolDefinitions } from "./readTools";
import { summarizeToolResult } from "./summarizeToolResult";
import {
  completeJob,
  registerHeartbeatForTests,
  resetSessionBridgeForTests,
  waitForJob,
} from "../sessionBridgeStore";

class FakeModelProvider implements ModelProvider {
  readonly kind = "openrouter" as const;

  constructor(private readonly script: ModelProviderEvent[][]) {}

  async *streamChat(): AsyncIterable<ModelProviderEvent> {
    const round = this.script.shift();
    if (!round) {
      yield { type: "done", finishReason: "stop" };
      return;
    }
    for (const event of round) {
      yield event;
    }
  }
}

const echoTool = defineTool({
  name: "echo_read",
  description: "Echo input",
  inputSchema: z.object({ text: z.string() }),
  permission: "read",
  requiresConfirmation: false,
  execute: async (input) => ({ ok: true, data: { echoed: input.text } }),
});

const clientReadTool = defineTool({
  name: "client_only_read",
  description: "Needs browser",
  inputSchema: z.object({}),
  permission: "read",
  requiresConfirmation: false,
  requiresClientSession: true,
  execute: async () => ({ ok: true, data: { ok: true } }),
});

describe("listReadToolDefinitions", () => {
  it("includes read tools regardless of client session requirement", () => {
    const registry = createToolRegistry([echoTool, clientReadTool]);
    const names = listReadToolDefinitions(registry).map((def) => def.name);
    expect(names).toEqual(["echo_read", "client_only_read"]);
  });
});

describe("listAgentToolDefinitions", () => {
  const writeTool = defineTool({
    name: "write_tool",
    description: "write",
    inputSchema: z.object({}),
    permission: "write",
    requiresConfirmation: false,
    execute: async () => ({ ok: true, data: {} }),
  });

  const destructiveTool = defineTool({
    name: "delete_tool",
    description: "delete",
    inputSchema: z.object({}),
    permission: "destructive",
    requiresConfirmation: true,
    execute: async () => ({ ok: true, data: {} }),
  });

  it("includes write and destructive tools in write mode", () => {
    const registry = createToolRegistry([echoTool, writeTool, destructiveTool]);
    const names = listAgentToolDefinitions(registry, "write").map((def) => def.name);
    expect(names).toEqual(["echo_read", "write_tool", "delete_tool"]);
  });
});

describe("summarizeToolResult", () => {
  it("explains missing browser session", () => {
    expect(
      summarizeToolResult("get_app_state", {
        ok: false,
        error: "needs browser",
        code: "requires_client_session",
      }),
    ).toMatch(/requires live browser session/i);
  });

  it("explains confirmation_required", () => {
    expect(
      summarizeToolResult("delete_drawing", {
        ok: false,
        error: "needs confirm",
        code: "confirmation_required",
      }),
    ).toMatch(/awaiting your confirmation/i);
  });
});

describe("orchestrateChat", () => {
  it("streams text and completes without tool calls", async () => {
    const provider = new FakeModelProvider([
      [
        { type: "text-delta", delta: "Hi" },
        { type: "done", finishReason: "stop" },
      ],
    ]);
    const registry = createToolRegistry([echoTool]);
    const context = (): ToolContext => ({ clientSession: false });

    const events = [];
    for await (const event of orchestrateChat({
      request: { messages: [{ role: "user", content: "Hello" }], permissionMode: "read" },
      provider,
      registry,
      createContext: context,
      env: {},
    })) {
      events.push(event);
    }

    expect(events).toEqual([
      { type: "text-delta", delta: "Hi" },
      { type: "done", finishReason: "stop" },
    ]);
  });

  it("executes a server read tool and continues the loop", async () => {
    const provider = new FakeModelProvider([
      [
        {
          type: "tool-call",
          callId: "call_1",
          name: "echo_read",
          arguments: { text: "ping" },
        },
        { type: "done", finishReason: "tool_calls" },
      ],
      [
        { type: "text-delta", delta: "pong" },
        { type: "done", finishReason: "stop" },
      ],
    ]);
    const registry = createToolRegistry([echoTool]);
    const context = (): ToolContext => ({ clientSession: false });

    const events = [];
    for await (const event of orchestrateChat({
      request: { messages: [{ role: "user", content: "Echo ping" }], permissionMode: "read" },
      provider,
      registry,
      createContext: context,
      env: {},
    })) {
      events.push(event);
    }

    expect(events[0]).toEqual({
      type: "tool-call",
      callId: "call_1",
      name: "echo_read",
      arguments: { text: "ping" },
    });
    expect(events[1]).toMatchObject({
      type: "tool-result",
      callId: "call_1",
      ok: true,
    });
    expect(events.at(-1)).toEqual({ type: "done", finishReason: "stop" });
  });

  it("emits confirm-required without executing destructive tools", async () => {
    const destructiveTool = defineTool({
      name: "delete_tool",
      description: "delete",
      inputSchema: z.object({ id: z.string() }),
      permission: "destructive",
      requiresConfirmation: true,
      execute: async () => {
        throw new Error("should not execute");
      },
    });

    const provider = new FakeModelProvider([
      [
        {
          type: "tool-call",
          callId: "call_del",
          name: "delete_tool",
          arguments: { id: "d1" },
        },
        { type: "done", finishReason: "tool_calls" },
      ],
      [{ type: "done", finishReason: "stop" }],
    ]);
    const registry = createToolRegistry([destructiveTool]);
    const context = (): ToolContext => ({ clientSession: false });

    const events = [];
    for await (const event of orchestrateChat({
      request: {
        messages: [{ role: "user", content: "Delete it" }],
        permissionMode: "write",
      },
      provider,
      registry,
      createContext: context,
      env: {},
    })) {
      events.push(event);
    }

    expect(events[0]).toMatchObject({
      type: "tool-call",
      name: "delete_tool",
    });
    expect(events[1]).toMatchObject({
      type: "confirm-required",
      callId: "call_del",
      name: "delete_tool",
    });
    expect(events[2]).toMatchObject({
      type: "tool-result",
      ok: false,
      summary: expect.stringMatching(/awaiting your confirmation/i),
    });
  });

  it("executes write tools without confirm gate in write mode", async () => {
    const writeTool = defineTool({
      name: "write_tool",
      description: "write",
      inputSchema: z.object({ label: z.string() }),
      permission: "write",
      requiresConfirmation: false,
      execute: async (input) => ({ ok: true, data: { label: input.label } }),
    });

    const provider = new FakeModelProvider([
      [
        {
          type: "tool-call",
          callId: "call_w",
          name: "write_tool",
          arguments: { label: "test" },
        },
        { type: "done", finishReason: "tool_calls" },
      ],
      [{ type: "done", finishReason: "stop" }],
    ]);
    const registry = createToolRegistry([writeTool]);
    const context = (): ToolContext => ({ clientSession: false });

    const events = [];
    for await (const event of orchestrateChat({
      request: {
        messages: [{ role: "user", content: "Write" }],
        permissionMode: "write",
      },
      provider,
      registry,
      createContext: context,
      env: {},
    })) {
      events.push(event);
    }

    expect(events[1]).toMatchObject({
      type: "tool-result",
      ok: true,
    });
  });

  it("returns structured failure when browser session is offline", async () => {
    resetSessionBridgeForTests();

    const provider = new FakeModelProvider([
      [
        {
          type: "tool-call",
          callId: "call_client",
          name: "client_only_read",
          arguments: {},
        },
        { type: "done", finishReason: "tool_calls" },
      ],
      [{ type: "done", finishReason: "stop" }],
    ]);
    const registry = createToolRegistry([clientReadTool]);
    const context = (): ToolContext => ({ clientSession: false });

    const events = [];
    for await (const event of orchestrateChat({
      request: { messages: [{ role: "user", content: "State?" }], permissionMode: "read" },
      provider,
      registry,
      createContext: context,
      env: {},
    })) {
      events.push(event);
    }

    expect(events[1]).toEqual({
      type: "tool-result",
      callId: "call_client",
      ok: false,
      summary: expect.stringMatching(/requires live browser session/i),
    });
  });

  it("executes client-session read tools via session bridge when active", async () => {
    resetSessionBridgeForTests();
    registerHeartbeatForTests();

    const provider = new FakeModelProvider([
      [
        {
          type: "tool-call",
          callId: "call_client",
          name: "client_only_read",
          arguments: {},
        },
        { type: "done", finishReason: "tool_calls" },
      ],
      [{ type: "done", finishReason: "stop" }],
    ]);
    const registry = createToolRegistry([clientReadTool]);
    const context = (): ToolContext => ({ clientSession: false });

    const completeBridgeJob = (async () => {
      const job = await waitForJob(5_000);
      expect(job).toMatchObject({ name: "client_only_read" });
      if (job) {
        completeJob(job.jobId, { ok: true, data: { live: true } });
      }
    })();

    const events = [];
    for await (const event of orchestrateChat({
      request: { messages: [{ role: "user", content: "State?" }], permissionMode: "read" },
      provider,
      registry,
      createContext: context,
      env: {},
    })) {
      events.push(event);
    }

    await completeBridgeJob;

    expect(events[1]).toEqual({
      type: "tool-result",
      callId: "call_client",
      ok: true,
      summary: "Done",
    });
  });
});
