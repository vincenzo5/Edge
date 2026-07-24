import "server-only";

import type { ToolDefinition } from "../types";

import { getModelRef } from "./allowlist";
import type {
  ModelChatMessage,
  ModelChatRequest,
  ModelProvider,
  ModelProviderEvent,
} from "./provider";
import { isContentPartArray } from "./contentParts";

const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";

export class OpenRouterMissingKeyError extends Error {
  readonly code = "missing_openrouter_key";

  constructor() {
    super("OPENROUTER_API_KEY is not configured");
    this.name = "OpenRouterMissingKeyError";
  }
}

export function isOpenRouterConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.OPENROUTER_API_KEY?.trim());
}

function getOpenRouterApiKey(env: NodeJS.ProcessEnv = process.env): string {
  const key = env.OPENROUTER_API_KEY?.trim();
  if (!key) throw new OpenRouterMissingKeyError();
  return key;
}

type OpenRouterTool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export function mapToolsToOpenRouter(
  tools: ToolDefinition[] | undefined,
): OpenRouterTool[] | undefined {
  if (!tools?.length) return undefined;
  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  }));
}

export function mapMessagesToOpenRouter(messages: ModelChatMessage[]) {
  return messages.map((message) => {
    if (message.role === "tool") {
      const content = isContentPartArray(message.content)
        ? message.content
            .filter((part) => part.type === "text")
            .map((part) => part.text)
            .join("\n")
        : message.content;
      return {
        role: "tool" as const,
        tool_call_id: message.toolCallId,
        content,
      };
    }

    if (message.role === "assistant" && message.toolCalls?.length) {
      const textContent = isContentPartArray(message.content)
        ? message.content
            .filter((part) => part.type === "text")
            .map((part) => part.text)
            .join("\n")
        : message.content;
      return {
        role: "assistant" as const,
        content: textContent || null,
        tool_calls: message.toolCalls.map((call) => ({
          id: call.id,
          type: "function" as const,
          function: {
            name: call.name,
            arguments: JSON.stringify(call.arguments),
          },
        })),
      };
    }

    return {
      role: message.role,
      content: message.content,
    };
  });
}

type ToolCallAccumulator = {
  id: string;
  name: string;
  arguments: string;
};

type OpenRouterStreamChunk = {
  choices?: Array<{
    finish_reason?: string | null;
    delta?: {
      content?: string | null;
      tool_calls?: Array<{
        index?: number;
        id?: string;
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
  }>;
  error?: {
    code?: number | string;
    message?: string;
  };
};

function parseToolCallArguments(raw: string): Record<string, unknown> {
  if (!raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

function* emitAccumulatedToolCalls(
  toolCallsByIndex: Map<number, ToolCallAccumulator>,
): Generator<ModelProviderEvent> {
  for (const index of [...toolCallsByIndex.keys()].sort((a, b) => a - b)) {
    const acc = toolCallsByIndex.get(index);
    if (!acc?.id || !acc.name) continue;
    yield {
      type: "tool-call",
      callId: acc.id,
      name: acc.name,
      arguments: parseToolCallArguments(acc.arguments),
    };
  }
  toolCallsByIndex.clear();
}

export async function* parseOpenRouterSseStream(
  body: ReadableStream<Uint8Array> | null,
): AsyncGenerator<ModelProviderEvent> {
  if (!body) {
    yield { type: "error", code: "empty_body", message: "OpenRouter returned an empty stream" };
    return;
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const toolCallsByIndex = new Map<number, ToolCallAccumulator>();
  let finishReason: string | undefined;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;

        const payload = trimmed.slice(5).trim();
        if (!payload) continue;

        if (payload === "[DONE]") {
          yield* emitAccumulatedToolCalls(toolCallsByIndex);
          yield { type: "done", finishReason };
          return;
        }

        let chunk: OpenRouterStreamChunk;
        try {
          chunk = JSON.parse(payload) as OpenRouterStreamChunk;
        } catch {
          continue;
        }

        if (chunk.error?.message) {
          yield {
            type: "error",
            code: String(chunk.error.code ?? "openrouter_error"),
            message: chunk.error.message,
          };
          return;
        }

        const choice = chunk.choices?.[0];
        if (!choice) continue;

        const delta = choice.delta;
        if (delta?.content) {
          yield { type: "text-delta", delta: delta.content };
        }

        if (delta?.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            const index = toolCall.index ?? 0;
            const current = toolCallsByIndex.get(index) ?? {
              id: "",
              name: "",
              arguments: "",
            };
            if (toolCall.id) current.id = toolCall.id;
            if (toolCall.function?.name) current.name = toolCall.function.name;
            if (toolCall.function?.arguments) {
              current.arguments += toolCall.function.arguments;
            }
            toolCallsByIndex.set(index, current);
          }
        }

        if (choice.finish_reason) {
          finishReason = choice.finish_reason;
          if (choice.finish_reason === "tool_calls") {
            yield* emitAccumulatedToolCalls(toolCallsByIndex);
          }
        }
      }
    }

    yield* emitAccumulatedToolCalls(toolCallsByIndex);
    yield { type: "done", finishReason };
  } finally {
    reader.releaseLock();
  }
}

export class OpenRouterModelProvider implements ModelProvider {
  readonly kind = "openrouter" as const;

  constructor(private readonly env: NodeJS.ProcessEnv = process.env) {}

  async *streamChat(request: ModelChatRequest): AsyncIterable<ModelProviderEvent> {
    const apiKey = getOpenRouterApiKey(this.env);
    const modelRef = getModelRef(request.model.id);
    if (!modelRef) {
      yield {
        type: "error",
        code: "model_not_allowed",
        message: `Invalid OpenRouter model id: ${request.model.id}`,
      };
      return;
    }

    const referer = this.env.EDGE_PUBLIC_APP_URL?.trim() || "https://edge.local";

    let response: Response;
    try {
      response = await fetch(OPENROUTER_CHAT_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": referer,
          "X-Title": "Edge",
          "X-OpenRouter-Title": "Edge",
        },
        body: JSON.stringify({
          model: request.model.id,
          messages: mapMessagesToOpenRouter(request.messages),
          tools: mapToolsToOpenRouter(request.tools),
          stream: true,
        }),
        signal: request.signal,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "OpenRouter request failed";
      yield { type: "error", code: "openrouter_fetch_error", message };
      return;
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      yield {
        type: "error",
        code: "openrouter_http_error",
        message: `OpenRouter HTTP ${response.status}: ${text.slice(0, 500)}`,
      };
      return;
    }

    yield* parseOpenRouterSseStream(response.body);
  }
}
