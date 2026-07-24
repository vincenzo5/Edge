import type { ToolRegistry } from "@edge/ai-tools-core";

import { executeTool } from "../adapters/execute";
import type { ToolContext } from "../context";
import type { ToolResult } from "../types";
import { getModelRef, modelSupportsVision, resolveAllowedModelId } from "../model/allowlist";
import { buildMultimodalContent } from "../model/contentParts";
import type { ModelChatMessage, ModelProvider } from "../model/provider";
import { executeClientSessionTool } from "../sessionBridgeExecute";

import type { AgentStreamEvent, ChatMessage, ChatRequest } from "./contracts";
import {
  attachmentDataUrlsForMessage,
  messageHasUnresolvedAttachments,
  resolveChatAttachmentDataUrls,
} from "./resolveChatAttachments";
import {
  applyAgentDrawingDefaults,
  buildConfirmReason,
  DESTRUCTIVE_TOOL_NAMES,
  toolNeedsConfirmGate,
} from "./confirmGate";
import { mintConfirmationToken } from "../confirmationToken";
import { listAgentToolDefinitions } from "./readTools";
import {
  assemblePromptMessages,
  buildSystemPrompt,
} from "./promptBoundaries";
import { toArtifactHint } from "@/lib/research/artifactHint";
import {
  formatToolResultForModel,
  summarizeToolResult,
} from "./summarizeToolResult";

const MAX_TOOL_ROUNDS = 8;

function toolResultEvent(
  callId: string,
  toolName: string,
  result: ToolResult,
): AgentStreamEvent {
  const summary = summarizeToolResult(toolName, result);
  const artifactHint = result.ok ? toArtifactHint(toolName, result) ?? undefined : undefined;
  return {
    type: "tool-result",
    callId,
    ok: result.ok,
    summary,
    ...(artifactHint ? { artifactHint } : {}),
  };
}

function chatMessagesHaveAttachments(messages: ChatMessage[]): boolean {
  return messages.some((message) => (message.attachments?.length ?? 0) > 0);
}

function toModelMessages(
  systemPrompt: string,
  messages: ChatMessage[],
  resolvedAttachments: Map<string, string>,
): ModelChatMessage[] {
  return [
    { role: "system", content: systemPrompt },
    ...messages.map((message) => ({
      role: message.role,
      content:
        message.role === "user"
          ? buildMultimodalContent(
              message.content,
              attachmentDataUrlsForMessage(message, resolvedAttachments),
            )
          : message.content,
      toolCallId: message.toolCallId,
      toolCalls: message.toolCalls,
    })),
  ];
}

export type OrchestrateChatOptions = {
  request: ChatRequest;
  provider: ModelProvider;
  registry: ToolRegistry<ToolContext>;
  createContext: () => ToolContext;
  env?: NodeJS.ProcessEnv;
  signal?: AbortSignal;
  userId?: string | null;
};

