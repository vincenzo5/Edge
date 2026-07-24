import { z } from "zod";

export const modelProviderKindSchema = z.enum(["openrouter", "openai", "xai"]);

export type ModelProviderKind = z.infer<typeof modelProviderKindSchema>;

export const modelCapabilitiesSchema = z.object({
  tools: z.boolean(),
  vision: z.boolean().optional(),
});

export type ModelCapabilities = z.infer<typeof modelCapabilitiesSchema>;

export const modelRefSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  provider: modelProviderKindSchema,
  capabilities: modelCapabilitiesSchema,
});

export type ModelRef = z.infer<typeof modelRefSchema>;
