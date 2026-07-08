import { z } from "zod";

export const SCHEMA_VERSION = 1;

export const syncEnvelopeResponseSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  syncRevision: z.number().int().positive(),
  updatedAt: z.string().datetime(),
});

export const writeRequestBaseSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  baseRevision: z.number().int().nonnegative(),
});

export type SyncEnvelopeResponse = z.infer<typeof syncEnvelopeResponseSchema>;

export type PersistenceErrorCode =
  | "unauthorized"
  | "validation"
  | "not_found"
  | "conflict"
  | "database_unavailable";

export type PersistenceErrorBody = {
  error: string;
  code: PersistenceErrorCode;
  details?: unknown;
  current?: Record<string, unknown> & {
    syncRevision: number;
    updatedAt: string;
  };
};

export function persistenceError(
  status: number,
  code: PersistenceErrorCode,
  error: string,
  extra?: Partial<Omit<PersistenceErrorBody, "error" | "code">>,
): Response {
  return Response.json(
    {
      error,
      code,
      ...extra,
    } satisfies PersistenceErrorBody,
    { status },
  );
}

export function parseJsonBody<T>(
  body: unknown,
  schema: z.ZodType<T>,
): { ok: true; data: T } | { ok: false; error: string; details: unknown } {
  const parsed = schema.safeParse(body);
  if (parsed.success) {
    return { ok: true, data: parsed.data };
  }
  return {
    ok: false,
    error: "Invalid request body",
    details: parsed.error.flatten(),
  };
}

export function isPersistenceDatabaseUnavailable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const errorWithCode = error as Error & { code?: string; cause?: unknown; errors?: unknown[] };
  if (errorWithCode.code === "22003") return false;
  if (errorWithCode.message.includes("integer out of range")) return false;
  if (errorWithCode.code === "ECONNREFUSED") return true;
  if (error.message.includes("ECONNREFUSED")) return true;
  if (error.message.includes("Failed query")) return true;
  if (error.message.includes("does not exist")) return true;
  if (errorWithCode.cause && isPersistenceDatabaseUnavailable(errorWithCode.cause)) return true;
  return Array.isArray(errorWithCode.errors)
    ? errorWithCode.errors.some(isPersistenceDatabaseUnavailable)
    : false;
}
