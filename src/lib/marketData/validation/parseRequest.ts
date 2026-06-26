import { z } from "zod";

export function parseMarketRequest<T>(
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

export function parseMarketQuery<T>(
  params: URLSearchParams,
  schema: z.ZodType<T>,
): { ok: true; data: T } | { ok: false; error: string; details: unknown } {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of params.entries()) {
    if (raw[key] !== undefined) continue;
    if (value === "true") raw[key] = true;
    else if (value === "false") raw[key] = false;
    else if (/^-?\d+$/.test(value)) raw[key] = Number(value);
    else raw[key] = value;
  }
  return parseMarketRequest(raw, schema);
}

export function asFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

/** Normalize provider timestamps to Unix epoch milliseconds. */
export function toTimestampMs(value: unknown): number | null {
  const n = asFiniteNumber(value);
  if (n == null) return null;
  return n > 0 && n < 1e12 ? n * 1000 : n;
}
