import { isLoopbackIp, readClientIp, type ClientIpSource } from "./clientIp";

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

export function isDevOpenAuthMode(): boolean {
  return (
    process.env.EDGE_API_AUTH_MODE?.trim() === "dev-open" &&
    process.env.NODE_ENV !== "production"
  );
}

export function isTrustLocalhostEnabled(): boolean {
  const raw = process.env.EDGE_TRUST_LOCALHOST?.trim().toLowerCase();
  if (raw === "false" || raw === "0") return false;
  return true;
}

export function isTrustedLocalhost(request: ClientIpSource): boolean {
  if (!isTrustLocalhostEnabled()) return false;
  return isLoopbackIp(readClientIp(request));
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

export function verifyApiKey(
  request: ClientIpSource,
  pathname: string,
): ApiAuthResult {
  if (!isSensitiveRoute(pathname)) {
    return { ok: true };
  }

  return verifyConfiguredApiKey(request);
}

export function verifyConfiguredApiKey(request: ClientIpSource): ApiAuthResult {
  const expected = process.env.EDGE_API_KEY?.trim();
  if (!expected) {
    if (isDevOpenAuthMode()) {
      return { ok: true };
    }
    return {
      ok: false,
      status: 401,
      message:
        "API key required. Set EDGE_API_KEY or EDGE_API_AUTH_MODE=dev-open (non-production only).",
    };
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
    message: "Missing or invalid API key.",
  };
}
