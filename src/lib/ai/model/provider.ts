import type { ToolDefinition } from "../types";

import type { ModelRef } from "./types";
import type { ModelMessageContent } from "./contentParts";

/** Minimal chat message shape for model providers (Phase 1 orchestrator). */
export type ModelChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: ModelMessageContent;
  /** Present when role is "tool" — links back to the assistant tool call. */
  toolCallId?: string;
  /** Present when role is "assistant" and the model emitted tool calls. */
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
};

/** Provider-native stream events; mapped to agent wire events in Phase 1. */
export type ModelProviderEvent =
  | { type: "text-delta"; delta: string }
  | {
      type: "tool-call";
      callId: string;
      name: string;
      arguments: Record<string, unknown>;
    }
  | { type: "done"; finishReason?: string }
  | { type: "error"; code: string; message: string };

export type ModelChatRequest = {
  model: ModelRef;
  messages: ModelChatMessage[];
  /** JSON Schema tool definitions exported from the registry — not redefined here. */
  tools?: ToolDefinition[];
  signal?: AbortSignal;
};

/**
 * Server-side model gateway boundary. Phase 0 defines the interface only;
 * OpenRouter implementation lands in Phase 1.
 */
export interface ModelProvider {
  readonly kind: ModelRef["provider"];
  streamChat(request: ModelChatRequest): AsyncIterable<ModelProviderEvent>;
}
