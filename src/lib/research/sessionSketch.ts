import { z } from "zod";

/**
 * Phase 0 contract sketch — local + cloud persistence use these shapes (Phase 6).
 */

export const RESEARCH_SESSION_SKETCH_VERSION = 1 as const;

/** Local + cloud research session storage key (Phase 3 local; Phase 6 multi-session + cloud sync). */
export const RESEARCH_SESSIONS_STORAGE_KEY = "tv-ai:research-sessions:v1";

export const researchCardSourceSchema = z.enum(["user", "ai"]);

export const researchCardPositionSketchSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
});

export const researchCardBaseSchema = z.object({
  id: z.string().uuid(),
  source: researchCardSourceSchema.default("user"),
  position: researchCardPositionSketchSchema.optional(),
  /** When source is ai — links back to Copilot provenance. */
  threadId: z.string().min(1).optional(),
  messageId: z.string().min(1).optional(),
});

export const chartResearchCardSketchSchema = researchCardBaseSchema.extend({
  type: z.literal("chart"),
  symbol: z.string().trim().min(1).max(16),
  interval: z.string().min(1).max(8),
  chartWorkspaceId: z.string().uuid().optional(),
  /** Desk tile binding after promote/demote (Phase 4). */
  deskTileId: z.string().min(1).optional(),
  appWorkspaceId: z.string().min(1).optional(),
  viewportRef: z.string().min(1).optional(),
});

export const screenerResearchCardSketchSchema = researchCardBaseSchema.extend({
  type: z.literal("screener"),
  savedScreenId: z.string().uuid().optional(),
  queryLabel: z.string().trim().min(1).max(120).optional(),
});

export const noteResearchCardSketchSchema = researchCardBaseSchema.extend({
  type: z.literal("note"),
  title: z.string().trim().max(200).optional(),
  body: z.string().trim().max(10_000),
});

export const journalDraftResearchCardSketchSchema = researchCardBaseSchema.extend({
  type: z.literal("journalDraft"),
  draftTradeId: z.string().uuid().optional(),
  summary: z.string().trim().max(500).optional(),
});

export const aiCalloutResearchCardSketchSchema = researchCardBaseSchema.extend({
  type: z.literal("aiCallout"),
  summary: z.string().trim().min(1).max(2000),
  threadId: z.string().min(1),
  messageId: z.string().min(1).optional(),
});

export const deskLinkResearchCardSketchSchema = researchCardBaseSchema.extend({
  type: z.literal("deskLink"),
  appWorkspaceId: z.string().min(1).optional(),
  tileId: z.string().min(1).optional(),
  label: z.string().trim().max(120).optional(),
});

export const researchRunResearchCardSketchSchema = researchCardBaseSchema.extend({
  type: z.literal("researchRun"),
  jobId: z.string().trim().min(1).max(64),
  runFingerprint: z.string().trim().min(1).max(128),
  datasetId: z.string().trim().min(1).max(64).optional(),
  toolName: z.string().trim().min(1).max(64),
  summary: z.string().trim().min(1).max(2000),
  keyMetrics: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});

export const researchCardSketchSchema = z.discriminatedUnion("type", [
  chartResearchCardSketchSchema,
  screenerResearchCardSketchSchema,
  noteResearchCardSketchSchema,
  journalDraftResearchCardSketchSchema,
  aiCalloutResearchCardSketchSchema,
  deskLinkResearchCardSketchSchema,
  researchRunResearchCardSketchSchema,
]);

export type ResearchCardSketch = z.infer<typeof researchCardSketchSchema>;

export const researchLinkSketchSchema = z.object({
  id: z.string().uuid(),
  fromCardId: z.string().uuid(),
  toCardId: z.string().uuid(),
  label: z.string().trim().max(120).optional(),
});

export type ResearchLinkSketch = z.infer<typeof researchLinkSketchSchema>;

export const researchReelBeatSketchSchema = z.object({
  id: z.string().uuid(),
  cardId: z.string().uuid(),
  label: z.string().trim().max(200).optional(),
  order: z.number().int().nonnegative(),
});

export type ResearchReelBeatSketch = z.infer<typeof researchReelBeatSketchSchema>;

export const researchSessionSketchSchema = z.object({
  id: z.string().uuid(),
  schemaVersion: z.literal(RESEARCH_SESSION_SKETCH_VERSION),
  title: z.string().trim().min(1).max(200),
  question: z.string().trim().max(2000).optional(),
  cards: z.array(researchCardSketchSchema).max(256),
  links: z.array(researchLinkSketchSchema).max(512),
  threadIds: z.array(z.string().min(1)).max(32),
  reel: z.array(researchReelBeatSketchSchema).max(128),
  updatedAt: z.string().datetime(),
});

export type ResearchSessionSketch = z.infer<typeof researchSessionSketchSchema>;

export function parseResearchSessionSketch(raw: unknown): ResearchSessionSketch {
  return researchSessionSketchSchema.parse(raw);
}
