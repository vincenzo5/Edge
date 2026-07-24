import { z } from "zod";

const scriptManifestSchema = z.record(z.string(), z.unknown());

export const createScriptBodySchema = z.object({
  displayName: z.string().trim().min(1).max(120).optional(),
  source: z.string().optional(),
});

export const patchScriptBodySchema = z.object({
  displayName: z.string().trim().min(1).max(120).optional(),
  draftSource: z.string().optional(),
  draftManifest: scriptManifestSchema.optional(),
  draftDirty: z.boolean().optional(),
});

export const saveScriptRevisionBodySchema = z.object({
  source: z.string().min(1),
  languageVersion: z.string().min(1).optional(),
  sdkVersion: z.string().min(1).optional(),
  manifest: scriptManifestSchema.optional(),
  artifactHash: z.string().optional(),
  compileOk: z.boolean(),
});

export type CreateScriptBody = z.infer<typeof createScriptBodySchema>;
export type PatchScriptBody = z.infer<typeof patchScriptBodySchema>;
export type SaveScriptRevisionBody = z.infer<typeof saveScriptRevisionBodySchema>;
