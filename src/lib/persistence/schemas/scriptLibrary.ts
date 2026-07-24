import { z } from "zod";

import {
  MAX_REVISIONS_PER_SCRIPT,
  MAX_SCRIPTS,
} from "@/lib/scriptLibrary/types";
import { writeRequestBaseSchema } from "@/lib/persistence/common";

const scriptManifestSchema = z.record(z.string(), z.unknown());

const scriptRevisionRecordSchema = z.object({
  revision: z.string().min(1),
  source: z.string(),
  languageVersion: z.string().min(1),
  sdkVersion: z.string().min(1),
  manifest: scriptManifestSchema.optional(),
  artifactHash: z.string().optional(),
  compiledAt: z.number().int().nonnegative().optional(),
  compileOk: z.boolean(),
});

const scriptDraftSchema = z.object({
  source: z.string(),
  updatedAt: z.number().int().nonnegative(),
  dirty: z.boolean(),
  manifest: scriptManifestSchema.optional(),
});

const scriptLibraryEntrySchema = z.object({
  scriptId: z.string().min(1),
  displayName: z.string().trim().min(1).max(120),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  headRevision: z.string().nullable(),
  draft: scriptDraftSchema.optional(),
  revisions: z.array(scriptRevisionRecordSchema).max(MAX_REVISIONS_PER_SCRIPT),
});

export const scriptLibrarySnapshotSchema = z.object({
  version: z.literal(1),
  scripts: z.array(scriptLibraryEntrySchema).max(MAX_SCRIPTS),
});

export type ScriptLibrarySnapshot = z.infer<typeof scriptLibrarySnapshotSchema>;

export const scriptLibraryWriteSchema = writeRequestBaseSchema.extend({
  scriptLibrarySnapshot: scriptLibrarySnapshotSchema,
});

export const scriptLibraryResponseSchema = z.object({
  schemaVersion: z.literal(1),
  syncRevision: z.number().int().positive(),
  updatedAt: z.string().datetime(),
  scriptLibrarySnapshot: scriptLibrarySnapshotSchema,
});
