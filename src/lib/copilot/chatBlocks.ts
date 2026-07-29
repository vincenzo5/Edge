import { z } from "zod";

import { COPILOT_ATTACHMENT_MIME_TYPES } from "@/lib/copilot/attachmentValidation";
import { researchArtifactHintSchema } from "@/lib/research/artifactHint";

/** In-thread block kinds — prose markdown is NOT a block; Context is NOT a block. */
export const CHAT_BLOCK_KINDS = [
  "trace",
  "media",
  "data",
  "action",
  "reference",
  "followups",
] as const;

export type ChatBlockKind = (typeof CHAT_BLOCK_KINDS)[number];

export const CHAT_BLOCK_MAX_DATA_COLUMNS = 12;
export const CHAT_BLOCK_MAX_DATA_ROWS = 40;
export const CHAT_BLOCK_MAX_KV_ENTRIES = 24;
export const CHAT_BLOCK_MAX_ACTION_SUMMARY_ROWS = 12;
export const CHAT_BLOCK_MAX_REFERENCE_CHIPS = 8;
export const CHAT_BLOCK_MAX_FOLLOWUPS = 6;
export const CHAT_BLOCK_MAX_TRACE_STEPS = 32;

const copilotToolStepStatusSchema = z.enum([
  "running",
  "done",
  "error",
  "pending-confirm",
  "rejected",
]);

const traceStepRefSchema = z.object({
  callId: z.string().min(1),
  name: z.string().min(1),
  status: copilotToolStepStatusSchema,
  summary: z.string().max(500).optional(),
});

export const traceChatBlockSchema = z.object({
  kind: z.literal("trace"),
  steps: z.array(traceStepRefSchema).max(CHAT_BLOCK_MAX_TRACE_STEPS),
});

const mediaChatBlockSchema = z
  .object({
    kind: z.literal("media"),
    src: z.string().min(1).max(8_000_000).optional(),
    mimeType: z.enum(COPILOT_ATTACHMENT_MIME_TYPES).optional(),
    caption: z.string().trim().max(240).optional(),
    openLabel: z.string().trim().max(40).optional(),
    openHref: z.string().min(1).max(2048).optional(),
    /** Compact pin bridge — in-memory only; not persisted on Copilot thread rows. */
    pinHint: researchArtifactHintSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.src && !value.mimeType) {
      ctx.addIssue({
        code: "custom",
        message: "mimeType is required when src is set",
        path: ["mimeType"],
      });
    }
    if (value.mimeType && !value.src) {
      ctx.addIssue({
        code: "custom",
        message: "src is required when mimeType is set",
        path: ["src"],
      });
    }
    if (!value.src && !value.caption?.trim() && !value.pinHint) {
      ctx.addIssue({
        code: "custom",
        message: "media block requires src, caption, or pinHint",
        path: ["caption"],
      });
    }
  });

const dataTableColumnSchema = z.object({
  id: z.string().min(1).max(32),
  label: z.string().trim().max(80),
});

const dataTableRowSchema = z.record(z.string().max(32), z.string().max(240));

export const dataKvEntrySchema = z.object({
  key: z.string().trim().min(1).max(80),
  value: z.string().trim().max(500),
});

export const actionSummaryRowSchema = dataKvEntrySchema;

export const dataChatBlockSchema = z.object({
  kind: z.literal("data"),
  shape: z.enum(["table", "kv"]),
  title: z.string().trim().max(120).optional(),
  columns: z.array(dataTableColumnSchema).max(CHAT_BLOCK_MAX_DATA_COLUMNS).optional(),
  rows: z.array(dataTableRowSchema).max(CHAT_BLOCK_MAX_DATA_ROWS).optional(),
  entries: z.array(dataKvEntrySchema).max(CHAT_BLOCK_MAX_KV_ENTRIES).optional(),
  /** Compact pin bridge — in-memory only; not persisted on Copilot thread rows. */
  pinHint: researchArtifactHintSchema.optional(),
});

export const actionChatBlockSchema = z.object({
  kind: z.literal("action"),
  title: z.string().trim().min(1).max(120),
  summary: z.string().trim().max(2000),
  summaryRows: z.array(actionSummaryRowSchema).max(CHAT_BLOCK_MAX_ACTION_SUMMARY_ROWS).optional(),
  primaryLabel: z.string().trim().min(1).max(40),
  secondaryLabel: z.string().trim().min(1).max(40),
  callId: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  confirmationToken: z.string().min(1).optional(),
  requiresClientSession: z.boolean().optional(),
  /** In-memory confirm payload — redacted from persisted thread rows. */
  confirmArguments: z.record(z.string(), z.unknown()).optional(),
});

const referenceTargetSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("symbol-interval"),
    symbol: z.string().trim().min(1).max(16),
    interval: z.string().min(1).max(8),
  }),
  z.object({
    type: z.literal("href"),
    href: z.string().url().max(2048),
  }),
]);

const referenceChipSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().trim().min(1).max(120),
  target: referenceTargetSchema.optional(),
});

export const referenceChatBlockSchema = z.object({
  kind: z.literal("reference"),
  chips: z.array(referenceChipSchema).min(1).max(CHAT_BLOCK_MAX_REFERENCE_CHIPS),
});

const followupChipSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().trim().min(1).max(120).optional(),
  prompt: z.string().trim().min(1).max(500),
});

export const followupsChatBlockSchema = z.object({
  kind: z.literal("followups"),
  chips: z.array(followupChipSchema).min(1).max(CHAT_BLOCK_MAX_FOLLOWUPS),
});

export const chatBlockSchema = z.discriminatedUnion("kind", [
  traceChatBlockSchema,
  mediaChatBlockSchema,
  dataChatBlockSchema,
  actionChatBlockSchema,
  referenceChatBlockSchema,
  followupsChatBlockSchema,
]);

export type ChatBlock = z.infer<typeof chatBlockSchema>;
export type TraceChatBlock = z.infer<typeof traceChatBlockSchema>;
export type MediaChatBlock = z.infer<typeof mediaChatBlockSchema>;
export type DataChatBlock = z.infer<typeof dataChatBlockSchema>;
export type ActionChatBlock = z.infer<typeof actionChatBlockSchema>;
export type ActionSummaryRow = z.infer<typeof actionSummaryRowSchema>;
export type ReferenceChatBlock = z.infer<typeof referenceChatBlockSchema>;
export type FollowupsChatBlock = z.infer<typeof followupsChatBlockSchema>;

export const chatBlocksSchema = z.array(chatBlockSchema).max(16);

export type ChatBlocks = z.infer<typeof chatBlocksSchema>;

/**
 * Persistence policy (Phase 0):
 * - Chat blocks are derived at render from CopilotMessage / tool steps / attachments.
 * - They are NOT a new persisted column on Copilot thread rows.
 * - `artifactHint` and confirm payloads stay in-memory; thread save redacts confirmArguments.
 */
export function parseChatBlock(raw: unknown): ChatBlock {
  return chatBlockSchema.parse(raw);
}

export function parseChatBlocks(raw: unknown): ChatBlocks {
  return chatBlocksSchema.parse(raw);
}
