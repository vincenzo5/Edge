import { z } from "zod";

import { COPILOT_ATTACHMENT_MIME_TYPES } from "@/lib/copilot/attachmentValidation";

export const copilotAttachmentSourceSchema = z.enum(["upload", "paste", "chart_capture"]);

export const copilotAttachmentResponseSchema = z.object({
  id: z.string().uuid(),
  mimeType: z.enum(COPILOT_ATTACHMENT_MIME_TYPES),
  byteSize: z.number().int().positive(),
  name: z.string().nullable(),
  source: copilotAttachmentSourceSchema,
  createdAt: z.string().datetime(),
});

export const persistedCopilotAttachmentRefSchema = z.object({
  id: z.string().uuid(),
  mimeType: z.enum(COPILOT_ATTACHMENT_MIME_TYPES),
  name: z.string().nullable().optional(),
  source: copilotAttachmentSourceSchema.optional(),
});

export type CopilotAttachmentResponse = z.infer<typeof copilotAttachmentResponseSchema>;
export type PersistedCopilotAttachmentRef = z.infer<typeof persistedCopilotAttachmentRefSchema>;
