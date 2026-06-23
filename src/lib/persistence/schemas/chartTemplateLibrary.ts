import { z } from "zod";

import { MAX_PRESETS } from "@/lib/presetStorage";
import { writeRequestBaseSchema } from "@/lib/persistence/common";

const studyTemplatePayloadSchema = z.object({
  name: z.string().min(1),
  pane: z.enum(["main", "sub"]),
  inputs: z.record(z.string(), z.unknown()).optional(),
  styles: z.record(z.string(), z.unknown()).optional(),
  visible: z.boolean().optional(),
  templateKey: z.string().optional(),
});

const chartTemplatePayloadSchema = z.object({
  chartType: z.enum(["candle_solid", "candle_stroke", "ohlc", "area", "heikin_ashi"]),
  chartSettings: z.record(z.string(), z.unknown()).optional(),
  paneOrder: z.array(z.string()).optional(),
  paneHeights: z.record(z.string(), z.number()).optional(),
  collapsedPanes: z.array(z.string()).optional(),
  maximizedPane: z.string().nullable().optional(),
  indicators: z.array(studyTemplatePayloadSchema).max(100),
});

const presetEnvelopeSchema = z.discriminatedUnion("kind", [
  z.object({
    version: z.literal(1),
    id: z.string().min(1),
    name: z.string().trim().min(1).max(120),
    createdAt: z.number().int().nonnegative(),
    kind: z.literal("chart"),
    payload: chartTemplatePayloadSchema,
  }),
  z.object({
    version: z.literal(1),
    id: z.string().min(1),
    name: z.string().trim().min(1).max(120),
    createdAt: z.number().int().nonnegative(),
    kind: z.literal("study"),
    payload: studyTemplatePayloadSchema,
  }),
]);

export const templateSnapshotSchema = z.object({
  version: z.literal(1),
  presets: z.array(presetEnvelopeSchema).max(MAX_PRESETS),
});

export type TemplateSnapshot = z.infer<typeof templateSnapshotSchema>;

export const chartTemplateLibraryWriteSchema = writeRequestBaseSchema.extend({
  templateSnapshot: templateSnapshotSchema,
});

export const chartTemplateLibraryResponseSchema = z.object({
  schemaVersion: z.literal(1),
  syncRevision: z.number().int().positive(),
  updatedAt: z.string().datetime(),
  templateSnapshot: templateSnapshotSchema,
});
