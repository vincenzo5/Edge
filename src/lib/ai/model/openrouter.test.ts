import { describe, expect, it } from "vitest";

import {
  mapMessagesToOpenRouter,
  mapToolsToOpenRouter,
  parseOpenRouterSseStream,
} from "./openrouter";

describe("mapToolsToOpenRouter", () => {
  it("maps registry tool definitions to OpenAI function tools", () => {
    const tools = mapToolsToOpenRouter([
      {
        name: "search_symbols",
        description: "Search symbols",
        permission: "read",
        requiresConfirmation: false,
        requiresClientSession: false,
        inputSchema: {
          type: "object",
          properties: { query: { type: "string" } },
        },
      },
    ]);

    expect(tools).toEqual([
      {
        type: "function",
        function: {
          name: "search_symbols",
          description: "Search symbols",
          parameters: {
            type: "object",
            properties: { query: { type: "string" } },
          },
        },
      },
    ]);
  });

  it("returns undefined when no tools are bound", () => {
    expect(mapToolsToOpenRouter(undefined)).toBeUndefined();
    expect(mapToolsToOpenRouter([])).toBeUndefined();
  });
});

describe("mapMessagesToOpenRouter", () => {
  it("maps assistant tool calls and tool role messages", () => {
    expect(
      mapMessagesToOpenRouter([
        { role: "user", content: "Find NVDA" },
        {
          role: "assistant",
          content: "",
          toolCalls: [{ id: "call_1", name: "search_symbols", arguments: { query: "NVDA" } }],
        },
        { role: "tool", content: '{"symbols":[]}', toolCallId: "call_1" },
      ]),
    ).toEqual([
      { role: "user", content: "Find NVDA" },
      {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_1",
            type: "function",
            function: { name: "search_symbols", arguments: '{"query":"NVDA"}' },
          },
        ],
      },
      { role: "tool", tool_call_id: "call_1", content: '{"symbols":[]}' },
    ]);
  });

  it("maps multimodal user content to OpenRouter image parts", () => {
    expect(
      mapMessagesToOpenRouter([
        {
          role: "user",
          content: [
            { type: "text", text: "What is this?" },
            { type: "image_url", image_url: { url: "data:image/png;base64,abc" } },
          ],
        },
      ]),
    ).toEqual([
      {
        role: "user",
        content: [
          { type: "text", text: "What is this?" },
          { type: "image_url", image_url: { url: "data:image/png;base64,abc" } },
        ],
      },
    ]);
  });
});

describe("parseOpenRouterSseStream", () => {
  async function collectEvents(chunks: string[]) {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(new TextEncoder().encode(chunk));
        }
        controller.close();
      },
    });

    const events = [];
    for await (const event of parseOpenRouterSseStream(stream)) {
      events.push(event);
    }
    return events;
  }

  it("parses text deltas and terminal done", async () => {
    const events = await collectEvents([
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
      'data: {"choices":[{"finish_reason":"stop"}]}\n\n',
      "data: [DONE]\n\n",
    ]);

    expect(events).toEqual([
      { type: "text-delta", delta: "Hello" },
      { type: "done", finishReason: "stop" },
    ]);
  });

  it("accumulates streamed tool calls and emits them on tool_calls finish", async () => {
    const events = await collectEvents([
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","function":{"name":"search_symbols","arguments":"{\\"query\\":"}}]}}]}\n\n',
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"\\"NVDA\\"}"}}]}}]}\n\n',
      'data: {"choices":[{"finish_reason":"tool_calls"}]}\n\n',
      "data: [DONE]\n\n",
    ]);

    expect(events).toEqual([
      {
        type: "tool-call",
        callId: "call_1",
        name: "search_symbols",
        arguments: { query: "NVDA" },
      },
      { type: "done", finishReason: "tool_calls" },
    ]);
  });

  it("surfaces provider error payloads", async () => {
    const events = await collectEvents([
      'data: {"error":{"code":401,"message":"Invalid API key"}}\n\n',
    ]);

    expect(events).toEqual([
      { type: "error", code: "401", message: "Invalid API key" },
    ]);
  });
});
