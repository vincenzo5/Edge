import { z } from "zod";

import { COPILOT_ATTACHMENT_MIME_TYPES } from "@/lib/copilot/attachmentValidation";
import { researchArtifactHintSchema } from "@/lib/research/artifactHint";
import { allowedModelIdSchema } from "../model/allowlist";

const permissionModeSchema = z.enum(["read", "write", "full"]);

export const chatMessageRoleSchema = z.enum(["system", "user", "assistant", "tool"]);

export const chatAttachmentSchema = z.object({
  id: z.string().uuid(),
  mimeType: z.enum(COPILOT_ATTACHMENT_MIME_TYPES),
  /** Ephemeral client payload for dev-lite; stripped from persistence. */
  dataUrl: z.string().max(8_000_000).optional(),
});

export type ChatAttachment = z.infer<typeof chatAttachmentSchema>;

export const chatMessageSchema = z.object({
  role: chatMessageRoleSchema,
  content: z.string().max(8000),
  attachments: z.array(chatAttachmentSchema).max(4).optional(),
  toolCallId: z.string().min(1).optional(),
  toolCalls: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        arguments: z.record(z.string(), z.unknown()),
      }),
    )
    .optional(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(64),
  modelId: allowedModelIdSchema.optional(),
  threadId: z.string().min(1).optional(),
  /** Client-allocated assistant message id for stamping drawing linkage on agent tool calls. */
  assistantMessageId: z.string().min(1).optional(),
  /** Compact workspace context from the client — not full candle history. */
  workspaceSnapshot: z.string().max(4000).optional(),
  permissionMode: permissionModeSchema.default("read"),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const agentStreamEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text-delta"),
    delta: z.string(),
  }),
  z.object({
    type: z.literal("tool-call"),
    callId: z.string().min(1),
    name: z.string().min(1),
    arguments: z.record(z.string(), z.unknown()),
  }),
  z.object({
    type: z.literal("tool-result"),
    callId: z.string().min(1),
    ok: z.boolean(),
    summary: z.string(),
    /** Compact pin payload for Talk artifact cards — not persisted on Copilot threads. */
    artifactHint: researchArtifactHintSchema.optional(),
  }),
  z.object({
    type: z.literal("confirm-required"),
    callId: z.string().min(1),
    name: z.string().min(1),
    reason: z.string().min(1),
    arguments: z.record(z.string(), z.unknown()).optional(),
    confirmationToken: z.string().min(1).optional(),
    requiresClientSession: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("error"),
    code: z.string().min(1),
    message: z.string().min(1),
  }),
  z.object({
    type: z.literal("done"),
    finishReason: z.string().optional(),
  }),
]);

export type AgentStreamEvent = z.infer<typeof agentStreamEventSchema>;

export function parseChatRequest(value: unknown): ChatRequest {
  return chatRequestSchema.parse(value);
}

export function parseAgentStreamEvent(value: unknown): AgentStreamEvent {
  return agentStreamEventSchema.parse(value);
}

export { AGENT_OWNS, REGISTRY_OWNS } from "./ownership";
export type { AgentOwnership, RegistryOwnership } from "./ownership";
