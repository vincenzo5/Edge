import "server-only";

import { BRIDGE_SECRET_HEADER } from "./bridgeConstants";
import { assertBridgeAccess, verifyBridgeSecret } from "./sessionBridgeStore";
import { verifyConfiguredApiKey } from "@/lib/api/apiAuth";

export { BRIDGE_SECRET_HEADER };

export function readBridgeSecretFromRequest(
  request: Request,
  bodySecret?: string | undefined,
): string | undefined {
  const header = request.headers.get(BRIDGE_SECRET_HEADER)?.trim();
  if (header) return header;
  const body = bodySecret?.trim();
  if (body) return body;
  return undefined;
}

export function requireBridgeAccess(
  provided: string | undefined,
): { ok: true } | { ok: false; status: 401; error: string } {
  return assertBridgeAccess(provided);
}

export function hasBridgeAccess(
  request: Request,
  bodySecret?: string | undefined,
): boolean {
  const provided = readBridgeSecretFromRequest(request, bodySecret);
  if (!provided) return false;
  return verifyBridgeSecret(provided);
}

export function requireBridgeOrApiKey(
  request: Request,
  bodySecret?: string | undefined,
): { ok: true } | { ok: false; status: 401; error: string } {
  if (hasBridgeAccess(request, bodySecret)) {
    return { ok: true };
  }

  const apiAuth = verifyConfiguredApiKey(request);
  if (apiAuth.ok) {
    return { ok: true };
  }

  return { ok: false, status: apiAuth.status, error: apiAuth.message };
}
