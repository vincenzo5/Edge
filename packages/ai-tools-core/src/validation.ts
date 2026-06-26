import { z } from "zod";
import type { ToolDefinition } from "./types";

export type ValidationError = {
  path: string;
  message: string;
};

export function formatZodErrors(error: z.ZodError): ValidationError[] {
  return error.issues.map((issue) => ({
    path: issue.path.join(".") || "(root)",
    message: issue.message,
  }));
}

export function parseToolInput<T>(
  schema: z.ZodType<T>,
  raw: unknown,
): { ok: true; data: T } | { ok: false; errors: ValidationError[] } {
  const result = schema.safeParse(raw);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  return { ok: false, errors: formatZodErrors(result.error) };
}

export function schemaToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  try {
    return z.toJSONSchema(schema, { unrepresentable: "any" }) as Record<
      string,
      unknown
    >;
  } catch {
    return { type: "object", additionalProperties: true };
  }
}

export function toToolDefinition(tool: {
  name: string;
  description: string;
  permission: ToolDefinition["permission"];
  requiresConfirmation: boolean;
  requiresClientSession?: boolean;
  inputSchema: z.ZodType;
}): ToolDefinition {
  return {
    name: tool.name,
    description: tool.description,
    permission: tool.permission,
    requiresConfirmation: tool.requiresConfirmation,
    requiresClientSession: tool.requiresClientSession ?? false,
    inputSchema: schemaToJsonSchema(tool.inputSchema),
  };
}
