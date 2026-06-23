import { z } from "zod";

import { INTERVALS } from "@/lib/chartConfig";

const intervalValues = INTERVALS.map((i) => i.value) as [string, ...string[]];

export const researchNoteTypeSchema = z.enum([
  "thesis",
  "invalidation",
  "target",
  "note",
]);

export const researchThesisSchema = z
  .object({
    title: z.string().trim().max(200).optional(),
    body: z.string().trim().max(10_000).optional(),
    confidence: z.number().min(0).max(1).optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  })
  .refine((value) => Boolean(value.title || value.body), {
    message: "researchThesis requires title or body",
  });

export const chartDrawingSnapshotSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().min(1),
    label: z.string(),
    points: z.array(z.record(z.string(), z.unknown())).max(500),
    visible: z.boolean(),
    locked: z.boolean(),
    zLevel: z.number().int(),
  })
  .passthrough();

export const marketResearchNoteCreateSchema = z.object({
  chartWorkspaceId: z.string().uuid().optional(),
  symbol: z.string().trim().min(1).max(16),
  chartInterval: z.enum(intervalValues),
  researchNoteType: researchNoteTypeSchema,
  chartDrawingSnapshot: chartDrawingSnapshotSchema.optional(),
  researchThesis: researchThesisSchema,
});

export const marketResearchNotePatchSchema = z
  .object({
    chartWorkspaceId: z.string().uuid().nullable().optional(),
    symbol: z.string().trim().min(1).max(16).optional(),
    chartInterval: z.enum(intervalValues).optional(),
    researchNoteType: researchNoteTypeSchema.optional(),
    chartDrawingSnapshot: chartDrawingSnapshotSchema.nullable().optional(),
    researchThesis: researchThesisSchema.optional(),
    archived: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const marketResearchNoteResponseSchema = z.object({
  id: z.string().uuid(),
  chartWorkspaceId: z.string().uuid().nullable(),
  symbol: z.string(),
  chartInterval: z.string(),
  researchNoteType: researchNoteTypeSchema,
  chartDrawingSnapshot: chartDrawingSnapshotSchema.nullable(),
  researchThesis: researchThesisSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  archivedAt: z.string().datetime().nullable(),
});

export type MarketResearchNoteResponse = z.infer<typeof marketResearchNoteResponseSchema>;
