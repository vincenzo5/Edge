const SENSITIVE_PREFIXES = [
  "/api/brokerage",
  "/api/trading",
  "/api/ai",
  "/api/market-data/tws/recover",
  "/api/market-data/warmup",
  "/api/market-data/health",
] as const;

export function isSensitiveRoute(pathname: string): boolean {
  return SENSITIVE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isApiKeyAuthEnabled(): boolean {
  return Boolean(process.env.EDGE_API_KEY?.trim());
}

export function isTrustLocalhostEnabled(): boolean {
  const raw = process.env.EDGE_TRUST_LOCALHOST?.trim().toLowerCase();
  if (raw === "false" || raw === "0") return false;
  return true;
}

function readClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

export function isTrustedLocalhost(request: Request): boolean {
  if (!isTrustLocalhostEnabled()) return false;
  const ip = readClientIp(request);
  return ip === "127.0.0.1" || ip === "::1" || ip === "localhost";
}

function readApiKeyFromRequest(request: Request): string | null {
  const header = request.headers.get("x-edge-api-key")?.trim();
  if (header) return header;
  const auth = request.headers.get("authorization")?.trim();
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim() || null;
  }
  return null;
}

function stringsEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function apiKeysMatch(provided: string, expected: string): boolean {
  return stringsEqual(provided, expected);
}

export type ApiAuthResult =
  | { ok: true }
  | { ok: false; status: 401; message: string };

export function verifyApiKey(request: Request, pathname: string): ApiAuthResult {
  if (!isSensitiveRoute(pathname)) {
    return { ok: true };
  }

  const expected = process.env.EDGE_API_KEY?.trim();
  if (!expected) {
    return { ok: true };
  }

  if (isTrustedLocalhost(request)) {
    return { ok: true };
  }

  const provided = readApiKeyFromRequest(request);
  if (provided && apiKeysMatch(provided, expected)) {
    return { ok: true };
  }

  return {
    ok: false,
    status: 401,
    message: "Missing or invalid API key for sensitive route.",
  };
}
