import { z } from "zod";

import { allowedModelIdSchema } from "@/lib/ai/model/allowlist";
import { writeRequestBaseSchema, SCHEMA_VERSION } from "@/lib/persistence/common";
import { persistedCopilotAttachmentRefSchema } from "@/lib/persistence/schemas/copilotAttachments";

export const copilotToolStepStatusSchema = z.enum([
  "running",
  "done",
  "error",
  "pending-confirm",
  "rejected",
]);

export const persistedCopilotToolStepSchema = z.object({
  callId: z.string().min(1),
  name: z.string().min(1),
  status: copilotToolStepStatusSchema,
  summary: z.string().optional(),
  confirmReason: z.string().optional(),
});

export const persistedCopilotMessageStatusSchema = z.enum([
  "streaming",
  "done",
  "error",
  "cancelled",
]);

export const persistedCopilotMessageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  attachments: z.array(persistedCopilotAttachmentRefSchema).max(4).optional(),
  toolSteps: z.array(persistedCopilotToolStepSchema).max(200),
  status: persistedCopilotMessageStatusSchema.optional(),
  error: z.string().optional(),
});

export const copilotThreadMessagesSchema = z.array(persistedCopilotMessageSchema).max(500);

export type PersistedCopilotMessage = z.infer<typeof persistedCopilotMessageSchema>;
export type PersistedCopilotToolStep = z.infer<typeof persistedCopilotToolStepSchema>;

export const copilotThreadResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
  schemaVersion: z.literal(SCHEMA_VERSION),
  syncRevision: z.number().int().positive(),
  updatedAt: z.string().datetime(),
  messages: copilotThreadMessagesSchema,
  modelId: allowedModelIdSchema.optional(),
});

export const copilotThreadSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
  schemaVersion: z.literal(SCHEMA_VERSION),
  syncRevision: z.number().int().positive(),
  updatedAt: z.string().datetime(),
  messageCount: z.number().int().nonnegative(),
  modelId: allowedModelIdSchema.optional(),
});

export const copilotThreadListResponseSchema = z.object({
  threads: z.array(copilotThreadSummarySchema),
});

export const copilotThreadCreateSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(120).optional(),
  messages: copilotThreadMessagesSchema.optional(),
  modelId: allowedModelIdSchema.optional(),
});

export const copilotThreadWriteSchema = writeRequestBaseSchema.extend({
  title: z.string().trim().min(1).max(120).optional(),
  messages: copilotThreadMessagesSchema,
  modelId: allowedModelIdSchema.optional(),
});

export type CopilotThreadResponse = z.infer<typeof copilotThreadResponseSchema>;
export type CopilotThreadSummary = z.infer<typeof copilotThreadSummarySchema>;