export async function* orchestrateChat(
  options: OrchestrateChatOptions,
): AsyncGenerator<AgentStreamEvent> {
  const env = options.env ?? process.env;
  const modelId = resolveAllowedModelId(options.request.modelId, env);
  const modelRef = getModelRef(modelId);
  if (!modelRef) {
    yield {
      type: "error",
      code: "model_not_allowed",
      message: `Invalid OpenRouter model id: ${modelId}`,
    };
    return;
  }

  const permissionMode = options.request.permissionMode ?? "read";
  const tools = listAgentToolDefinitions(options.registry, permissionMode);
  const systemPrompt = buildSystemPrompt();
  const promptMessages = assemblePromptMessages(
    options.request.workspaceSnapshot,
    options.request.messages,
  );

  const hasAttachments = chatMessagesHaveAttachments(options.request.messages);
  if (hasAttachments && !modelSupportsVision(modelId)) {
    yield {
      type: "error",
      code: "vision_not_supported",
      message: "The selected model does not support image attachments. Choose a vision-capable model.",
    };
    return;
  }

  const resolvedAttachments = hasAttachments
    ? await resolveChatAttachmentDataUrls(options.userId ?? null, options.request.messages)
    : new Map<string, string>();

  if (hasAttachments) {
    for (const message of options.request.messages) {
      if (messageHasUnresolvedAttachments(message, resolvedAttachments)) {
        yield {
          type: "error",
          code: "attachment_not_found",
          message: "One or more attachments could not be loaded. Re-attach the image and try again.",
        };
        return;
      }
    }
  }

  let conversation = toModelMessages(systemPrompt, promptMessages, resolvedAttachments);

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const toolCalls: Array<{
      callId: string;
      name: string;
      arguments: Record<string, unknown>;
      resultContent: string;
    }> = [];
    let finishReason: string | undefined;
    let streamFailed = false;

    for await (const event of options.provider.streamChat({
      model: modelRef,
      messages: conversation,
      tools,
      signal: options.signal,
    })) {
      if (event.type === "text-delta") {
        yield { type: "text-delta", delta: event.delta };
        continue;
      }

      if (event.type === "tool-call") {
        yield {
          type: "tool-call",
          callId: event.callId,
          name: event.name,
          arguments: event.arguments,
        };

        const def = options.registry.get(event.name);
        if (!def) {
          const result = {
            ok: false as const,
            error: `Unknown tool: ${event.name}`,
            code: "not_found" as const,
          };
          yield toolResultEvent(event.callId, event.name, result);
          toolCalls.push({
            callId: event.callId,
            name: event.name,
            arguments: event.arguments,
            resultContent: formatToolResultForModel(result),
          });
          continue;
        }

        if (toolNeedsConfirmGate(def)) {
          const permissionMode =
            def.permission === "destructive" || DESTRUCTIVE_TOOL_NAMES.has(event.name)
              ? "full"
              : "write";
          const confirmationToken =
            mintConfirmationToken({
              toolName: event.name,
              input: event.arguments,
              permissionMode,
            }) ?? undefined;
          yield {
            type: "confirm-required",
            callId: event.callId,
            name: event.name,
            reason: buildConfirmReason(def),
            arguments: event.arguments,
            confirmationToken,
            requiresClientSession: def.requiresClientSession === true,
          };

          const pendingResult = {
            ok: false as const,
            error: `Tool "${event.name}" requires user confirmation`,
            code: "confirmation_required" as const,
          };

          yield toolResultEvent(event.callId, event.name, pendingResult);

          toolCalls.push({
            callId: event.callId,
            name: event.name,
            arguments: event.arguments,
            resultContent: formatToolResultForModel(pendingResult),
          });
          continue;
        }

        const execArgs = applyAgentDrawingDefaults(event.name, event.arguments, {
          threadId: options.request.threadId,
          messageId: options.request.assistantMessageId,
        });
        const execOptions = { permissionMode };

        const result =
          def.requiresClientSession === true
            ? await executeClientSessionTool(
                event.name,
                execArgs,
                execOptions,
                "agent",
              )
            : await executeTool(
                options.registry,
                event.name,
                execArgs,
                options.createContext(),
                execOptions,
              );

        yield toolResultEvent(event.callId, event.name, result);

        toolCalls.push({
          callId: event.callId,
          name: event.name,
          arguments: event.arguments,
          resultContent: formatToolResultForModel(result),
        });
        continue;
      }

      if (event.type === "error") {
        streamFailed = true;
        yield { type: "error", code: event.code, message: event.message };
        continue;
      }

      if (event.type === "done") {
        finishReason = event.finishReason;
      }
    }

    if (streamFailed) return;

    if (toolCalls.length === 0) {
      yield { type: "done", finishReason };
      return;
    }

    conversation = [
      ...conversation,
      {
        role: "assistant",
        content: "",
        toolCalls: toolCalls.map((call) => ({
          id: call.callId,
          name: call.name,
          arguments: call.arguments,
        })),
      },
      ...toolCalls.map((call) => ({
        role: "tool" as const,
        content: call.resultContent,
        toolCallId: call.callId,
      })),
    ];
  }

  yield {
    type: "error",
    code: "max_tool_rounds",
    message: `Maximum tool rounds (${MAX_TOOL_ROUNDS}) exceeded`,
  };
}
