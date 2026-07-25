export const DEFAULT_READYZ_URL = "http://127.0.0.1:3003/readyz";

export const READYZ_REASON_CODES = [
  "postgres_unavailable",
  "redis_unavailable",
  "tws_unavailable",
  "readyz_unreachable",
  "readyz_invalid_response",
] as const;

export type ReadyzReasonCode = (typeof READYZ_REASON_CODES)[number];

export type ReadyzProbeResult = {
  ok: boolean;
  reasons: ReadyzReasonCode[];
  httpStatus?: number;
};

const ALLOWED_REASONS = new Set<string>(READYZ_REASON_CODES);

function normalizeReasons(raw: unknown): ReadyzReasonCode[] {
  if (!Array.isArray(raw)) {
    return ["readyz_invalid_response"];
  }
  const reasons: ReadyzReasonCode[] = [];
  for (const item of raw) {
    if (typeof item !== "string" || !ALLOWED_REASONS.has(item)) {
      continue;
    }
    if (!reasons.includes(item as ReadyzReasonCode)) {
      reasons.push(item as ReadyzReasonCode);
    }
  }
  return reasons;
}

export function resolveReadyzUrl(env: NodeJS.ProcessEnv = process.env): string {
  const raw = env.EDGE_READYZ_URL?.trim();
  return raw && raw.length > 0 ? raw : DEFAULT_READYZ_URL;
}

export async function probeReadyz(
  url = resolveReadyzUrl(),
  fetchImpl: typeof fetch = fetch,
): Promise<ReadyzProbeResult> {
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(5_000),
    });

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return {
        ok: false,
        reasons: ["readyz_invalid_response"],
        httpStatus: response.status,
      };
    }

    if (
      typeof body !== "object" ||
      body === null ||
      !("ok" in body) ||
      typeof (body as { ok: unknown }).ok !== "boolean"
    ) {
      return {
        ok: false,
        reasons: ["readyz_invalid_response"],
        httpStatus: response.status,
      };
    }

    const parsed = body as { ok: boolean; reasons?: unknown };
    const reasons = normalizeReasons(parsed.reasons);

    if (parsed.ok) {
      return { ok: true, reasons: [], httpStatus: response.status };
    }

    return {
      ok: false,
      reasons: reasons.length > 0 ? reasons : ["readyz_invalid_response"],
      httpStatus: response.status,
    };
  } catch {
    return { ok: false, reasons: ["readyz_unreachable"] };
  }
}
