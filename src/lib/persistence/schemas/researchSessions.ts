import { z } from "zod";

import {
  RESEARCH_SESSION_SKETCH_VERSION,
  researchCardSketchSchema,
  researchLinkSketchSchema,
  researchReelBeatSketchSchema,
} from "@/lib/research/sessionSketch";
import { SCHEMA_VERSION, writeRequestBaseSchema } from "@/lib/persistence/common";

export const researchSessionPayloadSchema = z.object({
  question: z.string().trim().max(2000).optional(),
  cards: z.array(researchCardSketchSchema).max(256),
  links: z.array(researchLinkSketchSchema).max(512),
  threadIds: z.array(z.string().min(1)).max(32),
  reel: z.array(researchReelBeatSketchSchema).max(128),
});

export type ResearchSessionPayload = z.infer<typeof researchSessionPayloadSchema>;

export const researchSessionResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  schemaVersion: z.literal(RESEARCH_SESSION_SKETCH_VERSION),
  syncRevision: z.number().int().positive(),
  updatedAt: z.string().datetime(),
  question: z.string().trim().max(2000).optional(),
  cards: z.array(researchCardSketchSchema).max(256),
  links: z.array(researchLinkSketchSchema).max(512),
  threadIds: z.array(z.string().min(1)).max(32),
  reel: z.array(researchReelBeatSketchSchema).max(128),
});

export const researchSessionSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  schemaVersion: z.literal(RESEARCH_SESSION_SKETCH_VERSION),
  syncRevision: z.number().int().positive(),
  updatedAt: z.string().datetime(),
  cardCount: z.number().int().nonnegative(),
  linkCount: z.number().int().nonnegative(),
});

export const researchSessionListResponseSchema = z.object({
  sessions: z.array(researchSessionSummarySchema),
});

export const researchSessionCreateSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200).optional(),
  question: z.string().trim().max(2000).optional(),
  cards: researchSessionPayloadSchema.shape.cards.optional(),
  links: researchSessionPayloadSchema.shape.links.optional(),
  threadIds: researchSessionPayloadSchema.shape.threadIds.optional(),
  reel: researchSessionPayloadSchema.shape.reel.optional(),
});

export const researchSessionWriteSchema = writeRequestBaseSchema.extend({
  title: z.string().trim().min(1).max(200).optional(),
  question: z.string().trim().max(2000).optional(),
  cards: researchSessionPayloadSchema.shape.cards,
  links: researchSessionPayloadSchema.shape.links,
  threadIds: researchSessionPayloadSchema.shape.threadIds,
  reel: researchSessionPayloadSchema.shape.reel,
});

export type ResearchSessionResponse = z.infer<typeof researchSessionResponseSchema>;
export type ResearchSessionSummary = z.infer<typeof researchSessionSummarySchema>;
